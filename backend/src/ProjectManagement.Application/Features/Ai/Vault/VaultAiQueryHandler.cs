using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.Ai.Vault;

internal sealed class VaultAiQueryHandler(
    IClaudeService claude,
    IProjectRepository projects)
    : IRequestHandler<VaultAiQuery, Result<string>>
{
    private const string HtmlRules = """
        OUTPUT FORMAT — follow exactly:
        - Return clean HTML only, no markdown, no backticks, no code fences
        - Allowed tags: h1 h2 h3 p ul ol li strong em code pre blockquote hr
        - No DOCTYPE, html, head, body, script, or style tags
        - No preamble, explanation, or text outside the HTML
        - Start immediately with the first HTML tag
        """;

    public async Task<Result<string>> Handle(VaultAiQuery req, CancellationToken ct)
    {
        var result = req.Mode switch
        {
            "spec"    => await SpecAsync(req, ct),
            "edit"    => await EditAsync(req, ct),
            _         => await CommandAsync(req, ct),
        };
        return Result<string>.Success(result);
    }

    private async Task<string> SpecAsync(VaultAiQuery req, CancellationToken ct)
    {
        var projectLine = await GetProjectLineAsync(req.ProjectId, ct);

        var prompt = $"""
            You are a technical specification writer.
            Generate a comprehensive, well-structured specification document for the following brief:

            "{req.Instruction}"
            {projectLine}
            {HtmlRules}

            Structure the document with an <h1> title, then relevant sections (e.g. Overview,
            Goals & Requirements, Technical Design, API / Data Model, Acceptance Criteria,
            Out of Scope). Adjust sections to what makes sense for the brief.
            Be specific, technical, and actionable.
            """;

        return await claude.AskAsync(prompt, ct);
    }

    private async Task<string> EditAsync(VaultAiQuery req, CancellationToken ct)
    {
        var prompt = $"""
            {req.Instruction} the following text.
            Return ONLY the rewritten text — no explanation, no preamble, no surrounding quotes.
            Preserve formatting intent (bold, italics, etc.) using the same HTML tags that were present.

            Text:
            {req.Content ?? string.Empty}
            """;

        return await claude.AskAsync(prompt, ct);
    }

    private async Task<string> CommandAsync(VaultAiQuery req, CancellationToken ct)
    {
        var projectLine = await GetProjectLineAsync(req.ProjectId, ct);

        var prompt = $"""
            You are an AI writing assistant embedded in a document editor.
            Carry out the following instruction:

            "{req.Instruction}"
            {projectLine}
            {HtmlRules}
            """;

        return await claude.AskAsync(prompt, ct);
    }

    private async Task<string> GetProjectLineAsync(Guid? projectId, CancellationToken ct)
    {
        if (!projectId.HasValue) return string.Empty;
        var project = await projects.GetByIdAsync(projectId.Value, ct);
        return project is null
            ? string.Empty
            : $"\nProject context: \"{project.Name}\"" +
              (string.IsNullOrWhiteSpace(project.Description) ? "" : $" — {project.Description}") +
              "\n";
    }
}
