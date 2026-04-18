using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities;

public class Ticket : BaseEntity
{
    public int         Number       { get; private set; }
    public Guid        ProjectId    { get; private set; }
    public string      SubmittedById { get; private set; } = string.Empty;
    public string      Subject      { get; private set; } = string.Empty;
    public string?     Description  { get; private set; }
    public TicketType   Type        { get; private set; }
    public TaskPriority Priority    { get; private set; }
    public TicketStatus Status      { get; private set; } = TicketStatus.New;
    public string?     AssignedToId { get; private set; }
    public Guid?       ConvertedToTaskId { get; private set; }

    public Project Project { get; set; } = null!;
    public ICollection<TicketComment> Comments { get; set; } = [];

    private Ticket() { }

    public static Ticket Create(int number, Guid projectId, string submittedById,
        string subject, string? description, TicketType type, TaskPriority priority) =>
        new()
        {
            Number       = number,
            ProjectId    = projectId,
            SubmittedById = submittedById,
            Subject      = subject,
            Description  = description,
            Type         = type,
            Priority     = priority,
        };

    public void UpdateStatus(TicketStatus status, string? assignedToId = null)
    {
        Status = status;
        if (assignedToId is not null) AssignedToId = assignedToId;
        SetUpdated();
    }

    public void MarkConverted(Guid taskId)
    {
        ConvertedToTaskId = taskId;
        Status = TicketStatus.Closed;
        SetUpdated();
    }
}
