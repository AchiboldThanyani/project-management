using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public string UserId { get; private set; } = string.Empty;
    public string UserName { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public Guid? EntityId { get; private set; }
    public string EntityName { get; private set; } = string.Empty;
    public Guid? ProjectId { get; private set; }

    private ActivityLog() { }

    public static ActivityLog Create(
        string userId,
        string userName,
        string action,
        string entityType,
        Guid? entityId,
        string entityName,
        Guid? projectId = null)
    {
        return new ActivityLog
        {
            UserId = userId,
            UserName = userName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            ProjectId = projectId,
        };
    }
}
