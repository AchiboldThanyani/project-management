using Microsoft.AspNetCore.Authorization;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.WebApi.Authorization;

/// <summary>
/// Type-safe replacement for [Authorize(Roles = "...")].
/// Usage: [AuthorizeRoles(UserRole.Admin, UserRole.ProjectManager)]
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthorizeRolesAttribute : AuthorizeAttribute
{
    public AuthorizeRolesAttribute(params UserRole[] roles)
    {
        Roles = string.Join(",", roles.Select(r => r.ToString()));
    }
}
