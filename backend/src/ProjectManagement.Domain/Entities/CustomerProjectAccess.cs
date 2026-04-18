using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class CustomerProjectAccess : BaseEntity
{
    public string UserId    { get; private set; } = string.Empty;
    public Guid   ProjectId { get; private set; }

    public Project Project { get; set; } = null!;

    private CustomerProjectAccess() { }

    public static CustomerProjectAccess Create(string userId, Guid projectId) =>
        new() { UserId = userId, ProjectId = projectId };
}
