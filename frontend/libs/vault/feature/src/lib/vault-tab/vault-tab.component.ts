import {
  Component, Input, OnInit, signal, inject,
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

      <!-- Sidebar -->
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
                 placeholder="Folder name"
                 (keydown.enter)="createFolder()"
                 (keydown.escape)="cancelNewFolder()" />
          <button class="btn-primary btn-xs" (click)="createFolder()" [disabled]="!newFolderName.trim()">Add</button>
          <button class="btn-ghost btn-xs" (click)="cancelNewFolder()">X</button>
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

        <div *ngIf="renamingFolder()" class="new-folder-row">
          <input class="folder-input" [(ngModel)]="renameDraft"
                 (keydown.enter)="saveRenameFolder()"
                 (keydown.escape)="cancelRenameFolder()" />
          <button class="btn-primary btn-xs" (click)="saveRenameFolder()">Save</button>
          <button class="btn-ghost btn-xs" (click)="cancelRenameFolder()">X</button>
        </div>
      </div>

      <!-- Main content area -->
      <div class="vault-main" *ngIf="!activeDocument()">

        <!-- Documents -->
        <div class="section-header">
          <span class="section-title">
            <span class="material-icons-round">description</span>
            Documents
            <span class="count-badge">{{ visibleDocuments().length }}</span>
          </span>
          <button class="btn-primary btn-sm" (click)="createDocument()">
            <span class="material-icons-round" style="font-size:14px">add</span> New Doc
          </button>
        </div>

        <div *ngIf="loading()" class="vault-empty">
          <span class="material-icons-round">autorenew</span> Loading...
        </div>

        <div *ngIf="!loading() && visibleDocuments().length === 0" class="vault-empty small">
          No documents yet.
        </div>

        <div *ngFor="let doc of visibleDocuments()" class="vault-item" (click)="openDocument(doc)">
          <span class="material-icons-round item-icon doc-icon">article</span>
          <div class="item-info">
            <span class="item-name">{{ doc.title }}</span>
            <span class="item-meta">
              {{ doc.updatedByName || doc.createdByName }} &middot;
              {{ (doc.updatedAt || doc.createdAt) | date:'mediumDate' }}
            </span>
          </div>
          <button class="icon-btn-xs danger" (click)="deleteDocument(doc); $event.stopPropagation()" title="Delete">
            <span class="material-icons-round" style="font-size:14px">delete_outline</span>
          </button>
        </div>

        <!-- Files -->
        <div class="section-header" style="margin-top:24px">
          <span class="section-title">
            <span class="material-icons-round">attach_file</span>
            Files
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
              {{ f.uploadedByName }} &middot; {{ f.sizeBytes | number }} bytes &middot;
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

      <!-- Document editor -->
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
    .new-folder-row { display: flex; gap: 4px; align-items: center; padding: 6px 10px; }
    .folder-input { flex: 1; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; outline: none; }
    .folder-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px; cursor: pointer; font-size: 13px;
      color: var(--ink-4); position: relative; transition: background 0.1s;
    }
    .folder-item:hover { background: var(--surface); }
    .folder-item.active { background: var(--violet-mid); color: var(--violet); font-weight: 600; }
    .folder-icon { font-size: 16px; flex-shrink: 0; }
    .folder-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .folder-actions { display: none; gap: 2px; }
    .folder-item:hover .folder-actions { display: flex; }

    .vault-main { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 28px; }
    .vault-main.editor-mode { padding: 0; display: flex; flex-direction: column; }
    .editor-topbar { padding: 10px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .back-btn {
      display: flex; align-items: center; gap: 4px; font-size: 13px;
      color: var(--muted); background: transparent; border: none;
      cursor: pointer; padding: 4px 8px; border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .back-btn:hover { color: var(--violet); background: var(--violet-mid); }

    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .section-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink-3); }
    .section-title .material-icons-round { font-size: 16px; color: var(--muted); }
    .count-badge { font-size: 11px; font-weight: 600; background: var(--surface); color: var(--muted); padding: 1px 7px; border-radius: 999px; }

    .vault-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border: 1px solid var(--border);
      border-radius: 8px; margin-bottom: 6px; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .vault-item:hover { background: var(--surface); border-color: var(--violet); }
    .item-icon { font-size: 18px; flex-shrink: 0; }
    .doc-icon { color: var(--blue, #3b82f6); }
    .file-icon { color: var(--amber, #f59e0b); }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .item-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-meta { font-size: 11px; color: var(--muted); }

    .vault-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 48px 0; color: var(--soft); font-size: 14px; }
    .vault-empty.small { padding: 16px 0; font-size: 13px; }

    .btn-sm { padding: 6px 14px; border-radius: 7px; font-size: 13px; cursor: pointer; border: 1px solid transparent; display: flex; align-items: center; gap: 4px; }
    .btn-xs { padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--violet); color: #fff; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: var(--border); color: var(--ink-4); }
    .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 2px; border-radius: 4px; }
    .icon-btn:hover { color: var(--violet); }
    .icon-btn-xs { background: transparent; border: none; cursor: pointer; color: var(--muted); padding: 2px; border-radius: 4px; }
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
    return fid === null ? this.documents() : this.documents().filter(d => d.folderId === fid);
  }

  visibleFiles(): VaultFile[] {
    const fid = this.selectedFolderId();
    return fid === null ? this.files() : this.files().filter(f => f.folderId === fid);
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
    if (!folder || !this.renameDraft.trim()) return;
    this.vaultService.renameFolder(this.projectId, folder.id, this.renameDraft.trim()).subscribe({
      next: updated => { this.folders.update(all => all.map(f => f.id === updated.id ? updated : f)); this.cancelRenameFolder(); this.toast('Folder renamed'); },
      error: () => this.toast('Failed to rename folder', true),
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
        this.vaultService.getDocument(this.projectId, doc.id).subscribe(detail => this.activeDocument.set(detail));
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
    if (!confirm('Delete "' + doc.title + '"?')) return;
    this.vaultService.deleteDocument(this.projectId, doc.id).subscribe({
      next: () => { this.documents.update(all => all.filter(d => d.id !== doc.id)); this.toast('Document deleted'); },
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
