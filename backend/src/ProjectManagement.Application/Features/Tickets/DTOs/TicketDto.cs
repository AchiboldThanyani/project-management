using ProjectManagement.Application.Features.Tickets.Sla;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tickets.DTOs;

public record TicketDto
{
    public Guid          Id                   { get; init; }
    public int           Number               { get; init; }
    public Guid          ProjectId            { get; init; }
    public string        SubmittedById        { get; init; } = default!;
    public string        SubmittedByName      { get; init; } = default!;
    public string        Subject              { get; init; } = default!;
    public string?       Description          { get; init; }
    public TicketType    Type                 { get; init; }
    public TaskPriority  Priority             { get; init; }
    public TicketStatus  Status               { get; init; }
    public string?       AssignedToId         { get; init; }
    public string?       AssignedToName       { get; init; }
    public Guid?         ConvertedToTaskId    { get; init; }
    public DateTime      CreatedAt            { get; init; }
    public DateTime?     UpdatedAt            { get; init; }
    public SlaStatus     SlaStatus            { get; init; }
    public DateTime      ResponseDeadlineUtc  { get; init; }
    public DateTime      ResolutionDeadlineUtc { get; init; }
    public double        SlaHoursRemaining    { get; init; }
}

public record TicketCommentDto
{
    public Guid     Id             { get; init; }
    public Guid     TicketId       { get; init; }
    public string   AuthorId       { get; init; } = default!;
    public string   AuthorName     { get; init; } = default!;
    public string   Content        { get; init; } = default!;
    public bool     IsFromCustomer { get; init; }
    public DateTime CreatedAt      { get; init; }
}
