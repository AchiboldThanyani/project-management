namespace ProjectManagement.Application.Features.PersonalTokens.DTOs;

public record PersonalAccessTokenDto(
    Guid Id,
    string Label,
    string Prefix,
    DateTime CreatedAt,
    DateTime? LastUsedAt);

/// <summary>Returned only once at creation — includes the raw token value.</summary>
public record CreatedTokenDto(
    Guid Id,
    string Label,
    string Prefix,
    string Token,
    DateTime CreatedAt);
