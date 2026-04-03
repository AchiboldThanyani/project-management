import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ProjectService } from '@pm/projects/data-access';
import { TeamService } from '@pm/teams/data-access';
import { TaskService } from '@pm/tasks/data-access';
import { AuthService } from '@pm/auth/data-access';
import { ActivityService } from '@pm/shared/util';
import { Project, Activity, TaskStatus } from '@pm/shared/models';

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
      position: relative; overflow: hidden;
    }
    .stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      border-radius: var(--r-lg) var(--r-lg) 0 0;
    }
    .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .stat-card.violet::before { background: var(--violet); }
    .stat-card.teal::before   { background: var(--teal); }
    .stat-card.amber::before  { background: var(--amber); }
    .stat-card.rose::before   { background: var(--rose); }
    .stat-card.emerald::before{ background: var(--emerald); }

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
  `],
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private projectService = inject(ProjectService);
  private teamService = inject(TeamService);
  private taskService = inject(TaskService);
  private activityService = inject(ActivityService);

  projectCount    = signal(0);
  teamCount       = signal(0);
  openTaskCount   = signal(0);
  doneTaskCount   = signal(0);
  activeSprintCount = signal(0);
  recentProjects  = signal<Project[]>([]);
  recentActivity  = signal<Activity[]>([]);
  activityLoading = signal(true);

  readonly today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  private readonly COLORS = ['#ede9ff','#e0faf7','#fef3c7','#dbeafe','#d1fae5','#ffe4e6'];
  private readonly TEXT   = ['#6644dd','#00b8a0','#f59e0b','#3b82f6','#10b981','#f43f5e'];

  private readonly STATUS_CLASSES = ['planning','active','on-hold','completed','archived'];
  private readonly STATUS_LABELS  = ['Planning','Active','On Hold','Completed','Archived'];

  ngOnInit() {
    this.projectService.getAll().subscribe(projects => {
      this.projectCount.set(projects.length);
      this.recentProjects.set(projects.slice(0, 5));

      projects.forEach(p => {
        this.taskService.getByProject(p.id).subscribe(tasks => {
          this.openTaskCount.update(n => n + tasks.filter(t => t.status !== TaskStatus.Done && t.status !== TaskStatus.Cancelled).length);
          this.doneTaskCount.update(n => n + tasks.filter(t => t.status === TaskStatus.Done).length);
        });
      });

      if (projects.length > 0) {
        forkJoin(projects.map(p =>
          this.projectService.getSprints(p.id).pipe(map(s => s.filter(x => x.isActive).length))
        )).subscribe(counts => this.activeSprintCount.set(counts.reduce((a, b) => a + b, 0)));
      }
    });

    this.teamService.getMyTeams().subscribe(t => this.teamCount.set(t.length));

    this.activityService.getRecent(8).subscribe({
      next: items => { this.recentActivity.set(items); this.activityLoading.set(false); },
      error: () => this.activityLoading.set(false),
    });
  }

  projectColor(id: string): string {
    const i = id.charCodeAt(0) % this.COLORS.length;
    return this.COLORS[i];
  }

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
}
