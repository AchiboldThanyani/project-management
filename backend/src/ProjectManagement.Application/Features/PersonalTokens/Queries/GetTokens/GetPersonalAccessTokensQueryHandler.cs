using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.PersonalTokens.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.PersonalTokens.Queries.GetTokens;

internal sealed class GetPersonalAccessTokensQueryHandler(
    IPersonalAccessTokenRepository repository,
    ICurrentUserService currentUser)
    : IRequestHandler<GetPersonalAccessTokensQuery, Result<IReadOnlyList<PersonalAccessTokenDto>>>
{
    public async Task<Result<IReadOnlyList<PersonalAccessTokenDto>>> Handle(
        GetPersonalAccessTokensQuery request, CancellationToken cancellationToken)
    {
        var tokens = await repository.GetByUserAsync(currentUser.UserId, cancellationToken);
        var dtos = tokens
            .Select(t => new PersonalAccessTokenDto(t.Id, t.Label, t.Prefix, t.CreatedAt, t.LastUsedAt))
            .ToList();
        return dtos;
    }
}
