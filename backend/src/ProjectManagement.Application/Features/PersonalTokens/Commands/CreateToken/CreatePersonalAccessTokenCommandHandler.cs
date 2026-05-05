using System.Security.Cryptography;
using System.Text;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.PersonalTokens.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.PersonalTokens.Commands.CreateToken;

internal sealed class CreatePersonalAccessTokenCommandHandler(
    IPersonalAccessTokenRepository repository,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<CreatePersonalAccessTokenCommand, Result<CreatedTokenDto>>
{
    public async Task<Result<CreatedTokenDto>> Handle(
        CreatePersonalAccessTokenCommand request, CancellationToken cancellationToken)
    {
        var rawToken = GenerateRawToken();
        var tokenHash = HashToken(rawToken);
        var prefix = rawToken[..12];

        var token = PersonalAccessToken.Create(currentUser.UserId, request.Label, tokenHash, prefix);
        await repository.AddAsync(token, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new CreatedTokenDto(token.Id, token.Label, token.Prefix, rawToken, token.CreatedAt);
    }

    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var base64 = Convert.ToBase64String(bytes)
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        return $"pmhub_{base64}";
    }

    internal static string HashToken(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
