using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Notifications;

public record NotificationDto(
    Guid Id,
    string Title,
    string Body,
    NotificationType Type,
    Guid? RelatedEntityId,
    bool IsRead,
    DateTime CreatedAt);
