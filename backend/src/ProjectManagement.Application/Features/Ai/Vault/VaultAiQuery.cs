using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Ai.Vault;

public sealed record VaultAiQuery(
    string Mode,           // "spec" | "edit" | "command"
    string Instruction,
    string? Content = null,     // selected text (edit mode only)
    Guid?   ProjectId = null)
    : IQuery<string>;
