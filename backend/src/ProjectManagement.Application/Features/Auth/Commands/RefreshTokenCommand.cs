using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Auth.DTOs;

namespace ProjectManagement.Application.Features.Auth.Commands;

public sealed record RefreshTokenCommand(string RefreshToken) : ICommand<AuthResponseDto>;
