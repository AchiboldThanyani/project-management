using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string UserId =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    public string FullName
    {
        get
        {
            var user = httpContextAccessor.HttpContext?.User;
            if (user is null) return "Unknown";
            var first = user.FindFirstValue(JwtRegisteredClaimNames.GivenName) ?? string.Empty;
            var last = user.FindFirstValue(JwtRegisteredClaimNames.FamilyName) ?? string.Empty;
            var full = $"{first} {last}".Trim();
            return string.IsNullOrEmpty(full) ? "Unknown" : full;
        }
    }
}
