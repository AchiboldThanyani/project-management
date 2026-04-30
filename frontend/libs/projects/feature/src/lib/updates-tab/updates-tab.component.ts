import { Component, Input, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UpdatesService } from '@pm/projects/data-access';
import { UpdatesFeedDay, UpdatesFeedMember } from '@pm/shared/models';

@Component({
  selector: 'pm-updates-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feed-body">
      <div *ngIf="loading()" class="empty-state">
        <span class="material-icons-round spin empty-icon">sync</span>
        <p class="empty-title">Loading activity…</p>
      </div>

      <div *ngIf="!loading() && feed().length === 0" class="empty-state">
        <span class="material-icons-round empty-icon">timeline</span>
        <p class="empty-title">No activity in the last {{ days }} days</p>
        <p class="empty-sub">As the team logs time and updates tasks, their activity will appear here.</p>
      </div>

      <div *ngFor="let day of feed()" class="day-group">
        <div class="day-header">
          <span class="material-icons-round day-icon">calendar_today</span>
          <span class="day-label">{{ dayLabel(day.date) }}</span>
          <span class="day-count">{{ day.members.length }} member{{ day.members.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="member-grid">
          <div *ngFor="let member of day.members" class="member-card">
            <div class="member-header">
              <div class="member-avatar">{{ initials(member.name) }}</div>
              <span class="member-name">{{ member.name }}</span>
            </div>
            <div class="member-body">

              <div *ngIf="member.timeLogs.length > 0" class="section">
                <div class="section-head">
                  <span class="material-icons-round sec-icon green">schedule</span>
                  <span class="sec-label">Time logged</span>
                  <span class="sec-total">{{ totalHours(member) }}h total</span>
                </div>
                <div class="items">
                  <div *ngFor="let log of member.timeLogs" class="item">
                    <span class="item-dot"></span>
                    <span class="item-text">
                      {{ log.taskTitle }}
                      <span class="item-meta">{{ log.hours }}h</span>
                      <span *ngIf="log.description" class="item-desc"> — {{ log.description }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div *ngIf="member.activity.length > 0" class="section">
                <div class="section-head">
                  <span class="material-icons-round sec-icon blue">bolt</span>
                  <span class="sec-label">Activity</span>
                </div>
                <div class="items">
                  <div *ngFor="let a of member.activity" class="item">
                    <span class="item-dot"></span>
                    <span class="item-text">
                      <span class="item-action">{{ a.action }}</span> {{ a.entityType }}: {{ a.entityName }}
                      <span class="item-time">{{ a.createdAt | date:'h:mm a' }}</span>
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .feed-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 28px; }

    /* ── Empty / Loading ── */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 10px; color: var(--muted); padding: 48px; }
    .empty-icon { font-size: 44px; color: var(--soft); }
    .empty-title { font-size: 15px; font-weight: 600; color: var(--ink-4); margin: 0; }
    .empty-sub { font-size: 13px; margin: 0; text-align: center; max-width: 300px; line-height: 1.5; }
    .spin { animation: spin 1.2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Day group ── */
    .day-group { display: flex; flex-direction: column; gap: 12px; }
    .day-header { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .day-icon { font-size: 15px; color: var(--violet); }
    .day-label { font-size: 13px; font-weight: 700; color: var(--ink); flex: 1; }
    .day-count { font-size: 11px; color: var(--muted); background: var(--surface); border: 1px solid var(--border); border-radius: 99px; padding: 2px 8px; }

    /* ── Member grid ── */
    .member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .member-card {
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg);
      overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 0.15s;
    }
    .member-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }

    .member-header {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid var(--border); background: var(--surface);
    }
    .member-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--violet-mid); color: var(--violet);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700;
    }
    .member-name { font-size: 13px; font-weight: 600; color: var(--ink); }

    .member-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 10px; }

    /* ── Sections ── */
    .section { display: flex; flex-direction: column; gap: 5px; }
    .section-head { display: flex; align-items: center; gap: 5px; }
    .sec-icon { font-size: 14px; }
    .sec-icon.green { color: #22c55e; }
    .sec-icon.blue { color: var(--violet); }
    .sec-label { font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.04em; flex: 1; }
    .sec-total { font-size: 11px; font-weight: 600; color: var(--violet); }

    .items { display: flex; flex-direction: column; gap: 4px; padding-left: 19px; }
    .item { display: flex; align-items: flex-start; gap: 6px; }
    .item-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--muted); flex-shrink: 0; margin-top: 6px; }
    .item-text { font-size: 12px; color: var(--ink-4); line-height: 1.5; }
    .item-meta { font-weight: 600; color: var(--ink); margin-left: 4px; }
    .item-desc { color: var(--muted); }
    .item-action { font-weight: 600; color: var(--ink); text-transform: capitalize; }
    .item-time { color: var(--muted); margin-left: 4px; font-size: 11px; }
  `],
})
export class UpdatesTabComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  readonly days = 14;
  private updatesService = inject(UpdatesService);

  loading = signal(true);
  feed = signal<UpdatesFeedDay[]>([]);

  ngOnInit(): void {
    this.updatesService.getFeed(this.projectId, this.days).subscribe({
      next: data => { this.feed.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  dayLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  totalHours(member: UpdatesFeedMember): number {
    return Math.round(member.timeLogs.reduce((s, l) => s + l.hours, 0) * 10) / 10;
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
