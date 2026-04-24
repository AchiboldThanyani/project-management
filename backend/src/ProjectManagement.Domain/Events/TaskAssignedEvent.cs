using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Events;

public sealed record TaskAssignedEvent(
    Guid TaskId,
    string TaskTitle,
    Guid ProjectId,
    string AssigneeId,
    string AssignedByUserId) : IDomainEvent;
