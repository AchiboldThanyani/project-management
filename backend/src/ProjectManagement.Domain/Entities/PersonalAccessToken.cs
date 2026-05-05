namespace ProjectManagement.Domain.Entities;

/// <summary>Long-lived API token used by MCP clients and CLI tools to authenticate without a JWT.</summary>
public class PersonalAccessToken
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string UserId { get; private set; } = string.Empty;
    public string Label { get; private set; } = string.Empty;
    /// <summary>SHA-256 hex hash of the raw token. Never stored in plain text.</summary>
    public string TokenHash { get; private set; } = string.Empty;
    /// <summary>First 12 chars of the raw token for display (e.g. "pmhub_AbCdEf").</summary>
    public string Prefix { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; private set; }

    private PersonalAccessToken() { }

    public static PersonalAccessToken Create(string userId, string label, string tokenHash, string prefix)
        => new() { UserId = userId, Label = label, TokenHash = tokenHash, Prefix = prefix };

    public void RecordUsage() => LastUsedAt = DateTime.UtcNow;
}
