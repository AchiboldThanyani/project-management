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
import { Subscription } from 'rxjs';
import { BoardService, BoardHubService } from '@pm/boards/data-access';
import { ProjectBoard, ProjectBoardDetail } from '@pm/shared/models';
import { ExcalidrawWrapperComponent } from '../excalidraw-wrapper/excalidraw-wrapper.component';

@Component({
  selector: 'pm-boards-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ExcalidrawWrapperComponent],
  template: `
    <div class="boards-tab">

      <!-- Sidebar: board list -->
      <div class="boards-sidebar">
        <div class="boards-sidebar-header">
          <span>Boards</span>
          <button class="btn-icon" title="New board" (click)="startCreate()">
            <span class="material-icons-round">add</span>
          </button>
        </div>

        <!-- Create form -->
        <div *ngIf="creating()" class="board-create-form">
          <input
            class="input-sm"
            [(ngModel)]="newBoardTitle"
            placeholder="Board name"
            (keyup.enter)="confirmCreate()"
            (keyup.escape)="creating.set(false)"
            autofocus
          />
          <button class="btn-primary btn-sm" (click)="confirmCreate()">Create</button>
          <button class="btn-ghost btn-sm" (click)="creating.set(false)">Cancel</button>
        </div>

        <ul class="board-list">
          <li
            *ngFor="let b of boards()"
            class="board-list-item"
            [class.active]="activeBoard()?.id === b.id"
            (click)="selectBoard(b)"
          >
            <span class="material-icons-round board-icon">dashboard</span>
            <span class="board-name">{{ b.title }}</span>
            <button
              class="btn-icon btn-icon-sm board-delete"
              title="Delete board"
              (click)="deleteBoard($event, b)"
            >
              <span class="material-icons-round">delete_outline</span>
            </button>
          </li>
        </ul>

        <div *ngIf="boards().length === 0 && !creating()" class="boards-empty">
          No boards yet. Create one!
        </div>
      </div>

      <!-- Canvas -->
      <div class="boards-canvas" *ngIf="activeBoard(); else noBoardSelected">
        <div class="boards-canvas-header">
          <span class="boards-canvas-title">{{ activeBoard()!.title }}</span>
          <span class="collaborators-badge" *ngIf="false">Live</span>
        </div>
        <pm-excalidraw-wrapper
          class="excalidraw-host"
          [contentJson]="activeBoard()!.contentJson"
          (contentChanged)="onContentChanged($event)"
        />
      </div>

      <ng-template #noBoardSelected>
        <div class="boards-canvas boards-canvas-empty">
          <span class="material-icons-round empty-icon">dashboard</span>
          <p>Select or create a board to start brainstorming</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    .boards-tab {
      display: flex;
      height: calc(100vh - 160px);
      gap: 0;
    }
    .boards-sidebar {
      width: 220px;
      min-width: 180px;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 12px 8px;
      gap: 8px;
    }
    .boards-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      font-size: 13px;
      padding: 0 4px;
    }
    .board-create-form {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 4px;
    }
    .board-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .board-list-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      position: relative;
    }
    .board-list-item:hover { background: var(--surface-hover); }
    .board-list-item.active { background: var(--primary-soft); color: var(--primary); }
    .board-icon { font-size: 16px; opacity: 0.6; }
    .board-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .board-delete { opacity: 0; transition: opacity 0.15s; }
    .board-list-item:hover .board-delete { opacity: 1; }
    .boards-empty { font-size: 12px; color: var(--text-muted); padding: 8px 4px; }
    .boards-canvas {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .boards-canvas-header {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    pm-excalidraw-wrapper, .excalidraw-host { flex: 1; min-height: 0; }
    .boards-canvas-empty {
      justify-content: center;
      align-items: center;
      gap: 12px;
      color: var(--text-muted);
      font-size: 14px;
    }
    .empty-icon { font-size: 48px; opacity: 0.3; }
    .input-sm { padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; width: 100%; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
  `],
})
export class BoardsTabComponent implements OnInit, OnDestroy {
  @Input({ required: true }) projectId!: string;

  private boardService = inject(BoardService);
  private hubService = inject(BoardHubService);

  boards = signal<ProjectBoard[]>([]);
  activeBoard = signal<ProjectBoardDetail | null>(null);
  creating = signal(false);
  newBoardTitle = '';

  private hubSubscription?: Subscription;
  private persistDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadBoards();
  }

  ngOnDestroy(): void {
    if (this.activeBoard()) this.hubService.leaveBoard(this.activeBoard()!.id);
    this.hubSubscription?.unsubscribe();
    if (this.persistDebounce) clearTimeout(this.persistDebounce);
  }

  private loadBoards(): void {
    this.boardService.getBoards(this.projectId).subscribe(boards => this.boards.set(boards));
  }

  selectBoard(board: ProjectBoard): void {
    const prev = this.activeBoard();
    if (prev) this.hubService.leaveBoard(prev.id);

    this.boardService.getBoard(this.projectId, board.id).subscribe(detail => {
      this.activeBoard.set(detail);
      this.connectHub(detail.id);
    });
  }

  private connectHub(boardId: string): void {
    this.hubSubscription?.unsubscribe();
    this.hubService.connect().then(() => {
      this.hubService.joinBoard(boardId);
      this.hubSubscription = this.hubService.boardChange$.subscribe(contentJson => {
        const current = this.activeBoard();
        if (current) this.activeBoard.set({ ...current, contentJson });
      });
    });
  }

  onContentChanged(contentJson: string): void {
    const board = this.activeBoard();
    if (!board) return;

    this.hubService.broadcastChange(board.id, contentJson);

    if (this.persistDebounce) clearTimeout(this.persistDebounce);
    this.persistDebounce = setTimeout(() => {
      this.boardService.updateBoard(this.projectId, board.id, undefined, contentJson).subscribe();
    }, 2000);
  }

  startCreate(): void {
    this.newBoardTitle = '';
    this.creating.set(true);
  }

  confirmCreate(): void {
    const title = this.newBoardTitle.trim();
    if (!title) return;
    this.boardService.createBoard(this.projectId, title).subscribe(board => {
      this.boards.update(bs => [...bs, board]);
      this.creating.set(false);
      this.selectBoard(board);
    });
  }

  deleteBoard(event: MouseEvent, board: ProjectBoard): void {
    event.stopPropagation();
    this.boardService.deleteBoard(this.projectId, board.id).subscribe(() => {
      this.boards.update(bs => bs.filter(b => b.id !== board.id));
      if (this.activeBoard()?.id === board.id) this.activeBoard.set(null);
    });
  }
}
