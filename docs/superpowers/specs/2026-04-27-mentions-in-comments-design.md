# @Mentions in Comments — Design Spec

**Date:** 2026-04-27
**Status:** Approved

## Goal

Allow users to @mention project members inside task comments. Mentioned users receive an in-app notification via the existing notification bell and SignalR pipeline.

## Scope

- @mention autocomplete in the task comment textarea
- Mention syntax stored inline in comment content
- Blue badge rendering of mentions in submitted comments
- In-app notification to each mentioned user on comment creation
- Project members only (not all system users)

## Architecture

### Mention Syntax

Mentions are stored inline in `Comment.Content` using the format:

```
@[Full Name](userId)
```

Example content value stored in the database:

```
Hey @[John Doe](abc-123) can you review this?
```

This makes the comment self-contained — name and userId travel together, so rendering never requires an extra lookup.

---

## Backend Changes

### 1. NotificationType enum

Add one value to `ProjectManagement.Domain/Enums/NotificationType.cs`:

```csharp
Mentioned = 9
```

### 2. CreateCommentCommandHandler — mention extraction

After the existing notification logic (task assignee + prior commenters), add:

```
regex: @\[([^\]]+)\]\(([a-zA-Z0-9-]+)\)
→ extract all (name, userId) pairs from Content
→ deduplicate userIds
→ exclude the commenter (currentUser.UserId)
→ for each mentionedUserId:
     create Notification(type: Mentioned, userId: mentionedUserId,
                         title: "@{commenterName} mentioned you",
                         body: task title, relatedEntityId: taskId)
     call INotificationService.NotifyUser(mentionedUserId, ...)
```

No new entities, no new tables. The existing `Notification` entity and `INotificationService.NotifyUser` handle everything.

### 3. Members endpoint

`GET /api/projects/{id}/members` already exists and returns member data including `id` and `fullName`. No changes required.

---

## Frontend Changes

### 1. Comment input — @mention trigger

**File:** `frontend/libs/projects/feature/src/lib/detail/project-detail.component.ts`

On every `input` event on the comment textarea:

1. Scan backwards from the cursor position for an unescaped `@` character
2. If found, extract the partial name typed after `@` (e.g. `Jo` from `@Jo`)
3. Filter loaded project members by `fullName` containing the partial (case-insensitive)
4. Show a floating dropdown below the textarea with matching members
5. On member select: splice `@[Full Name](userId)` into the textarea value at the `@` position, close dropdown
6. On Escape or click outside: close dropdown without inserting

**Dropdown behaviour:**
- Arrow Up / Arrow Down navigate the list
- Enter or click selects the highlighted member
- Typing further narrows the filter
- If no members match, hide the dropdown

**State added to component:**
```typescript
mentionDropdownOpen  = false
mentionMembers       = signal<{ id: string; fullName: string }[]>([])
mentionFilter        = ''
mentionAtIndex       = -1          // textarea index where @ was typed
mentionHighlighted   = 0           // dropdown cursor row
```

**Members are loaded** once when the task detail panel opens, via the existing project members endpoint, and cached for the lifetime of the panel.

### 2. Dropdown template (text mockup)

```
┌─────────────────────────────────────────┐
│ Write a comment…                        │
│ Hey @Jo                                 │
└─────────────────────────────────────────┘
     ┌──────────────────────┐
     │ ● John Doe           │  ← highlighted (violet bg)
     │   Jane Smith         │
     │   Joe Bloggs         │
     └──────────────────────┘
```

Dropdown is positioned absolutely below the textarea using Angular CDK overlay or simple CSS absolute positioning relative to the input wrapper.

### 3. MentionPipe — rendering submitted comments

**New file:** `frontend/libs/shared/util/src/lib/mention.pipe.ts`

```typescript
@Pipe({ name: 'mention', pure: true, standalone: true })
export class MentionPipe implements PipeTransform {
  transform(content: string): SafeHtml {
    const html = content.replace(
      /@\[([^\]]+)\]\([^)]+\)/g,
      '<span class="mention-badge">@$1</span>'
    );
    return sanitizer.bypassSecurityTrustHtml(html);
  }
}
```

Applied in comment templates as:
```html
<div [innerHTML]="comment.content | mention"></div>
```

**Mention badge style:**
```css
.mention-badge {
  display: inline-block;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
  font-size: 0.875em;
}
```

### 4. Notification bell

The existing `NotificationBellComponent` maps notification types to icons. Add:

```typescript
9: 'alternate_email'   // Mentioned
```

Notification message displayed: **"@Sarah Connor mentioned you in 'Fix login bug'"**

---

## Data Flow

```
User types "@Jo" in textarea
  → input event fires
  → scan back from cursor, find "@" at index 12
  → filter members where fullName.includes("jo")
  → show dropdown: [John Doe, Jane Smith, Joe Bloggs]

User clicks "John Doe"
  → splice "@[John Doe](abc-123)" into textarea at index 12
  → close dropdown
  → form control value: "Hey @[John Doe](abc-123) can you check?"

User submits comment
  → POST /api/tasks/{taskId}/comments  { content: "Hey @[John Doe](abc-123) ..." }
  → CreateCommentCommandHandler saves comment
  → regex extracts userId "abc-123"
  → Notification created for abc-123, type = Mentioned
  → SignalR pushes to user-abc-123 group
  → John Doe's bell lights up: "@You mentioned you in 'Fix login bug'"

Comment renders in thread
  → MentionPipe replaces @[John Doe](abc-123)
  → with <span class="mention-badge">@John Doe</span>
```

---

## What is NOT in scope

- Email notifications for mentions
- Mentions in ticket replies (tickets are a separate comment system — can be added later following the same pattern)
- A "My Mentions" inbox tab
- Editing mentions after submission (comment editing is a separate feature)
- Mentioning `@everyone` or `@here`
