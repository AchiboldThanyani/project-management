using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.PersonalTokens.Commands.RevokeToken;

public sealed record RevokePersonalAccessTokenCommand(Guid TokenId) : ICommand;
