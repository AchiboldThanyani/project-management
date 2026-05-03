using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Auth.Commands;

public sealed record LogoutCommand(string UserId) : ICommand;
