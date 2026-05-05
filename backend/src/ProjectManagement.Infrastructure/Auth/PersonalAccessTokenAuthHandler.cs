using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProjectManagement.Domain.Interfaces;
using ProjectManagement.Infrastructure.Identity;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Auth;

public sealed class PersonalAccessTokenAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IPersonalAccessTokenRepository tokenRepository,
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext db)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "PersonalAccessToken";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return AuthenticateResult.NoResult();

        var header = authHeader.ToString();
        if (!header.StartsWith("Bearer pmhub_", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var rawToken = header["Bearer ".Length..].Trim();
        var tokenHash = HashToken(rawToken);

        var token = await tokenRepository.GetByHashAsync(tokenHash, Context.RequestAborted);
        if (token is null)
            return AuthenticateResult.Fail("Invalid API token.");

        var user = await userManager.FindByIdAsync(token.UserId);
        if (user is null)
            return AuthenticateResult.Fail("User not found.");

        // Update last-used timestamp (best-effort)
        token.RecordUsage();
        await db.SaveChangesAsync(Context.RequestAborted);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new Claim(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }

    private static string HashToken(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
