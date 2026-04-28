# Vault UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-section list vault UI with a polished file-explorer: toolbar with search + actions, flat folder sidebar with left accent, unified card grid, and an editor topbar with breadcrumb and save status dot.

**Architecture:** Two Angular standalone components are modified — `VaultDocumentEditorComponent` drops its internal save-status div and emits `saveStatusChange` events; `VaultTabComponent` is fully rewritten with a `VaultItem` discriminated union, `computed()` signals for derived state, and a new template + styles. No backend changes.

**Tech Stack:** Angular 20 standalone components, Angular signals (`signal`, `computed`), `@angular/common` (`NgFor`, `NgIf`, `DatePipe`, `DecimalPipe`), Material Icons Rounded, existing `VaultService`, `MatSnackBar`.

---

### Task 1: Update VaultDocumentEditorComponent — add saveStatusChange output

**Files:**
- Modify: `frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts`

Context: The current component owns the save status and displays it inline. The new vault-tab topbar will display it instead. We need the component to emit status changes and stop rendering the `.save-status` div.

- [ ] **Step 1: Replace the component file**

Replace the full contents of `frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts` with:

```typescript
import {
  Component, Input, Output, EventEmitter,
  OnDestroy, AfterViewInit, ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
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
        <button class="tb-btn" (click)="insertTable()" title="Table">&#8862;</button>
        <button class="tb-btn" (click)="insertImage()" title="Image">Img</button>
      </div>
      <div #editorEl class="tiptap-content" [class.readonly]="readonly"></div>
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
    .tiptap-content { flex: 1; outline: none; font-size: 14px; line-height: 1.7; color: var(--ink); min-height: 200px; }
    .tiptap-content.readonly { cursor: default; }
    :host ::ng-deep .tiptap-content h1 { font-size: 1.6em; font-weight: 700; margin: 16px 0 8px; }
    :host ::ng-deep .tiptap-content h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
    :host ::ng-deep .tiptap-content h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
    :host ::ng-deep .tiptap-content p { margin: 4px 0; }
    :host ::ng-deep .tiptap-content ul, :host ::ng-deep .tiptap-content ol { padding-left: 24px; margin: 4px 0; }
    :host ::ng-deep .tiptap-content code { background: var(--surface); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
    :host ::ng-deep .tiptap-content pre { background: var(--surface); padding: 12px; border-radius: var(--r-md); margin: 8px 0; overflow-x: auto; }
    :host ::ng-deep .tiptap-content pre code { background: none; padding: 0; }
    :host ::ng-deep .tiptap-content blockquote { border-left: 3px solid var(--border); margin: 8px 0; padding-left: 12px; color: var(--muted); }
    :host ::ng-deep .tiptap-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    :host ::ng-deep .tiptap-content th, :host ::ng-deep .tiptap-content td { border: 1px solid var(--border); padding: 6px 10px; font-size: 13px; }
    :host ::ng-deep .tiptap-content th { background: var(--surface); font-weight: 600; }
    :host ::ng-deep .tiptap-content img { max-width: 100%; border-radius: var(--r-md); margin: 8px 0; }
    :host ::ng-deep .tiptap-content .ProseMirror-focused { outline: none; }
  `],
})
export class VaultDocumentEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) document!: VaultDocumentDetail;
  @Input() readonly = false;
  @Output() save = new EventEmitter<{ title: string; contentJson: string }>();
  @Output() saveStatusChange = new EventEmitter<'idle' | 'saving' | 'saved' | 'error'>();

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
      content: (() => { try { return this.document.contentJson ? JSON.parse(this.document.contentJson) : ''; } catch { return ''; } })(),
      editable: !this.readonly,
      onUpdate: () => {
        if (!this.readonly) {
          this.saveStatusChange.emit('saving');
          this.save$.next();
        }
      },
    });
  }

  onTitleInput(event: Event): void {
    this.titleValue = (event.target as HTMLInputElement).value;
    if (!this.readonly) {
      this.saveStatusChange.emit('saving');
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
    this.saveStatusChange.emit('saved');
  }

  ngOnDestroy(): void {
    this.saveSub.unsubscribe();
    this.editor?.destroy();
  }
}
```

- [ ] **Step 2: Verify it builds**

Run from `frontend/`:
```bash
npx nx build vault-feature --skip-nx-cache 2>&1 | tail -20
```
Expected: `Successfully ran target build` with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/libs/vault/feature/src/lib/vault-document-editor/vault-document-editor.component.ts
git commit -m "feat: add saveStatusChange output to VaultDocumentEditorComponent"
```

---

### Task 2: Rewrite VaultTabComponent — full redesign

**Files:**
- Modify: `frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts`

Context: Full template + styles + logic replacement. Key changes: `VaultItem` discriminated union type, `computed()` signals for `visibleItems`/`hasAnyItems`/`selectedFolderName`, toolbar with search left + actions right, sidebar with left accent on active folder + inline rename + bottom "New Folder" link, card grid, editor mode topbar with breadcrumb + save dot.

- [ ] **Step 1: Replace the component file**

Replace the full contents of `frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts` with:

```typescript
import {
  Component, Input, OnInit, signal, inject, computed,
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

type VaultItem =
  | { kind: 'doc'; data: VaultDocument }
  | { kind: 'file'; data: VaultFile };

type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

@Component({
  selector: 'pm-vault-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, VaultDocumentEditorComponent],
  template: `
    <div class="vault-toolbar">
      <div class="search-wrap">
        <span class="material-icons-round search-icon">search</span>
        <input class="search-input" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
               placeholder="Search vault..." />
        <button *ngIf="searchQuery()" class="clear-btn" (click)="searchQuery.set('')" title="Clear">
          <span class="material-icons-round" style="font-size:14px">close</span>
        </button>
      </div>
      <div class="toolbar-actions">
        <button class="btn-primary btn-sm" (click)="createDocument()">
          <span class="material-icons-round" style="font-size:14px">add</span> New Doc
        </button>
        <label class="btn-ghost btn-sm" style="cursor:pointer">
          <span class="material-icons-round" style="font-size:14px">upload</span> Upload
          <input type="file" style="display:none" (change)="onFileSelected($event)" />
        </label>
      </div>
    </div>

    <div class="vault-body">

      <!-- Sidebar -->
      <div class="vault-sidebar">
        <div class="sidebar-label">VAULT</div>

        <div class="folder-item" [class.active]="selectedFolderId() === null"
             (click)="selectFolder(null)">
          <span class="material-icons-round folder-icon">folder_open</span>
          <span class="folder-name">All Files</span>
        </div>

        <ng-container *ngFor="let f of folders()">
          <div class="folder-item" [class.active]="selectedFolderId() === f.id"
               (click)="selectFolder(f.id)">
            <span class="material-icons-round folder-icon">folder</span>
            <ng-container *ngIf="renamingFolder()?.id !== f.id">
              <span class="folder-name">{{ f.name }}</span>
              <div class="folder-actions">
                <button class="icon-btn-xs" (click)="startRenameFolder(f); $event.stopPropagation()" title="Rename">
                  <span class="material-icons-round" style="font-size:13px">edit</span>
                </button>
                <button class="icon-btn-xs danger" (click)="deleteFolder(f); $event.stopPropagation()" title="Delete">
                  <span class="material-icons-round" style="font-size:13px">delete_outline</span>
                </button>
              </div>
            </ng-container>
            <input *ngIf="renamingFolder()?.id === f.id"
                   class="folder-rename-input"
                   [(ngModel)]="renameDraft"
                   (keydown.enter)="saveRenameFolder()"
                   (keydown.escape)="cancelRenameFolder()"
                   (click)="$event.stopPropagation()"
                   (blur)="saveRenameFolder()" />
          </div>
        </ng-container>

        <div class="sidebar-spacer"></div>

        <div *ngIf="!showNewFolder" class="new-folder-link" (click)="showNewFolder = true">
          <span class="material-icons-round" style="font-size:14px">add</span> New Folder
        </div>
        <div *ngIf="showNewFolder" class="new-folder-row">
          <input class="folder-input" [(ngModel)]="newFolderName"
                 placeholder="Folder name"
                 (keydown.enter)="createFolder()"
                 (keydown.escape)="cancelNewFolder()" />
          <button class="btn-primary btn-xs" (click)="createFolder()" [disabled]="!newFolderName.trim()">Add</button>
          <button class="btn-ghost btn-xs" (click)="cancelNewFolder()">✕</button>
        </div>
      </div>

      <!-- Content: grid -->
      <div class="vault-content" *ngIf="!activeDocument()">

        <div *ngIf="loading()" class="empty-state">
          <span class="material-icons-round empty-icon spinning">autorenew</span>
          <p class="empty-title">Loading...</p>
        </div>

        <ng-container *ngIf="!loading() && visibleItems().length === 0">
          <div *ngIf="searchQuery()" class="empty-state">
            <span class="material-icons-round empty-icon">search_off</span>
            <p class="empty-title">No results for "{{ searchQuery() }}"</p>
            <button class="clear-search-link" (click)="searchQuery.set('')">Clear search</button>
          </div>
          <div *ngIf="!searchQuery() && hasAnyItems()" class="empty-state">
            <span class="material-icons-round empty-icon">folder_open</span>
            <p class="empty-title">This folder is empty</p>
            <div class="empty-actions">
              <button class="btn-primary btn-sm" (click)="createDocument()">
                <span class="material-icons-round" style="font-size:14px">add</span> New Doc
              </button>
              <label class="btn-ghost btn-sm" style="cursor:pointer">
                <span class="material-icons-round" style="font-size:14px">upload</span> Upload File
                <input type="file" style="display:none" (change)="onFileSelected($event)" />
              </label>
            </div>
          </div>
          <div *ngIf="!searchQuery() && !hasAnyItems()" class="empty-state">
            <span class="material-icons-round empty-icon">lock</span>
            <p class="empty-title">Your vault is empty</p>
            <p class="empty-sub">Store documents and files for this project.</p>
            <div class="empty-actions">
              <button class="btn-primary btn-sm" (click)="createDocument()">
                <span class="material-icons-round" style="font-size:14px">add</span> New Doc
              </button>
              <label class="btn-ghost btn-sm" style="cursor:pointer">
                <span class="material-icons-round" style="font-size:14px">upload</span> Upload File
                <input type="file" style="display:none" (change)="onFileSelected($event)" />
              </label>
            </div>
          </div>
        </ng-container>

        <div *ngIf="!loading() && (visibleItems().length > 0)" class="section-bar">
          <span class="section-name">{{ sectionTitle() }}</span>
          <span class="item-count">{{ visibleItems().length }} {{ visibleItems().length === 1 ? 'item' : 'items' }}</span>
          <button class="sort-btn" (click)="cycleSortMode()">{{ sortLabel() }}</button>
        </div>

        <div *ngIf="!loading() && visibleItems().length > 0" class="card-grid">
          <div *ngFor="let item of visibleItems()" class="vault-card" (click)="openItem(item)">
            <div class="card-icon-area">
              <span class="material-icons-round card-icon" [style.color]="itemIconColor(item)">
                {{ itemIcon(item) }}
              </span>
              <div class="card-actions">
                <button class="card-action-btn" (click)="openItem(item); $event.stopPropagation()" title="Open">
                  <span class="material-icons-round" style="font-size:15px">open_in_new</span>
                </button>
                <button *ngIf="item.kind === 'file'" class="card-action-btn"
                        (click)="downloadFile(item.data); $event.stopPropagation()" title="Download">
                  <span class="material-icons-round" style="font-size:15px">download</span>
                </button>
                <button class="card-action-btn danger" (click)="deleteItem(item, $event)" title="Delete">
                  <span class="material-icons-round" style="font-size:15px">delete_outline</span>
                </button>
              </div>
            </div>
            <div class="card-info">
              <span class="card-name">{{ itemName(item) }}</span>
              <span class="card-meta">{{ itemMeta(item) }}</span>
              <span class="card-meta">{{ itemDate(item) | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Content: editor -->
      <div class="vault-content editor-mode" *ngIf="activeDocument()">
        <div class="editor-topbar">
          <button class="back-btn" (click)="closeDocument()">
            <span class="material-icons-round" style="font-size:16px">arrow_back</span>
          </button>
          <div class="breadcrumb">
            <span class="breadcrumb-folder" *ngIf="selectedFolderName()">
              {{ selectedFolderName() }}
              <span class="material-icons-round" style="font-size:13px;vertical-align:middle">chevron_right</span>
            </span>
            <span class="breadcrumb-doc">{{ activeDocument()!.title }}</span>
          </div>
          <div class="save-indicator">
            <span class="save-dot"
                  [class.saving]="editorSaveStatus() === 'saving'"
                  [class.saved]="editorSaveStatus() === 'saved'"
                  [class.error]="editorSaveStatus() === 'error'">●</span>
            <span class="save-label">
              {{ editorSaveStatus() === 'saving' ? 'Saving…' : editorSaveStatus() === 'saved' ? 'Saved' : editorSaveStatus() === 'error' ? 'Error' : '' }}
            </span>
          </div>
        </div>
        <pm-vault-document-editor
          [document]="activeDocument()!"
          [readonly]="false"
          (save)="onDocumentSave($event)"
          (saveStatusChange)="editorSaveStatus.set($event)"
        />
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .vault-toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 20px; border-bottom: 1px solid var(--border);
      background: var(--white); flex-shrink: 0;
    }
    .search-wrap {
      flex: 1; display: flex; align-items: center; gap: 6px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: 6px 10px;
    }
    .search-icon { font-size: 16px; color: var(--muted); flex-shrink: 0; }
    .search-input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: var(--ink); }
    .search-input::placeholder { color: var(--soft); }
    .clear-btn { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 0; }
    .clear-btn:hover { color: var(--ink); }
    .toolbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .vault-body { display: flex; flex: 1; min-height: 0; }

    .vault-sidebar {
      width: 200px; flex-shrink: 0; border-right: 1px solid var(--border);
      display: flex; flex-direction: column; padding: 14px 0 10px; overflow-y: auto;
    }
    .sidebar-label {
      padding: 0 14px 10px; font-size: 10px; font-weight: 700;
      color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase;
    }
    .folder-item {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 14px 7px 12px; cursor: pointer; font-size: 13px;
      color: var(--ink-4); position: relative; transition: background 0.1s;
      border-left: 2px solid transparent;
    }
    .folder-item:hover { background: var(--surface); }
    .folder-item.active { background: var(--violet-mid); color: var(--violet); font-weight: 600; border-left-color: var(--violet); }
    .folder-icon { font-size: 15px; flex-shrink: 0; }
    .folder-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .folder-rename-input {
      flex: 1; border: 1px solid var(--violet); border-radius: 4px;
      padding: 2px 6px; font-size: 12px; outline: none; min-width: 0;
    }
    .folder-actions { display: none; gap: 1px; flex-shrink: 0; }
    .folder-item:hover .folder-actions { display: flex; }
    .sidebar-spacer { flex: 1; min-height: 12px; }
    .new-folder-link {
      display: flex; align-items: center; gap: 4px;
      padding: 8px 14px; font-size: 12px; color: var(--muted); cursor: pointer; transition: color 0.15s;
    }
    .new-folder-link:hover { color: var(--violet); }
    .new-folder-row { display: flex; gap: 4px; align-items: center; padding: 6px 10px; }
    .folder-input { flex: 1; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; outline: none; min-width: 0; }

    .vault-content { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
    .vault-content.editor-mode { overflow: hidden; }

    .empty-state {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px; padding: 48px 24px; text-align: center;
    }
    .empty-icon { font-size: 40px; color: var(--soft); }
    .empty-title { font-size: 14px; font-weight: 600; color: var(--muted); margin: 0; }
    .empty-sub { font-size: 12px; color: var(--soft); margin: 0; }
    .empty-actions { display: flex; gap: 8px; margin-top: 8px; }
    .clear-search-link { font-size: 13px; color: var(--violet); background: none; border: none; cursor: pointer; text-decoration: underline; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinning { display: inline-block; animation: spin 1s linear infinite; }

    .section-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .section-name { font-size: 13px; font-weight: 700; color: var(--ink-3); flex: 1; }
    .item-count { font-size: 11px; color: var(--muted); background: var(--surface); padding: 1px 8px; border-radius: 999px; }
    .sort-btn {
      font-size: 11px; color: var(--muted); background: transparent;
      border: 1px solid var(--border); border-radius: var(--r-sm);
      padding: 3px 8px; cursor: pointer; transition: color 0.15s, border-color 0.15s;
    }
    .sort-btn:hover { color: var(--violet); border-color: var(--violet); }

    .card-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px; padding: 20px;
    }
    .vault-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); overflow: hidden; cursor: pointer;
      box-shadow: var(--shadow-sm); transition: box-shadow 0.15s, border-color 0.15s;
    }
    .vault-card:hover { box-shadow: var(--shadow-md); border-color: var(--violet); }
    .card-icon-area {
      background: var(--surface); height: 96px;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
    }
    .card-icon { font-size: 36px; }
    .card-actions {
      position: absolute; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center; gap: 6px;
      opacity: 0; transition: opacity 0.15s;
    }
    .vault-card:hover .card-actions { opacity: 1; }
    .card-action-btn {
      background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px; padding: 5px; cursor: pointer; color: #fff;
      display: flex; align-items: center; justify-content: center; transition: background 0.1s;
    }
    .card-action-btn:hover { background: rgba(255,255,255,0.3); }
    .card-action-btn.danger:hover { background: rgba(244,63,94,0.6); }
    .card-info { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .card-name { font-size: 12px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-meta { font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .editor-topbar {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-bottom: 1px solid var(--border);
      flex-shrink: 0; background: var(--white);
    }
    .back-btn {
      background: transparent; border: none; cursor: pointer; color: var(--muted);
      display: flex; align-items: center; padding: 4px; border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .back-btn:hover { color: var(--violet); background: var(--violet-mid); }
    .breadcrumb { flex: 1; display: flex; align-items: center; font-size: 13px; color: var(--muted); min-width: 0; }
    .breadcrumb-folder { flex-shrink: 0; }
    .breadcrumb-doc { font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .save-indicator { display: flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 12px; color: var(--muted); }
    .save-dot { font-size: 10px; color: transparent; }
    .save-dot.saving { color: var(--amber, #f59e0b); }
    .save-dot.saved { color: var(--emerald, #10b981); }
    .save-dot.error { color: var(--rose, #f43f5e); }

    .btn-sm { padding: 6px 14px; border-radius: var(--r-sm); font-size: 13px; cursor: pointer; border: 1px solid transparent; display: flex; align-items: center; gap: 4px; }
    .btn-xs { padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--violet); color: #fff; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: var(--border); color: var(--ink-4); }
    .icon-btn-xs { background: transparent; border: none; cursor: pointer; color: var(--muted); padding: 2px; border-radius: 4px; line-height: 1; }
    .icon-btn-xs:hover { color: var(--violet); }
    .icon-btn-xs.danger:hover { color: var(--rose, #f43f5e); }
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
  searchQuery = signal('');
  sortMode = signal<SortMode>('date-desc');
  editorSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  showNewFolder = false;
  newFolderName = '';
  renamingFolder = signal<VaultFolder | null>(null);
  renameDraft = '';

  visibleItems = computed<VaultItem[]>(() => {
    const fid = this.selectedFolderId();
    const q = this.searchQuery().toLowerCase();
    const sort = this.sortMode();

    const docs: VaultItem[] = this.documents()
      .filter(d => fid === null || d.folderId === fid)
      .filter(d => !q || d.title.toLowerCase().includes(q))
      .map(d => ({ kind: 'doc' as const, data: d }));

    const vaultFiles: VaultItem[] = this.files()
      .filter(f => fid === null || f.folderId === fid)
      .filter(f => !q || f.fileName.toLowerCase().includes(q))
      .map(f => ({ kind: 'file' as const, data: f }));

    const all = [...docs, ...vaultFiles];
    const nameOf = (i: VaultItem) => i.kind === 'doc' ? i.data.title : i.data.fileName;
    const dateOf = (i: VaultItem) => new Date(
      i.kind === 'doc' ? (i.data.updatedAt || i.data.createdAt) : i.data.createdAt
    ).getTime();

    switch (sort) {
      case 'name-asc':  return [...all].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      case 'name-desc': return [...all].sort((a, b) => nameOf(b).localeCompare(nameOf(a)));
      case 'date-asc':  return [...all].sort((a, b) => dateOf(a) - dateOf(b));
      default:          return [...all].sort((a, b) => dateOf(b) - dateOf(a));
    }
  });

  hasAnyItems = computed(() => this.documents().length > 0 || this.files().length > 0);

  selectedFolderName = computed(() => {
    const fid = this.selectedFolderId();
    if (!fid) return '';
    return this.folders().find(f => f.id === fid)?.name ?? '';
  });

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.vaultService.getFolders(this.projectId).subscribe({
      next: f => this.folders.set(f),
      error: () => this.toast('Failed to load folders', true),
    });
    this.vaultService.getDocuments(this.projectId).subscribe({
      next: d => { this.documents.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load documents', true); },
    });
    this.vaultService.getFiles(this.projectId).subscribe({
      next: f => this.files.set(f),
      error: () => this.toast('Failed to load files', true),
    });
  }

  sectionTitle(): string {
    const fid = this.selectedFolderId();
    if (!fid) return 'All Files';
    return this.folders().find(f => f.id === fid)?.name ?? 'All Files';
  }

  sortLabel(): string {
    switch (this.sortMode()) {
      case 'date-asc':  return 'Date ↑';
      case 'name-asc':  return 'Name A→Z';
      case 'name-desc': return 'Name Z→A';
      default:          return 'Date ↓';
    }
  }

  cycleSortMode(): void {
    const modes: SortMode[] = ['date-desc', 'date-asc', 'name-asc', 'name-desc'];
    this.sortMode.set(modes[(modes.indexOf(this.sortMode()) + 1) % modes.length]);
  }

  itemIcon(item: VaultItem): string {
    if (item.kind === 'doc') return 'article';
    return this.fileIcon(item.data.contentType);
  }

  itemIconColor(item: VaultItem): string {
    if (item.kind === 'doc') return 'var(--blue, #3b82f6)';
    const ct = item.data.contentType;
    if (ct.startsWith('image/')) return 'var(--teal, #00b8a0)';
    if (ct === 'application/pdf') return 'var(--rose, #f43f5e)';
    if (ct.includes('spreadsheet') || ct.includes('excel')) return 'var(--emerald, #10b981)';
    if (ct.includes('word')) return 'var(--blue, #3b82f6)';
    return 'var(--amber, #f59e0b)';
  }

  itemName(item: VaultItem): string {
    return item.kind === 'doc' ? item.data.title : item.data.fileName;
  }

  itemMeta(item: VaultItem): string {
    return item.kind === 'doc'
      ? (item.data.updatedByName || item.data.createdByName)
      : item.data.uploadedByName;
  }

  itemDate(item: VaultItem): string {
    return item.kind === 'doc'
      ? (item.data.updatedAt || item.data.createdAt)
      : item.data.createdAt;
  }

  openItem(item: VaultItem): void {
    if (item.kind === 'doc') { this.openDocument(item.data); }
    else { this.downloadFile(item.data); }
  }

  deleteItem(item: VaultItem, event: Event): void {
    event.stopPropagation();
    if (item.kind === 'doc') { this.deleteDocument(item.data); }
    else { this.deleteFile(item.data); }
  }

  selectFolder(id: string | null): void { this.selectedFolderId.set(id); }

  createFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) return;
    this.vaultService.createFolder(this.projectId, name).subscribe({
      next: f => { this.folders.update(all => [...all, f]); this.cancelNewFolder(); this.toast('Folder created'); },
      error: () => this.toast('Failed to create folder', true),
    });
  }

  cancelNewFolder(): void { this.showNewFolder = false; this.newFolderName = ''; }

  startRenameFolder(folder: VaultFolder): void { this.renamingFolder.set(folder); this.renameDraft = folder.name; }

  saveRenameFolder(): void {
    const folder = this.renamingFolder();
    if (!folder) return;
    if (!this.renameDraft.trim()) { this.cancelRenameFolder(); return; }
    this.vaultService.renameFolder(this.projectId, folder.id, this.renameDraft.trim()).subscribe({
      next: updated => { this.folders.update(all => all.map(f => f.id === updated.id ? updated : f)); this.cancelRenameFolder(); this.toast('Folder renamed'); },
      error: () => { this.cancelRenameFolder(); this.toast('Failed to rename folder', true); },
    });
  }

  cancelRenameFolder(): void { this.renamingFolder.set(null); this.renameDraft = ''; }

  deleteFolder(folder: VaultFolder): void {
    if (!confirm('Delete "' + folder.name + '"? Contents will be moved to root.')) return;
    this.vaultService.deleteFolder(this.projectId, folder.id).subscribe({
      next: () => {
        this.folders.update(all => all.filter(f => f.id !== folder.id));
        if (this.selectedFolderId() === folder.id) this.selectedFolderId.set(null);
        this.documents.update(all => all.map(d => d.folderId === folder.id ? { ...d, folderId: undefined } : d));
        this.files.update(all => all.map(f => f.folderId === folder.id ? { ...f, folderId: undefined } : f));
        this.toast('Folder deleted');
      },
      error: () => this.toast('Failed to delete folder', true),
    });
  }

  createDocument(): void {
    const folderId = this.selectedFolderId() ?? undefined;
    this.vaultService.createDocument(this.projectId, { title: 'Untitled', folderId }).subscribe({
      next: doc => {
        this.documents.update(all => [doc, ...all]);
        this.vaultService.getDocument(this.projectId, doc.id).subscribe({
          next: detail => { this.activeDocument.set(detail); this.editorSaveStatus.set('idle'); },
          error: () => this.toast('Failed to open document', true),
        });
      },
      error: () => this.toast('Failed to create document', true),
    });
  }

  openDocument(doc: VaultDocument): void {
    this.vaultService.getDocument(this.projectId, doc.id).subscribe({
      next: detail => { this.activeDocument.set(detail); this.editorSaveStatus.set('idle'); },
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
      error: () => { this.editorSaveStatus.set('error'); this.toast('Failed to save document', true); },
    });
  }

  deleteDocument(doc: VaultDocument): void {
    if (!confirm('Delete "' + doc.title + '"?')) return;
    this.vaultService.deleteDocument(this.projectId, doc.id).subscribe({
      next: () => {
        this.documents.update(all => all.filter(d => d.id !== doc.id));
        if (this.activeDocument()?.id === doc.id) this.closeDocument();
        this.toast('Document deleted');
      },
      error: () => this.toast('Failed to delete document', true),
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const folderId = this.selectedFolderId() ?? undefined;
    this.vaultService.uploadFile(this.projectId, file, folderId).subscribe({
      next: vf => { this.files.update(all => [vf, ...all]); this.toast('File uploaded'); },
      error: () => this.toast('Failed to upload file', true),
    });
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
    if (!confirm('Delete "' + vaultFile.fileName + '"?')) return;
    this.vaultService.deleteFile(this.projectId, vaultFile.id).subscribe({
      next: () => { this.files.update(all => all.filter(f => f.id !== vaultFile.id)); this.toast('File deleted'); },
      error: () => this.toast('Failed to delete file', true),
    });
  }

  private fileIcon(contentType: string): string {
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

- [ ] **Step 2: Verify it builds**

Run from `frontend/`:
```bash
npx nx build vault-feature --skip-nx-cache 2>&1 | tail -20
```
Expected: `Successfully ran target build` with 0 errors.

- [ ] **Step 3: Verify it renders**

Start the dev server from `frontend/`:
```bash
npx nx serve project-management-app
```
Open the app, navigate to any project, click the Vault tab. Verify:
- Toolbar appears at top with search input on left, "New Doc" + "Upload" buttons on right
- Sidebar shows "VAULT" label, "All Files" entry, folder list with left accent on active item
- Content area shows card grid (or empty state if no items)
- Hovering a card reveals the action overlay
- Clicking a doc card opens the editor with topbar showing back arrow + breadcrumb + save dot
- Typing in the editor triggers amber "Saving…" dot, then green "Saved" dot after 2 seconds

- [ ] **Step 4: Commit**

```bash
git add frontend/libs/vault/feature/src/lib/vault-tab/vault-tab.component.ts
git commit -m "feat: redesign vault UI as polished file explorer with card grid"
```
