using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ProjectManagement.WebApi.Hubs;

[Authorize]
public class TaskHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (userId is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        await base.OnConnectedAsync();
    }

    public async Task JoinProject(string projectId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"project-{projectId}");

    public async Task LeaveProject(string projectId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project-{projectId}");
}
