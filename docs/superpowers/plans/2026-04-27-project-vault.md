# Project Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-project Vault tab with rich text documents (TipTap editor) and file uploads, organized into folders, with role-based access control.

**Architecture:** Three new domain entities (VaultFolder, VaultDocument, VaultFile) backed by a clean-arch CQRS pipeline, a VaultController at `api/projects/{projectId}/vault/`, two new Nx frontend libraries (vault/data-access, vault/feature), and a VaultTabComponent wired into the existing ProjectDetailComponent as a new tab.

**Tech Stack:** .NET 9, EF Core / PostgreSQL, AutoMapper, MediatR, Angular 20 standalone components, Angular signals, TipTap (vanilla JS), existing IFileStorageService for file uploads.

---

## File Structure

### Backend — Create
- `backend/src/ProjectManagement.Domain/Entities/VaultFolder.cs`
- `backend/src/ProjectManagement.Domain/Entities/VaultDocument.cs`
- `backend/src/ProjectManagement.Domain/Entities/VaultFile.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IVaultFolderRepository.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IVaultDocumentRepository.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IVaultFileRepository.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultFolderDto.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultDocumentDto.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultDocumentDetailDto.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultFileDto.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/VaultMappingProfile.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/CreateVaultFolder/CreateVaultFolderCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/CreateVaultFolder/CreateVaultFolderCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/RenameVaultFolder/RenameVaultFolderCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/RenameVaultFolder/RenameVaultFolderCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/DeleteVaultFolder/DeleteVaultFolderCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/DeleteVaultFolder/DeleteVaultFolderCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/GetVaultFolders/GetVaultFoldersQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Folders/GetVaultFolders/GetVaultFoldersQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/CreateVaultDocument/CreateVaultDocumentCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/CreateVaultDocument/CreateVaultDocumentCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/UpdateVaultDocument/UpdateVaultDocumentCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/UpdateVaultDocument/UpdateVaultDocumentCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/DeleteVaultDocument/DeleteVaultDocumentCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/DeleteVaultDocument/DeleteVaultDocumentCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/MoveVaultDocument/MoveVaultDocumentCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/MoveVaultDocument/MoveVaultDocumentCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/GetVaultDocuments/GetVaultDocumentsQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/GetVaultDocuments/GetVaultDocumentsQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/GetVaultDocumentById/GetVaultDocumentByIdQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Documents/GetVaultDocumentById/GetVaultDocumentByIdQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/UploadVaultFile/UploadVaultFileCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/UploadVaultFile/UploadVaultFileCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/DeleteVaultFile/DeleteVaultFileCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/DeleteVaultFile/DeleteVaultFileCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/MoveVaultFile/MoveVaultFileCommand.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/MoveVaultFile/MoveVaultFileCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/GetVaultFiles/GetVaultFilesQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/GetVaultFiles/GetVaultFilesQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/DownloadVaultFile/DownloadVaultFileQuery.cs`
- `backend/src/ProjectManagement.Application/Features/Vault/Files/DownloadVaultFile/DownloadVaultFileQueryHandler.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/VaultFolderRepository.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/VaultDocumentRepository.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/VaultFileRepository.cs`
- `backend/src/ProjectManagement.WebApi/Controllers/VaultController.cs`

### Backend — Modify
- `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs` — add 3 DbSets
- `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs` (or equivalent) — register 3 repositories

### Frontend — Create
- `frontend/libs/shared/models/src/lib/vault.model.ts`
- `frontend/libs/vault/data-access/project.json`
- `frontend/libs/vault/data-access/src/index.ts`
- `frontend/libs/vault/data-access/src/lib/vault.service.ts`
- `frontend/libs/vault/feature/project.json`
- `frontend/libs/vault/feature/src/index.ts`
- `frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts`
- `frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts`

### Frontend — Modify
- `frontend/libs/shared/models/src/index.ts` — add vault.model export
- `frontend/tsconfig.base.json` — add `@pm/vault/data-access` and `@pm/vault/feature` path aliases
- `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts` — add vault tab

---

## Task 1: Domain Entities

**Files:**
- Create: `backend/src/ProjectManagement.Domain/Entities/VaultFolder.cs`
- Create: `backend/src/ProjectManagement.Domain/Entities/VaultDocument.cs`
- Create: `backend/src/ProjectManagement.Domain/Entities/VaultFile.cs`

- [ ] **Step 1: Create VaultFolder.cs**

```csharp
// backend/src/ProjectManagement.Domain/Entities/VaultFolder.cs
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class VaultFolder : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public string Name { get; private set; } = string.Empty;
    public string CreatedById { get; private set; } = string.Empty;

    private VaultFolder() { }

    public static VaultFolder Create(string name, Guid projectId, string createdById) =>
        new() { Name = name, ProjectId = projectId, CreatedById = createdById };

    public void Rename(string name) { Name = name; SetUpdated(); }
}
```

- [ ] **Step 2: Create VaultDocument.cs**

```csharp
// backend/src/ProjectManagement.Domain/Entities/VaultDocument.cs
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class VaultDocument : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public Guid? FolderId { get; private set; }
    public VaultFolder? Folder { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string ContentJson { get; private set; } = string.Empty;
    public string CreatedById { get; private set; } = string.Empty;
    public string CreatedByName { get; private set; } = string.Empty;
    public string? UpdatedById { get; private set; }
    public string? UpdatedByName { get; private set; }

    private VaultDocument() { }

    public static VaultDocument Create(
        string title, Guid projectId, Guid? folderId,
        string createdById, string createdByName) =>
        new()
        {
            Title = title, ProjectId = projectId, FolderId = folderId,
            ContentJson = string.Empty,
            CreatedById = createdById, CreatedByName = createdByName
        };

    public void Update(string title, string contentJson, string updatedById, string updatedByName)
    {
        Title = title; ContentJson = contentJson;
        UpdatedById = updatedById; UpdatedByName = updatedByName;
        SetUpdated();
    }

    public void Move(Guid? folderId) { FolderId = folderId; SetUpdated(); }
}
```

- [ ] **Step 3: Create VaultFile.cs**

```csharp
// backend/src/ProjectManagement.Domain/Entities/VaultFile.cs
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class VaultFile : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public Guid? FolderId { get; private set; }
    public VaultFolder? Folder { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string StoredFileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string UploadedById { get; private set; } = string.Empty;
    public string UploadedByName { get; private set; } = string.Empty;

    private VaultFile() { }

    public static VaultFile Create(
        Guid projectId, Guid? folderId,
        string fileName, string storedFileName,
        string contentType, long sizeBytes,
        string uploadedById, string uploadedByName) =>
        new()
        {
            ProjectId = projectId, FolderId = folderId,
            FileName = fileName, StoredFileName = storedFileName,
            ContentType = contentType, SizeBytes = sizeBytes,
            UploadedById = uploadedById, UploadedByName = uploadedByName
        };

    public void Move(Guid? folderId) { FolderId = folderId; SetUpdated(); }
}
```

- [ ] **Step 4: Build the domain project to verify no compile errors**

```bash
cd backend
dotnet build src/ProjectManagement.Domain/ProjectManagement.Domain.csproj
```
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Entities/VaultFolder.cs \
        backend/src/ProjectManagement.Domain/Entities/VaultDocument.cs \
        backend/src/ProjectManagement.Domain/Entities/VaultFile.cs
git commit -m "feat: add VaultFolder, VaultDocument, VaultFile domain entities"
```

---

## Task 2: Repository Interfaces

**Files:**
- Create: `backend/src/ProjectManagement.Application/Interfaces/IVaultFolderRepository.cs`
- Create: `backend/src/ProjectManagement.Application/Interfaces/IVaultDocumentRepository.cs`
- Create: `backend/src/ProjectManagement.Application/Interfaces/IVaultFileRepository.cs`

- [ ] **Step 1: Create IVaultFolderRepository.cs**

```csharp
// backend/src/ProjectManagement.Application/Interfaces/IVaultFolderRepository.cs
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IVaultFolderRepository : IRepository<VaultFolder>
{
    Task<IReadOnlyList<VaultFolder>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
}
```

- [ ] **Step 2: Create IVaultDocumentRepository.cs**

```csharp
// backend/src/ProjectManagement.Application/Interfaces/IVaultDocumentRepository.cs
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IVaultDocumentRepository : IRepository<VaultDocument>
{
    Task<IReadOnlyList<VaultDocument>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<VaultDocument>> GetByFolderAsync(Guid folderId, CancellationToken ct = default);
}
```

- [ ] **Step 3: Create IVaultFileRepository.cs**

```csharp
// backend/src/ProjectManagement.Application/Interfaces/IVaultFileRepository.cs
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IVaultFileRepository : IRepository<VaultFile>
{
    Task<IReadOnlyList<VaultFile>> GetByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<IReadOnlyList<VaultFile>> GetByFolderAsync(Guid folderId, CancellationToken ct = default);
}
```

- [ ] **Step 4: Build Application project to verify**

```bash
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Interfaces/IVaultFolderRepository.cs \
        backend/src/ProjectManagement.Application/Interfaces/IVaultDocumentRepository.cs \
        backend/src/ProjectManagement.Application/Interfaces/IVaultFileRepository.cs
git commit -m "feat: add vault repository interfaces"
```

---

## Task 3: Repository Implementations, DbContext, DI Registration

**Files:**
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/VaultFolderRepository.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/VaultDocumentRepository.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/VaultFileRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs`
- Modify: Infrastructure DI registration file (search for `AddScoped<IBoardRepository`)

- [ ] **Step 1: Create VaultFolderRepository.cs**

```csharp
// backend/src/ProjectManagement.Infrastructure/Repositories/VaultFolderRepository.cs
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class VaultFolderRepository(ApplicationDbContext context)
    : Repository<VaultFolder>(context), IVaultFolderRepository
{
    public async Task<IReadOnlyList<VaultFolder>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.VaultFolders
            .Where(f => f.ProjectId == projectId)
            .OrderBy(f => f.Name)
            .ToListAsync(ct);
}
```

- [ ] **Step 2: Create VaultDocumentRepository.cs**

```csharp
// backend/src/ProjectManagement.Infrastructure/Repositories/VaultDocumentRepository.cs
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class VaultDocumentRepository(ApplicationDbContext context)
    : Repository<VaultDocument>(context), IVaultDocumentRepository
{
    public async Task<IReadOnlyList<VaultDocument>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.VaultDocuments
            .Where(d => d.ProjectId == projectId)
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<VaultDocument>> GetByFolderAsync(Guid folderId, CancellationToken ct = default)
        => await context.VaultDocuments
            .Where(d => d.FolderId == folderId)
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .ToListAsync(ct);
}
```

- [ ] **Step 3: Create VaultFileRepository.cs**

```csharp
// backend/src/ProjectManagement.Infrastructure/Repositories/VaultFileRepository.cs
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class VaultFileRepository(ApplicationDbContext context)
    : Repository<VaultFile>(context), IVaultFileRepository
{
    public async Task<IReadOnlyList<VaultFile>> GetByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.VaultFiles
            .Where(f => f.ProjectId == projectId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<VaultFile>> GetByFolderAsync(Guid folderId, CancellationToken ct = default)
        => await context.VaultFiles
            .Where(f => f.FolderId == folderId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);
}
```

- [ ] **Step 4: Add DbSets to ApplicationDbContext.cs**

Open `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs`.
Find the line `public DbSet<ProjectBoard> ProjectBoards => Set<ProjectBoard>();` and add these three lines immediately after:

```csharp
    public DbSet<VaultFolder> VaultFolders => Set<VaultFolder>();
    public DbSet<VaultDocument> VaultDocuments => Set<VaultDocument>();
    public DbSet<VaultFile> VaultFiles => Set<VaultFile>();
```

- [ ] **Step 5: Register repositories in DI**

Run this command to find where IBoardRepository is registered:
```bash
grep -rn "IBoardRepository" backend/src/ProjectManagement.Infrastructure/
```

Open that file (likely `DependencyInjection.cs` or `ServiceExtensions.cs`). Find the line registering `IBoardRepository` and add these three lines immediately after:

```csharp
services.AddScoped<IVaultFolderRepository, VaultFolderRepository>();
services.AddScoped<IVaultDocumentRepository, VaultDocumentRepository>();
services.AddScoped<IVaultFileRepository, VaultFileRepository>();
```

- [ ] **Step 6: Build Infrastructure to verify**

```bash
dotnet build src/ProjectManagement.Infrastructure/ProjectManagement.Infrastructure.csproj
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Infrastructure/Repositories/VaultFolderRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/VaultDocumentRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/VaultFileRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs
git commit -m "feat: add vault repository implementations and DbContext DbSets"
```

---

## Task 4: DTOs and AutoMapper Profile

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultFolderDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultDocumentDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultDocumentDetailDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultFileDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/Vault/VaultMappingProfile.cs`

- [ ] **Step 1: Create VaultFolderDto.cs**

```csharp
// backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultFolderDto.cs
namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultFolderDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public string Name { get; init; } = default!;
    public string CreatedById { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
```

- [ ] **Step 2: Create VaultDocumentDto.cs**

```csharp
// backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultDocumentDto.cs
namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultDocumentDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public Guid? FolderId { get; init; }
    public string Title { get; init; } = default!;
    public string CreatedById { get; init; } = default!;
    public string CreatedByName { get; init; } = default!;
    public string? UpdatedById { get; init; }
    public string? UpdatedByName { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
```

- [ ] **Step 3: Create VaultDocumentDetailDto.cs**

```csharp
// backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultDocumentDetailDto.cs
namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultDocumentDetailDto : VaultDocumentDto
{
    public string ContentJson { get; init; } = default!;
}
```

- [ ] **Step 4: Create VaultFileDto.cs**

```csharp
// backend/src/ProjectManagement.Application/Features/Vault/DTOs/VaultFileDto.cs
namespace ProjectManagement.Application.Features.Vault.DTOs;

public record VaultFileDto
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public Guid? FolderId { get; init; }
    public string FileName { get; init; } = default!;
    public string ContentType { get; init; } = default!;
    public long SizeBytes { get; init; }
    public string UploadedById { get; init; } = default!;
    public string UploadedByName { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
```

- [ ] **Step 5: Create VaultMappingProfile.cs**

```csharp
// backend/src/ProjectManagement.Application/Features/Vault/VaultMappingProfile.cs
using AutoMapper;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Features.Vault;

public class VaultMappingProfile : Profile
{
    public VaultMappingProfile()
    {
        CreateMap<VaultFolder, VaultFolderDto>();
        CreateMap<VaultDocument, VaultDocumentDto>();
        CreateMap<VaultDocument, VaultDocumentDetailDto>();
        CreateMap<VaultFile, VaultFileDto>();
    }
}
```

- [ ] **Step 6: Build Application to verify**

```bash
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Vault/
git commit -m "feat: add vault DTOs and AutoMapper profile"
```

---

## Task 5: Vault Folder CQRS Handlers

**Files:** All under `backend/src/ProjectManagement.Application/Features/Vault/Folders/`

- [ ] **Step 1: Create GetVaultFoldersQuery.cs**

```csharp
// Features/Vault/Folders/GetVaultFolders/GetVaultFoldersQuery.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Folders.GetVaultFolders;

public sealed record GetVaultFoldersQuery(Guid ProjectId) : IQuery<IReadOnlyList<VaultFolderDto>>;
```

- [ ] **Step 2: Create GetVaultFoldersQueryHandler.cs**

```csharp
// Features/Vault/Folders/GetVaultFolders/GetVaultFoldersQueryHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Folders.GetVaultFolders;

internal sealed class GetVaultFoldersQueryHandler(
    IVaultFolderRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultFoldersQuery, Result<IReadOnlyList<VaultFolderDto>>>
{
    public async Task<Result<IReadOnlyList<VaultFolderDto>>> Handle(GetVaultFoldersQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var folders = await repository.GetByProjectAsync(request.ProjectId, ct);
        return Result<IReadOnlyList<VaultFolderDto>>.Success(mapper.Map<IReadOnlyList<VaultFolderDto>>(folders));
    }
}
```

- [ ] **Step 3: Create CreateVaultFolderCommand.cs**

```csharp
// Features/Vault/Folders/CreateVaultFolder/CreateVaultFolderCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Folders.CreateVaultFolder;

public sealed record CreateVaultFolderCommand(string Name, Guid ProjectId) : ICommand<VaultFolderDto>;
```

- [ ] **Step 4: Create CreateVaultFolderCommandHandler.cs**

```csharp
// Features/Vault/Folders/CreateVaultFolder/CreateVaultFolderCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Folders.CreateVaultFolder;

internal sealed class CreateVaultFolderCommandHandler(
    IVaultFolderRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateVaultFolderCommand, Result<VaultFolderDto>>
{
    public async Task<Result<VaultFolderDto>> Handle(CreateVaultFolderCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Vault.Forbidden", "Only Managers and above can create folders.");

        var folder = VaultFolder.Create(request.Name, request.ProjectId, currentUser.UserId);
        await repository.AddAsync(folder, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFolderDto>(folder);
    }
}
```

- [ ] **Step 5: Create RenameVaultFolderCommand.cs**

```csharp
// Features/Vault/Folders/RenameVaultFolder/RenameVaultFolderCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Folders.RenameVaultFolder;

public sealed record RenameVaultFolderCommand(Guid FolderId, Guid ProjectId, string Name) : ICommand<VaultFolderDto>;
```

- [ ] **Step 6: Create RenameVaultFolderCommandHandler.cs**

```csharp
// Features/Vault/Folders/RenameVaultFolder/RenameVaultFolderCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Folders.RenameVaultFolder;

internal sealed class RenameVaultFolderCommandHandler(
    IVaultFolderRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<RenameVaultFolderCommand, Result<VaultFolderDto>>
{
    public async Task<Result<VaultFolderDto>> Handle(RenameVaultFolderCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Vault.Forbidden", "Only Managers and above can rename folders.");

        var folder = await repository.GetByIdAsync(request.FolderId, ct);
        if (folder is null) return Error.NotFound("Vault.FolderNotFound", "Folder not found.");

        folder.Rename(request.Name);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFolderDto>(folder);
    }
}
```

- [ ] **Step 7: Create DeleteVaultFolderCommand.cs**

```csharp
// Features/Vault/Folders/DeleteVaultFolder/DeleteVaultFolderCommand.cs
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Folders.DeleteVaultFolder;

public sealed record DeleteVaultFolderCommand(Guid FolderId, Guid ProjectId) : ICommand<int>;
```

- [ ] **Step 8: Create DeleteVaultFolderCommandHandler.cs**

The delete moves all folder contents to root (FolderId = null) before removing the folder.

```csharp
// Features/Vault/Folders/DeleteVaultFolder/DeleteVaultFolderCommandHandler.cs
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Folders.DeleteVaultFolder;

internal sealed class DeleteVaultFolderCommandHandler(
    IVaultFolderRepository folders,
    IVaultDocumentRepository documents,
    IVaultFileRepository files,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteVaultFolderCommand, Result<int>>
{
    public async Task<Result<int>> Handle(DeleteVaultFolderCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct))
            return Error.Forbidden("Vault.Forbidden", "Only Managers and above can delete folders.");

        var folder = await folders.GetByIdAsync(request.FolderId, ct);
        if (folder is null) return Error.NotFound("Vault.FolderNotFound", "Folder not found.");

        // Move contents to root
        var folderDocs = await documents.GetByFolderAsync(request.FolderId, ct);
        var folderFiles = await files.GetByFolderAsync(request.FolderId, ct);
        int movedCount = folderDocs.Count + folderFiles.Count;

        foreach (var doc in folderDocs) doc.Move(null);
        foreach (var file in folderFiles) file.Move(null);

        folders.Remove(folder);
        await unitOfWork.SaveChangesAsync(ct);
        return movedCount;
    }
}
```

- [ ] **Step 9: Build to verify**

```bash
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 10: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Vault/Folders/
git commit -m "feat: add vault folder CQRS handlers (get, create, rename, delete)"
```

---

## Task 6: Vault Document CQRS Handlers

**Files:** All under `backend/src/ProjectManagement.Application/Features/Vault/Documents/`

- [ ] **Step 1: Create GetVaultDocumentsQuery.cs and handler**

```csharp
// Documents/GetVaultDocuments/GetVaultDocumentsQuery.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocuments;

public sealed record GetVaultDocumentsQuery(Guid ProjectId, Guid? FolderId) : IQuery<IReadOnlyList<VaultDocumentDto>>;
```

```csharp
// Documents/GetVaultDocuments/GetVaultDocumentsQueryHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocuments;

internal sealed class GetVaultDocumentsQueryHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultDocumentsQuery, Result<IReadOnlyList<VaultDocumentDto>>>
{
    public async Task<Result<IReadOnlyList<VaultDocumentDto>>> Handle(GetVaultDocumentsQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var docs = request.FolderId.HasValue
            ? await repository.GetByFolderAsync(request.FolderId.Value, ct)
            : await repository.GetByProjectAsync(request.ProjectId, ct);

        return Result<IReadOnlyList<VaultDocumentDto>>.Success(mapper.Map<IReadOnlyList<VaultDocumentDto>>(docs));
    }
}
```

- [ ] **Step 2: Create GetVaultDocumentByIdQuery.cs and handler**

```csharp
// Documents/GetVaultDocumentById/GetVaultDocumentByIdQuery.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocumentById;

public sealed record GetVaultDocumentByIdQuery(Guid DocumentId, Guid ProjectId) : IQuery<VaultDocumentDetailDto>;
```

```csharp
// Documents/GetVaultDocumentById/GetVaultDocumentByIdQueryHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Documents.GetVaultDocumentById;

internal sealed class GetVaultDocumentByIdQueryHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultDocumentByIdQuery, Result<VaultDocumentDetailDto>>
{
    public async Task<Result<VaultDocumentDetailDto>> Handle(GetVaultDocumentByIdQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        return mapper.Map<VaultDocumentDetailDto>(doc);
    }
}
```

- [ ] **Step 3: Create CreateVaultDocumentCommand.cs and handler**

```csharp
// Documents/CreateVaultDocument/CreateVaultDocumentCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.CreateVaultDocument;

public sealed record CreateVaultDocumentCommand(string Title, Guid ProjectId, Guid? FolderId) : ICommand<VaultDocumentDto>;
```

```csharp
// Documents/CreateVaultDocument/CreateVaultDocumentCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.CreateVaultDocument;

internal sealed class CreateVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateVaultDocumentCommand, Result<VaultDocumentDto>>
{
    public async Task<Result<VaultDocumentDto>> Handle(CreateVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "Developers and above can create documents.");

        var doc = VaultDocument.Create(
            request.Title, request.ProjectId, request.FolderId,
            currentUser.UserId, currentUser.FullName);
        await repository.AddAsync(doc, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDto>(doc);
    }
}
```

- [ ] **Step 4: Create UpdateVaultDocumentCommand.cs and handler**

```csharp
// Documents/UpdateVaultDocument/UpdateVaultDocumentCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.UpdateVaultDocument;

public sealed record UpdateVaultDocumentCommand(
    Guid DocumentId, Guid ProjectId,
    string Title, string ContentJson) : ICommand<VaultDocumentDetailDto>;
```

```csharp
// Documents/UpdateVaultDocument/UpdateVaultDocumentCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.UpdateVaultDocument;

internal sealed class UpdateVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateVaultDocumentCommand, Result<VaultDocumentDetailDto>>
{
    public async Task<Result<VaultDocumentDetailDto>> Handle(UpdateVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "Developers and above can edit documents.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        doc.Update(request.Title, request.ContentJson, currentUser.UserId, currentUser.FullName);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDetailDto>(doc);
    }
}
```

- [ ] **Step 5: Create DeleteVaultDocumentCommand.cs and handler**

```csharp
// Documents/DeleteVaultDocument/DeleteVaultDocumentCommand.cs
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Documents.DeleteVaultDocument;

public sealed record DeleteVaultDocumentCommand(Guid DocumentId, Guid ProjectId) : ICommand;
```

```csharp
// Documents/DeleteVaultDocument/DeleteVaultDocumentCommandHandler.cs
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.DeleteVaultDocument;

internal sealed class DeleteVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteVaultDocumentCommand, Result>
{
    public async Task<Result> Handle(DeleteVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        var isManager = await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct);
        if (!isManager && doc.CreatedById != currentUser.UserId)
            return Error.Forbidden("Vault.Forbidden", "You can only delete your own documents.");

        repository.Remove(doc);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
```

- [ ] **Step 6: Create MoveVaultDocumentCommand.cs and handler**

```csharp
// Documents/MoveVaultDocument/MoveVaultDocumentCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Documents.MoveVaultDocument;

public sealed record MoveVaultDocumentCommand(Guid DocumentId, Guid ProjectId, Guid? FolderId) : ICommand<VaultDocumentDto>;
```

```csharp
// Documents/MoveVaultDocument/MoveVaultDocumentCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Documents.MoveVaultDocument;

internal sealed class MoveVaultDocumentCommandHandler(
    IVaultDocumentRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<MoveVaultDocumentCommand, Result<VaultDocumentDto>>
{
    public async Task<Result<VaultDocumentDto>> Handle(MoveVaultDocumentCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "Developers and above can move documents.");

        var doc = await repository.GetByIdAsync(request.DocumentId, ct);
        if (doc is null) return Error.NotFound("Vault.DocumentNotFound", "Document not found.");

        doc.Move(request.FolderId);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultDocumentDto>(doc);
    }
}
```

- [ ] **Step 7: Build to verify**

```bash
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 8: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Vault/Documents/
git commit -m "feat: add vault document CQRS handlers"
```

---

## Task 7: Vault File CQRS Handlers

**Files:** All under `backend/src/ProjectManagement.Application/Features/Vault/Files/`

- [ ] **Step 1: Create GetVaultFilesQuery.cs and handler**

```csharp
// Files/GetVaultFiles/GetVaultFilesQuery.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Files.GetVaultFiles;

public sealed record GetVaultFilesQuery(Guid ProjectId, Guid? FolderId) : IQuery<IReadOnlyList<VaultFileDto>>;
```

```csharp
// Files/GetVaultFiles/GetVaultFilesQueryHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Files.GetVaultFiles;

internal sealed class GetVaultFilesQueryHandler(
    IVaultFileRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IMapper mapper)
    : IRequestHandler<GetVaultFilesQuery, Result<IReadOnlyList<VaultFileDto>>>
{
    public async Task<Result<IReadOnlyList<VaultFileDto>>> Handle(GetVaultFilesQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var vaultFiles = request.FolderId.HasValue
            ? await repository.GetByFolderAsync(request.FolderId.Value, ct)
            : await repository.GetByProjectAsync(request.ProjectId, ct);

        return Result<IReadOnlyList<VaultFileDto>>.Success(mapper.Map<IReadOnlyList<VaultFileDto>>(vaultFiles));
    }
}
```

- [ ] **Step 2: Create UploadVaultFileCommand.cs and handler**

```csharp
// Files/UploadVaultFile/UploadVaultFileCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Files.UploadVaultFile;

public sealed record UploadVaultFileCommand(
    Guid ProjectId,
    Guid? FolderId,
    string FileName,
    string ContentType,
    long SizeBytes,
    Stream FileStream) : ICommand<VaultFileDto>;
```

```csharp
// Files/UploadVaultFile/UploadVaultFileCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Files.UploadVaultFile;

internal sealed class UploadVaultFileCommandHandler(
    IVaultFileRepository repository,
    IFileStorageService fileStorage,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UploadVaultFileCommand, Result<VaultFileDto>>
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv", "text/markdown", "text/x-markdown",
        "application/zip",
    ];

    private const long MaxBytes = 20 * 1024 * 1024;

    public async Task<Result<VaultFileDto>> Handle(UploadVaultFileCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "Developers and above can upload files.");

        if (request.SizeBytes == 0)
            return Error.Validation("Vault.FileEmpty", "File is empty.");
        if (request.SizeBytes > MaxBytes)
            return Error.Validation("Vault.FileTooLarge", "File exceeds the 20 MB limit.");
        if (!AllowedTypes.Contains(request.ContentType))
            return Error.Validation("Vault.InvalidType", "File type is not allowed.");

        var ext = Path.GetExtension(request.FileName);
        var storedName = await fileStorage.SaveAsync(request.FileStream, ext, ct);

        var vaultFile = VaultFile.Create(
            request.ProjectId, request.FolderId,
            request.FileName, storedName,
            request.ContentType, request.SizeBytes,
            currentUser.UserId, currentUser.FullName);

        await repository.AddAsync(vaultFile, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFileDto>(vaultFile);
    }
}
```

- [ ] **Step 3: Create DownloadVaultFileQuery.cs and handler**

```csharp
// Files/DownloadVaultFile/DownloadVaultFileQuery.cs
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Files.DownloadVaultFile;

public sealed record VaultFileDownload(string FileName, string ContentType, string FullPath);

public sealed record DownloadVaultFileQuery(Guid FileId, Guid ProjectId) : IQuery<VaultFileDownload>;
```

```csharp
// Files/DownloadVaultFile/DownloadVaultFileQueryHandler.cs
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;

namespace ProjectManagement.Application.Features.Vault.Files.DownloadVaultFile;

internal sealed class DownloadVaultFileQueryHandler(
    IVaultFileRepository repository,
    IFileStorageService fileStorage,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser)
    : IRequestHandler<DownloadVaultFileQuery, Result<VaultFileDownload>>
{
    public async Task<Result<VaultFileDownload>> Handle(DownloadVaultFileQuery request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Viewer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var vaultFile = await repository.GetByIdAsync(request.FileId, ct);
        if (vaultFile is null) return Error.NotFound("Vault.FileNotFound", "File not found.");

        var fullPath = fileStorage.GetFullPath(vaultFile.StoredFileName);
        return new VaultFileDownload(vaultFile.FileName, vaultFile.ContentType, fullPath);
    }
}
```

- [ ] **Step 4: Create DeleteVaultFileCommand.cs and handler**

```csharp
// Files/DeleteVaultFile/DeleteVaultFileCommand.cs
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.Vault.Files.DeleteVaultFile;

public sealed record DeleteVaultFileCommand(Guid FileId, Guid ProjectId) : ICommand;
```

```csharp
// Files/DeleteVaultFile/DeleteVaultFileCommandHandler.cs
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Files.DeleteVaultFile;

internal sealed class DeleteVaultFileCommandHandler(
    IVaultFileRepository repository,
    IFileStorageService fileStorage,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteVaultFileCommand, Result>
{
    public async Task<Result> Handle(DeleteVaultFileCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "You must be a project member.");

        var vaultFile = await repository.GetByIdAsync(request.FileId, ct);
        if (vaultFile is null) return Error.NotFound("Vault.FileNotFound", "File not found.");

        var isManager = await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Manager, ct);
        if (!isManager && vaultFile.UploadedById != currentUser.UserId)
            return Error.Forbidden("Vault.Forbidden", "You can only delete your own files.");

        fileStorage.Delete(vaultFile.StoredFileName);
        repository.Remove(vaultFile);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
```

- [ ] **Step 5: Create MoveVaultFileCommand.cs and handler**

```csharp
// Files/MoveVaultFile/MoveVaultFileCommand.cs
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;

namespace ProjectManagement.Application.Features.Vault.Files.MoveVaultFile;

public sealed record MoveVaultFileCommand(Guid FileId, Guid ProjectId, Guid? FolderId) : ICommand<VaultFileDto>;
```

```csharp
// Files/MoveVaultFile/MoveVaultFileCommandHandler.cs
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Vault.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Vault.Files.MoveVaultFile;

internal sealed class MoveVaultFileCommandHandler(
    IVaultFileRepository repository,
    IProjectPermissionService permissions,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<MoveVaultFileCommand, Result<VaultFileDto>>
{
    public async Task<Result<VaultFileDto>> Handle(MoveVaultFileCommand request, CancellationToken ct)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, currentUser.UserId, ProjectMemberRole.Developer, ct))
            return Error.Forbidden("Vault.Forbidden", "Developers and above can move files.");

        var vaultFile = await repository.GetByIdAsync(request.FileId, ct);
        if (vaultFile is null) return Error.NotFound("Vault.FileNotFound", "File not found.");

        vaultFile.Move(request.FolderId);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VaultFileDto>(vaultFile);
    }
}
```

- [ ] **Step 6: Build to verify**

```bash
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 7: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Vault/Files/
git commit -m "feat: add vault file CQRS handlers"
```

---

## Task 8: VaultController and EF Core Migration

**Files:**
- Create: `backend/src/ProjectManagement.WebApi/Controllers/VaultController.cs`
- Run EF Core migration

- [ ] **Step 1: Create VaultController.cs**

```csharp
// backend/src/ProjectManagement.WebApi/Controllers/VaultController.cs
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

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
    public async Task<IActionResult> DeleteFolder(Guid projectId, Guid folderId, CancellationToken ct)
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
        if (!result.IsSuccess) return result.ToActionResult(this);
        var download = result.Value!;
        return PhysicalFile(download.FullPath, download.ContentType, download.FileName);
    }

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
```

- [ ] **Step 2: Build the full solution**

```bash
cd backend
dotnet build
```
Expected: `Build succeeded. 0 Error(s).`

- [ ] **Step 3: Add EF Core migration**

```bash
cd backend
dotnet ef migrations add AddProjectVault --project src/ProjectManagement.Infrastructure --startup-project src/ProjectManagement.WebApi
```
Expected: a new migration file in `src/ProjectManagement.Infrastructure/Migrations/`.

- [ ] **Step 4: Apply migration to database**

```bash
dotnet ef database update --project src/ProjectManagement.Infrastructure --startup-project src/ProjectManagement.WebApi
```
Expected: `Done.`

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.WebApi/Controllers/VaultController.cs \
        backend/src/ProjectManagement.Infrastructure/Migrations/
git commit -m "feat: add VaultController and EF Core migration for vault tables"
```

---

## Task 9: Frontend Models, Nx Library Scaffolding, and VaultService

**Files:**
- Create: `frontend/libs/shared/models/src/lib/vault.model.ts`
- Modify: `frontend/libs/shared/models/src/index.ts`
- Create: `frontend/libs/vault/data-access/project.json`
- Create: `frontend/libs/vault/data-access/src/index.ts`
- Create: `frontend/libs/vault/data-access/src/lib/vault.service.ts`
- Create: `frontend/libs/vault/feature/project.json`
- Create: `frontend/libs/vault/feature/src/index.ts`
- Modify: `frontend/tsconfig.base.json`

- [ ] **Step 1: Create vault.model.ts**

```typescript
// frontend/libs/shared/models/src/lib/vault.model.ts
export interface VaultFolder {
  id: string;
  projectId: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VaultDocument {
  id: string;
  projectId: string;
  folderId?: string;
  title: string;
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VaultDocumentDetail extends VaultDocument {
  contentJson: string;
}

export interface VaultFile {
  id: string;
  projectId: string;
  folderId?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export interface CreateVaultDocumentRequest {
  title: string;
  folderId?: string;
}

export interface UpdateVaultDocumentRequest {
  title: string;
  contentJson: string;
}
```

- [ ] **Step 2: Export from shared models barrel**

Open `frontend/libs/shared/models/src/index.ts` and add this line at the end:
```typescript
export * from './lib/vault.model';
```

- [ ] **Step 3: Create vault/data-access Nx project.json**

```json
// frontend/libs/vault/data-access/project.json
{
  "name": "vault-data-access",
  "$schema": "../../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/vault/data-access/src",
  "prefix": "lib",
  "projectType": "library",
  "tags": [],
  "targets": {
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
```

- [ ] **Step 4: Create VaultService**

```typescript
// frontend/libs/vault/data-access/src/lib/vault.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  VaultFolder, VaultDocument, VaultDocumentDetail, VaultFile,
  CreateVaultDocumentRequest, UpdateVaultDocumentRequest
} from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class VaultService {
  constructor(private http: HttpClient) {}

  private base(projectId: string) {
    return `${environment.apiUrl}/projects/${projectId}/vault`;
  }

  // Folders
  getFolders(projectId: string) {
    return this.http.get<VaultFolder[]>(`${this.base(projectId)}/folders`);
  }
  createFolder(projectId: string, name: string) {
    return this.http.post<VaultFolder>(`${this.base(projectId)}/folders`, { name });
  }
  renameFolder(projectId: string, folderId: string, name: string) {
    return this.http.put<VaultFolder>(`${this.base(projectId)}/folders/${folderId}`, { name });
  }
  deleteFolder(projectId: string, folderId: string) {
    return this.http.delete(`${this.base(projectId)}/folders/${folderId}`);
  }

  // Documents
  getDocuments(projectId: string, folderId?: string) {
    const params = folderId ? `?folderId=${folderId}` : '';
    return this.http.get<VaultDocument[]>(`${this.base(projectId)}/documents${params}`);
  }
  getDocument(projectId: string, documentId: string) {
    return this.http.get<VaultDocumentDetail>(`${this.base(projectId)}/documents/${documentId}`);
  }
  createDocument(projectId: string, request: CreateVaultDocumentRequest) {
    return this.http.post<VaultDocument>(`${this.base(projectId)}/documents`, request);
  }
  updateDocument(projectId: string, documentId: string, request: UpdateVaultDocumentRequest) {
    return this.http.put<VaultDocumentDetail>(`${this.base(projectId)}/documents/${documentId}`, request);
  }
  deleteDocument(projectId: string, documentId: string) {
    return this.http.delete(`${this.base(projectId)}/documents/${documentId}`);
  }
  moveDocument(projectId: string, documentId: string, folderId: string | null) {
    return this.http.patch<VaultDocument>(`${this.base(projectId)}/documents/${documentId}/move`, { folderId });
  }

  // Files
  getFiles(projectId: string, folderId?: string) {
    const params = folderId ? `?folderId=${folderId}` : '';
    return this.http.get<VaultFile[]>(`${this.base(projectId)}/files${params}`);
  }
  uploadFile(projectId: string, file: File, folderId?: string) {
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId);
    return this.http.post<VaultFile>(`${this.base(projectId)}/files`, form);
  }
  downloadFile(projectId: string, fileId: string) {
    return this.http.get(`${this.base(projectId)}/files/${fileId}/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
  deleteFile(projectId: string, fileId: string) {
    return this.http.delete(`${this.base(projectId)}/files/${fileId}`);
  }
  moveFile(projectId: string, fileId: string, folderId: string | null) {
    return this.http.patch<VaultFile>(`${this.base(projectId)}/files/${fileId}/move`, { folderId });
  }
}
```

- [ ] **Step 5: Create data-access barrel**

```typescript
// frontend/libs/vault/data-access/src/index.ts
export * from './lib/vault.service';
```

- [ ] **Step 6: Create vault/feature Nx project.json**

```json
// frontend/libs/vault/feature/project.json
{
  "name": "vault-feature",
  "$schema": "../../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/vault/feature/src",
  "prefix": "pm",
  "projectType": "library",
  "tags": [],
  "targets": {
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
```

- [ ] **Step 7: Create feature barrel (placeholder — populated in Task 11)**

```typescript
// frontend/libs/vault/feature/src/index.ts
export * from './lib/vault-tab/vault-tab.component';
export * from './lib/vault-document-editor/vault-document-editor.component';
```

- [ ] **Step 8: Add path aliases to tsconfig.base.json**

Open `frontend/tsconfig.base.json`. Find the `"paths"` section (look for `"@pm/boards/data-access"`). Add these two entries in the same `paths` object:

```json
"@pm/vault/data-access": ["libs/vault/data-access/src/index.ts"],
"@pm/vault/feature": ["libs/vault/feature/src/index.ts"]
```

- [ ] **Step 9: Commit**

```bash
git add frontend/libs/shared/models/src/lib/vault.model.ts \
        frontend/libs/shared/models/src/index.ts \
        frontend/libs/vault/ \
        frontend/tsconfig.base.json
git commit -m "feat: add vault frontend models, Nx library scaffolding, and VaultService"
```

---

## Task 10: VaultDocumentEditorComponent (TipTap)

**Files:**
- Create: `frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts`

- [ ] **Step 1: Install TipTap packages**

```bash
cd frontend
npm install @tiptap/core @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-image
```
Expected: packages added to `package.json`, no errors.

- [ ] **Step 2: Create VaultDocumentEditorComponent**

```typescript
// frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts
import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit,
  signal, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import { VaultDocumentDetail } from '@pm/shared/models';

@Component({
  selector: 'pm-vault-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-wrap">
      <div class="editor-title-row">
        <input
          class="doc-title-input"
          [value]="titleValue"
          (input)="onTitleInput($event)"
          placeholder="Untitled document"
          [readonly]="readonly"
        />
      </div>

      <div *ngIf="!readonly" class="toolbar">
        <button class="tb-btn" (click)="cmd('toggleBold')" title="Bold"><b>B</b></button>
        <button class="tb-btn" (click)="cmd('toggleItalic')" title="Italic"><i>I</i></button>
        <button class="tb-btn" (click)="cmd('toggleStrike')" title="Strike"><s>S</s></button>
        <span class="tb-sep"></span>
        <button class="tb-btn" (click)="cmdH(1)" title="H1">H1</button>
        <button class="tb-btn" (click)="cmdH(2)" title="H2">H2</button>
        <button class="tb-btn" (click)="cmdH(3)" title="H3">H3</button>
        <span class="tb-sep"></span>
        <button class="tb-btn" (click)="cmd('toggleBulletList')" title="Bullet list">•</button>
        <button class="tb-btn" (click)="cmd('toggleOrderedList')" title="Numbered list">1.</button>
        <button class="tb-btn" (click)="cmd('toggleCodeBlock')" title="Code block">&lt;/&gt;</button>
        <span class="tb-sep"></span>
        <button class="tb-btn" (click)="insertTable()" title="Table">⊞</button>
        <button class="tb-btn" (click)="insertImage()" title="Image">🖼</button>
      </div>

      <div #editorEl class="tiptap-content" [class.readonly]="readonly"></div>

      <div class="save-status" *ngIf="!readonly">
        <span *ngIf="saveStatus() === 'saving'">Saving…</span>
        <span *ngIf="saveStatus() === 'saved'">
          Saved · Last edited by {{ document.updatedByName || document.createdByName }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
    .editor-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 24px 32px; overflow-y: auto; }
    .editor-title-row { margin-bottom: 12px; }
    .doc-title-input {
      width: 100%; border: none; outline: none; font-size: 22px; font-weight: 700;
      background: transparent; color: var(--ink); padding: 4px 0;
    }
    .doc-title-input::placeholder { color: var(--soft); }
    .toolbar {
      display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 4px 8px; margin-bottom: 12px; background: var(--surface);
    }
    .tb-btn {
      padding: 4px 8px; border: none; background: transparent; border-radius: 4px;
      cursor: pointer; font-size: 13px; color: var(--ink-4); line-height: 1;
    }
    .tb-btn:hover { background: var(--violet-mid); color: var(--violet); }
    .tb-sep { width: 1px; height: 16px; background: var(--border); margin: 0 4px; }
    .tiptap-content {
      flex: 1; outline: none; font-size: 14px; line-height: 1.7; color: var(--ink);
      min-height: 200px;
    }
    .tiptap-content.readonly { cursor: default; }
    .save-status { font-size: 11px; color: var(--soft); margin-top: 8px; height: 16px; }

    /* TipTap content styles */
    :host ::ng-deep .tiptap-content {
      h1 { font-size: 1.6em; font-weight: 700; margin: 16px 0 8px; }
      h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
      h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
      p { margin: 4px 0; }
      ul, ol { padding-left: 24px; margin: 4px 0; }
      code { background: var(--surface); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
      pre { background: var(--surface); padding: 12px; border-radius: var(--r-md); margin: 8px 0; overflow-x: auto; }
      pre code { background: none; padding: 0; }
      blockquote { border-left: 3px solid var(--border); margin: 8px 0; padding-left: 12px; color: var(--muted); }
      table { border-collapse: collapse; width: 100%; margin: 8px 0; }
      th, td { border: 1px solid var(--border); padding: 6px 10px; font-size: 13px; }
      th { background: var(--surface); font-weight: 600; }
      img { max-width: 100%; border-radius: var(--r-md); margin: 8px 0; }
      .ProseMirror-focused { outline: none; }
    }
  `],
})
export class VaultDocumentEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) document!: VaultDocumentDetail;
  @Input() readonly = false;
  @Output() save = new EventEmitter<{ title: string; contentJson: string }>();

  saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  titleValue = '';

  private editor: Editor | null = null;
  private save$ = new Subject<void>();
  private saveSub = this.save$.pipe(debounceTime(2000)).subscribe(() => this.emitSave());

  ngAfterViewInit(): void {
    this.titleValue = this.document.title;

    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions: [
        StarterKit,
        Table.configure({ resizable: false }),
        TableRow, TableHeader, TableCell,
        Image,
      ],
      content: this.document.contentJson ? JSON.parse(this.document.contentJson) : '',
      editable: !this.readonly,
      onUpdate: () => {
        if (!this.readonly) {
          this.saveStatus.set('saving');
          this.save$.next();
        }
      },
    });
  }

  onTitleInput(event: Event): void {
    this.titleValue = (event.target as HTMLInputElement).value;
    if (!this.readonly) {
      this.saveStatus.set('saving');
      this.save$.next();
    }
  }

  cmd(command: string): void {
    (this.editor?.chain().focus() as any)[command]?.().run();
  }

  cmdH(level: 1 | 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  insertTable(): void {
    this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  insertImage(): void {
    const src = prompt('Image URL:');
    if (src) this.editor?.chain().focus().setImage({ src }).run();
  }

  private emitSave(): void {
    const contentJson = JSON.stringify(this.editor?.getJSON() ?? {});
    this.save.emit({ title: this.titleValue, contentJson });
    this.saveStatus.set('saved');
  }

  ngOnDestroy(): void {
    this.saveSub.unsubscribe();
    this.editor?.destroy();
  }
}
```

- [ ] **Step 3: Build to verify (frontend)**

```bash
cd frontend
npx nx build project-management --configuration=development 2>&1 | tail -20
```
Expected: no TypeScript errors related to vault-document-editor.

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/vault/feature/src/lib/vault-document-editor/ \
        frontend/package.json \
        frontend/package-lock.json
git commit -m "feat: add VaultDocumentEditorComponent with TipTap rich text editor"
```

---

## Task 11: VaultTabComponent

**Files:**
- Create: `frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts`

- [ ] **Step 1: Create VaultTabComponent**

```typescript
// frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts
import {
  Component, Input, OnInit, OnDestroy, signal, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VaultService } from '@pm/vault/data-access';
import {
  VaultFolder, VaultDocument, VaultDocumentDetail, VaultFile,
  UpdateVaultDocumentRequest,
} from '@pm/shared/models';
import { VaultDocumentEditorComponent } from '../vault-document-editor/vault-document-editor.component';

@Component({
  selector: 'pm-vault-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, VaultDocumentEditorComponent],
  template: `
    <div class="vault-layout">

      <!-- ── Sidebar ── -->
      <div class="vault-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Vault</span>
          <button class="icon-btn" (click)="showNewFolder = true" title="New folder"
                  *ngIf="!showNewFolder">
            <span class="material-icons-round" style="font-size:18px">create_new_folder</span>
          </button>
        </div>

        <div *ngIf="showNewFolder" class="new-folder-row">
          <input class="folder-input" [(ngModel)]="newFolderName"
                 placeholder="Folder name…"
                 (keydown.enter)="createFolder()"
                 (keydown.escape)="cancelNewFolder()"
                 autofocus />
          <button class="btn-primary btn-xs" (click)="createFolder()" [disabled]="!newFolderName.trim()">Add</button>
          <button class="btn-ghost btn-xs" (click)="cancelNewFolder()">✕</button>
        </div>

        <div class="folder-item" [class.active]="selectedFolderId() === null"
             (click)="selectFolder(null)">
          <span class="material-icons-round folder-icon">folder_open</span>
          <span class="folder-name">All Files</span>
        </div>

        <div *ngFor="let f of folders()" class="folder-item"
             [class.active]="selectedFolderId() === f.id"
             (click)="selectFolder(f.id)">
          <span class="material-icons-round folder-icon">folder</span>
          <span class="folder-name">{{ f.name }}</span>
          <div class="folder-actions">
            <button class="icon-btn-xs" (click)="startRenameFolder(f); $event.stopPropagation()" title="Rename">
              <span class="material-icons-round" style="font-size:14px">edit</span>
            </button>
            <button class="icon-btn-xs danger" (click)="deleteFolder(f); $event.stopPropagation()" title="Delete">
              <span class="material-icons-round" style="font-size:14px">delete_outline</span>
            </button>
          </div>
        </div>

        <!-- Rename folder inline -->
        <div *ngIf="renamingFolder()" class="new-folder-row">
          <input class="folder-input" [(ngModel)]="renameDraft"
                 (keydown.enter)="saveRenameFolder()"
                 (keydown.escape)="cancelRenameFolder()" autofocus />
          <button class="btn-primary btn-xs" (click)="saveRenameFolder()">Save</button>
          <button class="btn-ghost btn-xs" (click)="cancelRenameFolder()">✕</button>
        </div>
      </div>

      <!-- ── Main content area ── -->
      <div class="vault-main" *ngIf="!activeDocument()">

        <!-- Documents section -->
        <div class="section-header">
          <span class="section-title">
            <span class="material-icons-round">description</span> Documents
            <span class="count-badge">{{ visibleDocuments().length }}</span>
          </span>
          <button class="btn-primary btn-sm" (click)="createDocument()">
            <span class="material-icons-round" style="font-size:14px">add</span> New Doc
          </button>
        </div>

        <div *ngIf="loading()" class="vault-empty">
          <span class="material-icons-round spin">autorenew</span> Loading…
        </div>

        <div *ngIf="!loading() && visibleDocuments().length === 0" class="vault-empty small">
          No documents yet.
        </div>

        <div *ngFor="let doc of visibleDocuments()" class="vault-item" (click)="openDocument(doc)">
          <span class="material-icons-round item-icon doc-icon">article</span>
          <div class="item-info">
            <span class="item-name">{{ doc.title }}</span>
            <span class="item-meta">
              {{ doc.updatedByName || doc.createdByName }} ·
              {{ (doc.updatedAt || doc.createdAt) | date:'mediumDate' }}
            </span>
          </div>
          <button class="icon-btn-xs danger" (click)="deleteDocument(doc); $event.stopPropagation()" title="Delete">
            <span class="material-icons-round" style="font-size:14px">delete_outline</span>
          </button>
        </div>

        <!-- Files section -->
        <div class="section-header" style="margin-top:24px">
          <span class="section-title">
            <span class="material-icons-round">attach_file</span> Files
            <span class="count-badge">{{ visibleFiles().length }}</span>
          </span>
          <label class="btn-primary btn-sm" style="cursor:pointer">
            <span class="material-icons-round" style="font-size:14px">upload</span> Upload
            <input type="file" style="display:none" (change)="onFileSelected($event)" />
          </label>
        </div>

        <div *ngIf="!loading() && visibleFiles().length === 0" class="vault-empty small">
          No files yet.
        </div>

        <div *ngFor="let f of visibleFiles()" class="vault-item">
          <span class="material-icons-round item-icon file-icon">{{ fileIcon(f.contentType) }}</span>
          <div class="item-info">
            <span class="item-name">{{ f.fileName }}</span>
            <span class="item-meta">
              {{ f.uploadedByName }} · {{ f.sizeBytes | number }} bytes ·
              {{ f.createdAt | date:'mediumDate' }}
            </span>
          </div>
          <button class="icon-btn-xs" (click)="downloadFile(f)" title="Download">
            <span class="material-icons-round" style="font-size:14px">download</span>
          </button>
          <button class="icon-btn-xs danger" (click)="deleteFile(f)" title="Delete">
            <span class="material-icons-round" style="font-size:14px">delete_outline</span>
          </button>
        </div>
      </div>

      <!-- ── Document editor ── -->
      <div class="vault-main editor-mode" *ngIf="activeDocument()">
        <div class="editor-topbar">
          <button class="back-btn" (click)="closeDocument()">
            <span class="material-icons-round">arrow_back</span> Back
          </button>
        </div>
        <pm-vault-document-editor
          [document]="activeDocument()!"
          [readonly]="false"
          (save)="onDocumentSave($event)"
        />
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; }

    .vault-layout { display: flex; flex: 1; min-height: 0; }

    /* Sidebar */
    .vault-sidebar {
      width: 220px; flex-shrink: 0;
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      padding: 16px 0; overflow-y: auto;
    }
    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 14px 10px; font-size: 12px; font-weight: 700;
      color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em;
    }
    .sidebar-title { flex: 1; }
    .new-folder-row {
      display: flex; gap: 4px; align-items: center;
      padding: 6px 10px;
    }
    .folder-input {
      flex: 1; padding: 4px 8px; border: 1px solid var(--border);
      border-radius: 6px; font-size: 12px; outline: none;
    }
    .folder-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px; cursor: pointer; font-size: 13px;
      color: var(--ink-4); border-radius: 0; transition: background 0.1s;
      position: relative;
    }
    .folder-item:hover { background: var(--surface); }
    .folder-item.active { background: var(--violet-mid); color: var(--violet); font-weight: 600; }
    .folder-icon { font-size: 16px; flex-shrink: 0; }
    .folder-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .folder-actions { display: none; gap: 2px; }
    .folder-item:hover .folder-actions { display: flex; }

    /* Main */
    .vault-main {
      flex: 1; min-height: 0; overflow-y: auto;
      padding: 24px 28px;
    }
    .vault-main.editor-mode { padding: 0; display: flex; flex-direction: column; }
    .editor-topbar {
      padding: 10px 16px; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .back-btn {
      display: flex; align-items: center; gap: 4px; font-size: 13px;
      color: var(--muted); background: transparent; border: none;
      cursor: pointer; padding: 4px 8px; border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .back-btn:hover { color: var(--violet); background: var(--violet-mid); }

    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700; color: var(--ink-3);
    }
    .section-title .material-icons-round { font-size: 16px; color: var(--muted); }
    .count-badge {
      font-size: 11px; font-weight: 600; background: var(--surface);
      color: var(--muted); padding: 1px 7px; border-radius: 999px;
    }

    .vault-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border: 1px solid var(--border);
      border-radius: 8px; margin-bottom: 6px; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .vault-item:hover { background: var(--surface); border-color: var(--violet); }
    .item-icon { font-size: 18px; flex-shrink: 0; }
    .doc-icon { color: var(--blue); }
    .file-icon { color: var(--amber); }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .item-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-meta { font-size: 11px; color: var(--muted); }

    .vault-empty {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 48px 0; color: var(--soft); font-size: 14px;
    }
    .vault-empty.small { padding: 16px 0; font-size: 13px; }

    /* Buttons */
    .btn-sm { padding: 6px 14px; border-radius: 7px; font-size: 13px; cursor: pointer; border: 1px solid transparent; display: flex; align-items: center; gap: 4px; }
    .btn-xs { padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--violet); color: #fff; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: var(--border); color: var(--ink-4); }
    .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 2px; border-radius: 4px; }
    .icon-btn:hover { color: var(--violet); }
    .icon-btn-xs { background: transparent; border: none; cursor: pointer; color: var(--muted); padding: 2px; border-radius: 4px; }
    .icon-btn-xs:hover { color: var(--violet); }
    .icon-btn-xs.danger:hover { color: var(--rose); }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class VaultTabComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private vaultService = inject(VaultService);
  private snackBar = inject(MatSnackBar);

  folders = signal<VaultFolder[]>([]);
  documents = signal<VaultDocument[]>([]);
  files = signal<VaultFile[]>([]);
  activeDocument = signal<VaultDocumentDetail | null>(null);
  loading = signal(true);
  selectedFolderId = signal<string | null>(null);

  showNewFolder = false;
  newFolderName = '';
  renamingFolder = signal<VaultFolder | null>(null);
  renameDraft = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.vaultService.getFolders(this.projectId).subscribe(f => this.folders.set(f));
    this.vaultService.getDocuments(this.projectId).subscribe(d => {
      this.documents.set(d);
      this.loading.set(false);
    });
    this.vaultService.getFiles(this.projectId).subscribe(f => this.files.set(f));
  }

  visibleDocuments(): VaultDocument[] {
    const fid = this.selectedFolderId();
    if (fid === null) return this.documents();
    return this.documents().filter(d => d.folderId === fid);
  }

  visibleFiles(): VaultFile[] {
    const fid = this.selectedFolderId();
    if (fid === null) return this.files();
    return this.files().filter(f => f.folderId === fid);
  }

  selectFolder(id: string | null): void { this.selectedFolderId.set(id); }

  // Folder management
  createFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) return;
    this.vaultService.createFolder(this.projectId, name).subscribe({
      next: f => { this.folders.update(all => [...all, f]); this.cancelNewFolder(); this.toast('Folder created'); },
      error: () => this.toast('Failed to create folder', true),
    });
  }

  cancelNewFolder(): void { this.showNewFolder = false; this.newFolderName = ''; }

  startRenameFolder(folder: VaultFolder): void {
    this.renamingFolder.set(folder);
    this.renameDraft = folder.name;
  }

  saveRenameFolder(): void {
    const folder = this.renamingFolder();
    if (!folder || !this.renameDraft.trim()) return;
    this.vaultService.renameFolder(this.projectId, folder.id, this.renameDraft.trim()).subscribe({
      next: updated => {
        this.folders.update(all => all.map(f => f.id === updated.id ? updated : f));
        this.cancelRenameFolder();
        this.toast('Folder renamed');
      },
      error: () => this.toast('Failed to rename folder', true),
    });
  }

  cancelRenameFolder(): void { this.renamingFolder.set(null); this.renameDraft = ''; }

  deleteFolder(folder: VaultFolder): void {
    if (!confirm(`Delete "${folder.name}"? Contents will be moved to root.`)) return;
    this.vaultService.deleteFolder(this.projectId, folder.id).subscribe({
      next: () => {
        this.folders.update(all => all.filter(f => f.id !== folder.id));
        if (this.selectedFolderId() === folder.id) this.selectedFolderId.set(null);
        // Move items back to root in local state
        this.documents.update(all => all.map(d => d.folderId === folder.id ? { ...d, folderId: undefined } : d));
        this.files.update(all => all.map(f => f.folderId === folder.id ? { ...f, folderId: undefined } : f));
        this.toast('Folder deleted');
      },
      error: () => this.toast('Failed to delete folder', true),
    });
  }

  // Document management
  createDocument(): void {
    const folderId = this.selectedFolderId() ?? undefined;
    this.vaultService.createDocument(this.projectId, { title: 'Untitled', folderId }).subscribe({
      next: doc => {
        this.documents.update(all => [doc, ...all]);
        // Immediately open the new document for editing
        this.vaultService.getDocument(this.projectId, doc.id).subscribe(detail => {
          this.activeDocument.set(detail);
        });
      },
      error: () => this.toast('Failed to create document', true),
    });
  }

  openDocument(doc: VaultDocument): void {
    this.vaultService.getDocument(this.projectId, doc.id).subscribe({
      next: detail => this.activeDocument.set(detail),
      error: () => this.toast('Failed to open document', true),
    });
  }

  closeDocument(): void { this.activeDocument.set(null); }

  onDocumentSave(event: { title: string; contentJson: string }): void {
    const doc = this.activeDocument();
    if (!doc) return;
    const req: UpdateVaultDocumentRequest = { title: event.title, contentJson: event.contentJson };
    this.vaultService.updateDocument(this.projectId, doc.id, req).subscribe({
      next: updated => {
        this.activeDocument.set(updated);
        this.documents.update(all => all.map(d => d.id === updated.id ? updated : d));
      },
    });
  }

  deleteDocument(doc: VaultDocument): void {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    this.vaultService.deleteDocument(this.projectId, doc.id).subscribe({
      next: () => { this.documents.update(all => all.filter(d => d.id !== doc.id)); this.toast('Document deleted'); },
      error: () => this.toast('Failed to delete document', true),
    });
  }

  // File management
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const folderId = this.selectedFolderId() ?? undefined;
    this.vaultService.uploadFile(this.projectId, file, folderId).subscribe({
      next: vf => { this.files.update(all => [vf, ...all]); this.toast('File uploaded'); },
      error: () => this.toast('Failed to upload file', true),
    });
    // Reset input so same file can be re-uploaded
    (event.target as HTMLInputElement).value = '';
  }

  downloadFile(vaultFile: VaultFile): void {
    this.vaultService.downloadFile(this.projectId, vaultFile.id).subscribe({
      next: response => {
        const blob = response.body!;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = vaultFile.fileName; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast('Failed to download file', true),
    });
  }

  deleteFile(vaultFile: VaultFile): void {
    if (!confirm(`Delete "${vaultFile.fileName}"?`)) return;
    this.vaultService.deleteFile(this.projectId, vaultFile.id).subscribe({
      next: () => { this.files.update(all => all.filter(f => f.id !== vaultFile.id)); this.toast('File deleted'); },
      error: () => this.toast('Failed to delete file', true),
    });
  }

  fileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'table_chart';
    if (contentType.includes('word')) return 'description';
    if (contentType.includes('zip')) return 'folder_zip';
    return 'attach_file';
  }

  private toast(msg: string, isError = false): void {
    this.snackBar.open(msg, undefined, {
      duration: 3000,
      panelClass: isError ? 'snack-error' : 'snack-success',
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
```

- [ ] **Step 2: Build to verify**

```bash
cd frontend
npx nx build project-management --configuration=development 2>&1 | tail -20
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/libs/vault/feature/src/lib/vault-tab/
git commit -m "feat: add VaultTabComponent with folder sidebar, doc list, file list"
```

---

## Task 12: Wire Vault Tab into ProjectDetailComponent

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

- [ ] **Step 1: Add imports**

Open `project-detail.component.ts`. Find the existing import block (look for `import { BoardsTabComponent }`). Add these two imports:

```typescript
import { VaultTabComponent } from '@pm/vault/feature';
```

- [ ] **Step 2: Add VaultTabComponent to @Component imports array**

Find the `imports: [` array in `@Component({ ... })`. Add `VaultTabComponent` to the end of the array.

- [ ] **Step 3: Add 'vault' to activeTab union type**

Find the `activeTab` property declaration. It will look like:
```typescript
activeTab: 'board' | 'sprints' | 'issues' | 'timeline' | 'members' | 'tickets' | 'invites' | 'brainstorm' = 'board';
```
Change it to:
```typescript
activeTab: 'board' | 'sprints' | 'issues' | 'timeline' | 'members' | 'tickets' | 'invites' | 'brainstorm' | 'vault' = 'board';
```

- [ ] **Step 4: Add the Vault tab button**

Find the tab buttons section in the template (look for the brainstorm tab button — it has `(click)="activeTab = 'brainstorm'"`). Add this new button immediately after the brainstorm tab button:

```html
<button class="tab-btn" [class.active]="activeTab === 'vault'" (click)="activeTab = 'vault'">
  <span class="material-icons-round">lock</span>
  Vault
</button>
```

- [ ] **Step 5: Add the Vault tab content panel**

Find the brainstorm tab content panel in the template (look for `*ngIf="activeTab === 'brainstorm'"`). Add this panel immediately after it:

```html
<div *ngIf="activeTab === 'vault'" style="display:flex;flex:1;min-height:0;">
  <pm-vault-tab [projectId]="project()!.id" />
</div>
```

- [ ] **Step 6: Hide "Add Task" button on vault tab**

Find the "Add Task" button in the template. It currently has a condition like `*ngIf="activeTab !== 'issues'"`. Change it to:
```html
*ngIf="activeTab !== 'issues' && activeTab !== 'vault'"
```

- [ ] **Step 7: Build the full frontend**

```bash
cd frontend
npx nx build project-management --configuration=development 2>&1 | tail -30
```
Expected: `Build succeeded` or similar. Zero TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: wire Vault tab into ProjectDetailComponent"
```

- [ ] **Step 9: Push**

```bash
git push origin develop
```

---

## Done

After Task 12, the Project Vault feature is complete:
- Backend: 3 domain entities, 3 repositories, 16 CQRS handlers, 1 controller, 1 EF migration
- Frontend: shared models, 2 Nx libraries, VaultService, TipTap editor component, VaultTabComponent, wired into project detail

Verify end-to-end by:
1. Opening a project → clicking the Vault tab
2. Creating a folder (must be Manager role)
3. Creating a document → typing in the editor → waiting 2 seconds for auto-save
4. Uploading a file → verifying it appears in the list
5. Clicking a file's download button → file downloads
6. Deleting a folder → verifying its contents move to root
