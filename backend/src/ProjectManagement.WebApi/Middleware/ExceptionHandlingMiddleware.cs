using System.Net;
using System.Text.Json;
using ProjectManagement.Application.Common.Exceptions;
using ValidationException = ProjectManagement.Application.Common.Exceptions.ValidationException;

namespace ProjectManagement.WebApi.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, response) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, new { error = exception.Message }),
            ValidationException validationEx => (HttpStatusCode.BadRequest, (object)new { errors = validationEx.Errors }),
            ForbiddenException => (HttpStatusCode.Forbidden, new { error = exception.Message }),
            _ => (HttpStatusCode.InternalServerError, new { error = "An unexpected error occurred." })
        };

        context.Response.StatusCode = (int)statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
    }
}
