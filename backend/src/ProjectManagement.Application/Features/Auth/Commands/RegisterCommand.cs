using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.DTOs;

namespace ProjectManagement.Application.Features.Auth.Commands;

public sealed record RegisterCommand(string FirstName, string LastName, string Email, string Password, string? InviteToken = null)
    : ICommand<AuthResponseDto>;
