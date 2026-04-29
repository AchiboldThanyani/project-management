using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;
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
    public async Task<IActionResult> GetSettings([FromRoute] Guid projectId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetStandupSettingsQuery(projectId), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error!.Type switch
        {
            ErrorType.Forbidden => StatusCode(403, new { result.Error.Code, result.Error.Description }),
            _ => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromRoute] Guid projectId,
        [FromBody] UpdateStandupSettingsRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new UpdateStandupSettingsCommand(projectId, request.IsEnabled, request.ScheduledTime), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error!.Type switch
        {
            ErrorType.Forbidden   => StatusCode(403, new { result.Error.Code, result.Error.Description }),
            ErrorType.NotFound    => NotFound(new { result.Error.Code, result.Error.Description }),
            ErrorType.Validation  => BadRequest(new { result.Error.Code, result.Error.Description }),
            _ => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromRoute] Guid projectId, CancellationToken ct)
    {
        var result = await mediator.Send(new GenerateStandupCommand(projectId), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error!.Type switch
        {
            ErrorType.Forbidden  => StatusCode(403, new { result.Error.Code, result.Error.Description }),
            ErrorType.NotFound   => NotFound(new { result.Error.Code, result.Error.Description }),
            ErrorType.Validation => BadRequest(new { result.Error.Code, result.Error.Description }),
            _ => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromRoute] Guid projectId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetStandupReportsQuery(projectId), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error!.Type switch
        {
            ErrorType.Forbidden => StatusCode(403, new { result.Error.Code, result.Error.Description }),
            _ => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    [HttpGet("reports/{reportId:guid}")]
    public async Task<IActionResult> GetReport(
        [FromRoute] Guid projectId,
        [FromRoute] Guid reportId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetStandupReportQuery(projectId, reportId), ct);
        return result.IsSuccess ? Ok(result.Value) : result.Error!.Type switch
        {
            ErrorType.NotFound  => NotFound(new { result.Error.Code, result.Error.Description }),
            ErrorType.Forbidden => StatusCode(403, new { result.Error.Code, result.Error.Description }),
            _ => StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }
}

public sealed record UpdateStandupSettingsRequest(bool IsEnabled, string ScheduledTime);
