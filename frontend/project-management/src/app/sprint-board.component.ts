import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from '@pm/projects/data-access';
import { TaskService } from '@pm/tasks/data-access';
import { AuthService } from '@pm/auth/data-access';
import { Project, Sprint, Task, TaskStatus, TaskPriority } from '@pm/shared/models';

interface ProjectBoard {
  project: Project;
  sprint: Sprint;
  allTasks: Task[];        // all tasks in this sprint
  projectIndex: number;   // for stable column IDs
}

const STATUS_COLUMNS = [
  { status: TaskStatus.Todo,       label: 'TO DO',       dot: 'var(--soft)' },
  { status: TaskStatus.InProgress, label: 'IN PROGRESS', dot: 'var(--blue)' },
  { status: TaskStatus.InReview,   label: 'IN REVIEW',   dot: 'var(--amber)' },
  { status: TaskStatus.Done,       label: 'DONE',        dot: 'var(--emerald)' },
  { status: TaskStatus.Blocked,    label: 'BLOCKED',     dot: 'var(--rose)' },
  { status: TaskStatus.Cancelled,  label: 'CANCELLED',   dot: 'var(--muted)' },
];

const PRIORITY_ICONS: Record<TaskPriority, string> = {
  [TaskPriority.Low]: '↓', [TaskPriority.Medium]: '→',
  [TaskPriority.High]: '↑', [TaskPriority.Critical]: '⬆',
};
const PRIORITY_CLASS: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'low', [TaskPriority.Medium]: 'medium',
  [TaskPriority.High]: 'high', [TaskPriority.Critical]: 'critical',
};

@Component({
  selector: 'app-sprint-board',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DragDropModule, MatSnackBarModule],
  template: `
    <div class="mywork-page">

      <!-- ── Topbar ──────────────────────────────────── -->
      <div class="topbar">
        <div>
          <h1 class="page-title">My Work</h1>
          <p class="page-sub">{{ showAll() ? 'All tasks in active sprints' : 'Tasks assigned to you across all active sprints' }}</p>
        </div>
        <div class="topbar-actions">
          <div class="toggle-group">
            <button class="toggle-btn" [class.active]="!showAll()" (click)="showAll.set(false)">
              <span class="material-icons-round">person</span> Mine
            </button>
            <button class="toggle-btn" [class.active]="showAll()" (click)="showAll.set(true)">
              <span class="material-icons-round">group</span> All
            </button>
          </div>
        </div>
      </div>

      <!-- ── Loading ─────────────────────────────────── -->
      <div *ngIf="loading()" class="loading-wrap">
        <div class="spinner"></div>
      </div>

      <!-- ── Empty — no active sprints ──────────────── -->
      <div *ngIf="!loading() && boards().length === 0" class="empty-state">
        <span class="material-icons-round empty-ico">checklist</span>
        <p class="empty-title">No active sprints</p>
        <p class="empty-sub">Start a sprint from a project to see work here.</p>
        <a class="btn-outline" routerLink="/projects">Go to Projects</a>
      </div>

      <!-- ── Empty — nothing assigned to me ───────────── -->
      <div *ngIf="!loading() && boards().length > 0 && visibleBoards().length === 0" class="empty-state">
        <span class="material-icons-round empty-ico">inbox</span>
        <p class="empty-title">Nothing assigned to you</p>
        <p class="empty-sub">Ask your team lead to assign tasks, or assign them from the project board.</p>
        <a class="btn-outline" routerLink="/projects">Go to Projects</a>
      </div>

      <!-- ── Project boards ───────────────────────────── -->
      <div *ngFor="let board of visibleBoards()" class="project-section">

        <!-- Sprint health header -->
        <div class="sprint-header">
          <div class="sprint-header-left">
            <div class="project-name-row">
              <div class="project-ico-wrap">
                <span class="material-icons-round project-ico">folder</span>
              </div>
              <span class="project-name">{{ board.project.name }}</span>
              <span class="sprint-tag">{{ board.sprint.name }}</span>
              <span class="days-badge" [class.overdue]="daysLeft(board.sprint) < 0">
                {{ daysLeft(board.sprint) < 0 ? 'Overdue' : daysLeft(board.sprint) + 'd left' }}
              </span>
            </div>
            <p *ngIf="board.sprint.goal" class="sprint-goal">{{ board.sprint.goal }}</p>
          </div>
          <div class="sprint-header-right">
            <div class="progress-row">
              <span class="progress-label">
                {{ doneCount(board) }} / {{ filteredTasks(board).length }} done
              </span>
              <span class="progress-pct">{{ progressPct(board) }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="progressPct(board)"></div>
            </div>
            <div *ngIf="totalSP(board) > 0" class="sp-row">
              <span class="material-icons-round sp-ico">star</span>
              {{ doneSP(board) }} / {{ totalSP(board) }} SP
            </div>
          </div>
        </div>

        <!-- Kanban columns -->
        <div class="kanban-board" cdkDropListGroup>
          <div class="kanban-col"
               *ngFor="let col of visibleColumns(board)">

            <div class="col-header">
              <div class="col-header-left">
                <span class="col-dot" [style.background]="col.dot"></span>
                <span class="col-label">{{ col.label }}</span>
              </div>
              <span class="col-count">{{ tasksByStatus(board, col.status).length }}</span>
            </div>

            <div class="task-list"
                 cdkDropList
                 [id]="colId(board, col.status)"
                 [cdkDropListData]="tasksByStatus(board, col.status)"
                 [cdkDropListConnectedTo]="visibleColumnIds(board)"
                 (cdkDropListDropped)="onDrop($event, board, col.status)">

              <div *ngFor="let task of tasksByStatus(board, col.status)"
                   class="task-card"
                   cdkDrag [cdkDragData]="task"
                   (click)="openTask(task, board)">
                <div *cdkDragPlaceholder class="drag-placeholder"></div>

                <div class="task-top">
                  <span class="task-id">{{ taskId(task) }}</span>
                  <span class="ph-priority {{ priorityClass(task.priority) }}">{{ priorityIcon(task.priority) }}</span>
                </div>

                <div class="task-title">{{ task.title }}</div>
                <p *ngIf="task.description" class="task-desc">{{ task.description }}</p>

                <div class="task-labels" *ngIf="task.labels?.length">
                  <span *ngFor="let l of task.labels" class="label-chip" [style.background]="l.color + '22'" [style.color]="l.color" [style.borderColor]="l.color + '55'">{{ l.name }}</span>
                </div>

                <div class="task-footer">
                  <div class="task-tags">
                    <span *ngIf="task.storyPoints" class="tag">
                      <span class="material-icons-round tag-ico">star</span>{{ task.storyPoints }} SP
                    </span>
                    <span *ngIf="task.dueDate" class="tag" [class.tag-overdue]="isOverdue(task.dueDate)">
                      <span class="material-icons-round tag-ico">event</span>{{ task.dueDate | date:'MMM d' }}
                    </span>
                    <span *ngIf="task.subTasks?.length" class="tag" [class.tag-done]="subtasksDone(task) === task.subTasks.length">
                      <span class="material-icons-round tag-ico">check_box</span>{{ subtasksDone(task) }}/{{ task.subTasks.length }}
                    </span>
                  </div>
                  <div *ngIf="task.assigneeName" class="assignee-ava" [title]="task.assigneeName">
                    {{ initials(task.assigneeName) }}
                  </div>
                </div>
              </div>

              <div *ngIf="tasksByStatus(board, col.status).length === 0" class="col-empty">
                <span class="material-icons-round">drag_indicator</span>
                <span>Drop here</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Task detail panel ─────────────────────────── -->
    <ng-container *ngIf="selectedTask() as task">
      <ng-container *ngIf="selectedBoard() as board">
        <div class="panel-overlay" (click)="closeTask()">
          <div class="task-panel" (click)="$event.stopPropagation()">

            <div class="panel-header">
              <div class="panel-title-row">
                <div class="panel-breadcrumb">
                  <span class="panel-project">{{ board.project.name }}</span>
                  <span class="material-icons-round bc-sep">chevron_right</span>
                  <span class="panel-sprint">{{ board.sprint.name }}</span>
                </div>
                <button class="icon-btn" (click)="closeTask()">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
              <span class="panel-task-id">{{ taskId(task) }}</span>
              <h2 class="panel-task-title">{{ task.title }}</h2>
            </div>

            <div class="panel-divider"></div>

            <div class="panel-body">
              <p *ngIf="task.description" class="panel-desc">{{ task.description }}</p>

              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <select class="status-select" [ngModel]="task.status" (ngModelChange)="changeStatus(task, board, $event)">
                    <option [value]="0">To Do</option>
                    <option [value]="1">In Progress</option>
                    <option [value]="2">In Review</option>
                    <option [value]="3">Done</option>
                    <option [value]="4">Blocked</option>
                    <option [value]="5">Cancelled</option>
                  </select>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Priority</span>
                  <div class="detail-row">
                    <span class="ph-priority {{ priorityClass(task.priority) }}">{{ priorityIcon(task.priority) }}</span>
                    <span class="detail-val">{{ priorityLabel(task.priority) }}</span>
                  </div>
                </div>
                <div class="detail-item" *ngIf="task.assigneeName">
                  <span class="detail-label">Assignee</span>
                  <div class="detail-row">
                    <div class="assignee-ava sm">{{ initials(task.assigneeName) }}</div>
                    <span class="detail-val">{{ task.assigneeName }}</span>
                  </div>
                </div>
                <div class="detail-item" *ngIf="task.storyPoints">
                  <span class="detail-label">Story Points</span>
                  <span class="detail-val">{{ task.storyPoints }}</span>
                </div>
                <div class="detail-item" *ngIf="task.dueDate">
                  <span class="detail-label">Due Date</span>
                  <span class="detail-val" [class.overdue-text]="isOverdue(task.dueDate)">
                    {{ task.dueDate | date:'MMM d, y' }}
                  </span>
                </div>
              </div>

              <div class="panel-hint">
                <span class="material-icons-round hint-ico">drag_indicator</span>
                Drag the card to move it through statuses, or go to the
                <a class="panel-link" [routerLink]="['/projects', board.project.id]">project board</a>
                to edit or comment.
              </div>
            </div>

          </div>
        </div>
      </ng-container>
    </ng-container>
  `,
  styles: [`
    .mywork-page {
      padding: 28px 32px;
      display: flex; flex-direction: column; gap: 28px;
    }

    /* ── Topbar ── */
    .topbar {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .page-title { margin: 0 0 2px; font-size: 20px; font-weight: 700; color: var(--ink); }
    .page-sub   { margin: 0; font-size: 13px; color: var(--muted); }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .toggle-group { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-full); padding: 3px; gap: 2px; }
    .toggle-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 14px; border-radius: var(--r-full); border: none;
      background: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600; color: var(--muted);
      transition: background .15s, color .15s;
    }
    .toggle-btn .material-icons-round { font-size: 14px; }
    .toggle-btn.active { background: var(--white); color: var(--ink); box-shadow: var(--shadow-sm); }

    /* ── Loading ── */
    .loading-wrap { display: flex; justify-content: center; padding: 64px; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--violet);
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Empty ── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 80px 0; color: var(--soft);
    }
    .empty-ico { font-size: 48px; opacity: 0.35; }
    .empty-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--muted); }
    .empty-sub   { margin: 0; font-size: 13px; }
    .btn-outline {
      padding: 8px 20px; border-radius: var(--r-full);
      border: 1px solid var(--border); background: var(--white);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; color: var(--ink);
      text-decoration: none; cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-outline:hover { border-color: var(--violet); color: var(--violet); }

    /* ── Project section ── */
    .project-section {
      display: flex; flex-direction: column; gap: 12px;
    }

    /* Sprint health header */
    .sprint-header {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 16px 20px;
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: 24px; flex-wrap: wrap;
      box-shadow: var(--shadow-sm);
    }
    .sprint-header-left { flex: 1; min-width: 220px; }

    .project-name-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;
    }
    .project-ico-wrap {
      width: 28px; height: 28px; border-radius: var(--r-sm);
      background: var(--violet-c); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .project-ico { font-size: 15px; color: var(--violet); }
    .project-name { font-size: 15px; font-weight: 700; color: var(--ink); }
    .sprint-tag {
      padding: 2px 9px; border-radius: var(--r-full);
      background: var(--surface); border: 1px solid var(--border);
      font-size: 11px; font-weight: 600; color: var(--muted);
    }
    .days-badge {
      padding: 2px 9px; border-radius: var(--r-full);
      background: var(--teal-c); color: var(--teal);
      font-size: 11px; font-weight: 600;
    }
    .days-badge.overdue { background: var(--rose-c); color: var(--rose); }
    .sprint-goal { margin: 0; font-size: 12px; color: var(--muted); font-style: italic; }

    .sprint-header-right { min-width: 200px; }
    .progress-row {
      display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;
    }
    .progress-label { font-size: 12px; font-weight: 600; color: var(--ink); }
    .mine-label { font-weight: 400; color: var(--muted); }
    .progress-pct { font-size: 12px; color: var(--muted); }
    .progress-track {
      height: 6px; border-radius: var(--r-full); background: var(--border);
      overflow: hidden; margin-bottom: 6px;
    }
    .progress-fill {
      height: 100%; border-radius: var(--r-full);
      background: linear-gradient(90deg, var(--violet), var(--teal));
      transition: width 0.4s ease;
    }
    .sp-row { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); }
    .sp-ico { font-size: 13px; color: var(--amber); }

    /* ── Kanban ── */
    .kanban-board {
      display: flex; gap: 12px;
      overflow-x: auto; padding-bottom: 8px;
      align-items: flex-start;
    }
    .kanban-col { min-width: 220px; flex: 1; display: flex; flex-direction: column; }

    .col-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md) var(--r-md) 0 0; border-bottom: none;
    }
    .col-header-left { display: flex; align-items: center; gap: 7px; }
    .col-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .col-label { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: var(--muted); }
    .col-count {
      font-size: 10px; font-weight: 700;
      background: var(--border); color: var(--muted);
      border-radius: var(--r-full); padding: 1px 6px;
    }

    .task-list {
      flex: 1; display: flex; flex-direction: column; gap: 6px;
      padding: 8px 6px;
      background: var(--surface); border: 1px solid var(--border);
      border-top: none; border-radius: 0 0 var(--r-md) var(--r-md);
      min-height: 100px; transition: background 0.12s;
    }
    .task-list.cdk-drop-list-dragging { background: var(--violet-mid); }

    /* ── Task card ── */
    .task-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: 10px 12px;
      cursor: pointer; transition: box-shadow 0.15s, transform 0.12s;
      box-shadow: var(--shadow-sm);
    }
    .task-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .task-card.cdk-drag-dragging { box-shadow: var(--shadow-lg); transform: rotate(1.5deg); cursor: grabbing; }

    .drag-placeholder {
      background: var(--violet-mid); border: 2px dashed var(--violet-2);
      border-radius: var(--r-md); min-height: 60px;
    }

    .task-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
    .task-id {
      font-family: 'DM Mono', monospace; font-size: 10px;
      font-weight: 500; color: var(--soft); letter-spacing: 0.3px;
    }
    .task-title { font-size: 12px; font-weight: 600; color: var(--ink); line-height: 1.35; margin-bottom: 4px; }
    .task-desc {
      font-size: 11px; color: var(--muted); margin: 0 0 6px;
      overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }

    .task-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
    .task-tags { display: flex; gap: 5px; flex-wrap: wrap; }
    .tag {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; color: var(--muted);
      background: var(--surface); border-radius: var(--r-full);
      padding: 2px 6px; border: 1px solid var(--border);
    }
    .tag-ico { font-size: 11px; }
    .tag-overdue { color: var(--rose); border-color: var(--rose-c); background: var(--rose-c); }
    .tag-done { color: var(--emerald); border-color: var(--emerald-c); background: var(--emerald-c); }

    .task-labels { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
    .label-chip {
      font-size: 10px; font-weight: 600; padding: 1px 7px;
      border-radius: var(--r-full); border: 1px solid transparent;
    }

    .status-select {
      appearance: none; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 5px 10px; font-family: 'DM Sans', sans-serif;
      font-size: 12px; color: var(--ink); cursor: pointer; outline: none;
      transition: border-color .15s;
    }
    .status-select:focus { border-color: var(--violet); }

    .assignee-ava {
      width: 22px; height: 22px; border-radius: 50%;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .assignee-ava.sm { width: 20px; height: 20px; font-size: 8px; }

    .col-empty {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 4px;
      color: var(--border); font-size: 11px; padding: 16px 0;
    }
    .col-empty .material-icons-round { font-size: 18px; }

    /* ── Task detail panel ── */
    .panel-overlay {
      position: fixed; inset: 0; background: rgba(15,15,20,0.35);
      z-index: 800; display: flex; justify-content: flex-end;
    }
    .task-panel {
      width: 400px; height: 100%; background: var(--white);
      box-shadow: -8px 0 32px rgba(15,15,20,0.12);
      display: flex; flex-direction: column;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .panel-header { padding: 16px 20px 14px; }
    .panel-title-row {
      display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;
    }
    .panel-breadcrumb { display: flex; align-items: center; gap: 2px; }
    .panel-project { font-size: 12px; font-weight: 700; color: var(--violet); }
    .bc-sep { font-size: 14px; color: var(--soft); }
    .panel-sprint { font-size: 12px; color: var(--muted); }
    .panel-task-id {
      display: block; margin-bottom: 4px;
      font-family: 'DM Mono', monospace; font-size: 11px; color: var(--soft);
    }
    .panel-task-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.3; }
    .panel-divider { height: 1px; background: var(--border); }
    .panel-body { padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .panel-desc { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.5; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .detail-item { display: flex; flex-direction: column; gap: 5px; }
    .detail-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--soft);
    }
    .detail-val { font-size: 13px; color: var(--ink); }
    .detail-row { display: flex; align-items: center; gap: 6px; }
    .overdue-text { color: var(--rose); font-weight: 600; }

    .panel-hint {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 12px 14px; border-radius: var(--r-md);
      background: var(--surface); border: 1px solid var(--border);
      font-size: 12px; color: var(--muted); line-height: 1.5;
    }
    .hint-ico { font-size: 16px; color: var(--soft); flex-shrink: 0; margin-top: 1px; }
    .panel-link { color: var(--violet); font-weight: 600; text-decoration: none; }
    .panel-link:hover { text-decoration: underline; }

    .icon-btn {
      width: 30px; height: 30px; border: none; background: transparent;
      border-radius: var(--r-md); cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: var(--soft); transition: background 0.12s, color 0.12s;
    }
    .icon-btn:hover { background: var(--surface); color: var(--ink); }
    .icon-btn .material-icons-round { font-size: 18px; }
  `],
})
export class SprintBoardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  boards = signal<ProjectBoard[]>([]);
  selectedTask = signal<Task | null>(null);
  selectedBoard = signal<ProjectBoard | null>(null);
  showAll = signal(false);

  currentUserId = computed(() => this.authService.user()?.userId ?? '');

  visibleBoards = computed(() =>
    this.boards().filter(b => this.filteredTasks(b).length > 0)
  );

  ngOnInit() {
    this.projectService.getAll().subscribe(projects => {
      if (projects.length === 0) { this.loading.set(false); return; }

      const sprintLoads$ = projects.map(p =>
        this.projectService.getSprints(p.id).pipe(map(sprints => ({ project: p, sprints })))
      );

      forkJoin(sprintLoads$).subscribe(results => {
        const active: { project: Project; sprint: Sprint }[] = [];

        results.forEach(({ project, sprints }) => {
          const activeSprint = sprints.find(s => s.isActive);
          if (activeSprint) active.push({ project, sprint: activeSprint });
        });

        if (active.length === 0) { this.loading.set(false); return; }

        const taskLoads$ = active.map(({ project }) =>
          this.taskService.getByProject(project.id)
        );

        forkJoin(taskLoads$).subscribe(taskResults => {
          const boards: ProjectBoard[] = active.map(({ project, sprint }, i) => ({
            project,
            sprint,
            allTasks: taskResults[i].filter(t => t.sprintId === sprint.id),
            projectIndex: i,
          }));
          this.boards.set(boards);
          this.loading.set(false);
        });
      });
    });
  }

  filteredTasks(board: ProjectBoard): Task[] {
    if (this.showAll()) return board.allTasks;
    return board.allTasks.filter(t => t.assigneeId === this.currentUserId());
  }

  subtasksDone(task: Task): number {
    return (task.subTasks ?? []).filter(s => s.isCompleted).length;
  }

  changeStatus(task: Task, board: ProjectBoard, newStatus: TaskStatus) {
    const originalStatus = task.status;
    const apply = (tasks: Task[]) =>
      tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);

    this.boards.update(all =>
      all.map(b => b.project.id === board.project.id ? { ...b, allTasks: apply(b.allTasks) } : b)
    );
    this.selectedTask.update(t => t?.id === task.id ? { ...t, status: newStatus } : t);

    this.taskService.updateStatus(task.id, { status: newStatus }).subscribe({
      error: () => {
        const revert = (tasks: Task[]) =>
          tasks.map(t => t.id === task.id ? { ...t, status: originalStatus } : t);
        this.boards.update(all =>
          all.map(b => b.project.id === board.project.id ? { ...b, allTasks: revert(b.allTasks) } : b)
        );
        this.selectedTask.update(t => t?.id === task.id ? { ...t, status: originalStatus } : t);
        this.snackBar.open('Failed to update status', 'Dismiss', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  tasksByStatus(board: ProjectBoard, status: TaskStatus): Task[] {
    return this.filteredTasks(board).filter(t => t.status === status);
  }

  // Only show Blocked/Cancelled if they have tasks
  visibleColumns(board: ProjectBoard) {
    const alwaysShow = new Set([
      TaskStatus.Todo, TaskStatus.InProgress, TaskStatus.InReview, TaskStatus.Done,
    ]);
    return STATUS_COLUMNS.filter(
      col => alwaysShow.has(col.status) || this.tasksByStatus(board, col.status).length > 0
    );
  }

  colId(board: ProjectBoard, status: TaskStatus): string {
    return `board-${board.projectIndex}-col-${status}`;
  }

  visibleColumnIds(board: ProjectBoard): string[] {
    return this.visibleColumns(board).map(col => this.colId(board, col.status));
  }

  doneCount(board: ProjectBoard): number {
    return this.filteredTasks(board).filter(t => t.status === TaskStatus.Done).length;
  }

  progressPct(board: ProjectBoard): number {
    const total = this.filteredTasks(board).length;
    return total > 0 ? Math.round((this.doneCount(board) / total) * 100) : 0;
  }

  totalSP(board: ProjectBoard): number {
    return this.filteredTasks(board).reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  }

  doneSP(board: ProjectBoard): number {
    return this.filteredTasks(board)
      .filter(t => t.status === TaskStatus.Done)
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  }

  daysLeft(sprint: Sprint): number {
    return Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / 86400000);
  }

  onDrop(event: CdkDragDrop<Task[]>, board: ProjectBoard, targetStatus: TaskStatus) {
    const task = event.item.data as Task;
    if (task.status === targetStatus) return;

    const originalStatus = task.status;
    const apply = (tasks: Task[]) =>
      tasks.map(t => t.id === task.id ? { ...t, status: targetStatus } : t);

    // Optimistically update the board's allTasks
    this.boards.update(all =>
      all.map(b => b.project.id === board.project.id
        ? { ...b, allTasks: apply(b.allTasks) }
        : b
      )
    );

    // Update selected task panel if open
    if (this.selectedTask()?.id === task.id) {
      this.selectedTask.update(t => t ? { ...t, status: targetStatus } : null);
    }

    this.taskService.updateStatus(task.id, { status: targetStatus }).subscribe({
      error: () => {
        const revert = (tasks: Task[]) =>
          tasks.map(t => t.id === task.id ? { ...t, status: originalStatus } : t);
        this.boards.update(all =>
          all.map(b => b.project.id === board.project.id
            ? { ...b, allTasks: revert(b.allTasks) }
            : b
          )
        );
        if (this.selectedTask()?.id === task.id) {
          this.selectedTask.update(t => t ? { ...t, status: originalStatus } : null);
        }
        this.snackBar.open('Failed to update task status', 'Dismiss', {
          duration: 3000, panelClass: 'snack-error',
        });
      },
    });
  }

  openTask(task: Task, board: ProjectBoard) {
    this.selectedTask.set(task);
    this.selectedBoard.set(board);
  }

  closeTask() {
    this.selectedTask.set(null);
    this.selectedBoard.set(null);
  }

  taskId(task: Task): string { return task.id.slice(0, 8).toUpperCase(); }
  priorityIcon(p: TaskPriority): string { return PRIORITY_ICONS[p] ?? '→'; }
  priorityClass(p: TaskPriority): string { return PRIORITY_CLASS[p] ?? 'low'; }
  priorityLabel(p: TaskPriority): string {
    return { [TaskPriority.Low]: 'Low', [TaskPriority.Medium]: 'Medium', [TaskPriority.High]: 'High', [TaskPriority.Critical]: 'Critical' }[p] ?? '';
  }
  statusLabel(s: TaskStatus): string {
    return { [TaskStatus.Todo]: 'To Do', [TaskStatus.InProgress]: 'In Progress', [TaskStatus.InReview]: 'In Review', [TaskStatus.Done]: 'Done', [TaskStatus.Blocked]: 'Blocked', [TaskStatus.Cancelled]: 'Cancelled' }[s] ?? '';
  }
  statusClass(s: TaskStatus): string {
    return { [TaskStatus.Todo]: 'planning', [TaskStatus.InProgress]: 'active', [TaskStatus.InReview]: 'on-hold', [TaskStatus.Done]: 'completed', [TaskStatus.Blocked]: 'archived', [TaskStatus.Cancelled]: 'archived' }[s] ?? 'planning';
  }
  initials(name: string): string {
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  isOverdue(d: string): boolean { return new Date(d) < new Date(); }
}
