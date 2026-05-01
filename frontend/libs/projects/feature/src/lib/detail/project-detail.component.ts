import { Component, OnInit, signal, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { marked } from 'marked';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProjectService, ProjectMemberService } from '@pm/projects/data-access';
import { TaskService, CommentService, IssueService, LabelService, TaskDependencyService, TicketService, InviteService } from '@pm/tasks/data-access';
import { AuthService, UserService } from '@pm/auth/data-access';
import { BoardsTabComponent } from '@pm/boards/feature';
import { VaultTabComponent } from '@pm/vault/feature';
import { UpdatesTabComponent } from '../updates-tab/updates-tab.component';
import { MessagingComponent } from '@pm/teams/feature';
import {
  Project, ProjectStatus, PROJECT_STATUS_LABELS,
  Task, TaskStatus, TaskPriority, Sprint, Comment, User,
  Issue, IssueComment, IssueType, IssueStatus,
  ISSUE_TYPE_LABELS, ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS,
  TASK_STATUS_LABELS,
  Label, LABEL_COLORS,
  ProjectMember, ProjectMemberRole, PROJECT_MEMBER_ROLE_LABELS,
  TaskRef,
  Ticket, TicketComment, TicketStatus, TicketType, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, SlaStatus,
  Invite,
} from '@pm/shared/models';
import { ConfirmDialogComponent, MentionPipe } from '@pm/shared/util';

const COLUMNS = [
  { id: 'col-todo',       status: TaskStatus.Todo,       label: 'TO DO',       dot: 'var(--soft)' },
  { id: 'col-inprogress', status: TaskStatus.InProgress, label: 'IN PROGRESS', dot: 'var(--blue)' },
  { id: 'col-inreview',   status: TaskStatus.InReview,   label: 'IN REVIEW',   dot: 'var(--amber)' },
  { id: 'col-blocked',    status: TaskStatus.Blocked,    label: 'BLOCKED',     dot: 'var(--rose)' },
  { id: 'col-done',       status: TaskStatus.Done,       label: 'DONE',        dot: 'var(--emerald)' },
];

@Component({
  selector: 'pm-project-detail',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, DragDropModule,
    MatSnackBarModule, MatDialogModule, BoardsTabComponent, MentionPipe, VaultTabComponent, UpdatesTabComponent, MessagingComponent,
  ],
  template: `
    <div *ngIf="loading()" class="loading-wrap">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!loading() && project()" class="detail-page">

      <!-- ── Topbar ─────────────────────────────── -->
      <div class="topbar">
        <div class="topbar-left">
          <h1 class="page-title">{{ project()!.name }}</h1>
          <div class="topbar-meta">
            <div class="status-wrap">
              @if (statusMenuOpen) {
                <div class="status-backdrop" (click)="statusMenuOpen = false"></div>
              }
              <button class="status-chip status-{{ project()!.status }}" (click)="statusMenuOpen = !statusMenuOpen">
                <span class="status-dot"></span>
                {{ projectStatusLabel(project()!.status) }}
                <span class="material-icons-round status-chevron">expand_more</span>
              </button>
              @if (statusMenuOpen) {
                <div class="status-menu">
                  @for (s of allStatuses; track s.value) {
                    <button class="status-option" [class.active]="project()!.status === s.value" (click)="changeProjectStatus(s.value)">
                      <span class="status-dot status-dot-{{ s.value }}"></span>
                      {{ s.label }}
                      @if (project()!.status === s.value) {
                        <span class="material-icons-round check-ico">check</span>
                      }
                    </button>
                  }
                </div>
              }
            </div>
            <p class="page-sub" *ngIf="project()!.description">{{ project()!.description }}</p>
          </div>
        </div>
        <button class="btn-primary" *ngIf="activeTab !== 'issues' && activeTab !== 'vault' && activeTab !== 'messages'" (click)="showCreateTask.set(true)">
          <span class="material-icons-round">add</span> Add Task
        </button>
        <button class="btn-primary" *ngIf="activeTab === 'issues'" (click)="showCreateIssue.set(true)">
          <span class="material-icons-round">add</span> New Issue
        </button>
      </div>

      <!-- ── Tabs ───────────────────────────────── -->
      <div class="tab-bar">
        <button class="tab" [class.active]="activeTab === 'board'" (click)="activeTab = 'board'">
          <span class="material-icons-round">view_kanban</span> Board
        </button>
        <button class="tab" [class.active]="activeTab === 'sprints'" (click)="activeTab = 'sprints'">
          <span class="material-icons-round">sprint</span> Sprints
        </button>
        <button class="tab" [class.active]="activeTab === 'issues'" (click)="switchToIssues()">
          <span class="material-icons-round">bug_report</span> Issues
          <span class="tab-badge" *ngIf="openIssueCount() > 0">{{ openIssueCount() }}</span>
        </button>
        <button class="tab" [class.active]="activeTab === 'timeline'" (click)="activeTab = 'timeline'">
          <span class="material-icons-round">timeline</span> Timeline
        </button>
        <button class="tab" [class.active]="activeTab === 'members'" (click)="switchToMembers()">
          <span class="material-icons-round">group</span> Members
          <span class="tab-badge" *ngIf="members().length > 0">{{ members().length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab === 'tickets'" (click)="switchToTickets()">
          <span class="material-icons-round">confirmation_number</span> Tickets
          <span class="tab-badge" *ngIf="tickets().length > 0">{{ tickets().length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab === 'invites'" (click)="switchToInvites()">
          <span class="material-icons-round">link</span> Invites
        </button>
        <button class="tab" [class.active]="activeTab === 'brainstorm'" (click)="activeTab = 'brainstorm'">
          <span class="material-icons-round">brush</span> Brainstorm
        </button>
        <button class="tab" [class.active]="activeTab === 'vault'" (click)="activeTab = 'vault'">
          <span class="material-icons-round">folder_open</span> Vault
        </button>
        <button class="tab" [class.active]="activeTab === 'updates'" (click)="activeTab = 'updates'">
          <span class="material-icons-round">update</span> Updates
        </button>
        <button class="tab" [class.active]="activeTab === 'messages'" (click)="activeTab = 'messages'">
          <span class="material-icons-round">chat_bubble_outline</span> Messages
        </button>
      </div>

      <!-- ── Board tab ──────────────────────────── -->
      <div *ngIf="activeTab === 'board'">

        <!-- Filter bar -->
        <div class="filter-bar">
          <select class="filter-select" [(ngModel)]="filterSprintId" (ngModelChange)="applyFilters()">
            <option [ngValue]="null">All sprints</option>
            <option value="backlog">Backlog</option>
            <option *ngFor="let s of sprints()" [value]="s.id">{{ s.name }}</option>
          </select>
          <select class="filter-select" [(ngModel)]="filterPriority" (ngModelChange)="applyFilters()">
            <option [ngValue]="null">All priorities</option>
            <option [ngValue]="TaskPriority.Low">Low</option>
            <option [ngValue]="TaskPriority.Medium">Medium</option>
            <option [ngValue]="TaskPriority.High">High</option>
            <option [ngValue]="TaskPriority.Critical">Critical</option>
          </select>
          <select class="filter-select" *ngIf="members().length > 0" [(ngModel)]="filterAssigneeId" (ngModelChange)="applyFilters()">
            <option [ngValue]="null">Anyone</option>
            <option value="unassigned">Unassigned</option>
            <option *ngFor="let m of assignableMembers()" [value]="m.userId">{{ m.fullName }}</option>
          </select>
          <select class="filter-select" *ngIf="labels().length > 0" [(ngModel)]="filterLabelId" (ngModelChange)="applyFilters()">
            <option [ngValue]="null">All labels</option>
            <option *ngFor="let l of labels()" [value]="l.id">{{ l.name }}</option>
          </select>
          <button class="clear-filter" *ngIf="hasActiveFilter()" (click)="clearFilters()">
            <span class="material-icons-round">filter_alt_off</span> Clear
          </button>
        </div>

        <!-- Kanban -->
        <div class="kanban-board" cdkDropListGroup>
          <div class="kanban-col {{ col.id }}" *ngFor="let col of columns">
            <div class="col-header">
              <div class="col-header-left">
                <span class="col-dot" [style.background]="col.dot"></span>
                <span class="col-label">{{ col.label }}</span>
              </div>
              <span class="col-count">{{ getTasksByStatus(col.status).length }}</span>
            </div>

            <div class="task-list"
                 cdkDropList [id]="col.id"
                 [cdkDropListData]="getTasksByStatus(col.status)"
                 [cdkDropListConnectedTo]="columnIds"
                 (cdkDropListDropped)="onDrop($event, col.status)">

              <div *ngFor="let task of getTasksByStatus(col.status)"
                   class="task-card"
                   cdkDrag [cdkDragData]="task"
                   (click)="openTask(task)">
                <div *cdkDragPlaceholder class="drag-placeholder"></div>

                <div class="task-top">
                  <span class="task-id">{{ taskId(task) }}</span>
                  <span class="ph-priority {{ priorityClass(task.priority) }}">{{ priorityIcon(task.priority) }}</span>
                </div>
                <div class="task-title">{{ task.title }}</div>
                <p *ngIf="task.description" class="task-desc">{{ task.description }}</p>
                <div class="task-labels" *ngIf="task.labels && task.labels.length > 0">
                  <span *ngFor="let l of task.labels" class="label-chip label-{{ l.color }}">{{ l.name }}</span>
                </div>
                <div class="blocked-badge" *ngIf="task.isBlocked">
                  <span class="material-icons-round">block</span> Blocked
                </div>
                <div class="task-footer">
                  <div class="task-tags">
                    <span *ngIf="task.storyPoints" class="tag">
                      <span class="material-icons-round tag-ico">star</span>{{ task.storyPoints }}
                    </span>
                    <span *ngIf="task.dueDate" class="tag" [class.tag-overdue]="isOverdue(task.dueDate)">
                      <span class="material-icons-round tag-ico">event</span>{{ task.dueDate | date:'MMM d' }}
                    </span>
                    <span *ngIf="task.subTasks?.length" class="tag" [class.tag-done]="doneSubtasks(task) === task.subTasks.length">
                      <span class="material-icons-round tag-ico">check_box</span>{{ doneSubtasks(task) }}/{{ task.subTasks.length }}
                    </span>
                  </div>
                  <div *ngIf="task.assigneeName" class="assignee-ava" [title]="task.assigneeName">
                    {{ nameInitials(task.assigneeName) }}
                  </div>
                </div>
              </div>

              <div *ngIf="getTasksByStatus(col.status).length === 0" class="col-empty">
                <span class="material-icons-round">drag_indicator</span>
                <span>Drop tasks here</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sprints tab ────────────────────────── -->
      <div *ngIf="activeTab === 'sprints'" class="sprints-section">
        <div class="sprints-header">
          <button class="btn-ghost" (click)="showManageLabels.set(true)">
            <span class="material-icons-round">label</span> Labels
          </button>
          <button class="btn-primary" (click)="showCreateSprint.set(true)">
            <span class="material-icons-round">add</span> New Sprint
          </button>
        </div>

        <div *ngFor="let s of sprints()" class="sprint-card">
          <div class="sprint-card-header">
            <div class="sprint-left">
              <div class="sprint-name-row">
                <span class="sprint-name">{{ s.name }}</span>
                <span class="ph-badge active" *ngIf="s.isActive">Active</span>
                <span class="ph-badge completed" *ngIf="s.isCompleted">Completed</span>
                <span class="ph-badge planning" *ngIf="!s.isActive && !s.isCompleted">Planned</span>
              </div>
              <div class="sprint-dates">
                <span class="material-icons-round date-ico">calendar_today</span>
                {{ s.startDate | date:'MMM d' }} – {{ s.endDate | date:'MMM d, y' }}
              </div>
              <p *ngIf="s.goal" class="sprint-goal">{{ s.goal }}</p>
              <div *ngIf="s.isCompleted" class="sprint-retro-row">
                <span class="material-icons-round retro-ico">history_edu</span>
                <span *ngIf="s.retroNotes" class="retro-notes-text">{{ s.retroNotes }}</span>
                <span *ngIf="!s.retroNotes" class="retro-notes-empty">No retro notes</span>
                <span *ngIf="s.carryOverCount > 0" class="carry-over-badge">{{ s.carryOverCount }} carried over</span>
              </div>
            </div>
            <div class="sprint-right">
              <div class="sprint-stats">
                <span class="stat">
                  <span class="material-icons-round stat-ico">assignment</span>
                  {{ tasksBySprint(s.id).length }} tasks
                </span>
                <span class="stat done" *ngIf="tasksBySprint(s.id).length > 0">
                  <span class="material-icons-round stat-ico">task_alt</span>
                  {{ doneTasksBySprint(s.id) }} done
                </span>
              </div>
              <div class="sprint-menu">
                <button class="icon-btn" (click)="toggleSprintMenu(s.id)">
                  <span class="material-icons-round">more_vert</span>
                </button>
                <div class="dropdown" *ngIf="openSprintMenuId === s.id" (click)="$event.stopPropagation()">
                  <button class="dd-item" *ngIf="!s.isActive" (click)="activateSprint(s); openSprintMenuId = null">
                    <span class="material-icons-round">play_arrow</span> Activate
                  </button>
                  <button class="dd-item" *ngIf="s.isActive" (click)="openCompleteSprint(s); openSprintMenuId = null">
                    <span class="material-icons-round">check_circle</span> Complete
                  </button>
                  <button class="dd-item" (click)="openEditSprint(s); openSprintMenuId = null">
                    <span class="material-icons-round">edit</span> Edit
                  </button>
                  <button class="dd-item danger" (click)="confirmDeleteSprint(s); openSprintMenuId = null">
                    <span class="material-icons-round">delete</span> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p *ngIf="sprints().length === 0" class="empty-text">No sprints yet.</p>
      </div>

      <!-- ── Issues tab ─────────────────────────── -->
      <div *ngIf="activeTab === 'issues'" class="issues-section">

        <!-- Filter bar -->
        <div class="issue-filter-bar">
          <div class="status-toggle">
            <button class="st-btn" [class.active]="issueFilterStatus === 'open'"
                    (click)="issueFilterStatus = 'open'">
              <span class="material-icons-round">radio_button_unchecked</span>
              {{ openIssueCount() }} Open
            </button>
            <button class="st-btn" [class.active]="issueFilterStatus === 'closed'"
                    (click)="issueFilterStatus = 'closed'">
              <span class="material-icons-round">check_circle_outline</span>
              {{ closedIssueCount() }} Closed
            </button>
          </div>
          <div style="flex:1"></div>
          <select class="filter-select" [(ngModel)]="issueFilterType">
            <option [ngValue]="null">All Types</option>
            <option value="Bug">Bug</option>
            <option value="Feature">Feature</option>
            <option value="Question">Question</option>
            <option value="Chore">Chore</option>
          </select>
          <select class="filter-select" [(ngModel)]="issueFilterAssignee">
            <option [ngValue]="null">Anyone</option>
            <option *ngFor="let m of assignableMembers()" [value]="m.userId">{{ m.fullName }}</option>
          </select>
        </div>

        <!-- Loading -->
        <div *ngIf="issuesLoading()" class="loading-wrap"><div class="spinner"></div></div>

        <!-- List -->
        <div *ngIf="!issuesLoading()" class="issue-list">
          <div *ngFor="let issue of filteredIssues()" class="issue-row" (click)="openIssue(issue)">
            <span class="issue-type-dot type-{{ issueTypeColor(issue.type) }}" [title]="issueTypeLabel(issue.type)">
              <span class="material-icons-round">{{ issueTypeIcon(issue.type) }}</span>
            </span>
            <span class="issue-num">#{{ issue.number }}</span>
            <div class="issue-info">
              <span class="issue-title">{{ issue.title }}</span>
              <span class="issue-meta">
                <span *ngIf="issue.convertedToTaskId" class="issue-converted-badge">
                  <span class="material-icons-round">done_all</span> converted to task
                </span>
                <ng-container *ngIf="!issue.convertedToTaskId">
                  opened by {{ issue.reporterName || 'Unknown' }}
                  <ng-container *ngIf="issue.commentCount > 0"> · {{ issue.commentCount }} comments</ng-container>
                </ng-container>
              </span>
            </div>
            <div class="issue-badges">
              <span class="issue-type-badge type-{{ issueTypeColor(issue.type) }}">{{ issueTypeLabel(issue.type) }}</span>
              <div *ngIf="issue.assigneeName" class="assignee-ava" [title]="issue.assigneeName">
                {{ nameInitials(issue.assigneeName) }}
              </div>
            </div>
          </div>
          <div *ngIf="filteredIssues().length === 0" class="issues-empty">
            <span class="material-icons-round">{{ issueFilterStatus === 'closed' ? 'check_circle' : 'bug_report' }}</span>
            <p>No {{ issueFilterStatus }} issues{{ issueFilterType !== null ? ' of this type' : '' }}</p>
          </div>
        </div>
      </div>

      <!-- ── Timeline tab ─────────────────────────── -->
      <div *ngIf="activeTab === 'timeline'" class="tl-section">

        <!-- Empty state -->
        <div *ngIf="sprints().length === 0" class="tl-empty">
          <span class="material-icons-round">timeline</span>
          <p>No sprints yet — create a sprint to see the timeline</p>
          <button class="btn-primary sm" (click)="activeTab = 'sprints'; showCreateSprint.set(true)">
            <span class="material-icons-round">add</span> New Sprint
          </button>
        </div>

        <ng-container *ngIf="sprints().length > 0">

          <!-- Axis row (month labels) -->
          <div class="tl-row tl-axis-row">
            <div class="tl-label"></div>
            <div class="tl-track tl-axis-track">
              <div *ngFor="let m of timelineMonths()" class="tl-month-tick"
                   [style.left.%]="m.pct">
                <span class="tl-month-label">{{ m.label }}</span>
              </div>
              <div class="tl-today-line tl-today-line--axis" [style.left.%]="todayPct()"></div>
            </div>
          </div>

          <!-- Sprint rows -->
          <div *ngFor="let s of sprints()" class="tl-row">
            <div class="tl-label">
              <span class="tl-sprint-name" [title]="s.name">{{ s.name }}</span>
              <span class="ph-badge active" *ngIf="s.isActive">Active</span>
            </div>
            <div class="tl-track">
              <!-- Grid lines aligned to month ticks -->
              <div *ngFor="let m of timelineMonths()" class="tl-grid-line"
                   [style.left.%]="m.pct"></div>
              <!-- Today line -->
              <div class="tl-today-line" [style.left.%]="todayPct()"></div>
              <!-- Sprint bar -->
              <div class="tl-bar" [class.tl-bar-active]="s.isActive"
                   [style.left.%]="sprintLeft(s)"
                   [style.width.%]="sprintWidth(s)"
                   [title]="s.name + ': ' + (s.startDate | date:'MMM d') + ' – ' + (s.endDate | date:'MMM d, y')">
                <span class="tl-bar-dates">{{ s.startDate | date:'MMM d' }} – {{ s.endDate | date:'MMM d' }}</span>
              </div>
              <!-- Task dots (only those with a due date) -->
              <ng-container *ngFor="let t of tasksBySprint(s.id)">
                <div *ngIf="t.dueDate"
                     class="tl-dot prio-{{ priorityClass(t.priority) }}"
                     [style.left.%]="pct(t.dueDate)"
                     [title]="t.title + ' · Due ' + (t.dueDate | date:'MMM d') + ' · ' + priorityLabel(t.priority)">
                </div>
              </ng-container>
            </div>
          </div>

          <!-- Backlog row -->
          <div class="tl-row tl-backlog-row" *ngIf="backlogTasksWithDue().length > 0">
            <div class="tl-label">
              <span class="tl-sprint-name">Backlog</span>
            </div>
            <div class="tl-track">
              <div *ngFor="let m of timelineMonths()" class="tl-grid-line"
                   [style.left.%]="m.pct"></div>
              <div class="tl-today-line" [style.left.%]="todayPct()"></div>
              <ng-container *ngFor="let t of backlogTasksWithDue()">
                <div class="tl-dot prio-{{ priorityClass(t.priority) }}"
                     [style.left.%]="pct(t.dueDate!)"
                     [title]="t.title + ' · Due ' + (t.dueDate | date:'MMM d') + ' · ' + priorityLabel(t.priority)">
                </div>
              </ng-container>
            </div>
          </div>

          <!-- Legend -->
          <div class="tl-legend">
            <div class="tl-legend-item">
              <div class="tl-legend-bar planned"></div><span>Planned sprint</span>
            </div>
            <div class="tl-legend-item">
              <div class="tl-legend-bar active-bar"></div><span>Active sprint</span>
            </div>
            <div class="tl-legend-item">
              <div class="tl-dot prio-low" style="position:static;transform:none"></div><span>Low</span>
            </div>
            <div class="tl-legend-item">
              <div class="tl-dot prio-medium" style="position:static;transform:none"></div><span>Medium</span>
            </div>
            <div class="tl-legend-item">
              <div class="tl-dot prio-high" style="position:static;transform:none"></div><span>High</span>
            </div>
            <div class="tl-legend-item">
              <div class="tl-dot prio-critical" style="position:static;transform:none"></div><span>Critical</span>
            </div>
            <div class="tl-legend-item">
              <div class="tl-today-legend"></div><span>Today</span>
            </div>
          </div>

        </ng-container>
      </div>

      <!-- ── Members tab ───────────────────────────── -->
      <div *ngIf="activeTab === 'members'" class="members-section">

        <!-- Header row -->
        <div class="members-header">
          <p class="members-subtitle">People working on this project and their open task workload.</p>
          <button class="btn-primary sm" *ngIf="canManageMembers()" (click)="showAddMember.set(true)">
            <span class="material-icons-round">person_add</span> Add Member
          </button>
        </div>

        <!-- Loading / empty -->
        <div *ngIf="membersLoading()" class="loading-wrap">
          <span class="material-icons-round spin">autorenew</span>
        </div>
        <div *ngIf="!membersLoading() && members().length === 0" class="members-empty">
          <span class="material-icons-round">group_off</span>
          <p>No members yet — add someone to get started.</p>
        </div>

        <!-- Member cards grid -->
        <div *ngIf="!membersLoading() && members().length > 0" class="member-grid">
          <div *ngFor="let m of members()" class="member-card">

            <!-- Top row: avatar + name/email + remove -->
            <div class="member-top">
              <div class="member-avatar">{{ initials(m.fullName) }}</div>
              <div class="member-info">
                <p class="member-name">{{ m.fullName }}</p>
                <p class="member-email">{{ m.email }}</p>
              </div>
              <button *ngIf="canManageMembers()" class="icon-btn danger-icon remove-btn"
                      title="Remove from project" (click)="removeMember(m)">
                <span class="material-icons-round">person_remove</span>
              </button>
            </div>

            <!-- Footer: task count + role -->
            <div class="member-footer">
              <span class="member-tasks" [class.tasks-warn]="m.openTaskCount >= 5">
                <span class="material-icons-round">task_alt</span>
                {{ m.openTaskCount }} open {{ m.openTaskCount === 1 ? 'task' : 'tasks' }}
              </span>
              <div class="member-role-wrap">
                @if (!canManageMembers() || m.systemRole === 1) {
                  <span class="member-role-badge role-{{ m.role }}">
                    @if (m.systemRole === 1) { <span class="material-icons-round" style="font-size:11px">lock</span> }
                    {{ roleLabel(m.role) }}
                  </span>
                } @else {
                  <select class="role-select" [ngModel]="m.role" (ngModelChange)="changeMemberRole(m, $event)">
                    <option value="Viewer">Viewer</option>
                    <option value="Member">Member</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                  </select>
                }
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- ── Tickets tab ──────────────────────────── -->
      <div *ngIf="activeTab === 'tickets'" class="tickets-section">
        <div class="tickets-header">
          <div class="tickets-filters">
            <select class="filter-select" [(ngModel)]="ticketFilterStatus">
              <option value="">All statuses</option>
              <option [value]="0">New</option>
              <option [value]="1">Open</option>
              <option [value]="2">In Progress</option>
              <option [value]="3">Resolved</option>
              <option [value]="4">Closed</option>
            </select>
          </div>
        </div>
        <div *ngIf="ticketsLoading()" class="loading-wrap">
          <span class="material-icons-round spin">autorenew</span>
        </div>
        <div *ngIf="!ticketsLoading() && filteredTickets().length === 0" class="members-empty">
          <span class="material-icons-round">confirmation_number</span>
          <p>No tickets for this project yet.</p>
        </div>
        <div *ngIf="!ticketsLoading() && filteredTickets().length > 0" class="ticket-table">
          <div class="ticket-table-header">
            <span>#</span><span>Subject</span><span>Type</span><span>Priority</span><span>Submitted by</span><span>Status</span>
          </div>
          <div class="ticket-row" *ngFor="let t of filteredTickets()" (click)="openTicket(t)">
            <span class="ticket-num">{{ t.number }}</span>
            <span class="ticket-subject">{{ t.subject }}</span>
            <span class="ticket-type-chip">{{ ticketTypeLabel(t.type) }}</span>
            <span class="priority-dot p-{{ t.priority }}">{{ ['Low','Medium','High','Critical'][t.priority] }}</span>
            <span class="ticket-submitter">{{ t.submittedByName }}</span>
            <span class="status-chip s-{{ t.status }}">{{ ticketStatusLabel(t.status) }}</span>
            <span class="sla-badge sla-{{ t.slaStatus }}" [title]="slaTooltip(t)">{{ slaLabel(t.slaStatus) }}</span>
          </div>
        </div>
      </div>

      <!-- ── Invites tab ──────────────────────────── -->
      <div *ngIf="activeTab === 'invites'" class="invites-section">
        <div class="invites-header">
          <p class="invites-subtitle">Share invite links with customers so they can register and access the portal for this project.</p>
          <button class="btn-primary sm" (click)="generateInvite()">
            <span class="material-icons-round">add_link</span> Generate Invite
          </button>
        </div>
        <div *ngIf="invitesLoading()" class="loading-wrap">
          <span class="material-icons-round spin">autorenew</span>
        </div>
        <div *ngIf="!invitesLoading() && invites().length === 0" class="members-empty">
          <span class="material-icons-round">link_off</span>
          <p>No invite links yet.</p>
        </div>
        <div *ngIf="!invitesLoading() && invites().length > 0" class="invite-list">
          <div class="invite-row" *ngFor="let inv of invites()">
            <span class="material-icons-round invite-icon">link</span>
            <div class="invite-info">
              <code class="invite-token">/join/{{ inv.token }}</code>
              <span class="invite-expiry">Expires {{ inv.expiresAt | date:'mediumDate' }}</span>
            </div>
            <div class="invite-actions">
              <button class="icon-btn" title="Copy link" (click)="copyInviteLink(inv)">
                <span class="material-icons-round">content_copy</span>
              </button>
              <button class="icon-btn danger-icon" title="Revoke" (click)="revokeInvite(inv)">
                <span class="material-icons-round">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Brainstorm tab ────────────────────────── -->
      <div *ngIf="activeTab === 'brainstorm' && project()" style="display:flex;flex-direction:column;height:calc(100vh - 160px);">
        <pm-boards-tab [projectId]="project()!.id" />
      </div>

      <!-- ── Vault tab ─────────────────────────────── -->
      <div *ngIf="activeTab === 'vault'" style="display:flex;flex:1;min-height:0;">
        <pm-vault-tab [projectId]="project()!.id" />
      </div>

      <!-- ── Updates tab ───────────────────────────── -->
      <div *ngIf="activeTab === 'updates'" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
        <pm-updates-tab [projectId]="project()!.id" />
      </div>

      <!-- ── Messages tab ─────────────────────────── -->
      <div *ngIf="activeTab === 'messages'" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
        <pm-messaging [projectId]="project()!.id" />
      </div>

    </div>

    <!-- ── Issue detail panel ────────────────────── -->
    <div *ngIf="selectedIssue()" class="panel-overlay" (click)="closeIssue()">
      <div class="task-panel" (click)="$event.stopPropagation()">
        <ng-container *ngIf="selectedIssue() as issue">

          <div class="panel-header">
            <div class="panel-title-row">
              <div class="issue-panel-meta">
                <span class="issue-type-dot type-{{ issueTypeColor(issue.type) }}">
                  <span class="material-icons-round">{{ issueTypeIcon(issue.type) }}</span>
                </span>
                <span class="panel-task-id">#{{ issue.number }}</span>
                <span class="issue-status-badge" [class]="'is-' + issueStatusKey(issue.status)">
                  {{ issueStatusLabel(issue.status) }}
                </span>
              </div>
              <div class="panel-actions">
                <button class="icon-btn" title="Close panel" (click)="closeIssue()">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>
            <h2 class="panel-task-title">{{ issue.title }}</h2>
          </div>

          <div class="panel-divider"></div>

          <div class="panel-body">
            <p *ngIf="issue.description" class="panel-desc">{{ issue.description }}</p>

            <!-- Issue metadata -->
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Type</span>
                <span class="issue-type-badge type-{{ issueTypeColor(issue.type) }}">
                  {{ issueTypeLabel(issue.type) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Priority</span>
                <span class="ph-priority {{ priorityClass(issue.priority) }}">{{ priorityIcon(issue.priority) }}</span>
                <span class="detail-val">{{ priorityLabel(issue.priority) }}</span>
              </div>
              <div class="detail-item" *ngIf="issue.reporterName">
                <span class="detail-label">Reported by</span>
                <span class="detail-val">{{ issue.reporterName }}</span>
              </div>
              <div class="detail-item" *ngIf="issue.assigneeName">
                <span class="detail-label">Assignee</span>
                <span class="detail-val">{{ issue.assigneeName }}</span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="issue-actions">
              <button class="btn-ghost sm" *ngIf="issue.status !== 'Closed'" (click)="closeIssueItem(issue)">
                <span class="material-icons-round">check_circle_outline</span> Close Issue
              </button>
              <button class="btn-ghost sm" *ngIf="issue.status === 'Closed'" (click)="reopenIssueItem(issue)">
                <span class="material-icons-round">radio_button_unchecked</span> Reopen
              </button>
              <button class="btn-primary sm"
                      *ngIf="issue.status !== 'Closed' && !issue.convertedToTaskId"
                      (click)="openConvert(issue)">
                <span class="material-icons-round">move_to_inbox</span> Convert to Task
              </button>
              <span *ngIf="issue.convertedToTaskId" class="converted-note">
                <span class="material-icons-round">done_all</span> Converted to task
              </span>
            </div>

            <div class="panel-divider"></div>

            <!-- Issue comments -->
            <div class="comments-section">
              <div class="comments-header">
                <span class="comments-title">Comments</span>
                <span class="comments-count" *ngIf="issueComments().length > 0">{{ issueComments().length }}</span>
              </div>

              <div *ngIf="issueCommentsLoading()" class="comments-loading">
                <div class="spinner-sm"></div>
              </div>

              <div class="comment-list">
                <div *ngFor="let c of issueComments()" class="comment-item">
                  <div class="comment-ava">{{ nameInitials(c.authorName || 'U') }}</div>
                  <div class="comment-body">
                    <div class="comment-meta">
                      <span class="comment-author">{{ c.authorName || 'User' }}</span>
                      <span class="comment-date">{{ c.createdAt | date:'MMM d, y' }}</span>
                    </div>
                    <p class="comment-content">{{ c.content }}</p>
                  </div>
                </div>
                <p *ngIf="issueComments().length === 0 && !issueCommentsLoading()" class="no-comments">No comments yet.</p>
              </div>

              <form [formGroup]="issueCommentForm" (ngSubmit)="addIssueComment()" class="comment-form">
                <textarea class="comment-input" formControlName="content" rows="2"
                          placeholder="Write a comment…"></textarea>
                <div class="comment-form-actions">
                  <button type="button" class="btn-danger-ghost" (click)="confirmDeleteIssue(issue)">
                    <span class="material-icons-round">delete</span> Delete Issue
                  </button>
                  <button type="submit" class="btn-primary sm" [disabled]="issueCommentForm.invalid">
                    <span class="material-icons-round">send</span> Post
                  </button>
                </div>
              </form>
            </div>
          </div>

        </ng-container>
      </div>
    </div>

    <!-- ── Task detail panel ──────────────────────── -->
    <div *ngIf="selectedTask()" class="panel-overlay" (click)="closeTask()">
      <div class="task-panel" (click)="$event.stopPropagation()">

        <div class="panel-header">
          <div class="panel-title-row" *ngIf="!editMode()">
            <span class="panel-task-id">{{ taskId(selectedTask()!) }}</span>
            <div class="panel-actions">
              <button class="icon-btn" title="Edit" (click)="startEdit()">
                <span class="material-icons-round">edit</span>
              </button>
              <button class="icon-btn" title="Close" (click)="closeTask()">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>
          <div class="panel-title-row" *ngIf="editMode()">
            <span class="panel-edit-label">Edit Task</span>
            <button class="icon-btn" (click)="editMode.set(false)">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <h2 class="panel-task-title" *ngIf="!editMode()">{{ selectedTask()!.title }}</h2>
        </div>

        <div class="panel-divider"></div>

        <!-- View mode -->
        <div class="panel-body" *ngIf="!editMode()">
          <p *ngIf="selectedTask()!.description" class="panel-desc">{{ selectedTask()!.description }}</p>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <select class="detail-select" [ngModel]="selectedTask()!.status" (ngModelChange)="changeStatus($event)">
                <option [ngValue]="TaskStatus.Todo">To Do</option>
                <option [ngValue]="TaskStatus.InProgress">In Progress</option>
                <option [ngValue]="TaskStatus.InReview">In Review</option>
                <option [ngValue]="TaskStatus.Blocked">Blocked</option>
                <option [ngValue]="TaskStatus.Done">Done</option>
              </select>
            </div>
            <div class="detail-item">
              <span class="detail-label">Priority</span>
              <span class="ph-priority {{ priorityClass(selectedTask()!.priority) }}">{{ priorityIcon(selectedTask()!.priority) }}</span>
              <span class="detail-val">{{ priorityLabel(selectedTask()!.priority) }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedTask()!.dueDate">
              <span class="detail-label">Due Date</span>
              <span [class.overdue-text]="isOverdue(selectedTask()!.dueDate)">{{ selectedTask()!.dueDate | date:'MMM d, y' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedTask()!.storyPoints">
              <span class="detail-label">Story Points</span>
              <span>{{ selectedTask()!.storyPoints }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Assignee</span>
              <select class="detail-select" [ngModel]="selectedTask()!.assigneeId ?? null" (ngModelChange)="changeAssignee($event)">
                <option [ngValue]="null">— Unassigned —</option>
                <option *ngFor="let m of members()" [value]="m.userId">{{ m.fullName }}</option>
              </select>
            </div>
          </div>

          <!-- Labels section -->
          <div class="panel-labels-section" *ngIf="labels().length > 0">
            <span class="detail-label">Labels</span>
            <div class="panel-labels-row">
              <span *ngFor="let l of selectedTask()!.labels"
                    class="label-chip label-{{ l.color }} label-removable"
                    (click)="removeLabelFromTask(l.id)">
                {{ l.name }} <span class="material-icons-round">close</span>
              </span>
              <div class="label-add-wrap" (click)="$event.stopPropagation()">
                <button class="label-add-btn" (click)="showLabelPicker.set(!showLabelPicker())">
                  <span class="material-icons-round">label</span>
                </button>
                <div class="label-picker" *ngIf="showLabelPicker()">
                  <div *ngFor="let l of labelsNotOnTask()" class="label-picker-item"
                       (click)="addLabelToTask(l.id)">
                    <span class="label-dot label-{{ l.color }}"></span>{{ l.name }}
                  </div>
                  <div *ngIf="labelsNotOnTask().length === 0" class="label-picker-empty">All labels applied</div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-divider"></div>

          <!-- Dependencies section -->
          <div class="dep-section">

            <!-- Blocked by -->
            <div class="dep-group">
              <div class="dep-group-header">
                <span class="detail-label">Blocked by</span>
                <button class="label-add-btn"
                        (click)="showDepPicker.set(showDepPicker() === 'blockedBy' ? null : 'blockedBy')">
                  <span class="material-icons-round">add</span>
                </button>
              </div>
              <!-- Inline picker -->
              <div *ngIf="showDepPicker() === 'blockedBy'" class="dep-inline-picker" (click)="$event.stopPropagation()">
                <div *ngFor="let t of availableForDep('blockedBy')" class="dep-inline-item"
                     (click)="addDependency('blockedBy', t.id)">
                  <span class="dep-status-dot" [class]="'s-' + t.status"></span>{{ t.title }}
                </div>
                <div *ngIf="availableForDep('blockedBy').length === 0" class="dep-empty" style="padding:8px">No tasks available</div>
              </div>
              <div *ngIf="(selectedTask()!.blockedBy ?? []).length === 0 && showDepPicker() !== 'blockedBy'" class="dep-empty">None</div>
              <div *ngFor="let ref of selectedTask()!.blockedBy ?? []" class="dep-row"
                   [class.dep-open]="ref.status !== TaskStatus.Done && ref.status !== TaskStatus.Cancelled">
                <span class="dep-status-dot" [class]="'s-' + ref.status"></span>
                <span class="dep-title">{{ ref.title }}</span>
                <span class="dep-status-label">{{ statusLabel(ref.status) }}</span>
                <button class="dep-remove" (click)="removeDependency(ref.dependencyId, selectedTask()!.id)" title="Remove">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>

            <!-- Blocking -->
            <div class="dep-group">
              <div class="dep-group-header">
                <span class="detail-label">Blocking</span>
                <button class="label-add-btn"
                        (click)="showDepPicker.set(showDepPicker() === 'blocking' ? null : 'blocking')">
                  <span class="material-icons-round">add</span>
                </button>
              </div>
              <!-- Inline picker -->
              <div *ngIf="showDepPicker() === 'blocking'" class="dep-inline-picker" (click)="$event.stopPropagation()">
                <div *ngFor="let t of availableForDep('blocking')" class="dep-inline-item"
                     (click)="addDependency('blocking', t.id)">
                  <span class="dep-status-dot" [class]="'s-' + t.status"></span>{{ t.title }}
                </div>
                <div *ngIf="availableForDep('blocking').length === 0" class="dep-empty" style="padding:8px">No tasks available</div>
              </div>
              <div *ngIf="(selectedTask()!.blocking ?? []).length === 0 && showDepPicker() !== 'blocking'" class="dep-empty">None</div>
              <div *ngFor="let ref of selectedTask()!.blocking ?? []" class="dep-row">
                <span class="dep-status-dot" [class]="'s-' + ref.status"></span>
                <span class="dep-title">{{ ref.title }}</span>
                <span class="dep-status-label">{{ statusLabel(ref.status) }}</span>
                <button class="dep-remove" (click)="removeDependency(ref.dependencyId, selectedTask()!.id)" title="Remove">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>

          </div>

          <div class="panel-divider"></div>

          <!-- Sub-tasks -->
          <div class="subtasks-section">
            <div class="section-header">
              <span class="section-title">Sub-tasks</span>
              <span class="section-count" *ngIf="selectedTask()!.subTasks?.length">
                {{ completedSubTasks() }}/{{ selectedTask()!.subTasks.length }}
              </span>
            </div>
            <div class="subtask-progress" *ngIf="selectedTask()!.subTasks?.length">
              <div class="subtask-bar">
                <div class="subtask-bar-fill" [style.width.%]="subTaskProgress()"></div>
              </div>
            </div>
            <div class="subtask-list">
              <div *ngFor="let st of selectedTask()!.subTasks ?? []" class="subtask-item">
                <button class="subtask-check" [class.checked]="st.isCompleted" (click)="toggleSubTask(st.id)">
                  <span class="material-icons-round">{{ st.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}</span>
                </button>
                <span class="subtask-title" [class.completed]="st.isCompleted">{{ st.title }}</span>
                <ng-container *ngIf="estimatingSubTaskId() !== st.id">
                  <span class="timelog-desc" *ngIf="st.estimatedHours" style="margin-left:4px">
                    {{ st.estimatedHours }}h est.
                  </span>
                  <button class="icon-btn" (click)="estimatingSubTaskId.set(st.id); estimateHoursInput = st.estimatedHours ?? null"
                          title="Set estimate" style="font-size:14px">
                    <span class="material-icons-round" style="font-size:14px">timer</span>
                  </button>
                </ng-container>
                <ng-container *ngIf="estimatingSubTaskId() === st.id">
                  <input class="timelog-hrs" type="number" [(ngModel)]="estimateHoursInput"
                         name="est_{{ st.id }}" min="0" step="0.25" style="width:70px"
                         placeholder="Hrs" />
                  <button class="btn-primary sm" (click)="setSubTaskEstimate(st.id)">OK</button>
                  <button class="icon-btn" (click)="estimatingSubTaskId.set(null)">
                    <span class="material-icons-round">close</span>
                  </button>
                </ng-container>
                <button class="subtask-del" (click)="deleteSubTask(st.id)">
                  <span class="material-icons-round">close</span>
                </button>
              </div>
            </div>
            <form class="subtask-add-form" (ngSubmit)="addSubTask()" *ngIf="showSubTaskInput()">
              <input class="subtask-input" [(ngModel)]="newSubTaskTitle" name="stTitle"
                     placeholder="Sub-task title…" autofocus />
              <button type="submit" class="btn-primary sm" [disabled]="!newSubTaskTitle.trim()">Add</button>
              <button type="button" class="icon-btn" (click)="showSubTaskInput.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </form>
            <button class="add-subtask-btn" *ngIf="!showSubTaskInput()" (click)="showSubTaskInput.set(true)">
              <span class="material-icons-round">add</span> Add sub-task
            </button>
          </div>

          <div class="panel-divider"></div>

          <!-- Time tracking -->
          <div class="timelog-section">
            <div class="section-header">
              <span class="section-title">Time Tracking</span>
              <div class="time-summary">
                <span class="time-logged">{{ selectedTask()!.totalLoggedHours ?? 0 }}h logged</span>
                <span class="time-sep" *ngIf="selectedTask()!.estimatedHours"> / </span>
                <span class="time-est" *ngIf="selectedTask()!.estimatedHours">{{ selectedTask()!.estimatedHours }}h est.</span>
              </div>
            </div>
            <div class="timelog-bar-wrap" *ngIf="selectedTask()!.estimatedHours">
              <div class="subtask-bar">
                <div class="subtask-bar-fill" [class.over-budget]="timeProgress() > 100"
                     [style.width.%]="timeProgress() > 100 ? 100 : timeProgress()"></div>
              </div>
              <span class="time-pct">{{ timeProgress() | number:'1.0-0' }}%</span>
            </div>
            <div class="timelog-list">
              <div *ngFor="let tl of selectedTask()!.timeLogs ?? []" class="timelog-item">
                <ng-container *ngIf="editingLogId() !== tl.id">
                  <span class="material-icons-round timelog-icon">schedule</span>
                  <div class="timelog-body">
                    <span class="timelog-hours">{{ tl.hours }}h</span>
                    <span class="timelog-date">{{ tl.loggedDate | date:'MMM d' }}</span>
                    <span class="timelog-desc" *ngIf="tl.description">{{ tl.description }}</span>
                    <span class="timelog-subtask" *ngIf="tl.subTaskTitle">· {{ tl.subTaskTitle }}</span>
                  </div>
                  <button class="icon-btn" *ngIf="tl.userId === auth.user()?.userId"
                          (click)="startEditLog(tl)" title="Edit">
                    <span class="material-icons-round" style="font-size:16px">edit</span>
                  </button>
                  <button class="subtask-del" (click)="confirmDeleteTimeLog(tl.id)">
                    <span class="material-icons-round">close</span>
                  </button>
                </ng-container>
                <ng-container *ngIf="editingLogId() === tl.id">
                  <form class="timelog-form" style="flex:1" (ngSubmit)="saveEditLog(tl.id)">
                    <input class="timelog-hrs" type="number" [(ngModel)]="editLogHours" name="editHrs"
                           min="0.25" step="0.25" style="width:80px" />
                    <input class="timelog-date-input" type="date" [(ngModel)]="editLogDate" name="editDt" />
                    <input class="timelog-desc-input" [(ngModel)]="editLogDesc" name="editDesc"
                           placeholder="Description (optional)" />
                    <button type="submit" class="btn-primary sm"
                            [disabled]="!editLogHours || editLogHours <= 0">Save</button>
                    <button type="button" class="icon-btn" (click)="editingLogId.set(null)">
                      <span class="material-icons-round">close</span>
                    </button>
                  </form>
                </ng-container>
              </div>
            </div>
            <form class="timelog-form" (ngSubmit)="logTime()" *ngIf="showTimeLogInput()">
              <input class="timelog-hrs" type="number" [(ngModel)]="newTimeHours" name="hrs"
                     placeholder="Hours" min="0.25" step="0.25" style="width:80px" />
              <input class="timelog-date-input" type="date" [(ngModel)]="newTimeDate" name="dt" />
              <input class="timelog-desc-input" [(ngModel)]="newTimeDesc" name="desc" placeholder="Description (optional)" />
              <select class="filter-select" [(ngModel)]="newTimeSubTaskId" name="subTask"
                      *ngIf="selectedTask()!.subTasks?.length">
                <option [ngValue]="null">Parent task</option>
                <option *ngFor="let st of selectedTask()!.subTasks" [value]="st.id">{{ st.title }}</option>
              </select>
              <button type="submit" class="btn-primary sm" [disabled]="!newTimeHours || newTimeHours <= 0">Log</button>
              <button type="button" class="icon-btn" (click)="showTimeLogInput.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </form>
            <button class="add-subtask-btn" *ngIf="!showTimeLogInput()" (click)="showTimeLogInput.set(true)">
              <span class="material-icons-round">add</span> Log time
            </button>
          </div>

          <div class="panel-divider"></div>

          <!-- Attachments -->
          <div class="attachments-section">
            <div class="section-header">
              <span class="material-icons-round section-ico">attach_file</span>
              <span class="section-label">Attachments</span>
              <span class="section-count" *ngIf="selectedTask()!.attachments?.length">{{ selectedTask()!.attachments.length }}</span>
            </div>

            <div class="attach-list">
              <div *ngFor="let a of selectedTask()!.attachments ?? []" class="attach-item">
                <span class="material-icons-round attach-icon">{{ fileIcon(a.contentType) }}</span>
                <div class="attach-info">
                  <span class="attach-name">{{ a.fileName }}</span>
                  <span class="attach-meta">{{ formatBytes(a.sizeBytes) }}</span>
                </div>
                <div class="attach-actions">
                  <button class="attach-act-btn" (click)="previewAttachment(a)" title="Preview" *ngIf="isPreviewable(a.contentType)">
                    <span class="material-icons-round">visibility</span>
                  </button>
                  <button class="attach-act-btn" (click)="downloadAttachment(a)" title="Download">
                    <span class="material-icons-round">download</span>
                  </button>
                  <button class="attach-act-btn danger" (click)="deleteAttachment(a.id)" title="Remove">
                    <span class="material-icons-round">delete_outline</span>
                  </button>
                </div>
              </div>
            </div>

            <label class="add-subtask-btn attach-upload-btn" [class.disabled]="uploadingAttachment()">
              <span class="material-icons-round">{{ uploadingAttachment() ? 'hourglass_top' : 'upload' }}</span>
              {{ uploadingAttachment() ? 'Uploading…' : 'Attach file' }}
              <input type="file" class="attach-input" (change)="onFileSelected($event)" [disabled]="uploadingAttachment()">
            </label>
          </div>

          <div class="panel-divider"></div>

          <!-- Comments -->
          <div class="comments-section">
            <div class="comments-header">
              <span class="comments-title">Comments</span>
              <span class="comments-count" *ngIf="comments().length > 0">{{ comments().length }}</span>
            </div>

            <div *ngIf="commentsLoading()" class="comments-loading">
              <div class="spinner-sm"></div>
            </div>

            <div class="comment-list">
              <div *ngFor="let c of comments()" class="comment-item">
                <div class="comment-ava">{{ nameInitials(c.authorName || 'U') }}</div>
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-author">{{ c.authorName || 'User' }}</span>
                    <span class="comment-date">{{ c.createdAt | date:'MMM d, y' }}</span>
                    <button class="del-btn" title="Delete" (click)="deleteComment(c)">
                      <span class="material-icons-round">delete_outline</span>
                    </button>
                  </div>
                  <p class="comment-content">{{ mentionText(c.content) }}</p>
                </div>
              </div>
              <p *ngIf="comments().length === 0 && !commentsLoading()" class="no-comments">No comments yet.</p>
            </div>

            <form [formGroup]="commentForm" (ngSubmit)="addComment()" class="comment-form">
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
              <div class="comment-form-actions">
                <button type="button" class="btn-danger-ghost" (click)="confirmDeleteTask(selectedTask()!)">
                  <span class="material-icons-round">delete</span> Delete Task
                </button>
                <button type="submit" class="btn-primary sm" [disabled]="commentForm.invalid">
                  <span class="material-icons-round">send</span> Post
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Edit mode -->
        <div class="panel-body" *ngIf="editMode()">
          <form [formGroup]="editTaskForm" (ngSubmit)="saveEdit()">
            <div class="field-group">
              <label class="field-label">Title</label>
              <input class="field-input" formControlName="title" />
            </div>
            <div class="field-group">
              <label class="field-label">Description</label>
              <textarea class="field-input" formControlName="description" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="field-group">
                <label class="field-label">Priority</label>
                <select class="field-input" formControlName="priority">
                  <option [ngValue]="TaskPriority.Low">Low</option>
                  <option [ngValue]="TaskPriority.Medium">Medium</option>
                  <option [ngValue]="TaskPriority.High">High</option>
                  <option [ngValue]="TaskPriority.Critical">Critical</option>
                </select>
              </div>
              <div class="field-group">
                <label class="field-label">Story Points</label>
                <input class="field-input" type="number" formControlName="storyPoints" min="1" max="100" />
              </div>
            </div>
            <div class="form-row">
              <div class="field-group">
                <label class="field-label">Due Date</label>
                <input class="field-input" type="date" formControlName="dueDate" />
              </div>
              <div class="field-group" *ngIf="sprints().length > 0">
                <label class="field-label">Sprint</label>
                <select class="field-input" formControlName="sprintId">
                  <option [ngValue]="null">— None —</option>
                  <option *ngFor="let s of sprints()" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
            <div class="field-group" *ngIf="members().length > 0">
              <label class="field-label">Assignee</label>
              <select class="field-input" formControlName="assigneeId">
                <option [ngValue]="null">— Unassigned —</option>
                <option *ngFor="let m of assignableMembers()" [value]="m.userId">{{ m.fullName }}</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="editMode.set(false)">Cancel</button>
              <button type="submit" class="btn-primary sm" [disabled]="editTaskForm.invalid">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ── Create Task dialog ─────────────────────── -->
    <div *ngIf="showCreateTask()" class="overlay" (click)="showCreateTask.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="dialog-title">New Task</h2>
          <button class="icon-btn" (click)="showCreateTask.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="taskForm" (ngSubmit)="createTask()">
          <div class="field-group">
            <label class="field-label">Title</label>
            <input class="field-input" formControlName="title" placeholder="Task title" />
          </div>
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea class="field-input" formControlName="description" rows="2" placeholder="Optional description"></textarea>
          </div>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Priority</label>
              <select class="field-input" formControlName="priority">
                <option [ngValue]="TaskPriority.Low">Low</option>
                <option [ngValue]="TaskPriority.Medium">Medium</option>
                <option [ngValue]="TaskPriority.High">High</option>
                <option [ngValue]="TaskPriority.Critical">Critical</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Story Points</label>
              <input class="field-input" type="number" formControlName="storyPoints" min="1" max="100" />
            </div>
          </div>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Due Date</label>
              <input class="field-input" type="date" formControlName="dueDate" />
            </div>
            <div class="field-group" *ngIf="sprints().length > 0">
              <label class="field-label">Sprint</label>
              <select class="field-input" formControlName="sprintId">
                <option [ngValue]="null">— None —</option>
                <option *ngFor="let s of sprints()" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>
          <div class="field-group" *ngIf="members().length > 0">
            <label class="field-label">Assignee</label>
            <select class="field-input" formControlName="assigneeId">
              <option [ngValue]="null">— Unassigned —</option>
              <option *ngFor="let m of assignableMembers()" [value]="m.userId">{{ m.fullName }}</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="showCreateTask.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="taskForm.invalid">Create Task</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Create Sprint dialog ───────────────────── -->
    <div *ngIf="showCreateSprint()" class="overlay" (click)="showCreateSprint.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="dialog-title">New Sprint</h2>
          <button class="icon-btn" (click)="showCreateSprint.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="sprintForm" (ngSubmit)="createSprint()">
          <div class="field-group">
            <label class="field-label">Sprint Name</label>
            <input class="field-input" formControlName="name" placeholder="e.g. Sprint 1" />
          </div>
          <div class="field-group">
            <label class="field-label">Goal</label>
            <input class="field-input" formControlName="goal" placeholder="What's the sprint goal?" />
          </div>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Start Date</label>
              <input class="field-input" type="date" formControlName="startDate" />
            </div>
            <div class="field-group">
              <label class="field-label">End Date</label>
              <input class="field-input" type="date" formControlName="endDate" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="showCreateSprint.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="sprintForm.invalid">Create Sprint</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Edit Sprint dialog ─────────────────────── -->
    <div *ngIf="editingSprint()" class="overlay" (click)="editingSprint.set(null)">
      <div class="dialog-card" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="dialog-title">Edit Sprint</h2>
          <button class="icon-btn" (click)="editingSprint.set(null)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="editSprintForm" (ngSubmit)="saveEditSprint()">
          <div class="field-group">
            <label class="field-label">Sprint Name</label>
            <input class="field-input" formControlName="name" />
          </div>
          <div class="field-group">
            <label class="field-label">Goal</label>
            <input class="field-input" formControlName="goal" />
          </div>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Start Date</label>
              <input class="field-input" type="date" formControlName="startDate" />
            </div>
            <div class="field-group">
              <label class="field-label">End Date</label>
              <input class="field-input" type="date" formControlName="endDate" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="editingSprint.set(null)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="editSprintForm.invalid">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Create Issue dialog ───────────────────── -->
    <div *ngIf="showCreateIssue()" class="overlay" (click)="showCreateIssue.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="dialog-title">New Issue</h2>
          <button class="icon-btn" (click)="showCreateIssue.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="issueForm" (ngSubmit)="createIssue()">
          <div class="field-group">
            <label class="field-label">Title</label>
            <input class="field-input" formControlName="title" placeholder="Short, descriptive title" />
          </div>
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea class="field-input" formControlName="description" rows="3"
                      placeholder="Steps to reproduce, expected vs actual…"></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">Type</label>
            <div class="type-picker">
              @for (t of issueTypes; track t.value) {
                <button type="button"
                  class="type-btn type-{{ t.color }}"
                  [class.selected]="issueForm.get('type')!.value === t.value"
                  (click)="issueForm.get('type')!.setValue(t.value)">
                  <span class="material-icons-round">{{ t.icon }}</span>
                  {{ t.label }}
                </button>
              }
            </div>
          </div>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Priority</label>
              <select class="field-input" formControlName="priority">
                <option [ngValue]="TaskPriority.Low">↓ Low</option>
                <option [ngValue]="TaskPriority.Medium">→ Medium</option>
                <option [ngValue]="TaskPriority.High">↑ High</option>
                <option [ngValue]="TaskPriority.Critical">⬆ Critical</option>
              </select>
            </div>
          </div>
          <div class="field-group" *ngIf="members().length > 0">
            <label class="field-label">Assignee</label>
            <select class="field-input" formControlName="assigneeId">
              <option [ngValue]="null">— Unassigned —</option>
              <option *ngFor="let m of assignableMembers()" [value]="m.userId">{{ m.fullName }}</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="showCreateIssue.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="issueForm.invalid">Submit Issue</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Convert to Task dialog ────────────────── -->
    <div *ngIf="showConvertDialog()" class="overlay" (click)="showConvertDialog.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()" style="max-width:400px">
        <div class="dialog-header">
          <h2 class="dialog-title">Convert to Task</h2>
          <button class="icon-btn" (click)="showConvertDialog.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <ng-container *ngIf="convertingIssue() as ci">
          <p class="convert-desc">
            This will create a task from <strong>#{{ ci.number }} {{ ci.title }}</strong>
            and close the issue.
          </p>
          <form [formGroup]="convertForm" (ngSubmit)="submitConvert()">
            <div class="field-group" *ngIf="sprints().length > 0">
              <label class="field-label">Sprint (optional)</label>
              <select class="field-input" formControlName="sprintId">
                <option [ngValue]="null">— Backlog —</option>
                <option *ngFor="let s of sprints()" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Priority</label>
              <select class="field-input" formControlName="priority">
                <option [ngValue]="null">Same as issue ({{ priorityLabel(ci.priority) }})</option>
                <option [ngValue]="TaskPriority.Low">↓ Low</option>
                <option [ngValue]="TaskPriority.Medium">→ Medium</option>
                <option [ngValue]="TaskPriority.High">↑ High</option>
                <option [ngValue]="TaskPriority.Critical">⬆ Critical</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="showConvertDialog.set(false)">Cancel</button>
              <button type="submit" class="btn-primary">
                <span class="material-icons-round">move_to_inbox</span> Convert
              </button>
            </div>
          </form>
        </ng-container>
      </div>
    </div>

    <!-- ── Ticket detail panel ──────────────────── -->
    <div *ngIf="selectedTicket()" class="panel-overlay" (click)="closeTicket()">
      <div class="task-panel" (click)="$event.stopPropagation()">
        <ng-container *ngIf="selectedTicket() as ticket">
          <div class="panel-header">
            <div class="panel-title-row">
              <span class="ticket-num">#{{ ticket.number }}</span>
              <span class="status-chip s-{{ ticket.status }}">{{ ticketStatusLabel(ticket.status) }}</span>
            </div>
            <div class="panel-actions">
              <button *ngIf="!ticket.convertedToTaskId" class="icon-btn" title="Convert to task" (click)="convertTicket(ticket)">
                <span class="material-icons-round">task_alt</span>
              </button>
              <button class="icon-btn" title="Close panel" (click)="closeTicket()">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>

          <div class="panel-body">
            <h2 style="margin:0 0 8px;font-size:16px;font-weight:600;color:var(--ink)">{{ ticket.subject }}</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
              <span class="ticket-type-chip">{{ ticketTypeLabel(ticket.type) }}</span>
              <span class="ticket-type-chip">{{ ['Low','Medium','High','Critical'][ticket.priority] }} priority</span>
              <span class="ticket-type-chip">By {{ ticket.submittedByName }}</span>
              <span class="sla-badge sla-{{ ticket.slaStatus }}" [title]="slaTooltip(ticket)">{{ slaLabel(ticket.slaStatus) }}</span>
            </div>
            <div class="sla-detail-row" *ngIf="ticket.slaStatus !== undefined">
              <span class="material-icons-round sla-detail-ico sla-ico-{{ ticket.slaStatus }}">timer</span>
              <span class="sla-detail-text">
                <ng-container *ngIf="ticket.slaStatus === 2">SLA breached — resolution was due {{ ticket.resolutionDeadlineUtc | date:'MMM d, HH:mm' }}</ng-container>
                <ng-container *ngIf="ticket.slaStatus === 1">At risk — {{ ticket.slaHoursRemaining | number:'1.1-1' }}h until breach ({{ ticket.resolutionDeadlineUtc | date:'MMM d, HH:mm' }})</ng-container>
                <ng-container *ngIf="ticket.slaStatus === 0">On time — {{ ticket.slaHoursRemaining | number:'1.1-1' }}h remaining (due {{ ticket.resolutionDeadlineUtc | date:'MMM d, HH:mm' }})</ng-container>
              </span>
            </div>

            <div *ngIf="ticket.description" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;color:var(--ink);white-space:pre-wrap;margin-bottom:16px">{{ ticket.description }}</div>

            <!-- Status change -->
            <div class="panel-field">
              <label class="field-label">Status</label>
              <select class="field-input" [ngModel]="ticket.status" (ngModelChange)="updateTicketStatus(ticket, $event)">
                <option [value]="0">New</option>
                <option [value]="1">Open</option>
                <option [value]="2">In Progress</option>
                <option [value]="3">Resolved</option>
                <option [value]="4">Closed</option>
              </select>
            </div>

            <!-- Conversion notice -->
            <div *ngIf="ticket.convertedToTaskId" style="background:var(--violet-c);color:var(--violet);padding:10px 14px;border-radius:8px;font-size:13px;font-weight:500;margin-top:12px">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px">task_alt</span> Converted to a task
            </div>

            <!-- Comments -->
            <div style="margin-top:20px">
              <p style="font-size:13px;font-weight:600;color:var(--ink);margin:0 0 12px">Conversation</p>
              <div *ngIf="ticketCommentsLoading()" class="loading-wrap"><span class="material-icons-round spin">autorenew</span></div>
              <div *ngFor="let c of ticketComments()" style="margin-bottom:10px;padding:12px;border-radius:8px" [style.background]="c.isFromCustomer ? 'var(--violet-c)' : 'var(--surface)'">
                <div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:4px">{{ c.authorName }} <span style="font-size:11px;font-weight:400;color:var(--muted)">{{ c.isFromCustomer ? '(Customer)' : '(Team)' }}</span></div>
                <div style="font-size:13px;color:var(--ink)">{{ c.content }}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px">{{ c.createdAt | date:'short' }}</div>
              </div>
              <div *ngIf="!ticketCommentsLoading() && ticketComments().length === 0" style="font-size:13px;color:var(--muted);padding:8px 0">No replies yet.</div>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
                <textarea class="comment-input" [(ngModel)]="ticketReply" rows="3" placeholder="Reply to customer..."></textarea>
                <button class="btn-primary sm" (click)="sendTicketReply()" [disabled]="!ticketReply.trim() || ticketReplySending()">
                  {{ ticketReplySending() ? 'Sending...' : 'Send Reply' }}
                </button>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>

    <!-- ── Add Member dialog ────────────────────── -->
    <div *ngIf="showAddMember()" class="overlay" (click)="showAddMember.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()" style="max-width:400px">
        <div class="dialog-header">
          <h2 class="dialog-title">Add Member</h2>
          <button class="icon-btn" (click)="showAddMember.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="addMemberForm" (ngSubmit)="submitAddMember()" class="form-body">
          <div class="field-group">
            <label class="field-label">User</label>
            <select class="field-input" formControlName="userId">
              <option value="">— Select user —</option>
              <option *ngFor="let u of availableUsers()" [value]="u.id">{{ u.fullName }} ({{ u.email }})</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Role</label>
            <select class="field-input" formControlName="role">
              <option value="Viewer">Viewer</option>
              <option value="Member">Member</option>
              <option value="Lead">Lead</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="showAddMember.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="addMemberForm.invalid">Add</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Manage Labels dialog ──────────────────── -->
    <div *ngIf="showManageLabels()" class="overlay" (click)="showManageLabels.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()" style="max-width:440px">
        <div class="dialog-header">
          <h2 class="dialog-title">Labels</h2>
          <button class="icon-btn" (click)="showManageLabels.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- Existing labels -->
        <div class="manage-labels-list">
          <div *ngFor="let l of labels()" class="manage-label-row">
            <span class="label-dot label-{{ l.color }}"></span>
            <span class="manage-label-name">{{ l.name }}</span>
            <button class="icon-btn danger-icon" (click)="deleteLabel(l)" title="Delete">
              <span class="material-icons-round">delete_outline</span>
            </button>
          </div>
          <p *ngIf="labels().length === 0" class="no-comments">No labels yet.</p>
        </div>

        <div class="panel-divider"></div>

        <!-- Create new label -->
        <form [formGroup]="newLabelForm" (ngSubmit)="createLabel()" class="new-label-form">
          <p class="field-label" style="margin:0 0 8px">New Label</p>
          <div class="new-label-row">
            <input class="field-input" formControlName="name" placeholder="Label name" style="flex:1" />
            <select class="field-input" formControlName="color" style="width:110px">
              <option *ngFor="let c of labelColors" [value]="c.value">{{ c.label }}</option>
            </select>
          </div>
          <!-- Color preview -->
          <div class="color-preview-row">
            <span class="label-chip label-{{ newLabelForm.value.color }}">
              {{ newLabelForm.value.name || 'Preview' }}
            </span>
          </div>
          <div class="form-actions" style="margin-top:8px">
            <button type="submit" class="btn-primary sm" [disabled]="newLabelForm.invalid">
              <span class="material-icons-round">add</span> Add Label
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Backdrop to close sprint menu -->
    <div *ngIf="openSprintMenuId" class="menu-backdrop" (click)="openSprintMenuId = null"></div>

    <!-- Attachment Preview Modal -->
    <div class="overlay" *ngIf="previewAttach()" (click)="closePreview()">
      <div class="attach-preview-card" (click)="$event.stopPropagation()">
        <div class="attach-preview-header">
          <span class="attach-preview-name">{{ previewAttach()!.fileName }}</span>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" (click)="downloadAttachment(previewAttach()!)" title="Download">
              <span class="material-icons-round">download</span>
            </button>
            <button class="icon-btn" (click)="closePreview()">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        </div>
        <div class="attach-preview-body">
          <img *ngIf="previewAttach()!.contentType.startsWith('image/')" [src]="previewBlobUrl()" class="preview-img" />
          <iframe *ngIf="previewAttach()!.contentType === 'application/pdf'" [src]="previewBlobUrl()" class="preview-pdf"></iframe>
          <div *ngIf="isMarkdown(previewAttach()!.contentType) && previewMarkdownHtml()" class="preview-md md-body" [innerHTML]="previewMarkdownHtml()"></div>
        </div>
      </div>
    </div>

    <!-- Complete Sprint Dialog -->
    <div class="overlay" *ngIf="completingSprintId()" (click)="cancelCompleteSprint()">
      <div class="dialog-card" (click)="$event.stopPropagation()" style="max-width:460px">
        <div class="dialog-header">
          <h3 class="dialog-title">Complete Sprint</h3>
          <button class="icon-btn" (click)="cancelCompleteSprint()">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <ng-container *ngIf="completingSprintCarryOver() > 0">
          <div class="retro-carry-warn">
            <span class="material-icons-round">warning</span>
            <span><strong>{{ completingSprintCarryOver() }} incomplete task(s)</strong> will be carried over.</span>
          </div>
          <div class="field-group" style="margin-top:12px">
            <label class="field-label">Move incomplete tasks to</label>
            <select class="field-input" style="padding:8px 10px"
                    [(ngModel)]="completingSprintTargetId">
              <option [ngValue]="null">Backlog</option>
              <option *ngFor="let s of futureSprints()" [ngValue]="s.id">{{ s.name }}</option>
            </select>
            <p *ngIf="futureSprints().length === 0" style="font-size:12px;color:var(--soft);margin:4px 0 0">
              No planned sprints — tasks will go to the backlog.
            </p>
          </div>
        </ng-container>

        <div class="field-group" [style.margin-top]="completingSprintCarryOver() > 0 ? '16px' : '0'">
          <label class="field-label">Retrospective Notes <span style="font-weight:400;text-transform:none">(optional)</span></label>
          <textarea class="field-input" rows="5" placeholder="What went well? What could be improved?" [(ngModel)]="completingSprintRetroNotes"></textarea>
        </div>

        <div class="form-actions">
          <button class="btn-ghost" (click)="cancelCompleteSprint()">Cancel</button>
          <button class="btn-primary" (click)="confirmCompleteSprint()">Complete Sprint</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Loading ── */
    .loading-wrap { display: flex; justify-content: center; padding: 64px; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--violet);
      animation: spin 0.7s linear infinite;
    }
    .spinner-sm {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid var(--border); border-top-color: var(--violet);
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Page ── */
    .detail-page {
      padding: 28px 32px;
      display: flex; flex-direction: column; gap: 20px;
    }

    /* ── Topbar ── */
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .topbar-left { display: flex; flex-direction: column; gap: 6px; }
    .topbar-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .page-title { margin: 0; font-size: 20px; font-weight: 700; color: var(--ink); }
    .page-sub   { margin: 0; font-size: 13px; color: var(--soft); }

    /* Status chip */
    .status-wrap { position: relative; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px 3px 8px; border-radius: var(--r-full);
      border: 1px solid; font-size: 12px; font-weight: 600; cursor: pointer;
      transition: opacity .15s; background: transparent;
    }
    .status-chip:hover { opacity: .8; }
    .status-chevron { font-size: 14px !important; }

    /* per-status colours */
    .status-chip.status-Planning  { background: var(--surface);  color: var(--soft);    border-color: var(--border); }
    .status-chip.status-Active    { background: #d1fae5;         color: #059669;        border-color: #6ee7b7; }
    .status-chip.status-OnHold    { background: #fef3c7;         color: #d97706;        border-color: #fcd34d; }
    .status-chip.status-Completed { background: #dbeafe;         color: #2563eb;        border-color: #93c5fd; }
    .status-chip.status-Archived  { background: var(--surface);  color: var(--soft);    border-color: var(--border); }

    .status-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      background: currentColor; opacity: .7;
    }

    .status-backdrop { position: fixed; inset: 0; z-index: 199; }

    /* Status dropdown */
    .status-menu {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 200;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,.1);
      min-width: 180px; display: flex; flex-direction: column; gap: 1px;
    }
    .status-option {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 6px; border: none;
      background: transparent; cursor: pointer; font-size: 13px; color: var(--ink);
      text-align: left; width: 100%; transition: background .1s;
    }
    .status-option:hover  { background: var(--surface); }
    .status-option.active { background: var(--violet-mid); color: var(--violet); }
    .status-option .check-ico { font-size: 15px !important; margin-left: auto; }
    .status-dot-0 { background: var(--soft); }
    .status-dot-1 { background: #059669; }
    .status-dot-2 { background: #d97706; }
    .status-dot-3 { background: #2563eb; }
    .status-dot-4 { background: var(--soft); opacity: .4; }

    /* ── Tabs ── */
    .tab-bar {
      display: flex; gap: 4px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0;
    }
    .tab {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border: none; background: transparent;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--muted); cursor: pointer; border-radius: var(--r-md) var(--r-md) 0 0;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab .material-icons-round { font-size: 16px; }
    .tab:hover { color: var(--ink); }
    .tab.active { color: var(--violet); border-bottom-color: var(--violet); }

    /* ── Buttons ── */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: var(--violet); color: #fff;
      border: none; border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background 0.15s, opacity 0.15s;
    }
    .btn-primary .material-icons-round { font-size: 16px; }
    .btn-primary:hover:not(:disabled) { background: var(--violet-2); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary.sm { padding: 7px 14px; }

    .btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; background: transparent;
      border: 1px solid var(--border); border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--muted); cursor: pointer; transition: border-color 0.15s, color 0.15s;
    }
    .btn-ghost:hover { border-color: var(--violet); color: var(--violet); }

    .btn-danger-ghost {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; background: transparent;
      border: 1px solid var(--rose-c); border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
      color: var(--rose); cursor: pointer; transition: background 0.15s;
    }
    .btn-danger-ghost:hover { background: var(--rose-c); }
    .btn-danger-ghost .material-icons-round { font-size: 14px; }

    .icon-btn {
      width: 30px; height: 30px; border: none; background: transparent;
      border-radius: var(--r-md); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--soft); transition: background 0.12s, color 0.12s;
    }
    .icon-btn:hover { background: var(--surface); color: var(--ink); }
    .icon-btn .material-icons-round { font-size: 18px; }

    /* ── Filter bar ── */
    .filter-bar {
      display: flex; gap: 8px; align-items: center;
      flex-wrap: wrap; padding: 12px 0 4px;
    }
    .filter-select {
      padding: 7px 10px; border-radius: var(--r-md);
      border: 1px solid var(--border); background: var(--white);
      font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--ink);
      cursor: pointer; outline: none; transition: border-color 0.15s;
    }
    .filter-select:focus { border-color: var(--violet); }
    .clear-filter {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 12px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--muted);
      cursor: pointer; transition: color 0.15s;
    }
    .clear-filter .material-icons-round { font-size: 14px; }
    .clear-filter:hover { color: var(--rose); border-color: var(--rose-c); }

    /* ── Kanban ── */
    .kanban-board {
      display: flex; gap: 12px;
      overflow-x: auto; padding: 12px 0 24px;
      align-items: flex-start;
    }
    .kanban-col { min-width: 240px; max-width: 240px; display: flex; flex-direction: column; flex-shrink: 0; }

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

    /* Blocked column — only the dot is red, label and count match other columns */
    .col-blocked .col-count { background: rgba(244,63,94,0.15); color: var(--rose); }

    .task-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: 10px 12px;
      cursor: pointer; transition: box-shadow 0.15s, transform 0.12s;
      box-shadow: var(--shadow-sm);
    }
    .task-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .task-card.cdk-drag-dragging { box-shadow: var(--shadow-lg); transform: rotate(1.5deg); }

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

    .assignee-ava {
      width: 20px; height: 20px; border-radius: 50%;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    .col-empty {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 4px;
      color: var(--border); font-size: 11px; padding: 16px 0;
    }
    .col-empty .material-icons-round { font-size: 20px; }

    /* ── Sprints tab ── */
    .sprints-section { display: flex; flex-direction: column; gap: 12px; padding: 12px 0; }
    .sprints-header { display: flex; justify-content: flex-end; gap: 8px; align-items: center; }

    .sprint-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 16px 20px;
      box-shadow: var(--shadow-sm);
    }
    .sprint-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .sprint-left { flex: 1; }
    .sprint-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .sprint-name { font-size: 14px; font-weight: 700; color: var(--ink); }
    .sprint-dates {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: var(--soft); margin-bottom: 4px;
    }
    .date-ico { font-size: 13px; color: var(--soft); }
    .sprint-goal { margin: 0; font-size: 12px; color: var(--muted); font-style: italic; }

    .sprint-retro-row {
      display: flex; align-items: flex-start; gap: 6px;
      margin-top: 6px; font-size: 12px; color: var(--muted);
    }
    .retro-ico { font-size: 14px; color: var(--soft); flex-shrink: 0; margin-top: 1px; }
    .retro-notes-text { flex: 1; white-space: pre-wrap; line-height: 1.4; }
    .retro-notes-empty { flex: 1; color: var(--soft); font-style: italic; }
    .carry-over-badge {
      display: inline-flex; align-items: center;
      background: var(--amber-c, #fef9ec); border: 1px solid var(--amber, #f59e0b);
      color: var(--amber, #f59e0b); border-radius: var(--r-full);
      padding: 2px 8px; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
    }

    .sprint-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .sprint-stats { display: flex; gap: 10px; }
    .stat { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); }
    .stat-ico { font-size: 14px; }
    .stat.done { color: var(--emerald); }

    /* Dropdown menu */
    .sprint-menu { position: relative; }
    .dropdown {
      position: absolute; right: 0; top: 32px; z-index: 100;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); box-shadow: var(--shadow-md);
      min-width: 160px; overflow: hidden;
    }
    .dd-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 9px 14px;
      background: none; border: none;
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      cursor: pointer; text-align: left;
      transition: background 0.12s;
    }
    .dd-item .material-icons-round { font-size: 16px; color: var(--muted); }
    .dd-item:hover { background: var(--surface); }
    .dd-item.danger { color: var(--rose); }
    .dd-item.danger .material-icons-round { color: var(--rose); }

    .menu-backdrop { position: fixed; inset: 0; z-index: 99; }

    .empty-text { margin: 0; font-size: 13px; color: var(--soft); text-align: center; padding: 32px; }

    .retro-carry-warn {
      display: flex; align-items: center; gap: 10px;
      background: var(--amber-c, #fef9ec); border: 1px solid var(--amber, #f59e0b);
      border-radius: var(--r-md); padding: 12px 14px;
      font-size: 13px; color: var(--ink);
    }
    .retro-carry-warn .material-icons-round { color: var(--amber, #f59e0b); font-size: 18px; flex-shrink: 0; }

    /* ── Task panel ── */
    .panel-overlay {
      position: fixed; inset: 0; background: rgba(15,15,20,0.35);
      z-index: 800; display: flex; justify-content: flex-end;
    }
    .task-panel {
      width: 440px; height: 100%; background: var(--white);
      box-shadow: -8px 0 32px rgba(15,15,20,0.12);
      display: flex; flex-direction: column;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .panel-header { padding: 16px 20px 12px; }
    .panel-title-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .panel-task-id {
      font-family: 'DM Mono', monospace; font-size: 11px;
      color: var(--soft); letter-spacing: 0.3px;
    }
    .panel-edit-label { font-size: 13px; font-weight: 600; color: var(--muted); }
    .panel-actions { display: flex; gap: 2px; }
    .panel-task-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.3; }
    .panel-divider { height: 1px; background: var(--border); }

    .panel-body { padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
    .panel-desc { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.5; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--soft);
    }
    .detail-val { font-size: 13px; color: var(--ink); }
    .detail-select {
      padding: 5px 8px; border-radius: var(--r-md);
      border: 1px solid var(--border); background: var(--surface);
      font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--ink);
      outline: none; cursor: pointer;
    }
    .detail-select:focus { border-color: var(--violet); }
    .overdue-text { color: var(--rose); font-weight: 600; }

    /* Comments */
    .comments-section { display: flex; flex-direction: column; gap: 10px; }
    .comments-header { display: flex; align-items: center; gap: 8px; }
    .comments-title { font-size: 13px; font-weight: 700; color: var(--ink); }
    .comments-count {
      font-size: 10px; background: var(--border); color: var(--muted);
      border-radius: var(--r-full); padding: 1px 6px;
    }
    .comments-loading { display: flex; justify-content: center; padding: 12px; }

    .comment-list { display: flex; flex-direction: column; gap: 8px; }
    .comment-item { display: flex; gap: 10px; }
    .comment-ava {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700;
    }
    .comment-body { flex: 1; }
    .comment-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
    .comment-author { font-size: 12px; font-weight: 700; color: var(--ink); }
    .comment-date { font-size: 11px; color: var(--soft); flex: 1; }
    .del-btn {
      background: none; border: none; cursor: pointer; padding: 2px;
      color: var(--soft); opacity: 0; border-radius: var(--r-sm);
      display: flex; align-items: center; transition: opacity 0.12s, color 0.12s;
    }
    .del-btn .material-icons-round { font-size: 14px; }
    .comment-item:hover .del-btn { opacity: 1; }
    .del-btn:hover { color: var(--rose); }
    .comment-content { margin: 0; font-size: 12px; color: var(--muted); white-space: pre-wrap; line-height: 1.5; }
    .no-comments { margin: 0; font-size: 12px; color: var(--soft); text-align: center; padding: 8px; }

    .comment-form { display: flex; flex-direction: column; gap: 8px; }
    .comment-input {
      width: 100%; padding: 9px 12px; resize: vertical;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md); color: var(--ink);
      font-family: 'DM Sans', sans-serif; font-size: 13px;
      outline: none; transition: border-color 0.15s; box-sizing: border-box;
    }
    .comment-input:focus { border-color: var(--violet); }
    .comment-form-actions { display: flex; align-items: center; justify-content: space-between; }

    /* Shared form styles */
    .field-group { display: flex; flex-direction: column; gap: 5px; }
    .field-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; }
    .field-input {
      width: 100%; padding: 9px 12px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md); color: var(--ink);
      font-family: 'DM Sans', sans-serif; font-size: 13px;
      outline: none; transition: border-color 0.15s; box-sizing: border-box;
    }
    .field-input:focus { border-color: var(--violet); }
    textarea.field-input { resize: vertical; }
    .form-row { display: flex; gap: 12px; }
    .form-row .field-group { flex: 1; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

    /* Issue type picker */
    .type-picker { display: flex; gap: 6px; flex-wrap: wrap; }
    .type-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: var(--r-full);
      border: 1.5px solid var(--border); background: var(--surface);
      font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
      color: var(--muted); cursor: pointer; transition: all 0.15s;
    }
    .type-btn .material-icons-round { font-size: 14px; }
    .type-btn:hover { border-color: var(--soft); color: var(--ink); background: var(--white); }
    .type-btn.type-rose.selected   { background: var(--rose-c);    border-color: var(--rose);    color: var(--rose); }
    .type-btn.type-violet.selected { background: var(--violet-c);  border-color: var(--violet);  color: var(--violet); }
    .type-btn.type-blue.selected   { background: var(--blue-c);    border-color: var(--blue);    color: var(--blue); }
    .type-btn.type-amber.selected  { background: var(--amber-c);   border-color: var(--amber);   color: var(--amber); }

    /* ── Overlay dialogs ── */
    .overlay {
      position: fixed; inset: 0; background: rgba(15,15,20,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog-card {
      width: 100%; max-width: 500px;
      background: var(--white); border-radius: var(--r-xl);
      padding: 28px; box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; gap: 16px;
      max-height: 90vh; overflow-y: auto;
    }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; }
    .dialog-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--ink); }

    /* ── Issues tab ── */
    .issues-section { display: flex; flex-direction: column; gap: 0; padding: 12px 0; }

    .issue-filter-bar {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 0 0 12px; border-bottom: 1px solid var(--border);
    }
    .status-toggle { display: flex; gap: 2px; }
    .st-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; background: transparent;
      border: 1px solid var(--border); border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: var(--muted);
      cursor: pointer; transition: all 0.15s;
    }
    .st-btn .material-icons-round { font-size: 14px; }
    .st-btn:hover { border-color: var(--violet); color: var(--violet); }
    .st-btn.active { background: var(--violet); border-color: var(--violet); color: #fff; }

    /* Tab badge */
    .tab-badge {
      font-size: 10px; font-weight: 700; line-height: 1;
      background: var(--rose); color: #fff;
      border-radius: var(--r-full); padding: 2px 5px;
      margin-left: 2px;
    }

    /* Issue list */
    .issue-list { display: flex; flex-direction: column; }
    .issue-row {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 4px; border-bottom: 1px solid var(--border);
      cursor: pointer; transition: background 0.12s; border-radius: var(--r-sm);
    }
    .issue-row:hover { background: var(--surface); }

    .issue-type-dot {
      width: 24px; height: 24px; border-radius: var(--r-sm); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .issue-type-dot .material-icons-round { font-size: 14px; }

    .issue-num {
      font-family: 'DM Mono', monospace; font-size: 11px;
      color: var(--soft); flex-shrink: 0; min-width: 28px;
    }
    .issue-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .issue-title { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .issue-meta { font-size: 11px; color: var(--soft); }
    .issue-converted-badge {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 600; color: var(--emerald);
    }
    .issue-converted-badge .material-icons-round { font-size: 12px; }

    .issue-badges { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .issue-type-badge {
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: var(--r-full);
      text-transform: uppercase; letter-spacing: 0.4px;
    }

    /* Type colours */
    .type-rose   { background: var(--rose-c);    color: var(--rose);    }
    .type-violet { background: var(--violet-mid); color: var(--violet);  }
    .type-blue   { background: var(--blue-c);     color: var(--blue);    }
    .type-amber  { background: var(--amber-c);    color: var(--amber);   }

    .issues-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 48px 0; color: var(--border);
    }
    .issues-empty .material-icons-round { font-size: 36px; }
    .issues-empty p { margin: 0; font-size: 13px; color: var(--soft); }

    /* Issue panel extras */
    .issue-panel-meta { display: flex; align-items: center; gap: 8px; }
    .issue-status-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--r-full);
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .is-open       { background: var(--blue-c);    color: var(--blue);    }
    .is-inprogress { background: var(--amber-c);   color: var(--amber);   }
    .is-closed     { background: var(--surface);   color: var(--soft);    border: 1px solid var(--border); }

    .issue-actions {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .btn-ghost.sm { padding: 5px 12px; font-size: 12px; }
    .converted-note {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--emerald); font-weight: 600;
    }
    .converted-note .material-icons-round { font-size: 14px; }

    /* Convert dialog */
    .convert-desc { margin: 0 0 16px; font-size: 13px; color: var(--muted); line-height: 1.5; }

    /* ── Blocked badge (board card) ── */
    .blocked-badge {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 700;
      color: var(--rose); background: var(--rose-c);
      border: 1px solid var(--rose); border-radius: var(--r-full);
      padding: 2px 7px; margin-bottom: 4px;
    }
    .blocked-badge .material-icons-round { font-size: 11px; }

    /* ── Dependencies panel section ── */
    .dep-section { display: flex; flex-direction: column; gap: 14px; }
    .dep-group { display: flex; flex-direction: column; gap: 6px; }

    .dep-group-header {
      display: flex; align-items: center; justify-content: space-between;
    }

    .dep-empty { font-size: 11px; color: var(--soft); padding: 0 2px; }

    .dep-row {
      display: flex; align-items: center; gap: 7px;
      padding: 5px 8px; border-radius: var(--r-sm);
      border: 1px solid var(--border); background: var(--surface);
      font-size: 12px;
    }
    .dep-row.dep-open { border-color: var(--rose-c); background: var(--rose-c); }

    .dep-status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .dep-status-dot.s-0 { background: var(--soft); }
    .dep-status-dot.s-1 { background: var(--blue); }
    .dep-status-dot.s-2 { background: var(--amber); }
    .dep-status-dot.s-3 { background: var(--emerald); }
    .dep-status-dot.s-4 { background: var(--rose); }
    .dep-status-dot.s-5 { background: var(--border); }

    .dep-title { flex: 1; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dep-status-label { font-size: 10px; color: var(--soft); flex-shrink: 0; }

    .dep-remove {
      width: 18px; height: 18px; border: none; background: transparent;
      cursor: pointer; color: var(--soft); display: flex; align-items: center; justify-content: center;
      border-radius: var(--r-sm); transition: color 0.12s, background 0.12s;
      flex-shrink: 0; padding: 0;
    }
    .dep-remove:hover { color: var(--rose); background: var(--rose-c); }
    .dep-remove .material-icons-round { font-size: 12px; }

    .dep-inline-picker {
      border: 1px solid var(--border); border-radius: var(--r-md);
      background: var(--white); overflow-y: auto; max-height: 180px;
    }
    .dep-inline-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; font-size: 12px; color: var(--ink);
      cursor: pointer; transition: background 0.12s;
    }
    .dep-inline-item:hover { background: var(--surface); }

    /* ── Sub-tasks ── */
    .subtasks-section, .timelog-section { display: flex; flex-direction: column; gap: 8px; }

    .section-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .section-title { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .section-count { font-size: 11px; font-weight: 600; color: var(--violet); background: rgba(99,102,241,.1); padding: 1px 7px; border-radius: 10px; }
    .time-summary { display: flex; align-items: center; gap: 4px; font-size: 12px; }
    .time-logged { font-weight: 600; color: var(--ink); }
    .time-sep, .time-est { color: var(--soft); }

    .subtask-bar { height: 5px; border-radius: 3px; background: var(--border); overflow: hidden; }
    .subtask-bar-fill { height: 100%; border-radius: 3px; background: var(--violet); transition: width .3s; }
    .subtask-bar-fill.over-budget { background: var(--rose); }
    .timelog-bar-wrap { display: flex; align-items: center; gap: 8px; }
    .time-pct { font-size: 11px; color: var(--soft); white-space: nowrap; }

    .subtask-item, .timelog-item {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 6px; border-radius: var(--r-sm);
      transition: background .12s;
    }
    .subtask-item:hover, .timelog-item:hover { background: var(--surface); }

    .subtask-check {
      background: none; border: none; cursor: pointer; padding: 0;
      color: var(--soft); display: flex; align-items: center;
    }
    .subtask-check.checked { color: var(--violet); }
    .subtask-check .material-icons-round { font-size: 18px; }

    .subtask-title { flex: 1; font-size: 13px; color: var(--ink); }
    .subtask-title.completed { text-decoration: line-through; color: var(--soft); }

    .subtask-del {
      width: 18px; height: 18px; background: transparent; border: none; cursor: pointer;
      color: var(--soft); display: flex; align-items: center; justify-content: center;
      border-radius: var(--r-sm); transition: color .12s, background .12s; padding: 0;
    }
    .subtask-del:hover { color: var(--rose); background: var(--rose-c); }
    .subtask-del .material-icons-round { font-size: 12px; }

    .subtask-add-form, .timelog-form {
      display: flex; align-items: center; gap: 6px; margin-top: 2px;
    }
    .subtask-input, .timelog-hrs, .timelog-date-input, .timelog-desc-input {
      border: 1px solid var(--border); border-radius: var(--r-sm);
      padding: 5px 8px; font-size: 12px; color: var(--ink); background: var(--white);
      outline: none;
    }
    .subtask-input { flex: 1; }
    .timelog-desc-input { flex: 1; }
    .subtask-input:focus, .timelog-hrs:focus, .timelog-date-input:focus, .timelog-desc-input:focus {
      border-color: var(--violet);
    }

    .add-subtask-btn {
      display: flex; align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer;
      font-size: 12px; color: var(--soft); padding: 4px 0;
      transition: color .12s;
    }
    .add-subtask-btn:hover { color: var(--violet); }
    .add-subtask-btn .material-icons-round { font-size: 15px; }

    /* Attachments */
    .attachments-section { display: flex; flex-direction: column; gap: 8px; }
    .attach-list { display: flex; flex-direction: column; gap: 4px; }
    .attach-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: var(--r-md);
      background: var(--surface); border: 1px solid var(--border);
    }
    .attach-icon { font-size: 18px; color: var(--violet); flex-shrink: 0; }
    .attach-info { flex: 1; min-width: 0; }
    .attach-name {
      font-size: 12px; font-weight: 500; color: var(--ink);
      text-decoration: none; display: block;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .attach-name:hover { text-decoration: underline; color: var(--violet); }
    .attach-meta { font-size: 10px; color: var(--soft); }
    .attach-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .attach-act-btn {
      width: 28px; height: 28px; border-radius: var(--r-sm);
      background: none; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--soft); transition: background .12s, color .12s;
    }
    .attach-act-btn:hover { background: var(--border); color: var(--ink); }
    .attach-act-btn.danger:hover { background: var(--rose-c); color: var(--rose); }
    .attach-act-btn .material-icons-round { font-size: 16px; }
    .attach-upload-btn { cursor: pointer; }
    .attach-upload-btn.disabled { opacity: .5; cursor: not-allowed; }
    .attach-input { display: none; }

    /* Preview modal */
    .attach-preview-card {
      background: var(--white); border-radius: var(--r-xl);
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
      width: 90vw; max-width: 900px; max-height: 88vh; overflow: hidden;
    }
    .attach-preview-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .attach-preview-name { font-size: 14px; font-weight: 600; color: var(--ink); }
    .attach-preview-body {
      flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center;
      background: var(--surface); padding: 16px;
    }
    .preview-img { max-width: 100%; max-height: 100%; border-radius: var(--r-md); object-fit: contain; }
    .preview-pdf { width: 100%; height: 70vh; border: none; border-radius: var(--r-md); }
    .preview-md { width: 100%; max-width: 720px; padding: 8px; align-self: flex-start; }

    .timelog-icon { font-size: 16px; color: var(--soft); flex-shrink: 0; }
    .timelog-body { flex: 1; display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .timelog-hours { font-weight: 600; color: var(--ink); }
    .timelog-date { color: var(--soft); }
    .timelog-desc { color: var(--muted); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Members tab ── */
    .members-section { display: flex; flex-direction: column; gap: 20px; }

    .members-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .members-subtitle { margin: 0; font-size: 13px; color: var(--muted); }

    .members-empty {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 60px 0; color: var(--soft);
    }
    .members-empty .material-icons-round { font-size: 40px; }
    .members-empty p { margin: 0; font-size: 14px; }

    .member-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px;
    }

    .member-card {
      display: flex; flex-direction: column; gap: 12px;
      padding: 16px; border-radius: var(--r-lg);
      border: 1px solid var(--border); background: var(--white);
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .member-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }

    .member-top { display: flex; align-items: center; gap: 12px; }

    .member-avatar {
      width: 40px; height: 40px; border-radius: var(--r-full); flex-shrink: 0;
      background: var(--violet-mid); color: var(--violet);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
    }

    .member-info { flex: 1; min-width: 0; }
    .member-name { margin: 0; font-size: 13px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-email { margin: 2px 0 0; font-size: 11px; color: var(--soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .remove-btn { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
    .member-card:hover .remove-btn { opacity: 1; }

    .member-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 10px; border-top: 1px solid var(--border);
    }

    .member-tasks {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 500; color: var(--soft);
    }
    .member-tasks .material-icons-round { font-size: 13px; }
    .tasks-warn { color: var(--amber); }

    .member-role-wrap { display: flex; align-items: center; }

    .member-role-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 700; padding: 3px 9px;
      border-radius: var(--r-full); border: 1px solid transparent;
    }
    .role-Viewer  { background: var(--surface);    color: var(--soft);    border-color: var(--border); }
    .role-Member  { background: var(--blue-c);      color: var(--blue);    border-color: var(--blue); }
    .role-Lead    { background: var(--violet-mid);  color: var(--violet);  border-color: var(--violet-2); }
    .role-Manager { background: var(--amber-c);     color: var(--amber);   border-color: var(--amber); }

    .role-select {
      font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: var(--r-full);
      border: 1px solid var(--border); background: var(--surface); color: var(--ink);
      cursor: pointer; font-family: 'DM Sans', sans-serif; transition: border-color 0.15s;
    }
    .role-select:focus { outline: none; border-color: var(--violet); }

    /* ── Labels ── */
    .label-chip {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 700; padding: 2px 7px;
      border-radius: var(--r-full); border: 1px solid transparent;
      white-space: nowrap; user-select: none;
    }
    .label-chip .material-icons-round { font-size: 11px; }

    .label-violet  { background: var(--violet-mid); color: var(--violet);  border-color: var(--violet-2); }
    .label-blue    { background: var(--blue-c);     color: var(--blue);    border-color: var(--blue); }
    .label-teal    { background: rgba(20,184,166,.12); color: var(--teal); border-color: var(--teal); }
    .label-emerald { background: rgba(16,185,129,.12); color: var(--emerald); border-color: var(--emerald); }
    .label-amber   { background: var(--amber-c);    color: var(--amber);   border-color: var(--amber); }
    .label-rose    { background: var(--rose-c);     color: var(--rose);    border-color: var(--rose); }
    .label-soft    { background: var(--surface);    color: var(--soft);    border-color: var(--border); }

    .label-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; display: inline-block;
    }

    .task-labels { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 5px; }

    /* Panel label section */
    .panel-labels-section { display: flex; flex-direction: column; gap: 6px; }
    .panel-labels-row { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }

    .label-removable { cursor: pointer; }
    .label-removable:hover { opacity: 0.7; }

    .label-add-wrap { position: relative; }
    .label-add-btn {
      width: 24px; height: 24px; border: 1px dashed var(--border); border-radius: var(--r-full);
      background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: var(--soft); transition: border-color 0.12s, color 0.12s;
    }
    .label-add-btn:hover { border-color: var(--violet); color: var(--violet); }
    .label-add-btn .material-icons-round { font-size: 13px; }

    .label-picker {
      position: absolute; top: 28px; left: 0; z-index: 200;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); box-shadow: var(--shadow-md);
      min-width: 140px; overflow: hidden;
    }
    .label-picker-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; font-size: 12px; color: var(--ink);
      cursor: pointer; transition: background 0.12s;
    }
    .label-picker-item:hover { background: var(--surface); }
    .label-picker-empty { padding: 10px 12px; font-size: 11px; color: var(--soft); }

    /* Manage labels dialog */
    .manage-labels-list { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; }
    .manage-label-row {
      display: flex; align-items: center; gap: 8px; padding: 6px 4px;
      border-radius: var(--r-sm); transition: background 0.1s;
    }
    .manage-label-row:hover { background: var(--surface); }
    .manage-label-name { flex: 1; font-size: 13px; color: var(--ink); }
    .danger-icon { color: var(--soft); }
    .danger-icon:hover { color: var(--rose) !important; background: var(--rose-c) !important; }

    .new-label-form { display: flex; flex-direction: column; gap: 8px; }
    .new-label-row { display: flex; gap: 8px; }
    .color-preview-row { padding: 4px 0; }

    /* ── Timeline ── */
    .tl-section {
      display: flex; flex-direction: column; gap: 0;
      padding: 12px 0 24px; overflow-x: auto;
      min-width: 0;
    }

    .tl-row {
      display: flex; align-items: stretch; min-height: 52px;
      border-bottom: 1px solid var(--border);
    }
    .tl-row:last-child { border-bottom: none; }

    .tl-label {
      width: 160px; min-width: 160px; padding: 0 12px 0 0;
      display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    }
    .tl-sprint-name {
      font-size: 12px; font-weight: 600; color: var(--ink);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 110px;
    }

    /* Axis row */
    .tl-axis-row { min-height: 28px; border-bottom: 2px solid var(--border); }
    .tl-axis-track { border-bottom: none; }
    .tl-month-tick {
      position: absolute; top: 0; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .tl-month-label {
      font-size: 10px; font-weight: 600; color: var(--soft);
      white-space: nowrap; letter-spacing: 0.3px; text-transform: uppercase;
    }
    .tl-month-tick::before {
      content: ''; width: 1px; height: 6px; background: var(--border);
    }

    /* Track */
    .tl-track {
      flex: 1; position: relative; min-width: 0;
      display: flex; align-items: center;
    }
    .tl-axis-track { align-items: flex-end; padding-bottom: 4px; }

    /* Grid lines */
    .tl-grid-line {
      position: absolute; top: 0; bottom: 0;
      width: 1px; background: var(--border); opacity: 0.5; pointer-events: none;
    }

    /* Today line */
    .tl-today-line {
      position: absolute; top: 0; bottom: 0;
      width: 2px; background: var(--rose); z-index: 4; pointer-events: none;
    }
    .tl-today-line--axis { height: 12px; top: auto; bottom: 0; }

    /* Sprint bar */
    .tl-bar {
      position: absolute; height: 28px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md); z-index: 2;
      display: flex; align-items: center; padding: 0 8px;
      overflow: hidden; box-sizing: border-box;
      transition: box-shadow 0.15s;
      min-width: 4px;
    }
    .tl-bar:hover { box-shadow: var(--shadow-md); }
    .tl-bar-active {
      background: var(--violet-mid); border-color: var(--violet-2);
    }
    .tl-bar-dates {
      font-size: 10px; color: var(--muted); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; pointer-events: none;
    }

    /* Task dots */
    .tl-dot {
      position: absolute; width: 10px; height: 10px; border-radius: 50%;
      transform: translateX(-50%); z-index: 3;
      border: 2px solid var(--white); box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      cursor: default; flex-shrink: 0;
    }
    .tl-dot.prio-low      { background: var(--soft); }
    .tl-dot.prio-medium   { background: var(--blue); }
    .tl-dot.prio-high     { background: var(--amber); }
    .tl-dot.prio-critical { background: var(--rose); }

    /* Backlog row */
    .tl-backlog-row .tl-sprint-name { color: var(--soft); font-style: italic; }

    /* Legend */
    .tl-legend {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      padding: 14px 0 0 160px; margin-top: 4px;
    }
    .tl-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
    .tl-legend-bar {
      width: 28px; height: 12px; border-radius: var(--r-sm);
      border: 1px solid var(--border); background: var(--surface);
    }
    .tl-legend-bar.active-bar { background: var(--violet-mid); border-color: var(--violet-2); }
    .tl-today-legend {
      width: 2px; height: 14px; background: var(--rose); border-radius: 1px;
    }

    /* Empty state */
    .tl-empty {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 64px 0; color: var(--border); text-align: center;
    }
    .tl-empty .material-icons-round { font-size: 40px; }
    .tl-empty p { margin: 0; font-size: 13px; color: var(--soft); }

    /* ── Tickets tab ── */
    .tickets-section { display: flex; flex-direction: column; gap: 16px; }
    .tickets-header { display: flex; align-items: center; justify-content: flex-end; padding: 4px 0; }
    .ticket-table { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .ticket-table-header {
      display: grid; grid-template-columns: 48px 1fr 120px 100px 140px 110px;
      padding: 10px 16px; background: var(--surface);
      font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .04em;
    }
    .ticket-row {
      display: grid; grid-template-columns: 48px 1fr 120px 100px 140px 110px;
      padding: 12px 16px; align-items: center; cursor: pointer; transition: background .12s;
      border-top: 1px solid var(--border);
    }
    .ticket-row:hover { background: var(--surface); }
    .ticket-num { font-size: 12px; color: var(--muted); }
    .ticket-subject { font-size: 14px; font-weight: 500; color: var(--ink); }
    .ticket-type-chip { font-size: 11px; color: var(--muted); background: var(--surface); border: 1px solid var(--border); padding: 2px 8px; border-radius: 10px; }
    .ticket-submitter { font-size: 12px; color: var(--muted); }
    .priority-dot { font-size: 12px; font-weight: 600; }
    .p-0 { color: var(--soft); } .p-1 { color: var(--blue); } .p-2 { color: var(--amber); } .p-3 { color: var(--rose); }
    .status-chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; }
    .s-0 { background: #f0f0f0; color: #555; } .s-1 { background: #e8f4fd; color: #1a73c7; }
    .s-2 { background: #fff3e0; color: #e67d00; } .s-3 { background: var(--violet-c); color: var(--violet); }
    .s-4 { background: #f5f5f5; color: #888; }

    /* SLA badges */
    .sla-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--r-full); white-space: nowrap; }
    .sla-0 { background: var(--emerald-c, #d1fae5); color: var(--emerald, #10b981); }
    .sla-1 { background: var(--amber-c, #fef3c7);   color: var(--amber, #f59e0b); }
    .sla-2 { background: var(--rose-c, #ffe4e6);     color: var(--rose, #f43f5e); }

    .sla-detail-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--muted); margin-bottom: 14px; }
    .sla-detail-ico { font-size: 15px; }
    .sla-ico-0 { color: var(--emerald, #10b981); }
    .sla-ico-1 { color: var(--amber, #f59e0b); }
    .sla-ico-2 { color: var(--rose, #f43f5e); }

    /* ── Invites tab ── */
    .invites-section { display: flex; flex-direction: column; gap: 20px; }
    .invites-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .invites-subtitle { font-size: 13px; color: var(--muted); max-width: 480px; margin: 0; }
    .invite-list { display: flex; flex-direction: column; gap: 10px; }
    .invite-row {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      background: var(--card); border: 1px solid var(--border); border-radius: 10px;
    }
    .invite-icon { color: var(--violet); font-size: 20px; }
    .invite-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .invite-token { font-size: 13px; color: var(--ink); }
    .invite-expiry { font-size: 11px; color: var(--muted); }
    .invite-actions { display: flex; gap: 6px; }

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

    :host ::ng-deep .mention-badge {
      display: inline-block;
      background: rgba(99,102,241,.12);
      color: var(--violet);
      border-radius: 4px;
      padding: 1px 6px;
      font-weight: 600;
      font-size: 0.875em;
    }
  `],
})
export class ProjectDetailComponent implements OnInit {
  readonly TaskStatus = TaskStatus;
  readonly TaskPriority = TaskPriority;

  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private commentService = inject(CommentService);
  private issueService = inject(IssueService);
  private labelService = inject(LabelService);
  private dependencyService = inject(TaskDependencyService);
  private memberService = inject(ProjectMemberService);
  private userService = inject(UserService);
  protected auth = inject(AuthService);
  private ticketService = inject(TicketService);
  private inviteService = inject(InviteService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  project = signal<Project | null>(null);
  tasks = signal<Task[]>([]);
  sprints = signal<Sprint[]>([]);
  comments = signal<Comment[]>([]);
  users = signal<User[]>([]);
  loading = signal(true);
  commentsLoading = signal(false);
  showCreateTask = signal(false);
  showCreateSprint = signal(false);
  selectedTask = signal<Task | null>(null);
  editMode = signal(false);
  editingSprint = signal<Sprint | null>(null);

  activeTab: 'board' | 'sprints' | 'issues' | 'timeline' | 'members' | 'tickets' | 'invites' | 'brainstorm' | 'vault' | 'updates' | 'messages' = 'board';
  openSprintMenuId: string | null = null;
  statusMenuOpen = false;

  readonly allStatuses = [
    { value: ProjectStatus.Planning,  label: PROJECT_STATUS_LABELS[ProjectStatus.Planning]  },
    { value: ProjectStatus.Active,    label: PROJECT_STATUS_LABELS[ProjectStatus.Active]    },
    { value: ProjectStatus.OnHold,    label: PROJECT_STATUS_LABELS[ProjectStatus.OnHold]    },
    { value: ProjectStatus.Completed, label: PROJECT_STATUS_LABELS[ProjectStatus.Completed] },
    { value: ProjectStatus.Archived,  label: PROJECT_STATUS_LABELS[ProjectStatus.Archived]  },
  ];

  completingSprintId = signal<string | null>(null);
  completingSprintRetroNotes = '';
  completingSprintTargetId: string | null = null;
  futureSprints = signal<Sprint[]>([]);

  completingSprintCarryOver = computed(() => {
    const id = this.completingSprintId();
    if (!id) return 0;
    return this.tasks().filter(
      t => t.sprintId === id
        && t.status !== TaskStatus.Done
        && t.status !== TaskStatus.Cancelled
    ).length;
  });

  filterSprintId: string | null = null;
  filterPriority: TaskPriority | null = null;
  filterAssigneeId: string | null = null;
  filterLabelId: string | null = null;
  filteredTasks = signal<Task[]>([]);

  // ── Labels ───────────────────────────────────────
  labels = signal<Label[]>([]);
  showManageLabels = signal(false);
  showLabelPicker = signal(false);
  readonly labelColors = LABEL_COLORS;

  newLabelForm = this.fb.group({
    name: ['', Validators.required],
    color: ['blue'],
  });

  // ── Dependencies ────────────────────────────────
  showDepPicker = signal<'blockedBy' | 'blocking' | null>(null);

  /** Tasks in this project that can be added as a dependency (not already linked, not this task) */
  availableForDep(mode: 'blockedBy' | 'blocking'): Task[] {
    const task = this.selectedTask();
    if (!task) return [];
    const linked = new Set([
      task.id,
      ...(task.blockedBy ?? []).map(t => t.id),
      ...(task.blocking  ?? []).map(t => t.id),
    ]);
    return this.tasks().filter(t => !linked.has(t.id));
  }

  addDependency(mode: 'blockedBy' | 'blocking', otherTaskId: string) {
    const task = this.selectedTask()!;
    const [blockingId, blockedId] =
      mode === 'blockedBy' ? [otherTaskId, task.id] : [task.id, otherTaskId];

    this.dependencyService.add(blockingId, blockedId).subscribe({
      next: () => {
        // Refresh this task to get updated dep lists from server
        this.taskService.getById(task.id).subscribe(updated => {
          this.selectedTask.set(updated);
          this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t));
          this.filteredTasks.update(all => all.map(t => t.id === updated.id ? updated : t));
        });
        this.showDepPicker.set(null);
      },
      error: (err) => this.toast(err?.error?.Description ?? 'Failed to add dependency', true),
    });
  }

  removeDependency(depId: string, taskId: string) {
    this.dependencyService.remove(depId).subscribe({
      next: () => {
        this.taskService.getById(taskId).subscribe(updated => {
          this.selectedTask.set(updated);
          this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t));
          this.filteredTasks.update(all => all.map(t => t.id === updated.id ? updated : t));
        });
      },
      error: () => this.toast('Failed to remove dependency', true),
    });
  }

  // ── Members ─────────────────────────────────────
  members = signal<ProjectMember[]>([]);
  membersLoading = signal(false);

  // ── @mention autocomplete ────────────────────────
  mentionOpen        = signal(false);
  mentionFilter      = signal('');
  mentionHighlighted = signal(0);
  private mentionAtIndex = -1;
  @ViewChild('commentTextarea') private commentTextareaRef?: ElementRef<HTMLTextAreaElement>;

  get filteredMembers(): ProjectMember[] {
    const filter = this.mentionFilter().toLowerCase();
    return this.members().filter(m =>
      !filter || m.fullName.toLowerCase().includes(filter)
    );
  }

  showAddMember = signal(false);

  myProjectRole = computed(() => {
    const me = this.auth.user()?.userId;
    return this.members().find(m => m.userId === me)?.role ?? ProjectMemberRole.Viewer;
  });

  assignableMembers = computed(() => {
    const isManager = this.myProjectRole() === ProjectMemberRole.Manager || this.auth.isAdmin();
    return isManager
      ? this.members()
      : this.members().filter(m => m.role !== ProjectMemberRole.Manager);
  });

  canManageMembers = computed(() =>
    this.myProjectRole() === ProjectMemberRole.Manager || this.auth.isAdmin()
  );

  addMemberForm = this.fb.group({
    userId: ['', Validators.required],
    role: [ProjectMemberRole.Member],
  });

  // users already on this project (by userId set) — used to filter the add dropdown
  availableUsers() {
    const taken = new Set(this.members().map(m => m.userId));
    return this.users().filter(u => !taken.has(u.id));
  }

  // ── Issues ──────────────────────────────────────
  issues = signal<Issue[]>([]);
  selectedIssue = signal<Issue | null>(null);
  issueComments = signal<IssueComment[]>([]);
  issueCommentsLoading = signal(false);
  issuesLoading = signal(false);
  showCreateIssue = signal(false);
  showConvertDialog = signal(false);
  convertingIssue = signal<Issue | null>(null);

  issueFilterStatus: 'open' | 'closed' = 'open';
  issueFilterType: IssueType | null = null;
  issueFilterAssignee: string | null = null;

  filteredIssues(): Issue[] {
    return this.issues().filter(i => {
      const isOpen = i.status !== IssueStatus.Closed;
      const statusMatch = this.issueFilterStatus === 'open' ? isOpen : !isOpen;
      const typeMatch = this.issueFilterType === null || i.type === this.issueFilterType;
      const assigneeMatch = this.issueFilterAssignee === null || i.assigneeId === this.issueFilterAssignee;
      return statusMatch && typeMatch && assigneeMatch;
    });
  }
  openIssueCount(): number { return this.issues().filter(i => i.status !== IssueStatus.Closed).length; }
  closedIssueCount(): number { return this.issues().filter(i => i.status === IssueStatus.Closed).length; }

  readonly columns = COLUMNS;
  readonly columnIds = COLUMNS.map(c => c.id);

  taskForm = this.fb.group({
    title: ['', Validators.required], description: [''],
    priority: [TaskPriority.Medium], storyPoints: [null as number | null],
    dueDate: [null as string | null], sprintId: [null as string | null],
    assigneeId: [null as string | null],
  });

  editTaskForm = this.fb.group({
    title: ['', Validators.required], description: [''],
    priority: [TaskPriority.Medium], storyPoints: [null as number | null],
    dueDate: [null as string | null], sprintId: [null as string | null],
    assigneeId: [null as string | null],
  });

  sprintForm = this.fb.group({
    name: ['', Validators.required], goal: [''],
    startDate: ['', Validators.required], endDate: ['', Validators.required],
  });

  editSprintForm = this.fb.group({
    name: ['', Validators.required], goal: [''],
    startDate: ['', Validators.required], endDate: ['', Validators.required],
  });

  commentForm = this.fb.group({ content: ['', Validators.required] });

  // ── Sub-tasks ────────────────────────────────────
  showSubTaskInput = signal(false);
  newSubTaskTitle = '';
  estimatingSubTaskId = signal<string | null>(null);
  estimateHoursInput: number | null = null;

  completedSubTasks = computed(() => (this.selectedTask()?.subTasks ?? []).filter(s => s.isCompleted).length);
  subTaskProgress = computed(() => {
    const all = this.selectedTask()?.subTasks ?? [];
    return all.length ? (all.filter(s => s.isCompleted).length / all.length) * 100 : 0;
  });

  addSubTask() {
    const task = this.selectedTask();
    if (!task || !this.newSubTaskTitle.trim()) return;
    this.taskService.createSubTask(task.id, this.newSubTaskTitle.trim()).subscribe({
      next: (st) => {
        this.selectedTask.update(t => t ? { ...t, subTasks: [...(t.subTasks ?? []), st] } : t);
        this.newSubTaskTitle = '';
        this.showSubTaskInput.set(false);
      },
      error: () => this.toast('Failed to add sub-task', true),
    });
  }

  toggleSubTask(subTaskId: string) {
    this.taskService.toggleSubTask(subTaskId).subscribe({
      next: (updated) => {
        this.selectedTask.update(t => t ? {
          ...t, subTasks: (t.subTasks ?? []).map(s => s.id === subTaskId ? updated : s)
        } : t);
      },
      error: () => this.toast('Failed to toggle sub-task', true),
    });
  }

  deleteSubTask(subTaskId: string) {
    this.taskService.deleteSubTask(subTaskId).subscribe({
      next: () => {
        this.selectedTask.update(t => t ? {
          ...t, subTasks: (t.subTasks ?? []).filter(s => s.id !== subTaskId)
        } : t);
      },
      error: () => this.toast('Failed to delete sub-task', true),
    });
  }

  setSubTaskEstimate(subTaskId: string) {
    const hours = Number(this.estimateHoursInput);
    if (hours < 0) return;
    this.taskService.setSubTaskEstimate(subTaskId, hours || null).subscribe({
      next: (updated) => {
        this.selectedTask.update(t => t ? {
          ...t, subTasks: (t.subTasks ?? []).map(s => s.id === subTaskId ? { ...s, estimatedHours: updated.estimatedHours } : s)
        } : t);
        this.estimatingSubTaskId.set(null);
        this.estimateHoursInput = null;
      },
      error: () => this.toast('Failed to set estimate', true),
    });
  }

  // ── Time logs ────────────────────────────────────
  showTimeLogInput = signal(false);
  newTimeHours: number | null = null;
  newTimeDate = new Date().toISOString().split('T')[0];
  newTimeDesc = '';
  newTimeSubTaskId: string | null = null;
  editingLogId = signal<string | null>(null);
  editLogHours: number | null = null;
  editLogDate = '';
  editLogDesc = '';

  timeProgress = computed(() => {
    const est = this.selectedTask()?.estimatedHours;
    const logged = this.selectedTask()?.totalLoggedHours ?? 0;
    return est ? (logged / est) * 100 : 0;
  });

  logTime() {
    const task = this.selectedTask();
    const hours = Number(this.newTimeHours);
    if (!task || !hours || hours <= 0) return;
    this.taskService.logTime(task.id, hours, this.newTimeDate, this.newTimeDesc || undefined, this.newTimeSubTaskId ?? undefined).subscribe({
      next: (tl) => {
        this.selectedTask.update(t => t ? {
          ...t,
          timeLogs: [tl, ...(t.timeLogs ?? [])],
          totalLoggedHours: (t.totalLoggedHours ?? 0) + Number(tl.hours),
        } : t);
        this.newTimeHours = null;
        this.newTimeDesc = '';
        this.showTimeLogInput.set(false);
        this.newTimeSubTaskId = null;
      },
      error: () => this.toast('Failed to log time', true),
    });
  }

  deleteTimeLog(timeLogId: string) {
    const tl = this.selectedTask()?.timeLogs?.find(t => t.id === timeLogId);
    this.taskService.deleteTimeLog(timeLogId).subscribe({
      next: () => {
        this.selectedTask.update(t => t ? {
          ...t,
          timeLogs: (t.timeLogs ?? []).filter(l => l.id !== timeLogId),
          totalLoggedHours: (t.totalLoggedHours ?? 0) - (tl?.hours ?? 0),
        } : t);
      },
      error: () => this.toast('Failed to delete time log', true),
    });
  }

  startEditLog(tl: any) {
    this.editingLogId.set(tl.id);
    this.editLogHours = tl.hours;
    this.editLogDate = tl.loggedDate;
    this.editLogDesc = tl.description ?? '';
  }

  saveEditLog(timeLogId: string) {
    const task = this.selectedTask();
    const hours = Number(this.editLogHours);
    if (!task || !hours || hours <= 0) return;
    this.taskService.updateTimeLog(timeLogId, hours, this.editLogDate, this.editLogDesc || undefined)
      .subscribe({
        next: () => {
          this.editingLogId.set(null);
          this.taskService.getById(task.id).subscribe(updated => this.selectedTask.set(updated));
        },
        error: () => this.toast('Failed to update time log', true),
      });
  }

  confirmDeleteTimeLog(timeLogId: string) {
    const tl = this.selectedTask()?.timeLogs?.find(t => t.id === timeLogId);
    if (!confirm(`Delete ${tl?.hours}h log entry?`)) return;
    this.deleteTimeLog(timeLogId);
  }

  // ── Attachments ─────────────────────────────────────────────────────────
  private readonly sanitizer = inject(DomSanitizer);
  uploadingAttachment = signal(false);
  previewAttach = signal<import('@pm/shared/models').TaskAttachment | null>(null);
  private _previewBlobUrl: SafeResourceUrl | null = null;
  private _previewRawUrl: string | null = null;
  previewMarkdownHtml = signal<SafeHtml | null>(null);

  previewBlobUrl(): SafeResourceUrl { return this._previewBlobUrl!; }

  isPreviewable(contentType: string): boolean {
    return contentType.startsWith('image/') || contentType === 'application/pdf' || this.isMarkdown(contentType);
  }

  isMarkdown(contentType: string): boolean {
    return contentType === 'text/markdown' || contentType === 'text/x-markdown';
  }

  fileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'table_chart';
    if (contentType.includes('word') || contentType.includes('document')) return 'description';
    if (contentType === 'application/zip') return 'folder_zip';
    return 'insert_drive_file';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  previewAttachment(a: import('@pm/shared/models').TaskAttachment) {
    this.taskService.fetchAttachmentBlob(a.id).subscribe(async res => {
      this._revokePreview();
      this.previewMarkdownHtml.set(null);

      if (this.isMarkdown(a.contentType)) {
        const text = await res.body!.text();
        const html = marked.parse(text) as string;
        this.previewMarkdownHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
      } else {
        this._previewRawUrl = URL.createObjectURL(res.body!);
        this._previewBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this._previewRawUrl);
      }
      this.previewAttach.set(a);
    });
  }

  closePreview() {
    this._revokePreview();
    this.previewAttach.set(null);
    this.previewMarkdownHtml.set(null);
  }

  private _revokePreview() {
    if (this._previewRawUrl) { URL.revokeObjectURL(this._previewRawUrl); this._previewRawUrl = null; }
  }

  downloadAttachment(a: import('@pm/shared/models').TaskAttachment) {
    this.taskService.fetchAttachmentBlob(a.id).subscribe(res => {
      const url = URL.createObjectURL(res.body!);
      const link = document.createElement('a');
      link.href = url; link.download = a.fileName; link.click();
      URL.revokeObjectURL(url);
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const task = this.selectedTask();
    if (!file || !task) return;
    input.value = '';
    this.uploadingAttachment.set(true);
    this.taskService.uploadAttachment(task.id, file).subscribe({
      next: (attachment) => {
        this.selectedTask.update(t => t ? { ...t, attachments: [attachment, ...(t.attachments ?? [])] } : t);
        this.uploadingAttachment.set(false);
        this.toast('File attached');
      },
      error: () => { this.uploadingAttachment.set(false); this.toast('Upload failed', true); },
    });
  }

  deleteAttachment(attachmentId: string) {
    this.taskService.deleteAttachment(attachmentId).subscribe({
      next: () => this.selectedTask.update(t => t ? { ...t, attachments: (t.attachments ?? []).filter(a => a.id !== attachmentId) } : t),
      error: () => this.toast('Failed to delete attachment', true),
    });
  }

  readonly issueTypes = [
    { value: IssueType.Bug,      label: 'Bug',      icon: 'bug_report',   color: 'rose'   },
    { value: IssueType.Feature,  label: 'Feature',  icon: 'auto_awesome', color: 'violet' },
    { value: IssueType.Question, label: 'Question', icon: 'help_outline', color: 'blue'   },
    { value: IssueType.Chore,    label: 'Chore',    icon: 'build',        color: 'amber'  },
  ];

  issueForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    type: [IssueType.Bug],
    priority: [TaskPriority.Medium],
    assigneeId: [null as string | null],
  });
  issueCommentForm = this.fb.group({ content: ['', Validators.required] });
  convertForm = this.fb.group({
    sprintId: [null as string | null],
    priority: [null as TaskPriority | null],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.projectService.getById(id).subscribe(p => { this.project.set(p); this.loading.set(false); });
    this.taskService.getByProject(id).subscribe(t => { this.tasks.set(t); this.filteredTasks.set(t); });
    this.projectService.getSprints(id).subscribe(s => this.sprints.set(s));
    this.userService.getAll().subscribe({ next: u => this.users.set(u), error: () => {} });
    this.loadMembers();
    this.labelService.seed(id).subscribe({
      complete: () => this.labelService.getByProject(id).subscribe(l => this.labels.set(l)),
      error: () => this.labelService.getByProject(id).subscribe(l => this.labels.set(l)),
    });
  }

  loadIssues() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.issuesLoading.set(true);
    this.issueService.getByProject(id).subscribe({
      next: items => { this.issues.set(items); this.issuesLoading.set(false); },
      error: () => this.issuesLoading.set(false),
    });
  }

  switchToIssues() {
    this.activeTab = 'issues';
    if (this.issues().length === 0) this.loadIssues();
  }

  switchToMembers() {
    this.activeTab = 'members';
    if (this.members().length === 0) this.loadMembers();
  }

  // ── Tickets ─────────────────────────────────────
  tickets = signal<Ticket[]>([]);
  ticketsLoading = signal(false);
  selectedTicket = signal<Ticket | null>(null);
  ticketComments = signal<TicketComment[]>([]);
  ticketCommentsLoading = signal(false);
  ticketReply = '';
  ticketReplySending = signal(false);
  ticketFilterStatus: TicketStatus | '' = '';

  switchToTickets() {
    this.activeTab = 'tickets';
    if (this.tickets().length === 0) this.loadTickets();
  }

  loadTickets() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ticketsLoading.set(true);
    this.ticketService.getByProject(id).subscribe({
      next: (t) => { this.tickets.set(t); this.ticketsLoading.set(false); },
      error: () => this.ticketsLoading.set(false),
    });
  }

  openTicket(t: Ticket) {
    this.selectedTicket.set(t);
    this.ticketComments.set([]);
    this.ticketCommentsLoading.set(true);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ticketService.getComments(id, t.id).subscribe({
      next: (c) => { this.ticketComments.set(c); this.ticketCommentsLoading.set(false); },
      error: () => this.ticketCommentsLoading.set(false),
    });
  }

  closeTicket() { this.selectedTicket.set(null); }

  updateTicketStatus(t: Ticket, status: TicketStatus) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ticketService.updateStatus(id, t.id, { status }).subscribe({
      next: (updated) => {
        this.tickets.update((all) => all.map(x => x.id === updated.id ? updated : x));
        this.selectedTicket.set(updated);
      },
    });
  }

  sendTicketReply() {
    if (!this.ticketReply.trim()) return;
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ticketReplySending.set(true);
    this.ticketService.addComment(id, this.selectedTicket()!.id, this.ticketReply).subscribe({
      next: (c) => { this.ticketComments.update(cs => [...cs, c]); this.ticketReply = ''; this.ticketReplySending.set(false); },
      error: () => this.ticketReplySending.set(false),
    });
  }

  convertTicket(t: Ticket) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ticketService.convertToTask(id, t.id).subscribe({
      next: () => { this.toast('Ticket converted to task'); this.loadTickets(); this.closeTicket(); },
      error: () => this.toast('Failed to convert ticket', true),
    });
  }

  ticketStatusLabel(s: TicketStatus) { return TICKET_STATUS_LABELS[s] ?? String(s); }
  ticketTypeLabel(t: TicketType) { return TICKET_TYPE_LABELS[t] ?? String(t); }

  slaLabel(s: SlaStatus): string {
    return s === SlaStatus.Breached ? 'Breached' : s === SlaStatus.AtRisk ? 'At Risk' : 'On Time';
  }

  slaTooltip(t: Ticket): string {
    const due = new Date(t.resolutionDeadlineUtc).toLocaleString();
    if (t.slaStatus === SlaStatus.Breached) return `SLA breached — was due ${due}`;
    if (t.slaStatus === SlaStatus.AtRisk)   return `At risk — ${t.slaHoursRemaining.toFixed(1)}h left, due ${due}`;
    return `On time — ${t.slaHoursRemaining.toFixed(1)}h remaining, due ${due}`;
  }

  filteredTickets() {
    if (this.ticketFilterStatus === '') return this.tickets();
    return this.tickets().filter(t => t.status === this.ticketFilterStatus);
  }

  // ── Invites ─────────────────────────────────────
  invites = signal<Invite[]>([]);
  invitesLoading = signal(false);

  switchToInvites() {
    this.activeTab = 'invites';
    if (this.invites().length === 0) this.loadInvites();
  }

  loadInvites() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.invitesLoading.set(true);
    this.inviteService.getByProject(id).subscribe({
      next: (inv) => { this.invites.set(inv); this.invitesLoading.set(false); },
      error: () => this.invitesLoading.set(false),
    });
  }

  generateInvite() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.inviteService.generate(id).subscribe({
      next: (inv) => { this.invites.update(all => [inv, ...all]); this.toast('Invite link generated'); },
      error: () => this.toast('Failed to generate invite', true),
    });
  }

  revokeInvite(inv: Invite) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.inviteService.revoke(id, inv.id).subscribe({
      next: () => this.invites.update(all => all.filter(i => i.id !== inv.id)),
      error: () => this.toast('Failed to revoke invite', true),
    });
  }

  copyInviteLink(inv: Invite) {
    const url = `${window.location.origin}/join/${inv.token}`;
    navigator.clipboard.writeText(url).then(() => this.toast('Invite link copied to clipboard'));
  }

  loadMembers() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.membersLoading.set(true);
    this.memberService.getByProject(id).subscribe({
      next: m => { this.members.set(m); this.membersLoading.set(false); },
      error: () => this.membersLoading.set(false),
    });
  }

  submitAddMember() {
    if (this.addMemberForm.invalid) return;
    const id = this.route.snapshot.paramMap.get('id')!;
    const { userId, role } = this.addMemberForm.value;
    this.memberService.add(id, userId!, role as ProjectMemberRole).subscribe({
      next: m => {
        this.members.update(all => [...all, m]);
        this.addMemberForm.reset({ userId: '', role: ProjectMemberRole.Member });
        this.showAddMember.set(false);
        this.toast('Member added');
      },
      error: (err) => this.toast(err?.error?.Description ?? 'Failed to add member', true),
    });
  }

  changeMemberRole(member: ProjectMember, role: ProjectMemberRole) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.memberService.updateRole(id, member.userId, role).subscribe({
      next: updated => this.members.update(all => all.map(m => m.id === member.id ? updated : m)),
      error: () => this.toast('Failed to update role', true),
    });
  }

  removeMember(member: ProjectMember) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.memberService.remove(id, member.userId).subscribe({
      next: () => {
        this.members.update(all => all.filter(m => m.id !== member.id));
        this.toast(`${member.fullName} removed`);
      },
      error: () => this.toast('Failed to remove member', true),
    });
  }

  initials(fullName: string): string {
    return fullName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
  }

  roleLabel(role: ProjectMemberRole): string {
    return PROJECT_MEMBER_ROLE_LABELS[role] ?? String(role);
  }


  toggleSprintMenu(id: string) {
    this.openSprintMenuId = this.openSprintMenuId === id ? null : id;
  }

  applyFilters() {
    let result = this.tasks();
    if (this.filterSprintId === 'backlog') result = result.filter(t => !t.sprintId);
    else if (this.filterSprintId) result = result.filter(t => t.sprintId === this.filterSprintId);
    if (this.filterPriority !== null) result = result.filter(t => t.priority === this.filterPriority);
    if (this.filterAssigneeId === 'unassigned') result = result.filter(t => !t.assigneeId);
    else if (this.filterAssigneeId) result = result.filter(t => t.assigneeId === this.filterAssigneeId);
    if (this.filterLabelId) result = result.filter(t => t.labels?.some(l => l.id === this.filterLabelId));
    this.filteredTasks.set(result);
  }

  clearFilters() {
    this.filterSprintId = null; this.filterPriority = null;
    this.filterAssigneeId = null; this.filterLabelId = null;
    this.filteredTasks.set(this.tasks());
  }

  hasActiveFilter(): boolean {
    return this.filterSprintId !== null || this.filterPriority !== null
        || this.filterAssigneeId !== null || this.filterLabelId !== null;
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.filteredTasks().filter(t => t.status === status);
  }

  tasksBySprint(sprintId: string): Task[] { return this.tasks().filter(t => t.sprintId === sprintId); }
  doneTasksBySprint(sprintId: string): number { return this.tasks().filter(t => t.sprintId === sprintId && t.status === TaskStatus.Done).length; }

  onDrop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus) {
    if (event.previousContainer === event.container) return;
    const task: Task = event.item.data;
    const originalStatus = task.status;

    // Optimistically update both signals so the board re-renders immediately
    const apply = (all: Task[]) => all.map(t => t.id === task.id ? { ...t, status: targetStatus } : t);
    this.tasks.update(apply);
    this.filteredTasks.update(apply);

    this.taskService.updateStatus(task.id, { status: targetStatus }).subscribe({
      next: () => this.toast(`Moved to ${this.statusLabel(targetStatus)}`),
      error: () => {
        // Revert both signals on failure
        const revert = (all: Task[]) => all.map(t => t.id === task.id ? { ...t, status: originalStatus } : t);
        this.tasks.update(revert);
        this.filteredTasks.update(revert);
        this.toast('Failed to update task status', true);
      },
    });
  }

  openTask(task: Task) {
    this.selectedTask.set(task);
    this.editMode.set(false);
    this.mentionOpen.set(false);
    this.commentsLoading.set(true);
    this.commentService.getByTask(task.id).subscribe({
      next: c => { this.comments.set(c); this.commentsLoading.set(false); },
      error: () => this.commentsLoading.set(false),
    });
    if (this.members().length === 0) {
      const id = this.route.snapshot.paramMap.get('id')!;
      this.memberService.getByProject(id).subscribe({
        next: m => this.members.set(m),
      });
    }
  }

  closeTask() { this.selectedTask.set(null); this.editMode.set(false); this.comments.set([]); }

  startEdit() {
    const t = this.selectedTask()!;
    this.editTaskForm.patchValue({
      title: t.title, description: t.description ?? '',
      priority: t.priority, storyPoints: t.storyPoints ?? null,
      dueDate: t.dueDate ? t.dueDate.substring(0, 10) : null,
      sprintId: t.sprintId ?? null, assigneeId: t.assigneeId ?? null,
    });
    this.editMode.set(true);
  }

  saveEdit() {
    if (this.editTaskForm.invalid) return;
    const task = this.selectedTask()!;
    const v = this.editTaskForm.value;
    this.taskService.update(task.id, {
      title: v.title!, description: v.description ?? undefined,
      priority: v.priority ?? TaskPriority.Medium,
      dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
      sprintId: v.sprintId ?? undefined, storyPoints: v.storyPoints ?? undefined,
      assigneeId: v.assigneeId ?? undefined,
    } as any).subscribe({
      next: updated => { this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t)); this.selectedTask.set(updated); this.editMode.set(false); this.toast('Task updated'); },
      error: () => this.toast('Failed to update task', true),
    });
  }

  changeStatus(status: TaskStatus) {
    const task = this.selectedTask()!;
    this.taskService.updateStatus(task.id, { status }).subscribe({
      next: updated => { this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t)); this.selectedTask.set(updated); this.toast(`Moved to ${this.statusLabel(status)}`); },
      error: () => this.toast('Failed to update status', true),
    });
  }

  changeAssignee(assigneeId: string | null) {
    const task = this.selectedTask()!;
    this.taskService.update(task.id, {
      title: task.title, description: task.description,
      priority: task.priority, dueDate: task.dueDate,
      sprintId: task.sprintId, storyPoints: task.storyPoints,
      assigneeId: assigneeId ?? undefined,
    } as any).subscribe({
      next: updated => { this.tasks.update(all => all.map(t => t.id === updated.id ? updated : t)); this.selectedTask.set(updated); },
      error: () => this.toast('Failed to update assignee', true),
    });
  }

  addComment() {
    if (this.commentForm.invalid) return;
    this.commentService.create(this.selectedTask()!.id, { content: this.commentForm.value.content! }).subscribe({
      next: c => { this.comments.update(all => [...all, c]); this.commentForm.reset(); },
      error: () => this.toast('Failed to add comment', true),
    });
  }

  onCommentInput(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    const val = ta.value;
    const cursor = ta.selectionStart ?? val.length;

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

  deleteComment(c: Comment) {
    this.commentService.delete(this.selectedTask()!.id, c.id).subscribe({
      next: () => this.comments.update(all => all.filter(x => x.id !== c.id)),
      error: () => this.toast('Failed to delete comment', true),
    });
  }

  confirmDeleteTask(task: Task) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Task', message: `Delete "${task.title}"?`, confirmLabel: 'Delete', danger: true },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.taskService.delete(task.id).subscribe({
        next: () => { this.tasks.update(all => all.filter(t => t.id !== task.id)); this.applyFilters(); this.closeTask(); this.toast('Task deleted'); },
        error: () => this.toast('Failed to delete task', true),
      });
    });
  }

  createTask() {
    if (this.taskForm.invalid) return;
    const projectId = this.route.snapshot.paramMap.get('id')!;
    const v = this.taskForm.value;
    this.taskService.create({
      title: v.title!, description: v.description ?? undefined,
      priority: v.priority ?? TaskPriority.Medium, projectId,
      dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
      storyPoints: v.storyPoints ?? undefined, sprintId: v.sprintId ?? undefined,
      assigneeId: v.assigneeId ?? undefined,
    } as any).subscribe({
      next: t => { this.tasks.update(prev => [...prev, t]); this.applyFilters(); this.showCreateTask.set(false); this.taskForm.reset({ priority: TaskPriority.Medium }); this.toast('Task created'); },
      error: () => this.toast('Failed to create task', true),
    });
  }

  createSprint() {
    if (this.sprintForm.invalid) return;
    const projectId = this.route.snapshot.paramMap.get('id')!;
    const v = this.sprintForm.value;
    this.projectService.createSprint(projectId, {
      name: v.name!, goal: v.goal ?? undefined,
      startDate: new Date(v.startDate!).toISOString(),
      endDate: new Date(v.endDate!).toISOString(),
    } as any).subscribe({
      next: s => { this.sprints.update(prev => [...prev, s]); this.showCreateSprint.set(false); this.sprintForm.reset(); this.toast('Sprint created'); },
      error: () => this.toast('Failed to create sprint', true),
    });
  }

  openEditSprint(s: Sprint) {
    this.editSprintForm.patchValue({ name: s.name, goal: s.goal ?? '', startDate: s.startDate.substring(0, 10), endDate: s.endDate.substring(0, 10) });
    this.editingSprint.set(s);
  }

  saveEditSprint() {
    if (this.editSprintForm.invalid) return;
    const sprint = this.editingSprint()!;
    const v = this.editSprintForm.value;
    this.projectService.updateSprint(sprint.id, {
      name: v.name!, goal: v.goal ?? undefined,
      startDate: new Date(v.startDate!).toISOString(),
      endDate: new Date(v.endDate!).toISOString(),
    } as any).subscribe({
      next: updated => { this.sprints.update(all => all.map(s => s.id === updated.id ? updated : s)); this.editingSprint.set(null); this.toast('Sprint updated'); },
      error: () => this.toast('Failed to update sprint', true),
    });
  }

  activateSprint(s: Sprint) {
    this.projectService.activateSprint(s.id).subscribe({
      next: updated => { this.sprints.update(all => all.map(x => x.id === updated.id ? updated : x)); this.toast('Sprint activated'); },
      error: () => this.toast('Failed to activate sprint', true),
    });
  }

  openCompleteSprint(s: Sprint) {
    this.completingSprintId.set(s.id);
    this.completingSprintRetroNotes = '';
    this.completingSprintTargetId = null;
    this.futureSprints.set([]);

    const projectId = this.project()?.id;
    if (projectId) {
      this.projectService.getFutureSprints(projectId).subscribe({
        next: sprints => this.futureSprints.set(sprints),
      });
    }
  }

  cancelCompleteSprint() {
    this.completingSprintId.set(null);
    this.completingSprintRetroNotes = '';
    this.completingSprintTargetId = null;
    this.futureSprints.set([]);
  }

  confirmCompleteSprint() {
    const id = this.completingSprintId();
    if (!id) return;
    const notes = this.completingSprintRetroNotes.trim() || undefined;
    const targetId = this.completingSprintTargetId;
    const carryCount = this.completingSprintCarryOver();
    const targetName = targetId
      ? (this.futureSprints().find(s => s.id === targetId)?.name ?? 'next sprint')
      : 'backlog';
    this.cancelCompleteSprint();

    this.projectService.completeSprint(id, notes, targetId).subscribe({
      next: updated => {
        this.sprints.update(all => all.map(x => x.id === updated.id ? updated : x));
        const msg = carryCount > 0
          ? `Sprint completed — ${carryCount} task(s) moved to ${targetName}`
          : 'Sprint completed';
        this.toast(msg);
      },
      error: () => this.toast('Failed to complete sprint', true),
    });
  }

  confirmDeleteSprint(s: Sprint) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Sprint', message: `Delete sprint "${s.name}"? Tasks will not be deleted.`, confirmLabel: 'Delete', danger: true },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.projectService.deleteSprint(s.id).subscribe({
        next: () => { this.sprints.update(all => all.filter(x => x.id !== s.id)); this.toast('Sprint deleted'); },
        error: () => this.toast('Failed to delete sprint', true),
      });
    });
  }

  taskId(task: Task): string { return `TASK-${task.taskNumber.toString().padStart(3, '0')}`; }
  doneSubtasks(task: Task): number { return (task.subTasks ?? []).filter(s => s.isCompleted).length; }
  priorityIcon(p: TaskPriority): string {
    return { [TaskPriority.Low]: '↓', [TaskPriority.Medium]: '→', [TaskPriority.High]: '↑', [TaskPriority.Critical]: '⬆' }[p] ?? '→';
  }
  priorityClass(p: TaskPriority): string {
    return { [TaskPriority.Low]: 'low', [TaskPriority.Medium]: 'medium', [TaskPriority.High]: 'high', [TaskPriority.Critical]: 'critical' }[p] ?? 'low';
  }
  priorityLabel(p: TaskPriority): string {
    return { [TaskPriority.Low]: 'Low', [TaskPriority.Medium]: 'Medium', [TaskPriority.High]: 'High', [TaskPriority.Critical]: 'Critical' }[p] ?? '';
  }
  statusLabel(s: TaskStatus): string { return TASK_STATUS_LABELS[s] ?? String(s); }

  projectStatusLabel(s: ProjectStatus): string { return PROJECT_STATUS_LABELS[s] ?? String(s); }

  changeProjectStatus(newStatus: ProjectStatus) {
    const p = this.project();
    if (!p || p.status === newStatus) { this.statusMenuOpen = false; return; }
    const prev = p.status;
    this.project.update(x => x ? { ...x, status: newStatus } : x);
    this.statusMenuOpen = false;
    this.projectService.update(p.id, {
      name: p.name,
      description: p.description,
      status: newStatus,
      startDate: p.startDate,
      endDate: p.endDate,
    }).subscribe({
      error: () => {
        this.project.update(x => x ? { ...x, status: prev } : x);
        this.toast('Failed to update status');
      },
    });
  }
  isOverdue(date: string | null | undefined): boolean { return !!date && new Date(date) < new Date(); }
  assigneeName(userId: string | null | undefined): string {
    if (!userId) return '';
    return this.users().find(x => x.id === userId)?.fullName ?? userId;
  }
  nameInitials(name: string): string {
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  mentionHtml(content: string | null | undefined): string {
    if (!content) return '';
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/@\[([^\]]+)\]\([^)]+\)/g, '<span class="mention-badge">@$1</span>');
  }

  mentionText(content: string | null | undefined): string {
    if (!content) return '';
    return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  }

  // ── Label methods ────────────────────────────────

  labelsNotOnTask(): Label[] {
    const task = this.selectedTask();
    if (!task) return this.labels();
    const taskLabelIds = new Set((task.labels ?? []).map(l => l.id));
    return this.labels().filter(l => !taskLabelIds.has(l.id));
  }

  addLabelToTask(labelId: string) {
    const task = this.selectedTask()!;
    const label = this.labels().find(l => l.id === labelId)!;
    this.labelService.addToTask(labelId, task.id).subscribe({
      next: () => {
        const updated = { ...task, labels: [...(task.labels ?? []), label] };
        this.tasks.update(all => all.map(t => t.id === task.id ? updated : t));
        this.filteredTasks.update(all => all.map(t => t.id === task.id ? updated : t));
        this.selectedTask.set(updated);
        this.showLabelPicker.set(false);
      },
      error: () => this.toast('Failed to add label', true),
    });
  }

  removeLabelFromTask(labelId: string) {
    const task = this.selectedTask()!;
    this.labelService.removeFromTask(labelId, task.id).subscribe({
      next: () => {
        const updated = { ...task, labels: (task.labels ?? []).filter(l => l.id !== labelId) };
        this.tasks.update(all => all.map(t => t.id === task.id ? updated : t));
        this.filteredTasks.update(all => all.map(t => t.id === task.id ? updated : t));
        this.selectedTask.set(updated);
      },
      error: () => this.toast('Failed to remove label', true),
    });
  }

  createLabel() {
    if (this.newLabelForm.invalid) return;
    const projectId = this.route.snapshot.paramMap.get('id')!;
    const v = this.newLabelForm.value;
    this.labelService.create(projectId, v.name!, v.color ?? 'blue').subscribe({
      next: label => {
        this.labels.update(all => [...all, label].sort((a, b) => a.name.localeCompare(b.name)));
        this.newLabelForm.reset({ name: '', color: 'blue' });
        this.toast('Label created');
      },
      error: () => this.toast('Failed to create label', true),
    });
  }

  deleteLabel(label: Label) {
    this.labelService.delete(label.id).subscribe({
      next: () => {
        this.labels.update(all => all.filter(l => l.id !== label.id));
        // Remove from any tasks in the local state
        const strip = (t: Task) => ({ ...t, labels: (t.labels ?? []).filter(l => l.id !== label.id) });
        this.tasks.update(all => all.map(strip));
        this.filteredTasks.update(all => all.map(strip));
        const sel = this.selectedTask();
        if (sel) this.selectedTask.set(strip(sel));
        this.toast('Label deleted');
      },
      error: () => this.toast('Failed to delete label', true),
    });
  }

  // ── Timeline helpers ─────────────────────────────

  private tlRange(): { startMs: number; days: number } {
    const sprints = this.sprints();
    if (sprints.length === 0) {
      const now = Date.now();
      return { startMs: now, days: 30 };
    }
    const startMs = Math.min(...sprints.map(s => new Date(s.startDate).getTime()));
    const endMs   = Math.max(...sprints.map(s => new Date(s.endDate).getTime()));
    // pad 3 days each side for breathing room
    const pad = 3 * 86_400_000;
    return { startMs: startMs - pad, days: Math.ceil((endMs - startMs + pad * 2) / 86_400_000) };
  }

  pct(date: string | Date): number {
    const { startMs, days } = this.tlRange();
    const ts = date instanceof Date ? date.getTime() : new Date(date).getTime();
    return Math.max(0, Math.min(100, (ts - startMs) / (days * 86_400_000) * 100));
  }

  sprintLeft(s: Sprint): number { return this.pct(s.startDate); }

  sprintWidth(s: Sprint): number {
    const { days } = this.tlRange();
    const w = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (days * 86_400_000) * 100;
    return Math.max(0.5, w);
  }

  todayPct(): number { return this.pct(new Date()); }

  timelineMonths(): { label: string; pct: number }[] {
    const { startMs, days } = this.tlRange();
    const endMs = startMs + days * 86_400_000;
    const result: { label: string; pct: number }[] = [];
    const cur = new Date(startMs);
    cur.setDate(1);
    while (cur.getTime() <= endMs) {
      result.push({
        label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        pct: this.pct(cur),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }

  backlogTasksWithDue(): Task[] {
    return this.tasks().filter(t => !t.sprintId && !!t.dueDate);
  }

  // ── Issue methods ────────────────────────────────

  openIssue(issue: Issue) {
    this.selectedIssue.set(issue);
    this.issueCommentsLoading.set(true);
    this.issueService.getComments(issue.id).subscribe({
      next: c => { this.issueComments.set(c); this.issueCommentsLoading.set(false); },
      error: () => this.issueCommentsLoading.set(false),
    });
  }

  closeIssue() {
    this.selectedIssue.set(null);
    this.issueComments.set([]);
    this.issueCommentForm.reset();
  }

  createIssue() {
    if (this.issueForm.invalid) return;
    const projectId = this.route.snapshot.paramMap.get('id')!;
    const v = this.issueForm.value;
    this.issueService.create({
      projectId,
      title: v.title!,
      description: v.description ?? undefined,
      type: v.type ?? IssueType.Bug,
      priority: v.priority ?? TaskPriority.Medium,
      assigneeId: v.assigneeId ?? undefined,
    } as any).subscribe({
      next: issue => {
        this.issues.update(all => [issue, ...all]);
        this.showCreateIssue.set(false);
        this.issueForm.reset({ type: IssueType.Bug, priority: TaskPriority.Medium });
        this.toast('Issue created');
      },
      error: () => this.toast('Failed to create issue', true),
    });
  }

  closeIssueItem(issue: Issue) {
    this.issueService.close(issue.id).subscribe({
      next: updated => {
        this.issues.update(all => all.map(i => i.id === updated.id ? updated : i));
        if (this.selectedIssue()?.id === updated.id) this.selectedIssue.set(updated);
        this.toast('Issue closed');
      },
      error: () => this.toast('Failed to close issue', true),
    });
  }

  reopenIssueItem(issue: Issue) {
    this.issueService.reopen(issue.id).subscribe({
      next: updated => {
        this.issues.update(all => all.map(i => i.id === updated.id ? updated : i));
        if (this.selectedIssue()?.id === updated.id) this.selectedIssue.set(updated);
        this.toast('Issue reopened');
      },
      error: () => this.toast('Failed to reopen issue', true),
    });
  }

  openConvert(issue: Issue) {
    this.convertingIssue.set(issue);
    this.convertForm.reset({ sprintId: null, priority: null });
    this.showConvertDialog.set(true);
  }

  submitConvert() {
    const issue = this.convertingIssue()!;
    const v = this.convertForm.value;
    this.issueService.convertToTask(issue.id, v.sprintId ?? null, v.priority ?? null).subscribe({
      next: () => {
        this.showConvertDialog.set(false);
        this.loadIssues();
        // reload tasks so the new one appears on the board
        const projectId = this.route.snapshot.paramMap.get('id')!;
        this.taskService.getByProject(projectId).subscribe(t => { this.tasks.set(t); this.applyFilters(); });
        if (this.selectedIssue()?.id === issue.id) this.closeIssue();
        this.toast('Issue converted to task');
      },
      error: () => this.toast('Failed to convert issue', true),
    });
  }

  addIssueComment() {
    if (this.issueCommentForm.invalid) return;
    const issue = this.selectedIssue()!;
    this.issueService.addComment(issue.id, this.issueCommentForm.value.content!).subscribe({
      next: c => { this.issueComments.update(all => [...all, c]); this.issueCommentForm.reset(); },
      error: () => this.toast('Failed to add comment', true),
    });
  }

  confirmDeleteIssue(issue: Issue) {
    // Issues don't have a delete endpoint — close them instead
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Close Issue', message: `Close issue #${issue.number} "${issue.title}"?`, confirmLabel: 'Close', danger: false },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.closeIssueItem(issue);
      this.closeIssue();
    });
  }

  // Issue type/status helpers
  issueTypeLabel(type: IssueType): string { return ISSUE_TYPE_LABELS[type] ?? 'Unknown'; }
  issueTypeIcon(type: IssueType): string { return ISSUE_TYPE_ICONS[type] ?? 'help'; }
  issueTypeColor(type: IssueType): string { return ISSUE_TYPE_COLORS[type] ?? 'blue'; }
  issueStatusLabel(status: IssueStatus): string {
    return { Open: 'Open', InProgress: 'In Progress', Closed: 'Closed' }[status] ?? 'Open';
  }
  issueStatusKey(status: IssueStatus): string {
    return { Open: 'open', InProgress: 'inprogress', Closed: 'closed' }[status] ?? 'open';
  }

  private toast(msg: string, isError = false) {
    this.snackBar.open(msg, 'Dismiss', { duration: 3000, panelClass: isError ? ['snack-error'] : ['snack-success'], horizontalPosition: 'right', verticalPosition: 'bottom' });
  }
}
