namespace ProjectManagement.Application.Interfaces;

public interface ICurrentUserService
{
    string UserId { get; }
    string FullName { get; }
    bool IsAdmin { get; }
    bool IsProjectManager { get; }
}
