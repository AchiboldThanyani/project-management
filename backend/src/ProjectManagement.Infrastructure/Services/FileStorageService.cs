using Microsoft.Extensions.Configuration;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Infrastructure.Services;

public class FileStorageService(IConfiguration configuration) : IFileStorageService
{
    private const long MaxFileSizeBytes = 20 * 1024 * 1024;

    private string UploadPath =>
        configuration["Uploads:Path"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");

    public async Task<string> SaveAsync(Stream stream, string extension, CancellationToken ct = default)
    {
        Directory.CreateDirectory(UploadPath);
        var storedName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(UploadPath, storedName);
        await using var dest = File.Create(fullPath);
        var buffer = new byte[81920];
        long totalRead = 0;
        int read;
        while ((read = await stream.ReadAsync(buffer, ct)) > 0)
        {
            totalRead += read;
            if (totalRead > MaxFileSizeBytes)
            {
                await dest.DisposeAsync();
                File.Delete(fullPath);
                throw new InvalidOperationException("File exceeds maximum allowed size.");
            }
            await dest.WriteAsync(buffer.AsMemory(0, read), ct);
        }
        return storedName;
    }

    public void Delete(string storedFileName)
    {
        EnsureContained(storedFileName);
        var fullPath = Path.Combine(UploadPath, storedFileName);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    public string GetFullPath(string storedFileName)
    {
        EnsureContained(storedFileName);
        return Path.Combine(UploadPath, storedFileName);
    }

    private void EnsureContained(string storedFileName)
    {
        var basePath = Path.GetFullPath(UploadPath) + Path.DirectorySeparatorChar;
        var fullPath = Path.GetFullPath(Path.Combine(UploadPath, storedFileName));
        if (!fullPath.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid stored file name.");
    }
}
