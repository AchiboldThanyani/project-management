using ProjectManagement.Domain.Common;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Domain.Entities;

public class Notification : BaseEntity
{
    public string UserId { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Body { get; private set; } = string.Empty;
    public NotificationType Type { get; private set; }
    public Guid? RelatedEntityId { get; private set; }
    public bool IsRead { get; private set; }

    private Notification() { }

    public static Notification Create(string userId, string title, string body,
        NotificationType type, Guid? relatedEntityId = null)
        => new()
        {
            UserId = userId,
            Title = title,
            Body = body,
            Type = type,
            RelatedEntityId = relatedEntityId,
            IsRead = false,
        };

    public void MarkRead()
    {
        IsRead = true;
        SetUpdated();
    }
}
