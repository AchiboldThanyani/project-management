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

        <div *ngIf="!loading() && visibleItems().length > 0" class="section-bar">
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
