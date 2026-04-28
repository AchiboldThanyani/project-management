using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Features.Vault.Documents.CreateVaultDocument;
using ProjectManagement.Application.Features.Vault.Documents.DeleteVaultDocument;
using ProjectManagement.Application.Features.Vault.Documents.GetVaultDocumentById;
using ProjectManagement.Application.Features.Vault.Documents.GetVaultDocuments;
using ProjectManagement.Application.Features.Vault.Documents.MoveVaultDocument;
using ProjectManagement.Application.Features.Vault.Documents.UpdateVaultDocument;
using ProjectManagement.Application.Features.Vault.Files.DeleteVaultFile;
using ProjectManagement.Application.Features.Vault.Files.DownloadVaultFile;
using ProjectManagement.Application.Features.Vault.Files.GetVaultFiles;
using ProjectManagement.Application.Features.Vault.Files.MoveVaultFile;
using ProjectManagement.Application.Features.Vault.Files.UploadVaultFile;
using ProjectManagement.Application.Features.Vault.Folders.CreateVaultFolder;
using ProjectManagement.Application.Features.Vault.Folders.DeleteVaultFolder;
using ProjectManagement.Application.Features.Vault.Folders.GetVaultFolders;
using ProjectManagement.Application.Features.Vault.Folders.RenameVaultFolder;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/vault")]
[Authorize]
public class VaultController(IMediator mediator) : ControllerBase
{
    // ── Folders ──────────────────────────────────────────────────────────

    [HttpGet("folders")]
    public async Task<ActionResult<IReadOnlyList<VaultFolderDto>>> GetFolders(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetVaultFoldersQuery(projectId), ct)).ToActionResult(this);

    [HttpPost("folders")]
    public async Task<ActionResult<VaultFolderDto>> CreateFolder(
        Guid projectId, [FromBody] CreateVaultFolderRequest request, CancellationToken ct)
        => (await mediator.Send(new CreateVaultFolderCommand(request.Name, projectId), ct)).ToActionResult(this);

    [HttpPut("folders/{folderId:guid}")]
    public async Task<ActionResult<VaultFolderDto>> RenameFolder(
        Guid projectId, Guid folderId, [FromBody] RenameFolderRequest request, CancellationToken ct)
        => (await mediator.Send(new RenameVaultFolderCommand(folderId, projectId, request.Name), ct)).ToActionResult(this);

    [HttpDelete("folders/{folderId:guid}")]
    public async Task<ActionResult<int>> DeleteFolder(Guid projectId, Guid folderId, CancellationToken ct)
        => (await mediator.Send(new DeleteVaultFolderCommand(folderId, projectId), ct)).ToActionResult(this);

    // ── Documents ────────────────────────────────────────────────────────

    [HttpGet("documents")]
    public async Task<ActionResult<IReadOnlyList<VaultDocumentDto>>> GetDocuments(
        Guid projectId, [FromQuery] Guid? folderId, CancellationToken ct)
        => (await mediator.Send(new GetVaultDocumentsQuery(projectId, folderId), ct)).ToActionResult(this);

    [HttpGet("documents/{documentId:guid}")]
    public async Task<ActionResult<VaultDocumentDetailDto>> GetDocument(
        Guid projectId, Guid documentId, CancellationToken ct)
        => (await mediator.Send(new GetVaultDocumentByIdQuery(documentId, projectId), ct)).ToActionResult(this);

    [HttpPost("documents")]
    public async Task<ActionResult<VaultDocumentDto>> CreateDocument(
        Guid projectId, [FromBody] CreateVaultDocumentRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateVaultDocumentCommand(request.Title, projectId, request.FolderId), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetDocument), new { projectId, documentId = result.Value!.Id }, result.Value);
    }

    [HttpPut("documents/{documentId:guid}")]
    public async Task<ActionResult<VaultDocumentDetailDto>> UpdateDocument(
        Guid projectId, Guid documentId, [FromBody] UpdateVaultDocumentRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateVaultDocumentCommand(documentId, projectId, request.Title, request.ContentJson), ct)).ToActionResult(this);

    [HttpDelete("documents/{documentId:guid}")]
    public async Task<IActionResult> DeleteDocument(Guid projectId, Guid documentId, CancellationToken ct)
        => (await mediator.Send(new DeleteVaultDocumentCommand(documentId, projectId), ct)).ToActionResult(this);

    [HttpPatch("documents/{documentId:guid}/move")]
    public async Task<ActionResult<VaultDocumentDto>> MoveDocument(
        Guid projectId, Guid documentId, [FromBody] MoveItemRequest request, CancellationToken ct)
        => (await mediator.Send(new MoveVaultDocumentCommand(documentId, projectId, request.FolderId), ct)).ToActionResult(this);

    // ── Files ────────────────────────────────────────────────────────────

    [HttpGet("files")]
    public async Task<ActionResult<IReadOnlyList<VaultFileDto>>> GetFiles(
        Guid projectId, [FromQuery] Guid? folderId, CancellationToken ct)
        => (await mediator.Send(new GetVaultFilesQuery(projectId, folderId), ct)).ToActionResult(this);

    [HttpPost("files")]
    public async Task<ActionResult<VaultFileDto>> UploadFile(
        Guid projectId, IFormFile file, [FromForm] Guid? folderId, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest("No file provided.");
        using var stream = file.OpenReadStream();
        var result = await mediator.Send(
            new UploadVaultFileCommand(projectId, folderId, file.FileName, file.ContentType, file.Length, stream), ct);
        return result.ToActionResult(this);
    }

    [HttpGet("files/{fileId:guid}/download")]
    public async Task<IActionResult> DownloadFile(Guid projectId, Guid fileId, CancellationToken ct)
    {
        var result = await mediator.Send(new DownloadVaultFileQuery(fileId, projectId), ct);
        if (!result.IsSuccess) return ErrorToActionResult(result.Error!);
        var download = result.Value!;
        return PhysicalFile(download.FullPath, download.ContentType, download.FileName);
    }

    private IActionResult ErrorToActionResult(Error error) => error.Type switch
    {
        ErrorType.NotFound     => NotFound(new { error.Code, error.Description }),
        ErrorType.Validation   => BadRequest(new { error.Code, error.Description }),
        ErrorType.Conflict     => Conflict(new { error.Code, error.Description }),
        ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
        ErrorType.Forbidden    => StatusCode(403, new { error.Code, error.Description }),
        _                      => StatusCode(500, new { error.Code, error.Description }),
    };

    [HttpDelete("files/{fileId:guid}")]
    public async Task<IActionResult> DeleteFile(Guid projectId, Guid fileId, CancellationToken ct)
        => (await mediator.Send(new DeleteVaultFileCommand(fileId, projectId), ct)).ToActionResult(this);

    [HttpPatch("files/{fileId:guid}/move")]
    public async Task<ActionResult<VaultFileDto>> MoveFile(
        Guid projectId, Guid fileId, [FromBody] MoveItemRequest request, CancellationToken ct)
        => (await mediator.Send(new MoveVaultFileCommand(fileId, projectId, request.FolderId), ct)).ToActionResult(this);
}

// Request records
public sealed record CreateVaultFolderRequest(string Name);
public sealed record RenameFolderRequest(string Name);
public sealed record CreateVaultDocumentRequest(string Title, Guid? FolderId);
public sealed record UpdateVaultDocumentRequest(string Title, string ContentJson);
public sealed record MoveItemRequest(Guid? FolderId);
