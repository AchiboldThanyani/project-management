namespace ProjectManagement.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(string userId, string email, string firstName, string lastName);
    string GenerateRefreshToken();
}
