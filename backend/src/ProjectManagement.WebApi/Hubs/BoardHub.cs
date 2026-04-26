using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ProjectManagement.WebApi.Hubs;

[Authorize]
public class BoardHub : Hub
{
    public async Task JoinBoard(string boardId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"board-{boardId}");

    public async Task LeaveBoard(string boardId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board-{boardId}");

    public async Task BroadcastBoardChange(string boardId, string contentJson)
        => await Clients.OthersInGroup($"board-{boardId}").SendAsync("ReceiveBoardChange", contentJson);
}
