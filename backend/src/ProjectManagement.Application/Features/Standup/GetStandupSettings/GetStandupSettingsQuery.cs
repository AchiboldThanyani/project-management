using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Standup.DTOs;

namespace ProjectManagement.Application.Features.Standup.GetStandupSettings;

public sealed record GetStandupSettingsQuery(Guid ProjectId) : IQuery<StandupSettingsDto>;
