namespace ProjectManagement.Domain.Enums;

public enum NotificationType
{
    TaskAssigned    = 0,
    TaskBlocked     = 1,
    TaskOverdue     = 2,
    TicketReplied   = 3,
    SlaBreached     = 4,
    CommentAdded    = 5,
    SprintStarted   = 6,
    SprintCompleted = 7,
    AddedToProject  = 8,
}
