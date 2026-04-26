import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { BoardService, BoardHubService } from '@pm/boards/data-access';
import { ProjectBoard, ProjectBoardDetail } from '@pm/shared/models';
import { ExcalidrawWrapperComponent } from '../excalidraw-wrapper/excalidraw-wrapper.component';

@Component({
  selector: 'pm-boards-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, ExcalidrawWrapperComponent],
  template: `
    <!-- ── Board list view ────────────────────── -->
    <div *ngIf="!activeBoard()" class="boards-list">
      <div class="boards-header">
        <span class="boards-title">Brainstorm Boards</span>
        <button class="btn-primary btn-sm" (click)="showCreate = true" *ngIf="!showCreate">
          <span class="material-icons-round" style="font-size:15px;vertical-align:middle">add</span> New Board
        </button>
      </div>

      <div *ngIf="showCreate" class="create-row">
        <input
          class="create-input"
          [(ngModel)]="newTitle"
          placeholder="Board name…"
          (keydown.enter)="createBoard()"
          (keydown.escape)="cancelCreate()"
          autofocus
        />
        <button class="btn-primary btn-sm" (click)="createBoard()" [disabled]="!newTitle.trim()">Create</button>
        <button class="btn-ghost btn-sm" (click)="cancelCreate()">Cancel</button>
      </div>

      <div *ngIf="loading()" class="boards-empty">
        <span class="material-icons-round spin">autorenew</span> Loading…
      </div>

      <div *ngIf="!loading() && boards().length === 0 && !showCreate" class="boards-empty">
        <span class="material-icons-round empty-icon">dashboard</span>
        <p>No boards yet. Create one to start planning.</p>
      </div>

      <div class="board-item" *ngFor="let board of boards()" (click)="openBoard(board)">
        <span class="material-icons-round board-icon">dashboard</span>
        <div class="board-item-info">
          <span class="board-name">{{ board.title }}</span>
          <span class="board-date">{{ board.updatedAt ?? board.createdAt | date:'mediumDate' }}</span>
        </div>
        <span class="material-icons-round board-arrow">chevron_right</span>
      </div>
    </div>

    <!-- ── Board detail view ──────────────────── -->
    <div *ngIf="activeBoard()" class="board-detail">
      <div class="board-detail-header">
        <button class="back-btn" (click)="closeBoard()">
          <span class="material-icons-round">arrow_back</span> Boards
        </button>

        <ng-container *ngIf="!editingTitle">
          <span class="board-detail-title" (click)="startRenaming()">
            {{ activeBoard()!.title }}
            <span class="material-icons-round rename-hint">edit</span>
          </span>
        </ng-container>
        <ng-container *ngIf="editingTitle">
          <input
            class="create-input title-input"
            [(ngModel)]="titleDraft"
            (keydown.enter)="saveTitle()"
            (keydown.escape)="cancelRename()"
            autofocus
          />
          <button class="btn-primary btn-sm" (click)="saveTitle()">Save</button>
          <button class="btn-ghost btn-sm" (click)="cancelRename()">Cancel</button>
        </ng-container>

        <button class="btn-danger btn-sm" style="margin-left:auto" (click)="deleteBoard(activeBoard()!.id)">
          <span class="material-icons-round" style="font-size:15px;vertical-align:middle">delete_outline</span> Delete
        </button>
      </div>

      <div class="canvas-wrap">
        <pm-excalidraw-wrapper
          [initialData]="activeBoard()!.contentJson"
          [remoteChange]="remoteChange()"
          (contentChanged)="onContentChanged($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    :host { display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }

    /* ── List ── */
    .boards-list { padding: 24px; max-width: 720px; }
    .boards-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .boards-title { font-size:16px; font-weight:700; }
    .create-row { display:flex; gap:8px; align-items:center; margin-bottom:16px; }
    .create-input {
      flex:1; padding:8px 12px; border:1px solid var(--border, #e2e8f0);
      border-radius:8px; font-size:14px; outline:none;
      transition:border-color 0.15s;
    }
    .create-input:focus { border-color:var(--primary, #16a34a); }
    .boards-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:48px 0; color:var(--text-muted, #94a3b8); }
    .empty-icon { font-size:40px; opacity:0.4; }
    .board-item {
      display:flex; align-items:center; gap:12px; padding:14px 16px;
      border:1px solid var(--border, #e2e8f0); border-radius:10px; cursor:pointer;
      margin-bottom:8px; transition:background 0.15s, border-color 0.15s;
    }
    .board-item:hover { background:var(--surface-hover, #f8fafc); border-color:var(--primary, #16a34a); }
    .board-icon { font-size:20px; color:var(--primary, #16a34a); }
    .board-item-info { flex:1; display:flex; flex-direction:column; gap:2px; }
    .board-name { font-size:14px; font-weight:600; }
    .board-date { font-size:11px; color:var(--text-muted, #94a3b8); }
    .board-arrow { color:var(--text-muted, #94a3b8); }

    /* ── Detail ── */
    .board-detail { display:flex; flex-direction:column; flex:1; min-height:0; }
    .board-detail-header {
      display:flex; align-items:center; gap:12px;
      padding:10px 16px; border-bottom:1px solid var(--border, #e2e8f0);
      flex-shrink:0;
    }
    .back-btn {
      display:flex; align-items:center; gap:4px; font-size:13px;
      color:var(--muted, #94a3b8); background:transparent; border:none;
      padding:4px 8px; border-radius:6px; cursor:pointer; transition:color 0.15s, background 0.15s;
    }
    .back-btn:hover { color:var(--violet, #3a8a45); background:var(--violet-mid, rgba(58,138,69,0.08)); }
    .board-detail-title {
      font-size:15px; font-weight:700; cursor:pointer;
      display:flex; align-items:center; gap:6px;
    }
    .rename-hint { font-size:14px; color:var(--text-muted, #94a3b8); opacity:0; transition:opacity 0.15s; }
    .board-detail-title:hover .rename-hint { opacity:1; }
    .title-input { width:240px; }
    .canvas-wrap { flex:1; min-height:0; display:flex; }

    /* ── Buttons ── */
    .btn-sm { padding:6px 14px; border-radius:7px; font-size:13px; cursor:pointer; border:1px solid transparent; }
    .btn-primary { background:var(--primary, #16a34a); color:#fff; border-color:var(--primary, #16a34a); }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-ghost { background:transparent; border-color:var(--border, #e2e8f0); color:var(--text, #374151); }
    .btn-danger { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }
    .spin { animation:spin 1s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
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

  ngOnInit(): void {
    this.boardService.getBoards(this.projectId).subscribe({
      next: (b) => { this.boards.set(b); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.persistSub = this.contentChange$.pipe(debounceTime(2000)).subscribe((json) => {
      if (!this.currentBoardId) return;
      this.boardService.updateBoard(this.projectId, this.currentBoardId, undefined, json).subscribe();
    });
  }

  createBoard(): void {
    const title = this.newTitle.trim();
    if (!title) return;
    this.boardService.createBoard(this.projectId, title).subscribe({
      next: (b) => {
        this.boards.update(prev => [...prev, b]);
        this.cancelCreate();
        this.toast('Board created');
      },
      error: () => this.toast('Failed to create board', true),
    });
  }

  cancelCreate(): void {
    this.showCreate = false;
    this.newTitle = '';
  }

  openBoard(board: ProjectBoard): void {
    this.boardService.getBoard(this.projectId, board.id).subscribe({
      next: async (detail) => {
        this.activeBoard.set(detail);
        this.currentBoardId = detail.id;
        await this.connectHub(detail.id);
      },
      error: () => this.toast('Failed to load board', true),
    });
  }

  closeBoard(): void {
    if (this.currentBoardId) this.hubService.leaveBoard(this.currentBoardId);
    this.hubSub?.unsubscribe();
    this.activeBoard.set(null);
    this.currentBoardId = undefined;
    this.remoteChange.set(null);
  }

  onContentChanged(json: string): void {
    if (!this.currentBoardId) return;
    this.hubService.broadcastChange(this.currentBoardId, json);
    this.contentChange$.next(json);
  }

  startRenaming(): void {
    this.titleDraft = this.activeBoard()!.title;
    this.editingTitle = true;
  }

  cancelRename(): void {
    this.editingTitle = false;
    this.titleDraft = '';
  }

  saveTitle(): void {
    const title = this.titleDraft.trim();
    if (!title || !this.currentBoardId) return;
    this.boardService.updateBoard(this.projectId, this.currentBoardId, title, undefined).subscribe({
      next: (updated) => {
        this.activeBoard.update(b => b ? { ...b, title: updated.title } : b);
        this.boards.update(all => all.map(b => b.id === updated.id ? { ...b, title: updated.title } : b));
        this.editingTitle = false;
        this.toast('Board renamed');
      },
      error: () => this.toast('Failed to rename board', true),
    });
  }

  deleteBoard(boardId: string): void {
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

  private async connectHub(boardId: string): Promise<void> {
    await this.hubService.connect();
    await this.hubService.joinBoard(boardId);
    this.hubSub = this.hubService.boardChange$.subscribe((json) => {
      this.remoteChange.set(json);
    });
  }

  private toast(message: string, isError = false): void {
    this.snackBar.open(message, undefined, {
      duration: 3000,
      panelClass: isError ? 'snack-error' : 'snack-success',
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  ngOnDestroy(): void {
    if (this.currentBoardId) this.hubService.leaveBoard(this.currentBoardId);
    this.hubSub?.unsubscribe();
    this.persistSub?.unsubscribe();
  }
}
