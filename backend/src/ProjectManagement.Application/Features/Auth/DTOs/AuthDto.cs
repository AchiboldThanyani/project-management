namespace ProjectManagement.Application.Features.Auth.DTOs;

public class RegisterDto
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string? InviteToken { get; set; }
}

public record LoginDto(string Email, string Password);

public record AuthResponseDto(string AccessToken, string RefreshToken, string UserId, string Email, string FirstName, string LastName);
