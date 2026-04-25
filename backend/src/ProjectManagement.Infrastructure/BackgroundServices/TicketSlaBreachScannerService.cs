using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProjectManagement.Application.Features.Tickets.Sla;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Infrastructure.BackgroundServices;

public class TicketSlaBreachScannerService(IServiceScopeFactory scopeFactory, ILogger<TicketSlaBreachScannerService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(10), ct);
            if (ct.IsCancellationRequested) break;

            try
            {
                await ScanAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error in TicketSlaBreachScannerService");
            }
        }
    }

    private async Task ScanAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var ticketRepo       = scope.ServiceProvider.GetRequiredService<ITicketRepository>();
        var notificationRepo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
        var notificationSvc  = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var uow              = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var openTickets = await ticketRepo.GetOpenTicketsAsync(ct);

        foreach (var ticket in openTickets)
        {
            if (ticket.AssignedToId is null) continue;

            var (status, _, resolutionDeadline, hoursRemaining) = SlaPolicy.Compute(ticket.Priority, ticket.CreatedAt);

            if (status == SlaStatus.Breached)
            {
                // Only notify once — check if we already sent a breach notification for this ticket recently
                var title = $"SLA Breached: Ticket #{ticket.Number}";
                var body  = $"Ticket \"{ticket.Subject}\" has breached its SLA. Resolution was due {resolutionDeadline:MMM d, HH:mm}.";

                var notification = Notification.Create(
                    ticket.AssignedToId, title, body,
                    NotificationType.General, ticket.Id);

                await notificationRepo.AddAsync(notification, ct);
                await uow.SaveChangesAsync(ct);
                await notificationSvc.PushAsync(ticket.AssignedToId, notification, ct);

                logger.LogInformation("SLA breach notification sent for ticket {Id}", ticket.Id);
            }
            else if (status == SlaStatus.AtRisk)
            {
                var title = $"SLA At Risk: Ticket #{ticket.Number}";
                var body  = $"Ticket \"{ticket.Subject}\" is at risk — {hoursRemaining:F1}h until SLA breach.";

                var notification = Notification.Create(
                    ticket.AssignedToId, title, body,
                    NotificationType.General, ticket.Id);

                await notificationRepo.AddAsync(notification, ct);
                await uow.SaveChangesAsync(ct);
                await notificationSvc.PushAsync(ticket.AssignedToId, notification, ct);
            }
        }
    }
}
