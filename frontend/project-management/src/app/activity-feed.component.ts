import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '@pm/shared/util';
import { Activity } from '@pm/shared/models';

interface ActivityGroup {
  label: string;
  items: Activity[];
}

const ENTITY_ICONS: Record<string, string> = {
  Task: 'assignment', Project: 'folder', Sprint: 'sprint',
  Team: 'group', Comment: 'comment',
};

const AVATAR_COLORS = [
  'var(--violet)', 'var(--teal)', 'var(--emerald)',
  'var(--amber)', 'var(--rose)', 'var(--blue)',
];

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feed-page">

      <div class="topbar">
        <h1 class="page-title">Activity Feed</h1>
        <p class="page-sub">Recent actions across all your projects</p>
      </div>

      <div *ngIf="loading()" class="loading-wrap">
        <div class="spinner"></div>
      </div>

      <div *ngIf="!loading() && groups().length === 0" class="empty-state">
        <span class="material-icons-round empty-ico">history</span>
        <p>No activity yet. Start by creating a project or task.</p>
      </div>

      <div *ngIf="!loading() && groups().length > 0" class="feed">
        <div *ngFor="let group of groups()" class="day-group">
          <div class="day-label">{{ group.label }}</div>
          <div class="activity-list">
            <div *ngFor="let item of group.items" class="activity-item">

              <div class="avatar" [style.background]="avatarColor(item.userName)">
                {{ initials(item.userName) }}
              </div>

              <div class="activity-body">
                <span class="user-name">{{ item.userName }}</span>
                <span class="action-text"> {{ item.action }} </span>
                <span class="entity-chip" [class]="'chip-' + item.entityType.toLowerCase()">
                  <span class="material-icons-round chip-ico">{{ entityIcon(item.entityType) }}</span>
                  {{ item.entityName }}
                </span>
              </div>

              <div class="time-ago" [title]="item.createdAt | date:'medium'">
                {{ timeAgo(item.createdAt) }}
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .feed-page {
      padding: 28px 32px;
      max-width: 780px;
      display: flex; flex-direction: column; gap: 24px;
    }

    .page-title { margin: 0 0 2px; font-size: 20px; font-weight: 700; color: var(--ink); }
    .page-sub   { margin: 0; font-size: 13px; color: var(--muted); }

    /* Loading */
    .loading-wrap { display: flex; justify-content: center; padding: 64px; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--violet);
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 80px 0; color: var(--soft);
    }
    .empty-ico { font-size: 48px; opacity: 0.4; }

    /* Feed */
    .feed { display: flex; flex-direction: column; gap: 28px; }

    .day-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.6px; color: var(--soft);
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 4px;
    }

    .activity-list { display: flex; flex-direction: column; }

    .activity-item {
      display: flex; align-items: center; gap: 12px;
      padding: 9px 12px; border-radius: var(--r-md);
      transition: background 0.12s;
    }
    .activity-item:hover { background: var(--surface); }

    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }

    .activity-body {
      flex: 1; font-size: 13px; line-height: 1.4;
      display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
    }
    .user-name  { font-weight: 700; color: var(--ink); }
    .action-text { color: var(--muted); }

    .entity-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: var(--r-full);
      font-size: 11px; font-weight: 600;
      background: var(--surface); color: var(--muted);
      border: 1px solid var(--border);
    }
    .chip-ico { font-size: 11px; }

    /* Per-entity colors */
    .chip-task    { background: var(--blue-c);    color: var(--blue);    border-color: var(--blue-c); }
    .chip-project { background: var(--violet-c);  color: var(--violet);  border-color: var(--violet-c); }
    .chip-sprint  { background: var(--emerald-c); color: var(--emerald); border-color: var(--emerald-c); }
    .chip-team    { background: var(--amber-c);   color: var(--amber);   border-color: var(--amber-c); }
    .chip-comment { background: var(--teal-c);    color: var(--teal);    border-color: var(--teal-c); }

    .time-ago {
      font-size: 11px; color: var(--soft);
      white-space: nowrap; flex-shrink: 0; cursor: default;
    }
  `],
})
export class ActivityFeedComponent implements OnInit {
  private activityService = inject(ActivityService);

  loading = signal(true);
  private activities = signal<Activity[]>([]);
  groups = computed<ActivityGroup[]>(() => this.groupByDate(this.activities()));

  ngOnInit() {
    this.activityService.getRecent(100).subscribe({
      next: (items) => { this.activities.set(items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private groupByDate(activities: Activity[]): ActivityGroup[] {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const groups = new Map<string, Activity[]>();
    for (const a of activities) {
      const d = new Date(a.createdAt); d.setHours(0, 0, 0, 0);
      let label: string;
      if (d.getTime() === today.getTime()) label = 'Today';
      else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
      else label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(a);
    }
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  }

  avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  entityIcon(t: string): string { return ENTITY_ICONS[t] ?? 'circle'; }

  timeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
