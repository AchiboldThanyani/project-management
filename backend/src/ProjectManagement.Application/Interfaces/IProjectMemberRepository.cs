using ProjectManagement.Application.Features.ProjectMembers.DTOs;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IProjectMemberRepository : IRepository<ProjectMember>
{
    Task<IReadOnlyList<ProjectMemberDto>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<ProjectMemberDto?> GetDtoByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetMemberUserIdsAsync(Guid projectId, CancellationToken ct = default);
}
