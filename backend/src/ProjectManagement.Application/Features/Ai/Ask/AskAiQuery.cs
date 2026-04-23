using MediatR;
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Ai.Ask;

public sealed record AskAiQuery(string Question, Guid? ProjectId = null)
    : IRequest<Result<string>>;
