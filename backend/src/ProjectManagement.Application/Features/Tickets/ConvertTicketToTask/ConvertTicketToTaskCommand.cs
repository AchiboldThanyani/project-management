using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tasks.DTOs;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Tickets.ConvertTicketToTask;

public record ConvertTicketToTaskCommand(
    Guid         TicketId,
    string?      Title       = null,
    string?      Description = null,
    TaskPriority? Priority   = null,
    Guid?        SprintId    = null,
    string?      AssigneeId  = null
) : ICommand<TaskDto>;
