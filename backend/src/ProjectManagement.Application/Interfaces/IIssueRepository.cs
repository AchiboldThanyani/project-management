using ProjectManagement.Application.Features.Issues.DTOs;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IIssueRepository : IRepository<Issue>
{
    Task<int> GetNextNumberAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<IssueDto?> GetDtoByIdAsync(Guid issueId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<IssueDto> Items, int TotalCount)> GetPagedByProjectAsync(
        Guid projectId, IssueStatus? status, IssueType? type, int page, int pageSize, CancellationToken cancellationToken = default);
    Task AddCommentAsync(IssueComment comment, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<IssueCommentDto>> GetCommentsAsync(Guid issueId, CancellationToken cancellationToken = default);
}
