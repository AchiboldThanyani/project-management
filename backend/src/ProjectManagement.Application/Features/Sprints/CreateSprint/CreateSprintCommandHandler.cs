using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Sprints.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Sprints.CreateSprint;

internal sealed class CreateSprintCommandHandler(
    ISprintRepository repository,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateSprintCommand, Result<SprintDto>>
{
    public async Task<Result<SprintDto>> Handle(CreateSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = Sprint.Create(request.Name, request.ProjectId, request.StartDate, request.EndDate, request.Goal);
        await repository.AddAsync(sprint, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<SprintDto>(sprint);
    }
}
