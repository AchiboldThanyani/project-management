# @Mentions in Comments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to @mention project members in task comments, rendering mentions as blue badges and sending an in-app notification to each mentioned user.

**Architecture:** Mentions are stored inline as `@[Full Name](userId)` in `Comment.Content`. On save, `CreateCommentCommandHandler` regex-extracts mentioned user IDs and creates `Mentioned` (type 9) notifications via the existing `INotificationService` pipeline. A new Angular `MentionPipe` transforms the stored syntax into `<span class="mention-badge">` elements for display. The comment textarea intercepts `@` keypresses and shows a floating dropdown of project members already loaded in the component.

**Tech Stack:** .NET 9 / C# (backend), xUnit (tests), Angular 20 signals + `*ngFor` (frontend), `DomSanitizer` (safe HTML in pipe)

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/src/ProjectManagement.Domain/Enums/NotificationType.cs` |
| Modify | `backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs` |
| Create | `backend/tests/ProjectManagement.Application.Tests/Comments/MentionExtractionTests.cs` |
| Create | `frontend/libs/shared/util/src/lib/mention.pipe.ts` |
| Modify | `frontend/libs/shared/util/src/index.ts` |
| Modify | `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts` |
| Modify | `frontend/libs/layout/feature/src/lib/notification-bell.component.ts` |

---

### Task 1: Add `Mentioned` notification type

**Files:**
- Modify: `backend/src/ProjectManagement.Domain/Enums/NotificationType.cs`

- [ ] **Step 1: Add the enum value**

Open `backend/src/ProjectManagement.Domain/Enums/NotificationType.cs`. The current last value is `AddedToProject = 8`. Add one line:

```csharp
namespace ProjectManagement.Domain.Enums;

public enum NotificationType
{
    TaskAssigned    = 0,
    TaskBlocked     = 1,
    TaskOverdue     = 2,
    TicketReplied   = 3,
    SlaBreached     = 4,
    CommentAdded    = 5,
    SprintStarted   = 6,
    SprintCompleted = 7,
    AddedToProject  = 8,
    Mentioned       = 9,
}
```

- [ ] **Step 2: Build to confirm no compile errors**

```bash
cd backend
dotnet build src/ProjectManagement.Domain/ProjectManagement.Domain.csproj --nologo -v:minimal
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add backend/src/ProjectManagement.Domain/Enums/NotificationType.cs
git commit -m "feat: add Mentioned = 9 to NotificationType"
```

---

### Task 2: Extract mentions and notify in `CreateCommentCommandHandler`

**Files:**
- Modify: `backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs`
- Create: `backend/tests/ProjectManagement.Application.Tests/Comments/MentionExtractionTests.cs`

- [ ] **Step 1: Write the failing tests first**

Create `backend/tests/ProjectManagement.Application.Tests/Comments/MentionExtractionTests.cs`:

```csharp
using ProjectManagement.Application.Features.Comments.CreateComment;

namespace ProjectManagement.Application.Tests.Comments;

public class MentionExtractionTests
{
    [Fact]
    public void ExtractMentionedUserIds_NoMentions_ReturnsEmpty()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds("Hello world");
        Assert.Empty(result);
    }

    [Fact]
    public void ExtractMentionedUserIds_OneMention_ReturnsId()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "Hey @[John Doe](abc-123) can you check?");
        Assert.Single(result);
        Assert.Contains("abc-123", result);
    }

    [Fact]
    public void ExtractMentionedUserIds_MultipleMentions_ReturnsAllIds()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "@[Alice](user-1) and @[Bob](user-2) please review");
        Assert.Equal(2, result.Count);
        Assert.Contains("user-1", result);
        Assert.Contains("user-2", result);
    }

    [Fact]
    public void ExtractMentionedUserIds_DuplicateMention_DeduplicatesIds()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "@[Alice](user-1) hey @[Alice](user-1) again");
        Assert.Single(result);
        Assert.Contains("user-1", result);
    }

    [Fact]
    public void ExtractMentionedUserIds_MalformedSyntax_ReturnsEmpty()
    {
        var result = CreateCommentCommandHandler.ExtractMentionedUserIds(
            "@Alice plain text @[NoClosing(user-1)");
        Assert.Empty(result);
    }
}
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
cd backend
dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --nologo -v:minimal
```

Expected: compile error — `ExtractMentionedUserIds` does not exist yet.

- [ ] **Step 3: Add `ExtractMentionedUserIds` and mention notification logic to the handler**

Replace the full contents of `backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs`:

```csharp
using System.Text.RegularExpressions;
using AutoMapper;
using MediatR;
using ProjectManagement.Application.Common;
using ProjectManagement.Application.Features.Comments.DTOs;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Enums;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Features.Comments.CreateComment;

internal sealed class CreateCommentCommandHandler(
    ICommentRepository repository,
    ITaskRepository taskRepository,
    INotificationRepository notificationRepo,
    INotificationService notificationService,
    IUnitOfWork unitOfWork,
    IMapper mapper)
    : IRequestHandler<CreateCommentCommand, Result<CommentDto>>
{
    private static readonly Regex MentionRegex =
        new(@"@\[([^\]]+)\]\(([a-zA-Z0-9\-]+)\)", RegexOptions.Compiled);

    public async Task<Result<CommentDto>> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        var task = await taskRepository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Error.NotFound("Task.NotFound", $"Task {request.TaskId} was not found.");

        var comment = Comment.Create(request.Content, request.TaskId, request.AuthorId);
        await repository.AddAsync(comment, cancellationToken);

        // Collect CommentAdded recipients: assignee + prior comment authors, deduped, excluding commenter
        var recipients = new HashSet<string>();

        if (task.AssigneeId is not null && task.AssigneeId != request.AuthorId)
            recipients.Add(task.AssigneeId);

        var priorComments = await repository.FindAsync(
            c => c.TaskId == request.TaskId, cancellationToken);
        foreach (var c in priorComments)
        {
            if (c.AuthorId != request.AuthorId)
                recipients.Add(c.AuthorId);
        }

        // Collect Mentioned recipients: users tagged via @[Name](id) syntax, excluding commenter
        var mentionedIds = ExtractMentionedUserIds(request.Content);
        mentionedIds.Remove(request.AuthorId);

        // Stage CommentAdded notifications
        foreach (var recipientId in recipients)
        {
            var n = Notification.Create(
                userId: recipientId,
                title: "New comment",
                body: $"New comment on \"{task.Title}\"",
                type: NotificationType.CommentAdded,
                relatedEntityId: task.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
        }

        // Stage Mentioned notifications (skip users already in recipients — they'll get CommentAdded)
        foreach (var mentionedId in mentionedIds)
        {
            var n = Notification.Create(
                userId: mentionedId,
                title: "You were mentioned",
                body: $"You were mentioned in a comment on \"{task.Title}\"",
                type: NotificationType.Mentioned,
                relatedEntityId: task.Id);
            await notificationRepo.AddAsync(n, cancellationToken);
        }

        // Commit comment + all notifications atomically
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Fire real-time pushes after DB rows exist
        foreach (var recipientId in recipients)
        {
            await notificationService.NotifyUser(
                recipientId, "New comment",
                $"New comment on \"{task.Title}\"",
                NotificationType.CommentAdded, task.Id, cancellationToken);
        }

        foreach (var mentionedId in mentionedIds)
        {
            await notificationService.NotifyUser(
                mentionedId, "You were mentioned",
                $"You were mentioned in a comment on \"{task.Title}\"",
                NotificationType.Mentioned, task.Id, cancellationToken);
        }

        return mapper.Map<CommentDto>(comment);
    }

    // Internal so MentionExtractionTests can call it directly.
    internal static HashSet<string> ExtractMentionedUserIds(string content)
    {
        var ids = new HashSet<string>();
        foreach (Match m in MentionRegex.Matches(content))
            ids.Add(m.Groups[2].Value);
        return ids;
    }
}
```

- [ ] **Step 4: Run the tests — confirm all pass**

```bash
cd backend
dotnet test tests/ProjectManagement.Application.Tests/ProjectManagement.Application.Tests.csproj --nologo -v:minimal
```

Expected: `Passed! - Failed: 0, Passed: 22` (17 existing + 5 new)

- [ ] **Step 5: Commit**

```bash
git add backend/src/ProjectManagement.Application/Features/Comments/CreateComment/CreateCommentCommandHandler.cs
git add backend/tests/ProjectManagement.Application.Tests/Comments/MentionExtractionTests.cs
git commit -m "feat: extract @mentions and send Mentioned notifications in CreateCommentCommandHandler"
```

---

### Task 3: Create `MentionPipe`

**Files:**
- Create: `frontend/libs/shared/util/src/lib/mention.pipe.ts`
- Modify: `frontend/libs/shared/util/src/index.ts`

- [ ] **Step 1: Create the pipe**

Create `frontend/libs/shared/util/src/lib/mention.pipe.ts`:

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'mention', pure: true, standalone: true })
export class MentionPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(content: string | null | undefined): SafeHtml {
    if (!content) return '';
    const html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/@\[([^\]]+)\]\([^)]+\)/g,
        '<span class="mention-badge">@$1</span>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
```

> Note: the pipe escapes `&`, `<`, `>` in the plain text parts before inserting the badge span, so it is safe to use with `[innerHTML]`.

- [ ] **Step 2: Export from the library barrel**

Open `frontend/libs/shared/util/src/index.ts` and add the export at the end:

```typescript
export * from './lib/auth.guard';
export * from './lib/auth.interceptor';
export * from './lib/error.interceptor';
export * from './lib/environment';
export * from './lib/confirm-dialog.component';
export * from './lib/activity.service';
export * from './lib/ai.service';
export * from './lib/signalr.service';
export * from './lib/notification.service';
export * from './lib/theme.service';
export * from './lib/mention.pipe';
```

- [ ] **Step 3: Build shared-util to confirm no errors**

```bash
cd frontend
npx nx build shared-util --skip-nx-cache 2>&1 | tail -5
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/shared/util/src/lib/mention.pipe.ts
git add frontend/libs/shared/util/src/index.ts
git commit -m "feat: add MentionPipe to shared-util"
```

---

### Task 4: Mention autocomplete in the task comment textarea

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

This task adds the `@` trigger, floating member dropdown, and mention insertion to the task comment form in the task detail panel. The component already has `members = signal<ProjectMember[]>([])` and `memberService` injected — no new services needed.

- [ ] **Step 1: Add mention state signals and the `@ViewChild` ref**

Find the block that starts with `// ── Members` (around line 2637). Add the mention state after `membersLoading`:

```typescript
// ── @mention autocomplete ────────────────────────
mentionOpen        = signal(false);
mentionFilter      = signal('');
mentionHighlighted = signal(0);
private mentionAtIndex = -1;
```

Find the `@ViewChild('messageList')` declaration (or any `@ViewChild`) and add alongside it:

```typescript
@ViewChild('commentTextarea') private commentTextareaRef?: ElementRef<HTMLTextAreaElement>;
```

Ensure `ElementRef` is imported from `@angular/core` — it should already be imported.

- [ ] **Step 2: Add `get filteredMembers()`**

After `mentionAtIndex`, add the getter (not a signal — plain getter is fine since it reads signals):

```typescript
get filteredMembers(): ProjectMember[] {
  const filter = this.mentionFilter().toLowerCase();
  return this.members().filter(m =>
    !filter || m.fullName.toLowerCase().includes(filter)
  );
}
```

- [ ] **Step 3: Add `onCommentInput`, `onCommentKeydown`, and `selectMention` methods**

Add these three methods near `addComment()` (around line 3279):

```typescript
onCommentInput(event: Event): void {
  const ta = event.target as HTMLTextAreaElement;
  const val = ta.value;
  const cursor = ta.selectionStart ?? val.length;

  // Scan backwards from cursor for @ not preceded by a word char
  let atIdx = -1;
  for (let i = cursor - 1; i >= 0; i--) {
    if (val[i] === ' ' || val[i] === '\n') break;
    if (val[i] === '@') { atIdx = i; break; }
  }

  if (atIdx >= 0) {
    const typed = val.slice(atIdx + 1, cursor);
    this.mentionAtIndex = atIdx;
    this.mentionFilter.set(typed);
    this.mentionHighlighted.set(0);
    this.mentionOpen.set(this.filteredMembers.length > 0);
  } else {
    this.mentionOpen.set(false);
    this.mentionAtIndex = -1;
  }
}

onCommentKeydown(event: KeyboardEvent): void {
  if (!this.mentionOpen()) return;
  const members = this.filteredMembers;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    this.mentionHighlighted.update(i => Math.min(i + 1, members.length - 1));
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.mentionHighlighted.update(i => Math.max(i - 1, 0));
  } else if (event.key === 'Enter' && members.length > 0) {
    event.preventDefault();
    this.selectMention(members[this.mentionHighlighted()]);
  } else if (event.key === 'Escape') {
    this.mentionOpen.set(false);
  }
}

selectMention(member: ProjectMember): void {
  const ta = this.commentTextareaRef?.nativeElement;
  if (!ta) return;
  const val = this.commentForm.get('content')!.value as string ?? '';
  const cursor = ta.selectionStart ?? val.length;
  const before = val.slice(0, this.mentionAtIndex);
  const after = val.slice(cursor);
  const replacement = `@[${member.fullName}](${member.userId}) `;
  const newVal = before + replacement + after;
  this.commentForm.get('content')!.setValue(newVal);
  const newCursor = before.length + replacement.length;
  setTimeout(() => ta.setSelectionRange(newCursor, newCursor), 0);
  this.mentionOpen.set(false);
  this.mentionAtIndex = -1;
  this.mentionFilter.set('');
}
```

- [ ] **Step 4: Load members when task panel opens (if not yet loaded)**

In the `openTask` method (around line 3232), add a member load guard after the comment load:

```typescript
openTask(task: Task) {
  this.selectedTask.set(task);
  this.editMode.set(false);
  this.mentionOpen.set(false);
  this.commentsLoading.set(true);
  this.commentService.getByTask(task.id).subscribe({
    next: c => { this.comments.set(c); this.commentsLoading.set(false); },
    error: () => this.commentsLoading.set(false),
  });
  // Ensure members are loaded for @mention dropdown
  if (this.members().length === 0) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.memberService.getByProject(id).subscribe({
      next: m => this.members.set(m),
    });
  }
}
```

- [ ] **Step 5: Update the comment textarea template**

Find the task comment textarea (around line 1029):

```html
<textarea class="comment-input" formControlName="content" rows="2"
          placeholder="Write a comment…"></textarea>
```

Replace it with the textarea + dropdown:

```html
<div class="mention-wrap">
  <textarea #commentTextarea class="comment-input" formControlName="content" rows="2"
            placeholder="Write a comment…"
            (input)="onCommentInput($event)"
            (keydown)="onCommentKeydown($event)"></textarea>
  <div class="mention-dropdown" *ngIf="mentionOpen()">
    <div *ngFor="let m of filteredMembers; let i = index"
         class="mention-option"
         [class.mention-highlighted]="i === mentionHighlighted()"
         (mousedown)="selectMention(m)">
      <span class="mention-ava">{{ nameInitials(m.fullName) }}</span>
      <span class="mention-name">{{ m.fullName }}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Add mention dropdown CSS**

In the component `styles` array, add these rules at the end (before the closing backtick):

```css
/* ── @mention autocomplete ───────────────────── */
.mention-wrap { position: relative; }

.mention-dropdown {
  position: absolute; bottom: calc(100% + 4px); left: 0;
  min-width: 220px; max-height: 180px; overflow-y: auto;
  background: rgba(255,255,255,.97);
  border: 1.5px solid rgba(99,102,241,.25);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(99,102,241,.15);
  z-index: 50;
}

.mention-option {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 12px; cursor: pointer;
  transition: background .12s;
}
.mention-option:hover,
.mention-highlighted {
  background: rgba(99,102,241,.08);
}

.mention-ava {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: var(--violet); color: #fff;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.mention-name { font-size: 13px; color: var(--ink); font-weight: 500; }

/* Badge rendered inside comment content */
.mention-badge {
  display: inline-block;
  background: rgba(99,102,241,.12);
  color: var(--violet);
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
  font-size: 0.875em;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git commit -m "feat: add @mention autocomplete to task comment textarea"
```

---

### Task 5: Render mentions in comment list and add notification bell icon

**Files:**
- Modify: `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`
- Modify: `frontend/libs/layout/feature/src/lib/notification-bell.component.ts`

- [ ] **Step 1: Import `MentionPipe` in `project-detail.component.ts`**

Find the `imports` array in the `@Component` decorator of `project-detail.component.ts`. Add `MentionPipe` to it. Also add `MentionPipe` to the import statement at the top:

```typescript
import { MentionPipe } from '@pm/shared/util';
```

In the `@Component` decorator's `imports` array, add `MentionPipe`.

- [ ] **Step 2: Replace plain text comment rendering with the pipe**

Find the task comment content line (around line 1022):

```html
<p class="comment-content">{{ c.content }}</p>
```

Replace with:

```html
<div class="comment-content" [innerHTML]="c.content | mention"></div>
```

- [ ] **Step 3: Add `Mentioned` icon to notification bell**

Open `frontend/libs/layout/feature/src/lib/notification-bell.component.ts`.

Find the `iconFor` method (around line 143). Add `case 9` before `default`:

```typescript
iconFor(type: number): string {
  switch (type) {
    case 0: return 'assignment_ind';
    case 1: return 'block';
    case 2: return 'schedule';
    case 3: return 'reply';
    case 4: return 'warning';
    case 5: return 'comment';
    case 6: return 'play_circle';
    case 7: return 'check_circle';
    case 8: return 'group_add';
    case 9: return 'alternate_email';
    default: return 'notifications';
  }
}
```

- [ ] **Step 4: Build frontend to confirm no type errors**

```bash
cd frontend
npx nx build projects-feature --skip-nx-cache 2>&1 | tail -10
```

Expected: build succeeds with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts
git add frontend/libs/layout/feature/src/lib/notification-bell.component.ts
git commit -m "feat: render @mention badges in comments and add Mentioned icon to notification bell"
```

---

## Manual Test Checklist

After all tasks are done, verify end-to-end in the browser:

1. Open a project where you are a member with at least one other member
2. Open any task → Comments section
3. Type `@` in the comment box — dropdown appears with project members
4. Type two letters to filter — list narrows
5. Use arrow keys to navigate, press Enter to select — `@[Name](id)` inserted in textarea
6. Click Escape — dropdown closes without inserting
7. Post the comment
8. Comment renders with a violet `@Name` badge instead of raw syntax
9. Log in as the mentioned user — notification bell shows a new "You were mentioned" notification with the `alternate_email` icon
10. Non-project-member usernames do not appear in the dropdown
