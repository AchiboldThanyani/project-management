using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Tickets.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Tickets.GetTicketComments;

internal sealed class GetTicketCommentsQueryHandler(
    ITicketCommentRepository comments,
    IUserRepository          users)
    : IRequestHandler<GetTicketCommentsQuery, Result<IReadOnlyList<TicketCommentDto>>>
{
    public async Task<Result<IReadOnlyList<TicketCommentDto>>> Handle(GetTicketCommentsQuery req, CancellationToken ct)
    {
        var list = await comments.GetByTicketAsync(req.TicketId, ct);

        var authorIds = list.Select(c => c.AuthorId).Distinct().ToList();
        var names = await users.GetNamesByIdsAsync(authorIds, ct);

        return list.Select(c => new TicketCommentDto
        {
            Id = c.Id, TicketId = c.TicketId,
            AuthorId = c.AuthorId,
            AuthorName = names.GetValueOrDefault(c.AuthorId, "Unknown"),
            Content = c.Content, IsFromCustomer = c.IsFromCustomer,
            CreatedAt = c.CreatedAt,
        }).ToList();
    }
}
