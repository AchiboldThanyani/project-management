namespace ProjectManagement.Application.Features.Auth.DTOs;

public record RegisterDto(string FirstName, string LastName, string Email, string Password, string? InviteToken = null);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(string AccessToken, string RefreshToken, string UserId, string Email, string FirstName, string LastName);
