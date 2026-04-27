# Project Vault — Design Spec

**Goal:** Add a per-project document and file vault as a new tab inside the project detail view, giving teams a single place to store rich text documents (specs, meeting notes, SOPs) and uploaded files (contracts, designs, exports), organized into folders.

**Architecture:** Vault tab inside `ProjectDetailComponent`, backed by three new domain entities (`VaultFolder`, `VaultDocument`, `VaultFile`), a new `VaultController`, and two new frontend Nx libraries (`vault/data-access`, `vault/feature`).

**Tech Stack:** .NET 9 clean arch (CQRS/MediatR), Angular 20 standalone components, TipTap rich text editor, existing `IFileStorageService` (filesystem) for file uploads.

---

## Data Model

### `VaultFolder`
| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| ProjectId | Guid | FK → Project |
| Name | string | Required |
| CreatedById | string | FK → User |
| CreatedAt | DateTime | UTC |
| UpdatedAt | DateTime? | UTC |

### `VaultDocument`
| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| ProjectId | Guid | FK → Project |
| FolderId | Guid? | FK → VaultFolder, null = root |
| Title | string | Required |
| ContentJson | string | TipTap JSON document |
| CreatedById | string | FK → User |
| CreatedByName | string | Denormalized for display |
| UpdatedById | string? | FK → User |
| UpdatedByName | string? | Denormalized for display |
| CreatedAt | DateTime | UTC |
| UpdatedAt | DateTime? | UTC |

### `VaultFile`
| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| ProjectId | Guid | FK → Project |
| FolderId | Guid? | FK → VaultFolder, null = root |
| FileName | string | Original filename (e.g. `contract.pdf`) |
| StoredFileName | string | GUID-based name on disk (e.g. `a3f9....pdf`) |
| ContentType | string | MIME type |
| SizeBytes | long | File size in bytes |
| UploadedById | string | FK → User |
| UploadedByName | string | Denormalized for display |
| CreatedAt | DateTime | UTC |

**Rules:**
- `FolderId: null` means the item sits at project root — no folder required
- Folders are flat (one level only) — no `ParentFolderId`
- Deleting a folder moves its contents to root rather than cascade deleting
- Documents and files are separate tables — no polymorphic VaultItem

---

## Backend API

Controller: `api/projects/{projectId}/vault/`  
Auth: all endpoints require project membership via existing `IProjectPermissionService`.

### Folders
| Method | Route | Description | Min Role |
|---|---|---|---|
| GET | `/folders` | List all folders | Viewer |
| POST | `/folders` | Create folder | Manager |
| PUT | `/folders/{folderId}` | Rename folder | Manager |
| DELETE | `/folders/{folderId}` | Delete folder (contents move to root) | Manager |

### Documents
| Method | Route | Description | Min Role |
|---|---|---|---|
| GET | `/documents` | List documents (`?folderId=`) | Viewer |
| POST | `/documents` | Create document | Developer |
| GET | `/documents/{documentId}` | Get document with ContentJson | Viewer |
| PUT | `/documents/{documentId}` | Update title + content | Developer |
| DELETE | `/documents/{documentId}` | Delete (own doc or Manager+) | Developer |
| PATCH | `/documents/{documentId}/move` | Move to folder | Developer |

### Files
| Method | Route | Description | Min Role |
|---|---|---|---|
| GET | `/files` | List files (`?folderId=`) | Viewer |
| POST | `/files` | Upload file (reuses IFileStorageService) | Developer |
| GET | `/files/{fileId}/download` | Stream file download | Viewer |
| DELETE | `/files/{fileId}` | Delete (own file or Manager+) | Developer |
| PATCH | `/files/{fileId}/move` | Move to folder | Developer |

### Permission Matrix
| Action | Minimum Role |
|---|---|
| View / download anything | Viewer |
| Create docs, upload files | Developer |
| Move items between folders | Developer |
| Delete own docs/files | Developer |
| Create / rename / delete folders | Manager |
| Delete others' docs/files | Manager |

### CQRS Features (Application layer)
Under `Features/Vault/`:
- `CreateVaultFolder` / `RenameVaultFolder` / `DeleteVaultFolder`
- `GetVaultFolders`
- `CreateVaultDocument` / `UpdateVaultDocument` / `DeleteVaultDocument` / `MoveVaultDocument`
- `GetVaultDocuments` / `GetVaultDocumentById`
- `UploadVaultFile` / `DeleteVaultFile` / `MoveVaultFile` / `DownloadVaultFile`
- `GetVaultFiles`

---

## Frontend

### Nx Libraries
- `libs/vault/data-access` — `VaultService` (HTTP calls to all vault endpoints)
- `libs/vault/feature` — `VaultTabComponent`, `VaultDocumentEditorComponent`

### `VaultTabComponent`
Two-panel layout:

**Left sidebar (folder nav):**
- "All Files" / "Root" default selection
- List of user-created folders — click to filter right panel
- "New Folder" button visible to Manager+ only
- Hover actions on folders: rename, delete (Manager+ only)

**Right panel (content area):**
- Two sections: **Documents** and **Files**
- Each section has a header with item count and action button ("New Doc" / "Upload")
- Document rows: icon, title, author name, last updated date — click to open editor
- File rows: file type icon, name, uploader name, size, date — click to download
- Empty states for both sections when no content exists

### `VaultDocumentEditorComponent`
Wraps TipTap (vanilla JS API, no React):

**Toolbar extensions:**
- `@tiptap/starter-kit` — headings (H1–H3), bold, italic, bullet list, numbered list, blockquote, horizontal rule
- `@tiptap/extension-table` — insert/edit tables
- `@tiptap/extension-code-block` — fenced code blocks with syntax highlighting
- `@tiptap/extension-image` — embed images by URL

**Behaviour:**
- Auto-saves after 2 seconds of inactivity (debounce, same pattern as Excalidraw board)
- Shows "Saved · Last edited by [name] at [time]" below editor
- Viewers see read-only rendered HTML — no toolbar rendered
- Document title is an editable `<input>` above the editor, saved together with content

### Integration into `ProjectDetailComponent`
- Add `'vault'` to `activeTab` union type
- Add Vault tab button: `lock` Material icon, label "Vault"
- Import `VaultTabComponent`, render when `activeTab === 'vault'`
- No "Add Task" / "New Issue" button shown on vault tab

### TipTap Packages to Install
```
@tiptap/core
@tiptap/starter-kit
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-header
@tiptap/extension-table-cell
@tiptap/extension-code-block-lowlight
@tiptap/extension-image
lowlight
```

---

## File Storage
Reuses existing `IFileStorageService` implementation:
- Files stored at `{Uploads:Path}/{Guid}{extension}` on the server filesystem
- Same 20 MB size limit and MIME type allowlist as `TaskAttachment`
- `StoredFileName` (GUID-based) saved in DB; original name preserved in `FileName`
- Download endpoint streams file directly from disk using `GetFullPath(storedFileName)`

---

## Error Handling
- 403 returned for permission violations (consistent with rest of API)
- 404 returned for missing vault items
- 400 returned for oversized files or disallowed MIME types (reuses existing validation)
- Frontend shows MatSnackBar toasts for success/error (consistent with rest of app)
- Folder delete with contents: backend moves items to root, returns 200 with count of moved items

---

## Out of Scope
- Document version history
- Real-time collaborative editing
- Per-document permissions
- Deep folder nesting (sub-folders)
- Full-text search across document content
