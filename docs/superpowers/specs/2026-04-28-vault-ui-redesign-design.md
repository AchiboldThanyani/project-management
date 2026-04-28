# Vault UI Redesign — Design Spec

## Goal

Replace the current two-section list vault UI with a polished file-explorer experience: flat folder sidebar, unified card grid, toolbar with search and actions, and an inline document editor that keeps the sidebar visible.

## Design Decisions

- **Unified view** — documents and files are shown together in one grid, not split into separate sections. Type icons differentiate them visually.
- **Flat folder model** — no nested subfolders (backend has no `parentFolderId`). Sidebar is a flat list; "All Files" is a permanent top entry.
- **Grid/card layout** — 4-column responsive card grid, not a list view.
- **Toolbar at top** — search left-aligned, action buttons right-aligned.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [🔍 Search vault...]          [+ New Doc]  [⬆ Upload]     │  toolbar
├──────────────┬──────────────────────────────────────────────┤
│  Sidebar     │  Content area (grid or editor)               │
└──────────────┴──────────────────────────────────────────────┘
```

- Toolbar spans full width, sits above the sidebar/content split, has a bottom border (`--border`)
- Sidebar: 200px fixed, scrollable
- Content: `flex: 1`, scrollable card grid or editor panel

---

## Toolbar

- **Search input** (left, flex-grow): placeholder "Search vault…", filters visible cards client-side in real-time. No API call.
- **+ New Doc** (right): `.btn-primary` — creates a blank document and opens the editor immediately
- **⬆ Upload** (right): `.btn-ghost` — opens native file picker
- Toolbar has `padding: 10px 20px`, `border-bottom: 1px solid var(--border)`, `background: var(--white)`

---

## Sidebar

```
VAULT

📂 All Files       ← permanent, always first
📁 Contracts       ← active: left accent + --violet-mid bg
📁 Design
📁 Legal

+ New Folder       ← ghost link, pinned to bottom
```

- Header label "VAULT" in uppercase, `--muted`, `font-size: 11px`, `letter-spacing: 0.05em`
- **All Files**: permanent entry, not a real folder. Selecting it shows all items across all folders.
- **Active folder**: 2px left accent bar in `--violet`, background `--violet-mid`, text `--violet`, `font-weight: 600`
- **Hover**: folder name row shows rename (✏) and delete (🗑) icon buttons fading in on the right edge
- **Rename**: inline input replaces folder name on click, confirm on Enter / cancel on Escape
- **+ New Folder**: quiet ghost link at bottom of sidebar list, not a floating button. Clicking shows an inline input row at the bottom.
- No folder item count badges — count is shown in the content area section bar instead

---

## Card Grid

### Section bar

```
All Files                                     12 items  Name ↕
```

- Shows current folder name (or "All Files") on the left
- Item count on the right
- Sort toggle cycles through: Name A→Z, Name Z→A, Date newest, Date oldest
- `border-bottom: 1px solid var(--border)`, `padding: 12px 20px`

### Cards

```
┌──────────────┐
│              │
│     📄       │   ← icon area, --surface background
│              │
├──────────────┤
│ Brief.md     │   ← name, bold, truncated
│ You          │   ← modified-by name
│ Apr 28       │   ← date
└──────────────┘
```

- **Grid**: `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`, gap 16px, padding 20px
- **Card**: white bg, `border: 1px solid var(--border)`, `border-radius: var(--r-lg)`, `box-shadow: var(--shadow-sm)`
- **Icon area** (~60% of card height): centred icon on `--surface` bg, `border-radius: var(--r-lg) var(--r-lg) 0 0`
- **Type icons** (Material Icons, 32px):
  - Document: `article` in `--blue`
  - Image: `image` in `--teal`
  - PDF: `picture_as_pdf` in `--rose`
  - Spreadsheet/Excel: `table_chart` in `--emerald`
  - Word doc: `description` in `--blue`
  - Zip: `folder_zip` in `--amber`
  - Generic file: `attach_file` in `--amber`
- **Info area** (~40%): `padding: 10px 12px`, name in `font-size: 13px font-weight: 600`, modified-by + date in `font-size: 11px color: --muted`
- **Hover state**: `box-shadow: var(--shadow-md)`, `border-color: var(--violet)`, action overlay fades in over icon area with three icon buttons: open (`open_in_new`), download (`download`, files only), delete (`delete_outline`)
- **Click**: opens document in editor; triggers download for files

---

## Empty States

All empty states are vertically and horizontally centred in the content area. Icon in `--soft`, text in `--muted`.

**Empty folder / All Files with no items:**
```
        🔒
  Your vault is empty
  Store documents and files for this project.

  [+ New Doc]   [⬆ Upload File]
```

**Empty folder (folder exists but has no items):**
```
        📁
  This folder is empty

  [+ New Doc]   [⬆ Upload File]
```

**No search results:**
```
        🔍
  No results for "contracts"

        Clear search
```
- "Clear search" is a plain text link, no action buttons shown

---

## Document Editor Mode

When a document card is opened, the content area transitions to the editor. The sidebar remains visible.

```
┌─────────────────────────────────────────────────────────────┐
│  [🔍 Search vault...]          [+ New Doc]  [⬆ Upload]     │  toolbar unchanged
├──────────────┬──────────────────────────────────────────────┤
│  Sidebar     │ ← Contracts › Brief.md          ● Saved     │  editor topbar
│  (unchanged) ├──────────────────────────────────────────────┤
│              │  [B][I][S] | [H1][H2][H3] | [•][1.][</>]   │  formatting bar
│              │  [⊞ Table] [🖼 Image]                        │
│              ├──────────────────────────────────────────────┤
│              │                                              │
│              │  Document title (large, editable)            │
│              │                                              │
│              │  Write something...                          │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

- **Editor topbar**: `←` back chevron + breadcrumb (`Folder › Doc name`), save status indicator on the right
  - Save status: `● Saving…` (amber dot) / `● Saved` (green dot) / `● Error` (red dot)
  - Clicking `←` or any sidebar folder/item exits editor and returns to the grid
- **Formatting bar**: replaces the section bar, directly below the editor topbar
- **Auto-save**: existing `debounceTime(2000)` logic unchanged; only the status indicator display is updated
- Clicking a different document in the sidebar navigates directly to it without returning to the grid first

---

## Component Changes

### Files to modify

- `frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts` — full redesign of template + styles. Logic (signals, service calls) largely unchanged; add `searchQuery` signal and `sortMode` signal; merge `visibleDocuments()` and `visibleFiles()` into a single `visibleItems()` computed that filters + sorts both arrays together.
- `frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts` — update save status indicator to show coloured dot states; remove standalone toolbar (now rendered in vault-tab); accept `folderName` input for breadcrumb.

### No backend changes required

All data is already fetched. The unified view is a frontend-only concern — `visibleItems()` merges the existing `documents` and `files` signals.

---

## Behaviour Notes

- **Search**: filters `visibleItems()` by name/title client-side. Case-insensitive `includes` match.
- **Sort**: default is date descending (newest first). Toggle cycles Name A→Z → Name Z→A → Date newest → Date oldest.
- **Delete confirmation**: existing `confirm()` dialogs retained for now.
- **File download**: existing blob + `URL.createObjectURL` approach unchanged.
- **Folder delete**: existing behaviour (contents moved to root) unchanged.
