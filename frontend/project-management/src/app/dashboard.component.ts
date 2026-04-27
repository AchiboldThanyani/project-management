import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ProjectService } from '@pm/projects/data-access';
import { TeamService } from '@pm/teams/data-access';
import { TaskService } from '@pm/tasks/data-access';
import { AuthService } from '@pm/auth/data-access';
import { ActivityService } from '@pm/shared/util';
import { Project, Activity, Task, Sprint, TaskStatus } from '@pm/shared/models';

interface EnrichedTask extends Task { projectName: string; }
interface EnrichedSprint extends Sprint { projectName: string; }
interface SprintProgress { id: string; name: string; projectName: string; done: number; total: number; endDate: string; }
interface VelocityBar { name: string; done: number; pct: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-wrap">

      <!-- Topbar -->
      <div class="topbar">
        <div class="topbar-title">Dashboard</div>
        <div class="topbar-right">
          <div class="search-bar">
            <span class="material-icons-round">search</span>
            <span>Search projects, tasks…</span>
          </div>
          <a class="add-btn" routerLink="/projects">
            <span class="material-icons-round">add</span> New Project
          </a>
        </div>
      </div>

      <!-- Content -->
      <div class="content">
        <div class="dash-greeting">
          <h1>Welcome back, {{ auth.user()?.firstName }}!</h1>
          <p>{{ today }} · Here's your project overview</p>
        </div>

        <!-- Stat cards -->
        <div class="stat-grid">
          <div class="stat-card violet" routerLink="/projects">
            <div class="sc-top">
              <div class="sc-ico violet"><span class="material-icons-round">folder</span></div>
            </div>
            <div class="sc-num">{{ projectCount() }}</div>
            <div class="sc-lbl">Projects</div>
            <div class="sc-link violet">View all <span class="material-icons-round">arrow_forward</span></div>
          </div>

          <div class="stat-card teal" routerLink="/sprint-board">
            <div class="sc-top">
              <div class="sc-ico teal"><span class="material-icons-round">view_kanban</span></div>
            </div>
            <div class="sc-num">{{ activeSprintCount() }}</div>
            <div class="sc-lbl">Active Sprints</div>
            <div class="sc-link teal">Sprint Board <span class="material-icons-round">arrow_forward</span></div>
          </div>

          <div class="stat-card amber" routerLink="/teams">
            <div class="sc-top">
              <div class="sc-ico amber"><span class="material-icons-round">group</span></div>
            </div>
            <div class="sc-num">{{ teamCount() }}</div>
            <div class="sc-lbl">Teams</div>
            <div class="sc-link amber">View all <span class="material-icons-round">arrow_forward</span></div>
          </div>

          <div class="stat-card rose">
            <div class="sc-top">
              <div class="sc-ico rose"><span class="material-icons-round">assignment</span></div>
            </div>
            <div class="sc-num">{{ openTaskCount() }}</div>
            <div class="sc-lbl">Open Tasks</div>
            <div class="sc-link rose">View tasks <span class="material-icons-round">arrow_forward</span></div>
          </div>

          <div class="stat-card emerald">
            <div class="sc-top">
              <div class="sc-ico emerald"><span class="material-icons-round">check_circle</span></div>
            </div>
            <div class="sc-num">{{ doneTaskCount() }}</div>
            <div class="sc-lbl">Completed</div>
            <div class="sc-link emerald">See history <span class="material-icons-round">arrow_forward</span></div>
          </div>
        </div>

        <!-- ── Widgets row ── -->
        <div class="widgets-row">

          <!-- At-Risk Tasks -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <span class="material-icons-round widget-ico rose">warning_amber</span>
                <span class="widget-title">At-Risk Tasks</span>
                <span class="widget-count rose" *ngIf="atRiskTasks().length > 0">{{ atRiskTasks().length }}</span>
              </div>
            </div>
            <div *ngIf="atRiskTasks().length === 0" class="widget-empty">No at-risk tasks right now</div>
            <div class="risk-list" *ngIf="atRiskTasks().length > 0">
              <div class="risk-row" *ngFor="let t of atRiskTasks()">
                <div class="risk-left">
                  <span class="risk-status-dot" [class.blocked]="t.status === TaskStatus.Blocked" [class.overdue]="isOverdue(t) && t.status !== TaskStatus.Blocked"></span>
                  <div>
                    <div class="risk-title">{{ t.title }}</div>
                    <div class="risk-meta">{{ t.projectName }}</div>
                  </div>
                </div>
                <div class="risk-right">
                  <span class="risk-chip blocked" *ngIf="t.status === TaskStatus.Blocked">Blocked</span>
                  <span class="risk-chip overdue" *ngIf="isOverdue(t) && t.status !== TaskStatus.Blocked">{{ daysOverdue(t.dueDate!) }}d overdue</span>
                  <span class="risk-assignee" *ngIf="t.assigneeName">{{ initials(t.assigneeName) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sprint Progress -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <span class="material-icons-round widget-ico teal">sprint</span>
                <span class="widget-title">Active Sprints</span>
              </div>
            </div>
            <div *ngIf="sprintProgress().length === 0" class="widget-empty">No active sprints</div>
            <div class="sprint-prog-list" *ngIf="sprintProgress().length > 0">
              <div class="sprint-prog-row" *ngFor="let s of sprintProgress()">
                <div class="sp-header">
                  <div>
                    <div class="sp-name">{{ s.name }}</div>
                    <div class="sp-project">{{ s.projectName }}</div>
                  </div>
                  <div class="sp-stats">
                    <span class="sp-fraction">{{ s.done }}/{{ s.total }}</span>
                    <span class="sp-days" [class.urgent]="sprintDaysLeft(s.endDate) <= 2">{{ sprintDaysLeft(s.endDate) }}d left</span>
                  </div>
                </div>
                <div class="sp-bar-track">
                  <div class="sp-bar-fill" [style.width.%]="s.total > 0 ? (s.done / s.total * 100) : 0"></div>
                </div>
                <div class="sp-pct">{{ s.total > 0 ? (s.done / s.total * 100 | number:'1.0-0') : 0 }}% complete</div>
              </div>
            </div>
          </div>

          <!-- Velocity -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <span class="material-icons-round widget-ico violet">trending_up</span>
                <span class="widget-title">Sprint Velocity</span>
                <span class="widget-sub">Last {{ velocityBars().length }} sprints</span>
              </div>
            </div>
            <div *ngIf="velocityBars().length === 0" class="widget-empty">No completed sprints yet</div>
            <div class="velocity-chart" *ngIf="velocityBars().length > 0">
              <div class="vel-bars">
                <div class="vel-bar-col" *ngFor="let b of velocityBars()">
                  <div class="vel-bar-wrap">
                    <span class="vel-count">{{ b.done }}</span>
                    <div class="vel-bar" [style.height.%]="b.pct"></div>
                  </div>
                  <div class="vel-label" [title]="b.name">{{ b.name | slice:0:8 }}</div>
                </div>
              </div>
              <div class="vel-axis-label">tasks completed per sprint</div>
            </div>
          </div>

        </div>

        <!-- Lower two-col -->
        <div class="dash-cols">

          <!-- Recent projects -->
          <div *ngIf="recentProjects().length > 0">
            <div class="sec-hdr">
              <div class="sec-title">Recent Projects</div>
              <a class="see-all" routerLink="/projects">See all <span class="material-icons-round">arrow_forward</span></a>
            </div>
            <div class="project-list">
              <div class="proj-card" *ngFor="let p of recentProjects()" [routerLink]="['/projects', p.id]">
                <div class="proj-color" [style.background]="projectColor(p.id)">
                  {{ p.name[0]?.toUpperCase() }}
                </div>
                <div>
                  <div class="proj-name">{{ p.name }}</div>
                  <div class="proj-desc">{{ p.description || 'No description' }}</div>
                </div>
                <div class="proj-meta">
                  <span class="ph-badge" [class]="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Activity feed -->
          <div>
            <div class="sec-hdr">
              <div class="sec-title">Recent Activity</div>
              <a class="see-all" routerLink="/activity">See all <span class="material-icons-round">arrow_forward</span></a>
            </div>
            <div class="act-card">
              <div *ngIf="activityLoading()" class="act-loading">
                <div class="spinner"></div>
              </div>
              <div *ngIf="!activityLoading() && recentActivity().length === 0" class="act-empty">
                No activity yet
              </div>
              <div class="activity-list" *ngIf="!activityLoading() && recentActivity().length > 0">
                <div class="act-item" *ngFor="let item of recentActivity()">
                  <div class="act-ava" [style.background]="avatarColor(item.userName)">
                    {{ initials(item.userName) }}
                  </div>
                  <div class="act-text">
                    <strong>{{ item.userName.split(' ')[0] }}</strong>
                    {{ item.action }}
                    <span class="act-chip">{{ item.entityName }}</span>
                  </div>
                  <div class="act-time" [title]="item.createdAt | date:'medium'">{{ timeAgo(item.createdAt) }}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    /* Topbar */
    .topbar {
      background: var(--white); border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0; gap: 12px;
    }
    .topbar-title { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
    .topbar-right { display: flex; align-items: center; gap: 8px; }
    .search-bar {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 13px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--r-full);
      width: 220px; cursor: text;
    }
    .search-bar .material-icons-round { font-size: 15px; color: var(--soft); }
    .search-bar span { font-size: 12px; color: var(--soft); }
    .add-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--r-full);
      background: var(--violet); color: #fff;
      text-decoration: none; font-size: 13px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(102,68,221,0.3);
      transition: background 0.15s, transform 0.1s;
    }
    .add-btn:hover { background: var(--violet-2); transform: translateY(-1px); }
    .add-btn .material-icons-round { font-size: 16px; }

    /* Content */
    .content { flex: 1; overflow-y: auto; padding: 22px 24px; }

    .dash-greeting { margin-bottom: 20px; }
    .dash-greeting h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; margin: 0 0 3px; }
    .dash-greeting p  { font-size: 13px; color: var(--muted); margin: 0; }

    /* Stat grid */
    .stat-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 22px; }

    .stat-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 16px;
      cursor: pointer; transition: box-shadow 0.15s, transform 0.15s;
    }
    .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

    .sc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .sc-ico { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
    .sc-ico .material-icons-round { font-size: 17px; }
    .sc-ico.violet  { background: var(--violet-c);  } .sc-ico.violet  .material-icons-round { color: var(--violet); }
    .sc-ico.teal    { background: var(--teal-c);    } .sc-ico.teal    .material-icons-round { color: var(--teal); }
    .sc-ico.amber   { background: var(--amber-c);   } .sc-ico.amber   .material-icons-round { color: var(--amber); }
    .sc-ico.rose    { background: var(--rose-c);    } .sc-ico.rose    .material-icons-round { color: var(--rose); }
    .sc-ico.emerald { background: var(--emerald-c); } .sc-ico.emerald .material-icons-round { color: var(--emerald); }

    .sc-num { font-size: 28px; font-weight: 700; letter-spacing: -1px; line-height: 1; margin-bottom: 3px; }
    .sc-lbl { font-size: 11px; color: var(--muted); font-weight: 500; }
    .sc-link { font-size: 11px; font-weight: 600; margin-top: 8px; display: flex; align-items: center; gap: 3px; cursor: pointer; }
    .sc-link.violet  { color: var(--violet); }
    .sc-link.teal    { color: var(--teal); }
    .sc-link.amber   { color: var(--amber); }
    .sc-link.rose    { color: var(--rose); }
    .sc-link.emerald { color: var(--emerald); }
    .sc-link .material-icons-round { font-size: 13px; }

    /* Two-col */
    .dash-cols { display: grid; grid-template-columns: 1fr 380px; gap: 16px; }
    @media (max-width: 900px) { .dash-cols { grid-template-columns: 1fr; } }

    .sec-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .sec-title { font-size: 14px; font-weight: 700; letter-spacing: -0.2px; }
    .see-all { font-size: 12px; font-weight: 600; color: var(--violet); text-decoration: none; display: flex; align-items: center; gap: 3px; }
    .see-all .material-icons-round { font-size: 14px; }

    /* Project list */
    .project-list { display: flex; flex-direction: column; gap: 8px; }
    .proj-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
      text-decoration: none; color: inherit;
    }
    .proj-card:hover { box-shadow: var(--shadow-sm); border-color: #d8d8e8; }
    .proj-color {
      width: 36px; height: 36px; border-radius: 9px;
      background: var(--violet-c); color: var(--violet);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; flex-shrink: 0;
    }
    .proj-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .proj-desc { font-size: 11px; color: var(--muted); }
    .proj-meta { margin-left: auto; }

    /* Activity */
    .act-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 14px 16px; }
    .act-loading { display: flex; justify-content: center; padding: 20px 0; }
    .act-empty { color: var(--soft); font-size: 12px; padding: 16px 0; }
    .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--violet); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .activity-list { display: flex; flex-direction: column; }
    .act-item { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
    .act-item:last-child { border-bottom: none; }
    .act-ava { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .act-text { flex: 1; font-size: 12px; color: var(--ink-4); line-height: 1.5; }
    .act-text strong { color: var(--ink); font-weight: 600; }
    .act-chip { display: inline-flex; padding: 1px 7px; border-radius: var(--r-full); font-size: 10px; font-weight: 600; background: var(--violet-c); color: var(--violet); margin-left: 3px; }
    .act-time { font-size: 10px; color: var(--soft); white-space: nowrap; flex-shrink: 0; margin-top: 2px; }

    /* ── Widgets row ────────────────────────────── */
    .widgets-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 22px; }
    @media (max-width: 1100px) { .widgets-row { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 700px)  { .widgets-row { grid-template-columns: 1fr; } }

    .widget-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      min-height: 180px;
    }
    .widget-hdr { flex-shrink: 0; }
    .widget-title-row { display: flex; align-items: center; gap: 8px; }
    .widget-ico { font-size: 18px; }
    .widget-ico.rose   { color: var(--rose); }
    .widget-ico.teal   { color: var(--teal); }
    .widget-ico.violet { color: var(--violet); }
    .widget-title { font-size: 13px; font-weight: 700; color: var(--ink); flex: 1; }
    .widget-sub   { font-size: 11px; color: var(--soft); }
    .widget-count { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: var(--r-full); }
    .widget-count.rose { background: var(--rose-c); color: var(--rose); }
    .widget-empty { font-size: 12px; color: var(--soft); text-align: center; padding: 20px 0; flex: 1; display: flex; align-items: center; justify-content: center; }

    /* At-risk */
    .risk-list { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; max-height: 220px; }
    .risk-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 10px; border-radius: var(--r-md); background: var(--surface); }
    .risk-left { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .risk-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--soft); }
    .risk-status-dot.blocked { background: var(--rose); }
    .risk-status-dot.overdue { background: var(--amber); }
    .risk-title { font-size: 12px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
    .risk-meta  { font-size: 10px; color: var(--soft); }
    .risk-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .risk-chip { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: var(--r-full); }
    .risk-chip.blocked { background: var(--rose-c); color: var(--rose); }
    .risk-chip.overdue { background: var(--amber-c); color: var(--amber); }
    .risk-assignee { width: 22px; height: 22px; border-radius: 50%; background: var(--violet-c); color: var(--violet); font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

    /* Sprint progress */
    .sprint-prog-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; max-height: 220px; }
    .sprint-prog-row { display: flex; flex-direction: column; gap: 5px; }
    .sp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .sp-name { font-size: 12px; font-weight: 600; color: var(--ink); }
    .sp-project { font-size: 10px; color: var(--soft); }
    .sp-stats { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .sp-fraction { font-size: 11px; font-weight: 700; color: var(--ink); }
    .sp-days { font-size: 10px; color: var(--teal); font-weight: 600; }
    .sp-days.urgent { color: var(--rose); }
    .sp-bar-track { height: 6px; background: var(--surface); border-radius: var(--r-full); overflow: hidden; }
    .sp-bar-fill  { height: 100%; background: var(--teal); border-radius: var(--r-full); transition: width 0.4s ease; }
    .sp-pct { font-size: 10px; color: var(--soft); }

    /* Velocity chart */
    .velocity-chart { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .vel-bars { display: flex; align-items: flex-end; gap: 8px; height: 130px; padding: 4px 0 0; }
    .vel-bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; height: 100%; }
    .vel-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; width: 100%; }
    .vel-count { font-size: 10px; font-weight: 700; color: var(--violet); }
    .vel-bar { width: 100%; max-width: 32px; background: linear-gradient(180deg, var(--violet) 0%, #818cf8 100%); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.4s ease; }
    .vel-label { font-size: 9px; color: var(--soft); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    .vel-axis-label { font-size: 10px; color: var(--soft); text-align: center; }
  `],
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private projectService = inject(ProjectService);
  private teamService = inject(TeamService);
  private taskService = inject(TaskService);
  private activityService = inject(ActivityService);

  projectCount      = signal(0);
  teamCount         = signal(0);
  openTaskCount     = signal(0);
  doneTaskCount     = signal(0);
  activeSprintCount = signal(0);
  recentProjects    = signal<Project[]>([]);
  recentActivity    = signal<Activity[]>([]);
  activityLoading   = signal(true);
  allTasks          = signal<EnrichedTask[]>([]);
  allSprints        = signal<EnrichedSprint[]>([]);

  readonly today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  readonly TaskStatus = TaskStatus;

  private readonly COLORS = ['#ede9ff','#e0faf7','#fef3c7','#dbeafe','#d1fae5','#ffe4e6'];
  private readonly STATUS_CLASSES = ['planning','active','on-hold','completed','archived'];
  private readonly STATUS_LABELS  = ['Planning','Active','On Hold','Completed','Archived'];

  // ── Widget computed signals ────────────────────────
  atRiskTasks = computed<EnrichedTask[]>(() => {
    const now = new Date();
    return this.allTasks().filter(t =>
      t.status === TaskStatus.Blocked ||
      (t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.Done && t.status !== TaskStatus.Cancelled)
    ).slice(0, 8);
  });

  sprintProgress = computed<SprintProgress[]>(() => {
    const taskMap = new Map<string, EnrichedTask[]>();
    for (const t of this.allTasks()) {
      if (t.sprintId) {
        if (!taskMap.has(t.sprintId)) taskMap.set(t.sprintId, []);
        taskMap.get(t.sprintId)!.push(t);
      }
    }
    return this.allSprints()
      .filter(s => s.isActive)
      .map(s => {
        const tasks = taskMap.get(s.id) ?? [];
        return { id: s.id, name: s.name, projectName: s.projectName, endDate: s.endDate, done: tasks.filter(t => t.status === TaskStatus.Done).length, total: tasks.length };
      });
  });

  velocityBars = computed<VelocityBar[]>(() => {
    const taskMap = new Map<string, EnrichedTask[]>();
    for (const t of this.allTasks()) {
      if (t.sprintId) {
        if (!taskMap.has(t.sprintId)) taskMap.set(t.sprintId, []);
        taskMap.get(t.sprintId)!.push(t);
      }
    }
    const bars = this.allSprints()
      .filter(s => s.isCompleted)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(-6)
      .map(s => ({ name: s.name, done: (taskMap.get(s.id) ?? []).filter(t => t.status === TaskStatus.Done).length }));
    const max = Math.max(...bars.map(b => b.done), 1);
    return bars.map(b => ({ ...b, pct: Math.round((b.done / max) * 100) }));
  });

  ngOnInit() {
    this.projectService.getAll().subscribe(projects => {
      this.projectCount.set(projects.length);
      this.recentProjects.set(projects.slice(0, 5));
      if (projects.length === 0) return;

      forkJoin(projects.map(p =>
        this.taskService.getByProject(p.id).pipe(map(tasks => tasks.map(t => ({ ...t, projectName: p.name }))))
      )).subscribe(byProject => {
        const all = byProject.flat();
        this.allTasks.set(all);
        this.openTaskCount.set(all.filter(t => t.status !== TaskStatus.Done && t.status !== TaskStatus.Cancelled).length);
        this.doneTaskCount.set(all.filter(t => t.status === TaskStatus.Done).length);
      });

      forkJoin(projects.map(p =>
        this.projectService.getSprints(p.id).pipe(map(sprints => sprints.map(s => ({ ...s, projectName: p.name }))))
      )).subscribe(byProject => {
        const all = byProject.flat();
        this.allSprints.set(all);
        this.activeSprintCount.set(all.filter(s => s.isActive).length);
      });
    });

    this.teamService.getMyTeams().subscribe(t => this.teamCount.set(t.length));
    this.activityService.getRecent(8).subscribe({
      next: items => { this.recentActivity.set(items); this.activityLoading.set(false); },
      error: () => this.activityLoading.set(false),
    });
  }

  projectColor(id: string): string { return this.COLORS[id.charCodeAt(0) % this.COLORS.length]; }
  statusClass(status: number): string { return this.STATUS_CLASSES[status] ?? 'planning'; }
  statusLabel(status: number): string { return this.STATUS_LABELS[status] ?? 'Planning'; }

  initials(name: string): string {
    return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = ['#6644dd','#00b8a0','#f59e0b','#3b82f6','#10b981','#f43f5e'];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }

  timeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  isOverdue(t: EnrichedTask): boolean {
    return !!(t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.Done && t.status !== TaskStatus.Cancelled);
  }

  daysOverdue(dueDate: string): number {
    return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
  }

  sprintDaysLeft(endDate: string): number {
    return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
  }
}
