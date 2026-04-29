using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.Standup.DTOs;
using ProjectManagement.Application.Features.Standup.GenerateStandup;
using ProjectManagement.Application.Features.Standup.GetStandupReport;
using ProjectManagement.Application.Features.Standup.GetStandupReports;
using ProjectManagement.Application.Features.Standup.GetStandupSettings;
using ProjectManagement.Application.Features.Standup.UpdateStandupSettings;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/standup")]
[Authorize]
public class StandupController(IMediator mediator) : ControllerBase
{
    [HttpGet("settings")]
    public async Task<ActionResult<StandupSettingsDto>> GetSettings(
        [FromRoute] Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetStandupSettingsQuery(projectId), ct)).ToActionResult(this);

    [HttpPut("settings")]
    public async Task<ActionResult<StandupSettingsDto>> UpdateSettings(
        [FromRoute] Guid projectId,
        [FromBody] UpdateStandupSettingsRequest request,
        CancellationToken ct)
        => (await mediator.Send(
            new UpdateStandupSettingsCommand(projectId, request.IsEnabled, request.ScheduledTime), ct))
            .ToActionResult(this);

    [HttpPost("generate")]
    public async Task<ActionResult<StandupReportDto>> Generate(
        [FromRoute] Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GenerateStandupCommand(projectId), ct)).ToActionResult(this);

    [HttpGet("reports")]
    public async Task<ActionResult<List<StandupReportSummaryDto>>> GetReports(
        [FromRoute] Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetStandupReportsQuery(projectId), ct)).ToActionResult(this);

    [HttpGet("reports/{reportId:guid}")]
    public async Task<ActionResult<StandupReportDto>> GetReport(
        [FromRoute] Guid projectId,
        [FromRoute] Guid reportId,
        CancellationToken ct)
        => (await mediator.Send(new GetStandupReportQuery(projectId, reportId), ct)).ToActionResult(this);
}

public sealed record UpdateStandupSettingsRequest(bool IsEnabled, string ScheduledTime);
