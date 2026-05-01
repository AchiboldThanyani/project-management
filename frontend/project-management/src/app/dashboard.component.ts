import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ProjectService } from '@pm/projects/data-access';
import { TeamService } from '@pm/teams/data-access';
import { TaskService } from '@pm/tasks/data-access';
import { AuthService } from '@pm/auth/data-access';
import { Task, Sprint, TaskStatus, TaskPriority } from '@pm/shared/models';

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
          <h1>{{ greeting }}, {{ auth.user()?.firstName }}!</h1>
          <p>{{ today }} · Here's your project overview</p>
        </div>

        <!-- Stat cards -->
        <div class="stat-grid">
          <div class="stat-card" routerLink="/projects">
            <div class="stat-ico violet"><span class="material-icons-round">folder</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ projectCount() }}</span>
              <span class="stat-lbl">Projects</span>
            </div>
            <span class="material-icons-round stat-arrow violet">arrow_forward</span>
          </div>

          <div class="stat-card" routerLink="/sprint-board">
            <div class="stat-ico teal"><span class="material-icons-round">view_kanban</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ activeSprintCount() }}</span>
              <span class="stat-lbl">Active Sprints</span>
            </div>
            <span class="material-icons-round stat-arrow teal">arrow_forward</span>
          </div>

          <div class="stat-card" routerLink="/teams">
            <div class="stat-ico amber"><span class="material-icons-round">group</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ teamCount() }}</span>
              <span class="stat-lbl">Teams</span>
            </div>
            <span class="material-icons-round stat-arrow amber">arrow_forward</span>
          </div>

          <div class="stat-card">
            <div class="stat-ico rose"><span class="material-icons-round">assignment</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ openTaskCount() }}</span>
              <span class="stat-lbl">Open Tasks</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-ico emerald"><span class="material-icons-round">check_circle</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ doneTaskCount() }}</span>
              <span class="stat-lbl">Completed</span>
            </div>
          </div>
        </div>

        <!-- ── Widgets row ── -->
        <div class="widgets-row">

          <!-- My Tasks -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <div class="widget-ico-wrap blue"><span class="material-icons-round">task_alt</span></div>
                <span class="widget-title">My Tasks</span>
                <span class="widget-count blue" *ngIf="myTasks().length > 0">{{ myTasks().length }}</span>
              </div>
            </div>
            <div class="widget-body">
              <div *ngIf="myTasks().length === 0" class="widget-empty">No tasks assigned to you</div>
              <div class="my-task-list" *ngIf="myTasks().length > 0">
                <div class="my-task-row" *ngFor="let t of myTasks()">
                  <span class="task-prio-dot prio-{{ t.priority.toLowerCase() }}"></span>
                  <div class="my-task-info">
                    <div class="my-task-title">{{ t.title }}</div>
                    <div class="my-task-meta">{{ t.projectName }}</div>
                  </div>
                  <span *ngIf="t.dueDate" class="my-task-due" [class.overdue]="isOverdue(t)">
                    {{ t.dueDate | date:'MMM d' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- At-Risk Tasks -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <div class="widget-ico-wrap rose"><span class="material-icons-round">warning_amber</span></div>
                <span class="widget-title">At-Risk Tasks</span>
                <span class="widget-count rose" *ngIf="atRiskTasks().length > 0">{{ atRiskTasks().length }}</span>
              </div>
            </div>
            <div class="widget-body">
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
          </div>

          <!-- Sprint Progress -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <div class="widget-ico-wrap teal"><span class="material-icons-round">sprint</span></div>
                <span class="widget-title">Active Sprints</span>
              </div>
            </div>
            <div class="widget-body">
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
          </div>

          <!-- Velocity -->
          <div class="widget-card">
            <div class="widget-hdr">
              <div class="widget-title-row">
                <div class="widget-ico-wrap violet"><span class="material-icons-round">trending_up</span></div>
                <span class="widget-title">Sprint Velocity</span>
                <span class="widget-sub">Last {{ velocityBars().length }} sprints</span>
              </div>
            </div>
            <div class="widget-body">
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

        </div>

      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

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
      display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: box-shadow 0.15s, transform 0.15s;
    }
    .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

    .stat-ico {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-ico .material-icons-round { font-size: 20px; }
    .stat-ico.violet  { background: var(--violet-mid); color: var(--violet); }
    .stat-ico.teal    { background: var(--teal-c);     color: var(--teal); }
    .stat-ico.amber   { background: var(--amber-c);    color: var(--amber); }
    .stat-ico.rose    { background: var(--rose-c);     color: var(--rose); }
    .stat-ico.emerald { background: var(--emerald-c);  color: var(--emerald); }

    .stat-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .stat-num  { font-size: 24px; font-weight: 700; color: var(--ink); line-height: 1; letter-spacing: -0.5px; }
    .stat-lbl  { font-size: 10px; font-weight: 600; color: var(--soft); text-transform: uppercase; letter-spacing: .06em; }

    .stat-arrow { font-size: 16px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
    .stat-card:hover .stat-arrow { opacity: 1; }
    .stat-arrow.violet  { color: var(--violet); }
    .stat-arrow.teal    { color: var(--teal); }
    .stat-arrow.amber   { color: var(--amber); }


    /* ── Widgets row ────────────────────────────── */
    .widgets-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
    @media (max-width: 700px) { .widgets-row { grid-template-columns: 1fr; } }

    .widget-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); overflow: hidden;
      display: flex; flex-direction: column;
      min-height: 200px; transition: box-shadow 0.15s;
    }
    .widget-card:hover { box-shadow: var(--shadow-md); }

    .widget-hdr {
      padding: 14px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .widget-body { padding: 12px 16px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

    .widget-title-row { display: flex; align-items: center; gap: 10px; }
    .widget-ico-wrap {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .widget-ico-wrap .material-icons-round { font-size: 16px; }
    .widget-ico-wrap.rose   { background: var(--rose-c);    color: var(--rose); }
    .widget-ico-wrap.teal   { background: var(--teal-c);    color: var(--teal); }
    .widget-ico-wrap.violet { background: var(--violet-mid); color: var(--violet); }
    .widget-ico-wrap.blue   { background: var(--blue-c);    color: var(--blue); }

    .widget-title { font-size: 13px; font-weight: 700; color: var(--ink); flex: 1; }
    .widget-sub   { font-size: 11px; color: var(--soft); }
    .widget-count { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: var(--r-full); }
    .widget-count.rose { background: var(--rose-c); color: var(--rose); }
    .widget-count.blue { background: var(--blue-c); color: var(--blue); }
    .widget-empty { font-size: 12px; color: var(--soft); text-align: center; padding: 20px 0; flex: 1; display: flex; align-items: center; justify-content: center; }

    /* My Tasks */
    .my-task-list { display: flex; flex-direction: column; gap: 2px; }
    .my-task-row {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 10px; border-radius: var(--r-md);
      transition: background 0.12s;
    }
    .my-task-row:hover { background: var(--surface); }
    .task-prio-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .prio-low      { background: var(--emerald); }
    .prio-medium   { background: var(--amber); }
    .prio-high     { background: var(--rose); }
    .prio-critical { background: var(--rose); box-shadow: 0 0 0 2px var(--rose-c); }
    .my-task-info  { flex: 1; min-width: 0; }
    .my-task-title { font-size: 12px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .my-task-meta  { font-size: 10px; color: var(--soft); }
    .my-task-due   { font-size: 10px; font-weight: 600; color: var(--soft); flex-shrink: 0; }
    .my-task-due.overdue { color: var(--rose); }

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
    .vel-bar { width: 100%; max-width: 32px; background: linear-gradient(180deg, var(--violet) 0%, var(--violet-2) 100%); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.4s ease; }
    .vel-label { font-size: 9px; color: var(--soft); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    .vel-axis-label { font-size: 10px; color: var(--soft); text-align: center; }
  `],
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private projectService = inject(ProjectService);
  private teamService = inject(TeamService);
  private taskService = inject(TaskService);

  projectCount      = signal(0);
  teamCount         = signal(0);
  openTaskCount     = signal(0);
  doneTaskCount     = signal(0);
  activeSprintCount = signal(0);
  allTasks          = signal<EnrichedTask[]>([]);
  allSprints        = signal<EnrichedSprint[]>([]);

  readonly today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  readonly TaskStatus = TaskStatus;
  readonly greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();

  myTasks = computed<EnrichedTask[]>(() => {
    const me = this.auth.user()?.userId;
    if (!me) return [];
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return this.allTasks()
      .filter(t => t.assigneeId === me && t.status !== TaskStatus.Done && t.status !== TaskStatus.Cancelled)
      .sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2))
      .slice(0, 8);
  });

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
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();
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
