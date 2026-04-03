using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Projects.DeleteProject;

public sealed record DeleteProjectCommand(Guid Id) : ICommand;
