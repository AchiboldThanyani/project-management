using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Infrastructure.Services;

public class ClaudeCliService(ILogger<ClaudeCliService> logger) : IClaudeService
{
    public async Task<string> AskAsync(string prompt, CancellationToken ct = default)
    {
        // --print        : non-interactive (headless) mode — reads prompt from stdin
        // --output-format json : emits NDJSON instead of terminal-rendered text,
        //                        so we get a clean "result" field without any PTY chrome
        var isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        var psi = new ProcessStartInfo
        {
            FileName  = isWindows ? "cmd.exe" : "claude",
            Arguments = isWindows
                ? "/c claude --print --output-format json"
                : "--print --output-format json",
            RedirectStandardInput  = true,
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
            StandardInputEncoding  = Encoding.UTF8,
            StandardOutputEncoding = Encoding.UTF8,
        };

        // Merge user + machine PATH so the child process can find the npm global bin
        // (e.g. C:\Users\...\AppData\Roaming\npm) even when the backend is launched
        // from a host that only inherits the system PATH (VS Code, task runners, etc.).
        if (isWindows)
        {
            var machinePath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine) ?? "";
            var userPath    = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User)    ?? "";
            psi.Environment["PATH"] = $"{userPath};{machinePath}";
        }

        // If ANTHROPIC_API_KEY is set in the environment it takes priority over the stored
        // OAuth session for --print mode, causing "Credit balance is too low" when the key
        // has no credits. Remove it so Claude falls back to the OAuth subscription tokens.
        psi.Environment.Remove("ANTHROPIC_API_KEY");
        psi.Environment.Remove("CLAUDE_API_KEY");

        using var process = new Process { StartInfo = psi };
        var stdoutSb = new StringBuilder();
        var stderrSb = new StringBuilder();

        process.OutputDataReceived += (_, e) => { if (e.Data != null) stdoutSb.AppendLine(e.Data); };
        process.ErrorDataReceived  += (_, e) => { if (e.Data != null) stderrSb.AppendLine(e.Data); };

        try
        {
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            await process.StandardInput.WriteAsync(prompt);
            process.StandardInput.Close();

            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3));
            using var linked  = CancellationTokenSource.CreateLinkedTokenSource(ct, timeout.Token);
            await process.WaitForExitAsync(linked.Token);

            var stdout = stdoutSb.ToString();
            var stderr = stderrSb.ToString().Trim();

            if (process.ExitCode != 0 && string.IsNullOrWhiteSpace(stdout))
            {
                logger.LogError("Claude exited {Code}. Stderr: {Err}", process.ExitCode, stderr);
                return string.IsNullOrWhiteSpace(stderr)
                    ? "Claude returned no response."
                    : $"Claude error: {stderr}";
            }

            return ParseNdjson(stdout, stderr);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to invoke Claude CLI");
            return "Could not reach Claude. Ensure `claude auth login` has been run.";
        }
    }

    // Claude --output-format json emits one JSON object per line (NDJSON).
    // The "result" line at the end carries the final response text.
    private string ParseNdjson(string stdout, string stderr)
    {
        string? result = null;

        foreach (var line in stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            try
            {
                using var doc  = JsonDocument.Parse(line);
                var root = doc.RootElement;

                if (!root.TryGetProperty("type", out var typeProp)) continue;
                var type = typeProp.GetString();

                if (type == "result" && root.TryGetProperty("result", out var r))
                {
                    result = r.GetString();
                }
                else if (type == "assistant" &&
                         root.TryGetProperty("message", out var msg) &&
                         msg.TryGetProperty("content", out var content) &&
                         content.ValueKind == JsonValueKind.Array)
                {
                    foreach (var block in content.EnumerateArray())
                    {
                        if (block.TryGetProperty("type", out var bt) && bt.GetString() == "text" &&
                            block.TryGetProperty("text", out var txt))
                            result = txt.GetString();
                    }
                }
            }
            catch { /* skip non-JSON lines */ }
        }

        if (!string.IsNullOrWhiteSpace(result)) return result!;

        logger.LogWarning("Could not parse Claude NDJSON output. Stderr: {Err}", stderr);
        return string.IsNullOrWhiteSpace(stderr) ? "No response from Claude." : $"Claude error: {stderr}";
    }
}
