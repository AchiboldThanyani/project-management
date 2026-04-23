using System.Diagnostics;
using System.Text;
using Microsoft.Extensions.Logging;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Infrastructure.Services;

/// <summary>
/// Calls the locally-installed Claude Code CLI in print mode.
/// Requires `claude` to be on PATH and authenticated (claude auth login).
/// The full context + question is piped via stdin to avoid shell escaping limits.
/// </summary>
public class ClaudeCliService(ILogger<ClaudeCliService> logger) : IClaudeService
{
    public async Task<string> AskAsync(string prompt, CancellationToken ct = default)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "claude",
            // -p / --print: non-interactive mode, reads from stdin when no message arg given
            Arguments = "--print",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardInputEncoding = Encoding.UTF8,
            StandardOutputEncoding = Encoding.UTF8,
        };

        using var process = new Process { StartInfo = psi };

        var stdoutBuilder = new StringBuilder();
        var stderrBuilder = new StringBuilder();

        process.OutputDataReceived += (_, e) => { if (e.Data != null) stdoutBuilder.AppendLine(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data != null) stderrBuilder.AppendLine(e.Data); };

        try
        {
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            await process.StandardInput.WriteAsync(prompt);
            process.StandardInput.Close();

            await process.WaitForExitAsync(ct);

            var output = stdoutBuilder.ToString().Trim();

            if (process.ExitCode != 0 || string.IsNullOrWhiteSpace(output))
            {
                var err = stderrBuilder.ToString().Trim();
                logger.LogError("Claude CLI exited with code {Code}. Stderr: {Error}", process.ExitCode, err);
                return string.IsNullOrWhiteSpace(output)
                    ? $"I couldn't get a response from Claude. Make sure the `claude` CLI is installed and authenticated (`claude auth login`). Error: {err}"
                    : output;
            }

            return output;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to invoke Claude CLI");
            return "The Claude CLI is not available. Please install Claude Code and run `claude auth login`, then restart the API.";
        }
    }
}
