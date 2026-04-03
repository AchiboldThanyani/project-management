using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.DTOs;

namespace ProjectManagement.Application.Features.Auth.Commands;

public sealed record LoginCommand(string Email, string Password) : ICommand<AuthResponseDto>;
