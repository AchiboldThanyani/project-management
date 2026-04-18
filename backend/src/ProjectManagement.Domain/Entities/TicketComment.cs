using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class TicketComment : BaseEntity
{
    public Guid   TicketId       { get; private set; }
    public string AuthorId       { get; private set; } = string.Empty;
    public string Content        { get; private set; } = string.Empty;
    public bool   IsFromCustomer { get; private set; }

    public Ticket Ticket { get; set; } = null!;

    private TicketComment() { }

    public static TicketComment Create(Guid ticketId, string authorId, string content, bool isFromCustomer) =>
        new() { TicketId = ticketId, AuthorId = authorId, Content = content, IsFromCustomer = isFromCustomer };
}
