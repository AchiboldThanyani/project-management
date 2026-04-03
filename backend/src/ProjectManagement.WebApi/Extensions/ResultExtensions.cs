using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;

namespace ProjectManagement.WebApi.Extensions;

public static class ResultExtensions
{
    public static ActionResult<T> ToActionResult<T>(this Result<T> result, ControllerBase controller)
    {
        if (result.IsSuccess)
            return controller.Ok(result.Value);

        return result.Error!.Type switch
        {
            ErrorType.NotFound     => controller.NotFound(new { result.Error.Code, result.Error.Description }),
            ErrorType.Validation   => controller.BadRequest(new { result.Error.Code, result.Error.Description }),
            ErrorType.Conflict     => controller.Conflict(new { result.Error.Code, result.Error.Description }),
            ErrorType.Unauthorized => controller.Forbid(),
            _                      => controller.StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }

    public static IActionResult ToActionResult(this Result result, ControllerBase controller)
    {
        if (result.IsSuccess)
            return controller.NoContent();

        return result.Error!.Type switch
        {
            ErrorType.NotFound     => controller.NotFound(new { result.Error.Code, result.Error.Description }),
            ErrorType.Validation   => controller.BadRequest(new { result.Error.Code, result.Error.Description }),
            ErrorType.Conflict     => controller.Conflict(new { result.Error.Code, result.Error.Description }),
            ErrorType.Unauthorized => controller.Forbid(),
            _                      => controller.StatusCode(500, new { result.Error.Code, result.Error.Description }),
        };
    }
}
