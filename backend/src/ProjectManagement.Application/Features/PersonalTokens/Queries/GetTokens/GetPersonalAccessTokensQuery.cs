using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.PersonalTokens.DTOs;

namespace ProjectManagement.Application.Features.PersonalTokens.Queries.GetTokens;

public sealed record GetPersonalAccessTokensQuery : IQuery<IReadOnlyList<PersonalAccessTokenDto>>;
