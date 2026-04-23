namespace ProjectManagement.Application.Interfaces;

public interface IClaudeService
{
    Task<string> AskAsync(string prompt, CancellationToken ct = default);
}
