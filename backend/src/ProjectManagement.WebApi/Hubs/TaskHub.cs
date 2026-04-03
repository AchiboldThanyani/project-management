using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ProjectManagement.WebApi.Hubs;

[Authorize]
public class TaskHub : Hub
{
    /// <summary>Clients join a project-specific group to receive targeted updates.</summary>
    public async Task JoinProject(string projectId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"project-{projectId}");

    public async Task LeaveProject(string projectId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project-{projectId}");
}
