namespace ProjectManagement.Application.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveAsync(Stream stream, string extension, CancellationToken ct = default);
    void Delete(string storedFileName);
    string GetFullPath(string storedFileName);
}
