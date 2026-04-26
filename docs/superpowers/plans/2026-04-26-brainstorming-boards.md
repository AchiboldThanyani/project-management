# Brainstorming Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-project brainstorming boards backed by Excalidraw, with real-time collaborative editing via SignalR and REST persistence.

**Architecture:** Each project can have multiple named boards. The Excalidraw canvas JSON is stored as a single string blob in `ProjectBoard`. A new `BoardHub` broadcasts canvas changes to all project members viewing the same board in real-time via SignalR. The frontend embeds Excalidraw via a React-in-Angular wrapper and adds a "Boards" tab to the existing project detail component.

**Tech Stack:** .NET 9 / EF Core / MediatR / AutoMapper / FluentValidation (backend); Angular 20 standalone components / Angular Signals / `@microsoft/signalr` / `@excalidraw/excalidraw` + `react` + `react-dom` (frontend); PostgreSQL.

---

## File Map

### New Backend Files
- `backend/src/ProjectManagement.Domain/Entities/ProjectBoard.cs`
- `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ProjectBoardConfiguration.cs`
- `backend/src/ProjectManagement.Application/Interfaces/IBoardRepository.cs`
- `backend/src/ProjectManagement.Infrastructure/Repositories/BoardRepository.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/DTOs/ProjectBoardDto.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/DTOs/ProjectBoardDetailDto.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommand.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommandValidator.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommand.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommandValidator.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/DeleteProjectBoardCommand.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/DeleteProjectBoardCommandHandler.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/GetProjectBoardsQuery.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/GetProjectBoardsQueryHandler.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/GetProjectBoardQuery.cs`
- `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/GetProjectBoardQueryHandler.cs`
- `backend/src/ProjectManagement.WebApi/Controllers/ProjectBoardsController.cs`
- `backend/src/ProjectManagement.WebApi/Hubs/BoardHub.cs`
- `backend/tests/ProjectManagement.Application.Tests/ProjectBoards/ProjectBoardEntityTests.cs`

### Modified Backend Files
- `backend/src/ProjectManagement.Domain/Entities/Project.cs` — add `Boards` nav property
- `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs` — add `DbSet<ProjectBoard>`
- `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs` — register `IBoardRepository`
- `backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs` — add board mappings
- `backend/src/ProjectManagement.WebApi/Program.cs` — map `BoardHub`

### New Frontend Files
- `frontend/libs/shared/models/src/lib/board.model.ts`
- `frontend/libs/boards/data-access/src/index.ts`
- `frontend/libs/boards/data-access/src/lib/board.service.ts`
- `frontend/libs/boards/data-access/src/lib/board-hub.service.ts`
- `frontend/libs/boards/feature/src/index.ts`
- `frontend/libs/boards/feature/src/lib/excalidraw-wrapper.component.ts`
- `frontend/libs/boards/feature/src/lib/boards-tab.component.ts`

### Modified Frontend Files
- `frontend/libs/shared/models/src/index.ts` — export board models
- `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts` — add Boards tab

---

## Task 1: Domain Entity — ProjectBoard

**Files:**
- Create: `backend/src/ProjectManagement.Domain/Entities/ProjectBoard.cs`
- Modify: `backend/src/ProjectManagement.Domain/Entities/Project.cs`

- [ ] **Step 1: Write the failing entity tests**

Create `backend/tests/ProjectManagement.Application.Tests/ProjectBoards/ProjectBoardEntityTests.cs`:

```csharp
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Tests.ProjectBoards;

public class ProjectBoardEntityTests
{
    [Fact]
    public void Create_SetsAllProperties()
    {
        var projectId = Guid.NewGuid();
        var createdById = Guid.NewGuid().ToString();

        var board = ProjectBoard.Create("Sprint 3 Planning", projectId, createdById);

        Assert.Equal("Sprint 3 Planning", board.Title);
        Assert.Equal(projectId, board.ProjectId);
        Assert.Equal(createdById, board.CreatedById);
        Assert.Equal(string.Empty, board.ContentJson);
        Assert.NotEqual(Guid.Empty, board.Id);
    }

    [Fact]
    public void UpdateTitle_ChangesTitle()
    {
        var board = ProjectBoard.Create("Old Title", Guid.NewGuid(), Guid.NewGuid().ToString());
        board.UpdateTitle("New Title");
        Assert.Equal("New Title", board.Title);
    }

    [Fact]
    public void UpdateContent_ChangesContentJson()
    {
        var board = ProjectBoard.Create("Board", Guid.NewGuid(), Guid.NewGuid().ToString());
        var json = "{\"elements\":[]}";
        board.UpdateContent(json);
        Assert.Equal(json, board.ContentJson);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd backend
dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --filter "ProjectBoardEntityTests" -v minimal
```
Expected: compilation error — `ProjectBoard` does not exist yet.

- [ ] **Step 3: Create the ProjectBoard entity**

Create `backend/src/ProjectManagement.Domain/Entities/ProjectBoard.cs`:

```csharp
using ProjectManagement.Domain.Common;

namespace ProjectManagement.Domain.Entities;

public class ProjectBoard : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public Project Project { get; private set; } = null!;
    public string Title { get; private set; } = string.Empty;
    public string ContentJson { get; private set; } = string.Empty;
    public string CreatedById { get; private set; } = string.Empty;

    private ProjectBoard() { }

    public static ProjectBoard Create(string title, Guid projectId, string createdById)
    {
        return new ProjectBoard
        {
            Title = title,
            ProjectId = projectId,
            CreatedById = createdById
        };
    }

    public void UpdateTitle(string title)
    {
        Title = title;
        SetUpdated();
    }

    public void UpdateContent(string contentJson)
    {
        ContentJson = contentJson;
        SetUpdated();
    }
}
```

- [ ] **Step 4: Add Boards nav property to Project**

In `backend/src/ProjectManagement.Domain/Entities/Project.cs`, add one line inside the class body (after the existing nav properties on lines 17-19):

```csharp
public ICollection<ProjectBoard> Boards { get; set; } = [];
```

- [ ] **Step 5: Run tests — should pass**

```
cd backend
dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --filter "ProjectBoardEntityTests" -v minimal
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Entities/ProjectBoard.cs \
        backend/src/ProjectManagement.Domain/Entities/Project.cs \
        backend/tests/ProjectManagement.Application.Tests/ProjectBoards/ProjectBoardEntityTests.cs
git commit -m "feat: add ProjectBoard domain entity"
```

---

## Task 2: EF Core Configuration + DbContext + Migration

**Files:**
- Create: `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ProjectBoardConfiguration.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs`

- [ ] **Step 1: Create EF configuration**

Create `backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ProjectBoardConfiguration.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Infrastructure.Persistence.Configurations;

public class ProjectBoardConfiguration : IEntityTypeConfiguration<ProjectBoard>
{
    public void Configure(EntityTypeBuilder<ProjectBoard> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Title).IsRequired().HasMaxLength(200);
        builder.Property(b => b.ContentJson).HasColumnType("text");
        builder.Property(b => b.CreatedById).IsRequired();
        builder.HasOne(b => b.Project)
            .WithMany(p => p.Boards)
            .HasForeignKey(b => b.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

- [ ] **Step 2: Add DbSet to ApplicationDbContext**

In `backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs`, add this line alongside the other `DbSet` declarations:

```csharp
public DbSet<ProjectBoard> ProjectBoards => Set<ProjectBoard>();
```

- [ ] **Step 3: Add and apply migration**

```
cd backend
dotnet ef migrations add AddProjectBoards --project src/ProjectManagement.Infrastructure --startup-project src/ProjectManagement.WebApi
dotnet ef database update --project src/ProjectManagement.Infrastructure --startup-project src/ProjectManagement.WebApi
```
Expected: migration file created, database updated with `ProjectBoards` table.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Infrastructure/Persistence/Configurations/ProjectBoardConfiguration.cs \
        backend/src/ProjectManagement.Infrastructure/Persistence/ApplicationDbContext.cs \
        backend/src/ProjectManagement.Infrastructure/Migrations/
git commit -m "feat: add ProjectBoards EF Core configuration and migration"
```

---

## Task 3: Repository Interface + Implementation + DI Registration

**Files:**
- Create: `backend/src/ProjectManagement.Application/Interfaces/IBoardRepository.cs`
- Create: `backend/src/ProjectManagement.Infrastructure/Repositories/BoardRepository.cs`
- Modify: `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs`

- [ ] **Step 1: Create the repository interface**

Create `backend/src/ProjectManagement.Application/Interfaces/IBoardRepository.cs`:

```csharp
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Interfaces;

public interface IBoardRepository : IRepository<ProjectBoard>
{
    Task<IReadOnlyList<ProjectBoard>> GetBoardsByProjectAsync(Guid projectId, CancellationToken ct = default);
}
```

- [ ] **Step 2: Create the repository implementation**

Create `backend/src/ProjectManagement.Infrastructure/Repositories/BoardRepository.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Infrastructure.Persistence;

namespace ProjectManagement.Infrastructure.Repositories;

public class BoardRepository(ApplicationDbContext context)
    : Repository<ProjectBoard>(context), IBoardRepository
{
    public async Task<IReadOnlyList<ProjectBoard>> GetBoardsByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await context.ProjectBoards
            .Where(b => b.ProjectId == projectId)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync(ct);
}
```

- [ ] **Step 3: Register in DI**

In `backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs`, add after the existing repository registrations:

```csharp
services.AddScoped<IBoardRepository, BoardRepository>();
```

- [ ] **Step 4: Build to verify no errors**

```
cd backend
dotnet build src/ProjectManagement.Infrastructure/ProjectManagement.Infrastructure.csproj
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Interfaces/IBoardRepository.cs \
        backend/src/ProjectManagement.Infrastructure/Repositories/BoardRepository.cs \
        backend/src/ProjectManagement.Infrastructure/DependencyInjection.cs
git commit -m "feat: add IBoardRepository and BoardRepository"
```

---

## Task 4: DTOs + AutoMapper Mappings

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/DTOs/ProjectBoardDto.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/DTOs/ProjectBoardDetailDto.cs`
- Modify: `backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs`

- [ ] **Step 1: Create ProjectBoardDto (list — no ContentJson)**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/DTOs/ProjectBoardDto.cs`:

```csharp
namespace ProjectManagement.Application.Features.ProjectBoards.DTOs;

public record ProjectBoardDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = default!;
    public Guid ProjectId { get; init; }
    public string CreatedById { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
```

- [ ] **Step 2: Create ProjectBoardDetailDto (detail — with ContentJson)**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/DTOs/ProjectBoardDetailDto.cs`:

```csharp
namespace ProjectManagement.Application.Features.ProjectBoards.DTOs;

public record ProjectBoardDetailDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = default!;
    public string ContentJson { get; init; } = default!;
    public Guid ProjectId { get; init; }
    public string CreatedById { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
```

- [ ] **Step 3: Add AutoMapper mappings**

In `backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs`, add inside the `MappingProfile()` constructor (alongside the other `CreateMap` calls):

```csharp
CreateMap<ProjectBoard, ProjectBoardDto>();
CreateMap<ProjectBoard, ProjectBoardDetailDto>();
```

Also add the using at the top of the file:

```csharp
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
```

- [ ] **Step 4: Build to verify**

```
cd backend
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/ProjectBoards/ \
        backend/src/ProjectManagement.Application/Mappings/MappingProfile.cs
git commit -m "feat: add ProjectBoard DTOs and AutoMapper mappings"
```

---

## Task 5: CreateProjectBoard Command

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommandValidator.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommandHandler.cs`

- [ ] **Step 1: Create the command record**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommand.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;

public sealed record CreateProjectBoardCommand(
    string Title,
    Guid ProjectId,
    string CreatedById) : ICommand<ProjectBoardDto>;
```

- [ ] **Step 2: Create the validator**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommandValidator.cs`:

```csharp
using FluentValidation;

namespace ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;

public sealed class CreateProjectBoardCommandValidator : AbstractValidator<CreateProjectBoardCommand>
{
    public CreateProjectBoardCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.CreatedById).NotEmpty();
    }
}
```

- [ ] **Step 3: Create the handler**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/CreateProjectBoardCommandHandler.cs`:

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;

internal sealed class CreateProjectBoardCommandHandler(
    IBoardRepository repository,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateProjectBoardCommand, Result<ProjectBoardDto>>
{
    public async Task<Result<ProjectBoardDto>> Handle(CreateProjectBoardCommand request, CancellationToken cancellationToken)
    {
        if (!await permissions.HasProjectRoleAsync(request.ProjectId, request.CreatedById, ProjectManagement.Domain.Enums.ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Board.Forbidden", "You must be a project member to create boards.");

        var board = ProjectBoard.Create(request.Title, request.ProjectId, request.CreatedById);
        await repository.AddAsync(board, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProjectBoardDto>(board);
    }
}
```

- [ ] **Step 4: Build to verify**

```
cd backend
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/ProjectBoards/CreateProjectBoard/
git commit -m "feat: add CreateProjectBoard command, validator, and handler"
```

---

## Task 6: UpdateProjectBoard Command

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommandValidator.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommandHandler.cs`

- [ ] **Step 1: Create the command**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommand.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;

public sealed record UpdateProjectBoardCommand(
    Guid BoardId,
    string? Title,
    string? ContentJson,
    string UserId) : ICommand<ProjectBoardDetailDto>;
```

- [ ] **Step 2: Create the validator**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommandValidator.cs`:

```csharp
using FluentValidation;

namespace ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;

public sealed class UpdateProjectBoardCommandValidator : AbstractValidator<UpdateProjectBoardCommand>
{
    public UpdateProjectBoardCommandValidator()
    {
        RuleFor(x => x.BoardId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Title).MaximumLength(200).When(x => x.Title is not null);
    }
}
```

- [ ] **Step 3: Create the handler**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/UpdateProjectBoardCommandHandler.cs`:

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;

internal sealed class UpdateProjectBoardCommandHandler(
    IBoardRepository repository,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<UpdateProjectBoardCommand, Result<ProjectBoardDetailDto>>
{
    public async Task<Result<ProjectBoardDetailDto>> Handle(UpdateProjectBoardCommand request, CancellationToken cancellationToken)
    {
        var board = await repository.GetByIdAsync(request.BoardId, cancellationToken);
        if (board is null)
            return Error.NotFound("Board.NotFound", $"Board {request.BoardId} not found.");

        if (!await permissions.HasProjectRoleAsync(board.ProjectId, request.UserId, ProjectManagement.Domain.Enums.ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Board.Forbidden", "You must be a project member to edit boards.");

        if (request.Title is not null)
            board.UpdateTitle(request.Title);

        if (request.ContentJson is not null)
            board.UpdateContent(request.ContentJson);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProjectBoardDetailDto>(board);
    }
}
```

- [ ] **Step 4: Build to verify**

```
cd backend
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/ProjectBoards/UpdateProjectBoard/
git commit -m "feat: add UpdateProjectBoard command, validator, and handler"
```

---

## Task 7: DeleteProjectBoard Command

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/DeleteProjectBoardCommand.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/DeleteProjectBoardCommandHandler.cs`

- [ ] **Step 1: Create the command**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/DeleteProjectBoardCommand.cs`:

```csharp
using ProjectManagement.Application.Common;

namespace ProjectManagement.Application.Features.ProjectBoards.DeleteProjectBoard;

public sealed record DeleteProjectBoardCommand(Guid BoardId, string UserId) : ICommand;
```

- [ ] **Step 2: Create the handler**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/DeleteProjectBoardCommandHandler.cs`:

```csharp
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.DeleteProjectBoard;

internal sealed class DeleteProjectBoardCommandHandler(
    IBoardRepository repository,
    IProjectPermissionService permissions,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteProjectBoardCommand, Result>
{
    public async Task<Result> Handle(DeleteProjectBoardCommand request, CancellationToken cancellationToken)
    {
        var board = await repository.GetByIdAsync(request.BoardId, cancellationToken);
        if (board is null)
            return Error.NotFound("Board.NotFound", $"Board {request.BoardId} not found.");

        if (!await permissions.HasProjectRoleAsync(board.ProjectId, request.UserId, ProjectManagement.Domain.Enums.ProjectMemberRole.Viewer, cancellationToken))
            return Error.Forbidden("Board.Forbidden", "You must be a project member to delete boards.");

        await repository.DeleteAsync(board, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
```

- [ ] **Step 3: Build to verify**

```
cd backend
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/ProjectBoards/DeleteProjectBoard/
git commit -m "feat: add DeleteProjectBoard command and handler"
```

---

## Task 8: GetProjectBoards + GetProjectBoard Queries

**Files:**
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/GetProjectBoardsQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/GetProjectBoardsQueryHandler.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/GetProjectBoardQuery.cs`
- Create: `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/GetProjectBoardQueryHandler.cs`

- [ ] **Step 1: Create GetProjectBoardsQuery**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/GetProjectBoardsQuery.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoards;

public sealed record GetProjectBoardsQuery(Guid ProjectId) : IQuery<IReadOnlyList<ProjectBoardDto>>;
```

- [ ] **Step 2: Create GetProjectBoardsQueryHandler**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/GetProjectBoardsQueryHandler.cs`:

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoards;

internal sealed class GetProjectBoardsQueryHandler(IBoardRepository repository, IMapper mapper)
    : IRequestHandler<GetProjectBoardsQuery, Result<IReadOnlyList<ProjectBoardDto>>>
{
    public async Task<Result<IReadOnlyList<ProjectBoardDto>>> Handle(GetProjectBoardsQuery request, CancellationToken cancellationToken)
    {
        var boards = await repository.GetBoardsByProjectAsync(request.ProjectId, cancellationToken);
        return mapper.Map<IReadOnlyList<ProjectBoardDto>>(boards);
    }
}
```

- [ ] **Step 3: Create GetProjectBoardQuery**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/GetProjectBoardQuery.cs`:

```csharp
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoard;

public sealed record GetProjectBoardQuery(Guid BoardId) : IQuery<ProjectBoardDetailDto>;
```

- [ ] **Step 4: Create GetProjectBoardQueryHandler**

Create `backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/GetProjectBoardQueryHandler.cs`:

```csharp
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Interfaces;

namespace ProjectManagement.Application.Features.ProjectBoards.GetProjectBoard;

internal sealed class GetProjectBoardQueryHandler(IBoardRepository repository, IMapper mapper)
    : IRequestHandler<GetProjectBoardQuery, Result<ProjectBoardDetailDto>>
{
    public async Task<Result<ProjectBoardDetailDto>> Handle(GetProjectBoardQuery request, CancellationToken cancellationToken)
    {
        var board = await repository.GetByIdAsync(request.BoardId, cancellationToken);
        if (board is null)
            return Error.NotFound("Board.NotFound", $"Board {request.BoardId} not found.");
        return mapper.Map<ProjectBoardDetailDto>(board);
    }
}
```

- [ ] **Step 5: Build to verify**

```
cd backend
dotnet build src/ProjectManagement.Application/ProjectManagement.Application.csproj
```
Expected: Build succeeded.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoards/ \
        backend/src/ProjectManagement.Application/Features/ProjectBoards/GetProjectBoard/
git commit -m "feat: add GetProjectBoards and GetProjectBoard queries"
```

---

## Task 9: ProjectBoardsController

**Files:**
- Create: `backend/src/ProjectManagement.WebApi/Controllers/ProjectBoardsController.cs`

- [ ] **Step 1: Create the controller**

Create `backend/src/ProjectManagement.WebApi/Controllers/ProjectBoardsController.cs`:

```csharp
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Application.Features.ProjectBoards.CreateProjectBoard;
using ProjectManagement.Application.Features.ProjectBoards.DeleteProjectBoard;
using ProjectManagement.Application.Features.ProjectBoards.DTOs;
using ProjectManagement.Application.Features.ProjectBoards.GetProjectBoard;
using ProjectManagement.Application.Features.ProjectBoards.GetProjectBoards;
using ProjectManagement.Application.Features.ProjectBoards.UpdateProjectBoard;
using ProjectManagement.WebApi.Extensions;

namespace ProjectManagement.WebApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/boards")]
[Authorize]
public class ProjectBoardsController(IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectBoardDto>>> GetAll(Guid projectId, CancellationToken ct)
        => (await mediator.Send(new GetProjectBoardsQuery(projectId), ct)).ToActionResult(this);

    [HttpGet("{boardId:guid}")]
    public async Task<ActionResult<ProjectBoardDetailDto>> GetById(Guid projectId, Guid boardId, CancellationToken ct)
        => (await mediator.Send(new GetProjectBoardQuery(boardId), ct)).ToActionResult(this);

    [HttpPost]
    public async Task<ActionResult<ProjectBoardDto>> Create(Guid projectId, [FromBody] CreateBoardRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateProjectBoardCommand(request.Title, projectId, CurrentUserId), ct);
        if (!result.IsSuccess) return result.ToActionResult(this);
        return CreatedAtAction(nameof(GetById), new { projectId, boardId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{boardId:guid}")]
    public async Task<ActionResult<ProjectBoardDetailDto>> Update(Guid projectId, Guid boardId, [FromBody] UpdateBoardRequest request, CancellationToken ct)
        => (await mediator.Send(new UpdateProjectBoardCommand(boardId, request.Title, request.ContentJson, CurrentUserId), ct)).ToActionResult(this);

    [HttpDelete("{boardId:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid boardId, CancellationToken ct)
        => (await mediator.Send(new DeleteProjectBoardCommand(boardId, CurrentUserId), ct)).ToActionResult(this);
}

public record CreateBoardRequest(string Title);
public record UpdateBoardRequest(string? Title, string? ContentJson);
```

- [ ] **Step 2: Build the full WebApi project to verify**

```
cd backend
dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj
```
Expected: Build succeeded.

- [ ] **Step 3: Smoke test the endpoints**

Start the API and test with curl or the Scalar docs at `http://localhost:5059/scalar`:
```
dotnet run --project src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj
```
- `GET /api/projects/{any-project-id}/boards` should return `[]`
- `POST /api/projects/{project-id}/boards` with `{"title":"Test Board"}` should return 201 with the new board

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.WebApi/Controllers/ProjectBoardsController.cs
git commit -m "feat: add ProjectBoardsController with CRUD endpoints"
```

---

## Task 10: BoardHub (SignalR)

**Files:**
- Create: `backend/src/ProjectManagement.WebApi/Hubs/BoardHub.cs`
- Modify: `backend/src/ProjectManagement.WebApi/Program.cs`

- [ ] **Step 1: Create the BoardHub**

Create `backend/src/ProjectManagement.WebApi/Hubs/BoardHub.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ProjectManagement.WebApi.Hubs;

[Authorize]
public class BoardHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (userId is not null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        await base.OnConnectedAsync();
    }

    public async Task JoinBoard(string boardId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"board-{boardId}");

    public async Task LeaveBoard(string boardId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board-{boardId}");

    public async Task BroadcastBoardChange(string boardId, string contentJson)
        => await Clients.OthersInGroup($"board-{boardId}").SendAsync("ReceiveBoardChange", contentJson);
}
```

- [ ] **Step 2: Register BoardHub in Program.cs**

In `backend/src/ProjectManagement.WebApi/Program.cs`, add after the existing `app.MapHub<TaskHub>(...)` line:

```csharp
app.MapHub<ProjectManagement.WebApi.Hubs.BoardHub>("/hubs/boards").RequireCors("Angular");
```

- [ ] **Step 3: Build to verify**

```
cd backend
dotnet build src/ProjectManagement.WebApi/ProjectManagement.WebApi.csproj
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ProjectManagement.WebApi/Hubs/BoardHub.cs \
        backend/src/ProjectManagement.WebApi/Program.cs
git commit -m "feat: add BoardHub for real-time board collaboration"
```

---

## Task 11: Frontend — Board Models

**Files:**
- Create: `frontend/libs/shared/models/src/lib/board.model.ts`
- Modify: `frontend/libs/shared/models/src/index.ts`

- [ ] **Step 1: Create board.model.ts**

Create `frontend/libs/shared/models/src/lib/board.model.ts`:

```typescript
export interface ProjectBoard {
  id: string;
  title: string;
  projectId: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectBoardDetail {
  id: string;
  title: string;
  contentJson: string;
  projectId: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBoardRequest {
  title: string;
}

export interface UpdateBoardRequest {
  title?: string;
  contentJson?: string;
}
```

- [ ] **Step 2: Export from shared models index**

In `frontend/libs/shared/models/src/index.ts`, add:

```typescript
export * from './lib/board.model';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/libs/shared/models/src/lib/board.model.ts \
        frontend/libs/shared/models/src/index.ts
git commit -m "feat: add ProjectBoard frontend models"
```

---

## Task 12: Frontend — Nx Library Scaffolding + Install Dependencies

- [ ] **Step 1: Install Excalidraw and React dependencies**

```
cd frontend
pnpm add @excalidraw/excalidraw react react-dom
pnpm add -D @types/react @types/react-dom
```

- [ ] **Step 2: Create boards/data-access library**

```
cd frontend
pnpm nx generate @nx/angular:library --name=boards-data-access --directory=libs/boards/data-access --standalone --no-interactive
```

If the generator prompts for options or fails, check `pnpm nx generate @nx/angular:library --help` and match the flags to the existing libs structure (e.g. `libs/projects/data-access`).

- [ ] **Step 3: Create boards/feature library**

```
cd frontend
pnpm nx generate @nx/angular:library --name=boards-feature --directory=libs/boards/feature --standalone --no-interactive
```

- [ ] **Step 4: Verify libraries are registered in tsconfig.base.json**

```
cat tsconfig.base.json | grep boards
```
Expected: Two path aliases — `@pm/boards/data-access` and `@pm/boards/feature` (exact names may differ based on generator output; check and note the actual aliases).

- [ ] **Step 5: Commit**

```bash
git add frontend/libs/boards/ frontend/tsconfig.base.json frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat: scaffold boards data-access and feature Nx libs, install Excalidraw"
```

---

## Task 13: Frontend — BoardService + BoardHubService

**Files:**
- Create: `frontend/libs/boards/data-access/src/lib/board.service.ts`
- Create: `frontend/libs/boards/data-access/src/lib/board-hub.service.ts`
- Modify: `frontend/libs/boards/data-access/src/index.ts`

- [ ] **Step 1: Create BoardService**

Create `frontend/libs/boards/data-access/src/lib/board.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';
import { ProjectBoard, ProjectBoardDetail, CreateBoardRequest, UpdateBoardRequest } from '@pm/shared/models';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly http = inject(HttpClient);

  getBoards(projectId: string) {
    return this.http.get<ProjectBoard[]>(
      `${environment.apiUrl}/projects/${projectId}/boards`
    );
  }

  getBoard(projectId: string, boardId: string) {
    return this.http.get<ProjectBoardDetail>(
      `${environment.apiUrl}/projects/${projectId}/boards/${boardId}`
    );
  }

  createBoard(projectId: string, request: CreateBoardRequest) {
    return this.http.post<ProjectBoard>(
      `${environment.apiUrl}/projects/${projectId}/boards`,
      request
    );
  }

  updateBoard(projectId: string, boardId: string, request: UpdateBoardRequest) {
    return this.http.put<ProjectBoardDetail>(
      `${environment.apiUrl}/projects/${projectId}/boards/${boardId}`,
      request
    );
  }

  deleteBoard(projectId: string, boardId: string) {
    return this.http.delete<void>(
      `${environment.apiUrl}/projects/${projectId}/boards/${boardId}`
    );
  }
}
```

- [ ] **Step 2: Create BoardHubService**

Create `frontend/libs/boards/data-access/src/lib/board-hub.service.ts`:

```typescript
import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BoardHubService implements OnDestroy {
  private hub: signalR.HubConnection | null = null;
  private readonly boardChange$ = new Subject<string>();

  readonly boardChanges$ = this.boardChange$.asObservable();

  async connect(): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5059/hubs/boards', {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveBoardChange', (contentJson: string) => {
      this.boardChange$.next(contentJson);
    });

    await this.hub.start();
  }

  async joinBoard(boardId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('JoinBoard', boardId);
  }

  async leaveBoard(boardId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('LeaveBoard', boardId);
  }

  async broadcastChange(boardId: string, contentJson: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('BroadcastBoardChange', boardId, contentJson);
  }

  disconnect(): void {
    this.hub?.stop();
    this.hub = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
```

- [ ] **Step 3: Update data-access index.ts**

In `frontend/libs/boards/data-access/src/index.ts`, replace the generated contents with:

```typescript
export * from './lib/board.service';
export * from './lib/board-hub.service';
```

- [ ] **Step 4: Build data-access lib to verify**

```
cd frontend
pnpm nx build boards-data-access
```
Expected: Build succeeded (the lib name may differ — check the name used in `project.json` inside `libs/boards/data-access/`).

- [ ] **Step 5: Commit**

```bash
git add frontend/libs/boards/data-access/src/
git commit -m "feat: add BoardService and BoardHubService"
```

---

## Task 14: Frontend — ExcalidrawWrapperComponent (React in Angular)

**Files:**
- Create: `frontend/libs/boards/feature/src/lib/excalidraw-wrapper.component.ts`

- [ ] **Step 1: Create the React-in-Angular wrapper**

Create `frontend/libs/boards/feature/src/lib/excalidraw-wrapper.component.ts`:

```typescript
import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  Input, Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

@Component({
  selector: 'pm-excalidraw-wrapper',
  standalone: true,
  template: `<div #container style="width:100%;height:100%;"></div>`,
})
export class ExcalidrawWrapperComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  @Input() initialData: string = '';
  @Input() remoteChange: string | null = null;
  @Output() contentChanged = new EventEmitter<string>();

  private root: ReactDOM.Root | null = null;
  private api: ExcalidrawImperativeAPI | null = null;
  private isApplyingRemoteChange = false;

  ngAfterViewInit(): void {
    this.root = ReactDOM.createRoot(this.containerRef.nativeElement);
    this.renderExcalidraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['remoteChange'] && changes['remoteChange'].currentValue && this.api) {
      const json = changes['remoteChange'].currentValue as string;
      if (!json) return;
      try {
        const parsed = JSON.parse(json);
        this.isApplyingRemoteChange = true;
        this.api.updateScene({ elements: parsed.elements ?? [], appState: parsed.appState });
        this.isApplyingRemoteChange = false;
      } catch {
        this.isApplyingRemoteChange = false;
      }
    }
  }

  private renderExcalidraw(): void {
    let initialData: { elements: unknown[]; appState?: unknown } = { elements: [] };
    try {
      if (this.initialData) initialData = JSON.parse(this.initialData);
    } catch { /* empty canvas */ }

    const self = this;

    this.root!.render(
      React.createElement(Excalidraw, {
        initialData,
        excalidrawAPI: (api: ExcalidrawImperativeAPI) => { self.api = api; },
        onChange: (_elements: unknown, appState: unknown) => {
          if (self.isApplyingRemoteChange) return;
          const json = JSON.stringify({ elements: _elements, appState });
          self.contentChanged.emit(json);
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.root?.unmount();
  }
}
```

- [ ] **Step 2: Configure TypeScript to allow React JSX**

In `frontend/tsconfig.base.json` (or the tsconfig for the boards/feature lib), verify that `"jsx": "react"` or `"jsx": "react-jsx"` is NOT needed for plain `React.createElement` usage (it isn't — `React.createElement` works without JSX transform). If the build complains about JSX, add `"jsx": "react-jsx"` to the lib's own `tsconfig.json`.

- [ ] **Step 3: Build to verify**

```
cd frontend
pnpm nx build boards-feature
```

If Excalidraw types cause issues, add `"skipLibCheck": true` to the feature lib's `tsconfig.json`.

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/boards/feature/src/lib/excalidraw-wrapper.component.ts
git commit -m "feat: add ExcalidrawWrapperComponent (React-in-Angular)"
```

---

## Task 15: Frontend — BoardsTabComponent (List + Detail views)

**Files:**
- Create: `frontend/libs/boards/feature/src/lib/boards-tab.component.ts`
- Modify: `frontend/libs/boards/feature/src/index.ts`

- [ ] **Step 1: Create BoardsTabComponent**

Create `frontend/libs/boards/feature/src/lib/boards-tab.component.ts`:

```typescript
import {
  Component, Input, OnInit, OnDestroy, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { debounceTime, Subject } from 'rxjs';
import { BoardService, BoardHubService } from '@pm/boards/data-access';
import { ProjectBoard, ProjectBoardDetail } from '@pm/shared/models';
import { ExcalidrawWrapperComponent } from './excalidraw-wrapper.component';

@Component({
  selector: 'pm-boards-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, ExcalidrawWrapperComponent],
  template: `
    <!-- ── Board List ─────────────────────────── -->
    <div *ngIf="!activeBoard()" class="boards-list">
      <div class="boards-header">
        <span class="boards-title">Boards</span>
        <button class="btn-sm" (click)="showCreate = true" *ngIf="!showCreate">
          <span class="material-icons-round" style="font-size:16px;vertical-align:middle">add</span> New
        </button>
      </div>

      <div *ngIf="showCreate" class="create-row">
        <input
          class="inline-input"
          [(ngModel)]="newTitle"
          placeholder="Board name"
          (keydown.enter)="createBoard()"
          (keydown.escape)="cancelCreate()"
          autofocus
        />
        <button class="btn-sm" (click)="createBoard()" [disabled]="!newTitle.trim()">Create</button>
        <button class="btn-sm btn-ghost" (click)="cancelCreate()">Cancel</button>
      </div>

      <div *ngIf="loading()" class="boards-loading">Loading...</div>

      <div *ngIf="!loading() && boards().length === 0 && !showCreate" class="boards-empty">
        No boards yet. Create one to start planning.
      </div>

      <div class="board-item" *ngFor="let board of boards()" (click)="openBoard(board)">
        <span class="material-icons-round board-icon">dashboard</span>
        <span class="board-name">{{ board.title }}</span>
        <span class="material-icons-round board-arrow">chevron_right</span>
      </div>
    </div>

    <!-- ── Board Detail ───────────────────────── -->
    <div *ngIf="activeBoard()" class="board-detail">
      <div class="board-detail-header">
        <button class="btn-ghost back-btn" (click)="closeBoard()">
          <span class="material-icons-round">arrow_back</span> Back
        </button>
        <span *ngIf="!editingTitle" class="board-detail-title" (click)="startRenaming()">
          {{ activeBoard()!.title }}
          <span class="material-icons-round rename-icon">edit</span>
        </span>
        <input
          *ngIf="editingTitle"
          class="inline-input title-input"
          [(ngModel)]="titleDraft"
          (keydown.enter)="saveTitle()"
          (keydown.escape)="cancelRename()"
          autofocus
        />
        <button *ngIf="editingTitle" class="btn-sm" (click)="saveTitle()">Save</button>
        <button
          class="btn-sm btn-danger"
          style="margin-left:auto"
          (click)="deleteBoard(activeBoard()!.id)"
        >Delete</button>
      </div>
      <div class="excalidraw-container">
        <pm-excalidraw-wrapper
          [initialData]="activeBoard()!.contentJson"
          [remoteChange]="remoteChange()"
          (contentChanged)="onContentChanged($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    .boards-list { padding: 16px; }
    .boards-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .boards-title { font-weight: 600; font-size: 15px; }
    .create-row { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
    .inline-input { border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 6px 10px; font-size: 13px; outline: none; }
    .title-input { font-size: 15px; font-weight: 600; }
    .btn-sm { padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border, #e2e8f0); background: var(--surface, #fff); cursor: pointer; font-size: 13px; }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border: none; cursor: pointer; }
    .btn-danger { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .boards-loading, .boards-empty { color: var(--muted, #94a3b8); font-size: 13px; padding: 12px 0; }
    .board-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
    .board-item:hover { background: var(--hover, #f8fafc); }
    .board-icon { font-size: 18px; color: var(--muted, #94a3b8); }
    .board-name { flex: 1; font-size: 14px; }
    .board-arrow { font-size: 18px; color: var(--muted, #94a3b8); }
    .board-detail { display: flex; flex-direction: column; height: 100%; }
    .board-detail-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border, #e2e8f0); }
    .board-detail-title { font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .rename-icon { font-size: 14px; color: var(--muted, #94a3b8); opacity: 0; transition: opacity 0.15s; }
    .board-detail-title:hover .rename-icon { opacity: 1; }
    .back-btn { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted, #94a3b8); }
    .excalidraw-container { flex: 1; min-height: 0; }
  `],
})
export class BoardsTabComponent implements OnInit, OnDestroy {
  @Input({ required: true }) projectId!: string;

  private boardService = inject(BoardService);
  private hubService = inject(BoardHubService);
  private snackBar = inject(MatSnackBar);

  boards = signal<ProjectBoard[]>([]);
  activeBoard = signal<ProjectBoardDetail | null>(null);
  remoteChange = signal<string | null>(null);
  loading = signal(true);

  showCreate = false;
  newTitle = '';
  editingTitle = false;
  titleDraft = '';

  private contentChange$ = new Subject<string>();
  private persistSub?: Subscription;
  private hubSub?: Subscription;
  private currentBoardId?: string;

  ngOnInit() {
    this.boardService.getBoards(this.projectId).subscribe({
      next: (b) => { this.boards.set(b); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.persistSub = this.contentChange$.pipe(debounceTime(2000)).subscribe((json) => {
      if (!this.currentBoardId) return;
      this.boardService.updateBoard(this.projectId, this.currentBoardId, { contentJson: json })
        .subscribe();
    });
  }

  createBoard() {
    const title = this.newTitle.trim();
    if (!title) return;
    this.boardService.createBoard(this.projectId, { title }).subscribe({
      next: (b) => {
        this.boards.update(prev => [...prev, b]);
        this.cancelCreate();
        this.toast('Board created');
      },
      error: () => this.toast('Failed to create board', true),
    });
  }

  cancelCreate() {
    this.showCreate = false;
    this.newTitle = '';
  }

  openBoard(board: ProjectBoard) {
    this.boardService.getBoard(this.projectId, board.id).subscribe({
      next: async (detail) => {
        this.activeBoard.set(detail);
        this.currentBoardId = detail.id;
        await this.connectToHub(detail.id);
      },
      error: () => this.toast('Failed to load board', true),
    });
  }

  closeBoard() {
    if (this.currentBoardId) {
      this.hubService.leaveBoard(this.currentBoardId);
    }
    this.hubSub?.unsubscribe();
    this.activeBoard.set(null);
    this.currentBoardId = undefined;
    this.remoteChange.set(null);
  }

  onContentChanged(json: string) {
    if (!this.currentBoardId) return;
    this.hubService.broadcastChange(this.currentBoardId, json);
    this.contentChange$.next(json);
  }

  startRenaming() {
    this.titleDraft = this.activeBoard()!.title;
    this.editingTitle = true;
  }

  cancelRename() {
    this.editingTitle = false;
    this.titleDraft = '';
  }

  saveTitle() {
    const title = this.titleDraft.trim();
    if (!title || !this.currentBoardId) return;
    this.boardService.updateBoard(this.projectId, this.currentBoardId, { title }).subscribe({
      next: (updated) => {
        this.activeBoard.update(b => b ? { ...b, title: updated.title } : b);
        this.boards.update(all => all.map(b => b.id === updated.id ? { ...b, title: updated.title } : b));
        this.editingTitle = false;
        this.toast('Board renamed');
      },
      error: () => this.toast('Failed to rename', true),
    });
  }

  deleteBoard(boardId: string) {
    if (!confirm('Delete this board? This cannot be undone.')) return;
    this.boardService.deleteBoard(this.projectId, boardId).subscribe({
      next: () => {
        this.boards.update(all => all.filter(b => b.id !== boardId));
        this.closeBoard();
        this.toast('Board deleted');
      },
      error: () => this.toast('Failed to delete board', true),
    });
  }

  private async connectToHub(boardId: string) {
    await this.hubService.connect();
    await this.hubService.joinBoard(boardId);
    this.hubSub = this.hubService.boardChanges$.subscribe((json) => {
      this.remoteChange.set(json);
    });
  }

  private toast(message: string, isError = false) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000,
      panelClass: isError ? ['snack-error'] : ['snack-success'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  ngOnDestroy() {
    if (this.currentBoardId) this.hubService.leaveBoard(this.currentBoardId);
    this.hubSub?.unsubscribe();
    this.persistSub?.unsubscribe();
  }
}
```

- [ ] **Step 2: Update feature index.ts**

In `frontend/libs/boards/feature/src/index.ts`, replace generated contents with:

```typescript
export * from './lib/boards-tab.component';
export * from './lib/excalidraw-wrapper.component';
```

- [ ] **Step 3: Build to verify**

```
cd frontend
pnpm nx build boards-feature
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/boards/feature/src/
git commit -m "feat: add BoardsTabComponent with board list and Excalidraw detail"
```

---

## Task 16: Wire Boards Tab into ProjectDetailComponent

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

- [ ] **Step 1: Add BoardsTabComponent import**

In `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`, add to the imports array at the top of the file:

```typescript
import { BoardsTabComponent } from '@pm/boards/feature';
```

And add `BoardsTabComponent` to the `imports` array inside the `@Component` decorator (alongside `CommonModule`, `DragDropModule`, etc.).

- [ ] **Step 2: Add the Boards tab button**

In the tab-bar section of the component template (around line 62–87 where the other tab buttons are), add:

```html
<button class="tab" [class.active]="activeTab === 'boards'" (click)="activeTab = 'boards'">
  <span class="material-icons-round">dashboard</span> Boards
</button>
```

Place it after the existing "Sprints" tab button.

- [ ] **Step 3: Add the Boards tab panel**

After the last tab panel (`*ngIf="activeTab === 'invites'"` section), add:

```html
<!-- ── Boards tab ────────────────────────── -->
<div *ngIf="activeTab === 'boards'" style="height:calc(100vh - 200px);">
  <pm-boards-tab [projectId]="project()!.id" />
</div>
```

- [ ] **Step 4: Build the full frontend**

```
cd frontend
pnpm nx build project-management
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Run the dev server and test**

```
cd frontend
pnpm nx serve project-management
```

1. Open `http://localhost:4200` and log in.
2. Navigate to any project.
3. Click the **Boards** tab — should show "No boards yet."
4. Click **+ New**, type a name, press Enter — board appears in the list.
5. Click the board — Excalidraw canvas opens.
6. Draw something — canvas responds.
7. Open the same board in a second browser tab — drawing in one should appear in the other within ~500ms.
8. Refresh the page and open the board — your drawing should still be there (persisted).

- [ ] **Step 6: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: add Boards tab to project detail with real-time Excalidraw collaboration"
```

---

## Done

All tasks complete. The brainstorming boards feature is fully implemented:
- Backend: domain entity, EF migration, CRUD API, SignalR hub
- Frontend: Nx libs, Excalidraw wrapper, boards tab wired into project detail, real-time via SignalR
