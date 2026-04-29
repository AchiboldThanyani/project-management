using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GenerateStandup;

public sealed record GenerateStandupCommand(Guid ProjectId) : ICommand<StandupReportDto>;
