using Microsoft.Extensions.Configuration;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Infrastructure.Services;

public class FileStorageService(IConfiguration configuration) : IFileStorageService
{
    private string UploadPath =>
        configuration["Uploads:Path"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");

    public async Task<string> SaveAsync(Stream stream, string extension, CancellationToken ct = default)
    {
        Directory.CreateDirectory(UploadPath);
        var storedName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(UploadPath, storedName);
        await using var dest = File.Create(fullPath);
        await stream.CopyToAsync(dest, ct);
        return storedName;
    }

    public void Delete(string storedFileName)
    {
        var fullPath = Path.Combine(UploadPath, storedFileName);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    public string GetFullPath(string storedFileName) =>
        Path.Combine(UploadPath, storedFileName);
}
