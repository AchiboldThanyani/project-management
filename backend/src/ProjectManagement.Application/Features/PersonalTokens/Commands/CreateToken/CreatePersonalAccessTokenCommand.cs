using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.PersonalTokens.DTOs;

namespace ProjectManagement.Application.Features.PersonalTokens.Commands.CreateToken;

public sealed record CreatePersonalAccessTokenCommand(string Label) : ICommand<CreatedTokenDto>;
