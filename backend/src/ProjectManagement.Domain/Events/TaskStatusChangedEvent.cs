using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;
using TaskStatus = ProjectManagement.Domain.Enums.TaskStatus;

namespace ProjectManagement.Domain.Events;

public sealed record TaskStatusChangedEvent(
    Guid TaskId,
    string TaskTitle,
    Guid ProjectId,
    TaskStatus OldStatus,
    TaskStatus NewStatus,
    string ChangedByUserId) : IDomainEvent;
