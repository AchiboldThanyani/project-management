using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Messages;

public static class MessageErrors
{
    public static Error NotFound(Guid id) =>
        Error.NotFound("Message.NotFound", $"Message with id '{id}' was not found.");
}
