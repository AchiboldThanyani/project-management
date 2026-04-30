import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UpdatesService } from '@pm/projects/data-access';
import {
  StandupSettings, StandupReport, StandupReportSummary,
} from '@pm/shared/models';

interface SummarySection {
  icon: string;
  colorClass: string;
  title: string;
  items: string[];
}

@Component({
  selector: 'pm-updates-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="updates-toolbar">
      <div class="schedule-wrap">
        <label class="toggle-label">
          <span class="material-icons-round toolbar-icon">event_repeat</span>
          <span class="toggle-text">Schedule</span>
          <input type="checkbox" class="toggle-input" [checked]="isEnabled()"
                 (change)="toggleEnabled($event)" />
          <span class="toggle-pill" [class.on]="isEnabled()">
            {{ isEnabled() ? 'ON' : 'OFF' }}
          </span>
        </label>
        <div *ngIf="isEnabled()" class="time-wrap">
          <span class="material-icons-round time-icon">schedule</span>
          <input type="time" class="time-input"
                 [ngModel]="scheduledTime()" (ngModelChange)="onTimeChange($event)" />
        </div>
      </div>
      <button class="btn-generate" (click)="generate()" [disabled]="generating()">
        <span class="material-icons-round btn-icon">
          {{ generating() ? 'hourglass_top' : 'play_circle' }}
        </span>
        {{ generating() ? 'Generating…' : 'Generate Now' }}
      </button>
    </div>

    <div class="updates-body">
      <div *ngIf="loading()" class="empty-state">
        <span class="material-icons-round spin empty-icon">sync</span>
        <p class="empty-title">Loading reports…</p>
      </div>

      <div *ngIf="!loading() && !latestReport() && !generating()" class="empty-state">
        <span class="material-icons-round empty-icon">group</span>
        <p class="empty-title">No standup reports yet</p>
        <p class="empty-sub">Hit Generate Now to capture today's activity for every team member.</p>
      </div>

      <ng-container *ngIf="latestReport()">
        <div class="section-header-row">
          <div class="section-label-wrap">
            <span class="material-icons-round section-label-icon">today</span>
            <span class="section-label">Latest Report</span>
          </div>
          <span class="report-date">{{ latestReport()!.generatedAt | date:'MMM d, y · h:mm a' }}</span>
          <span class="report-badge" [class.scheduled]="latestReport()!.isScheduled">
            <span class="material-icons-round badge-icon">
              {{ latestReport()!.isScheduled ? 'event_repeat' : 'touch_app' }}
            </span>
            {{ latestReport()!.isScheduled ? 'Scheduled' : 'Manual' }}
          </span>
        </div>
        <div class="member-grid">
          <div *ngFor="let member of latestReport()!.members" class="member-card"
               [class.no-activity]="member.summary === 'No activity recorded.'">
            <div class="member-header">
              <div class="member-avatar">{{ initials(member.name) }}</div>
              <span class="member-name">{{ member.name }}</span>
              <span *ngIf="member.summary === 'No activity recorded.'"
                    class="material-icons-round no-activity-icon" title="No activity">
                hourglass_empty
              </span>
            </div>
            <div class="member-body">
              <ng-container *ngIf="member.summary !== 'No activity recorded.'; else noActivity">
                <div *ngFor="let section of parseSummary(member.summary)" class="summary-section">
                  <div class="sum-header">
                    <span class="material-icons-round sum-icon" [class]="section.colorClass">{{ section.icon }}</span>
                    <span class="sum-title">{{ section.title }}</span>
                  </div>
                  <div class="sum-items">
                    <div *ngFor="let item of section.items" class="sum-item">
                      <span class="item-dot"></span>
                      <span>{{ item }}</span>
                    </div>
                  </div>
                </div>
              </ng-container>
              <ng-template #noActivity>
                <div class="no-activity-row">
                  <span class="material-icons-round">remove_circle_outline</span>
                  No activity recorded
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="history().length > 0" class="history-section">
        <div class="section-header-row" style="margin-bottom:8px">
          <div class="section-label-wrap">
            <span class="material-icons-round section-label-icon">history</span>
            <span class="section-label">History</span>
          </div>
        </div>
        <div *ngFor="let item of history()" class="history-row" (click)="toggleHistory(item.id)">
          <span class="material-icons-round history-cal-icon">calendar_today</span>
          <span class="history-date">{{ item.generatedAt | date:'EEE, MMM d, y' }}</span>
          <span class="history-badge" [class.scheduled]="item.isScheduled">
            <span class="material-icons-round badge-icon">
              {{ item.isScheduled ? 'event_repeat' : 'touch_app' }}
            </span>
            {{ item.isScheduled ? 'Scheduled' : 'Manual' }}
          </span>
          <span class="material-icons-round history-chevron"
                [class.open]="expandedId() === item.id">chevron_right</span>
        </div>
        <div *ngIf="expandedReport()" class="history-expanded">
          <div class="member-grid">
            <div *ngFor="let member of expandedReport()!.members" class="member-card"
                 [class.no-activity]="member.summary === 'No activity recorded.'">
              <div class="member-header">
                <div class="member-avatar">{{ initials(member.name) }}</div>
                <span class="member-name">{{ member.name }}</span>
                <span *ngIf="member.summary === 'No activity recorded.'"
                      class="material-icons-round no-activity-icon">hourglass_empty</span>
              </div>
              <div class="member-body">
                <ng-container *ngIf="member.summary !== 'No activity recorded.'; else noActivityExp">
                  <div *ngFor="let section of parseSummary(member.summary)" class="summary-section">
                    <div class="sum-header">
                      <span class="material-icons-round sum-icon" [class]="section.colorClass">{{ section.icon }}</span>
                      <span class="sum-title">{{ section.title }}</span>
                    </div>
                    <div class="sum-items">
                      <div *ngFor="let item of section.items" class="sum-item">
                        <span class="item-dot"></span>
                        <span>{{ item }}</span>
                      </div>
                    </div>
                  </div>
                </ng-container>
                <ng-template #noActivityExp>
                  <div class="no-activity-row">
                    <span class="material-icons-round">remove_circle_outline</span>
                    No activity recorded
                  </div>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    /* ── Toolbar ── */
    .updates-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; border-bottom: 1px solid var(--border);
      background: var(--white); flex-shrink: 0;
    }
    .schedule-wrap { display: flex; align-items: center; gap: 12px; }
    .toggle-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--ink-4); }
    .toolbar-icon { font-size: 16px; color: var(--muted); }
    .toggle-input { display: none; }
    .toggle-pill {
      padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
      transition: background 0.15s, color 0.15s;
    }
    .toggle-pill.on { background: var(--violet); color: #fff; border-color: var(--violet); }
    .time-wrap { display: flex; align-items: center; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 3px 8px; }
    .time-icon { font-size: 15px; color: var(--muted); }
    .time-input { border: none; background: transparent; font-size: 13px; color: var(--ink); outline: none; }
    .btn-generate {
      display: flex; align-items: center; gap: 6px; padding: 7px 16px;
      background: var(--violet); color: #fff; border: none; border-radius: var(--r-md);
      font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
    }
    .btn-generate:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-generate:not(:disabled):hover { opacity: 0.88; }
    .btn-icon { font-size: 18px; }

    /* ── Body ── */
    .updates-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }

    /* ── Empty / Loading ── */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 10px; color: var(--muted); padding: 48px; }
    .empty-icon { font-size: 44px; color: var(--soft); }
    .empty-title { font-size: 15px; font-weight: 600; color: var(--ink-4); margin: 0; }
    .empty-sub { font-size: 13px; margin: 0; text-align: center; max-width: 280px; }
    .spin { animation: spin 1.2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Section header row ── */
    .section-header-row { display: flex; align-items: center; gap: 10px; }
    .section-label-wrap { display: flex; align-items: center; gap: 6px; flex: 1; }
    .section-label-icon { font-size: 16px; color: var(--violet); }
    .section-label { font-size: 12px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; }
    .report-date { font-size: 12px; color: var(--muted); }
    .report-badge, .history-badge {
      display: flex; align-items: center; gap: 3px;
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
    }
    .report-badge.scheduled, .history-badge.scheduled {
      background: var(--violet-mid); color: var(--violet); border-color: var(--violet);
    }
    .badge-icon { font-size: 12px; }

    /* ── Member grid ── */
    .member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .member-card {
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg);
      overflow: hidden; display: flex; flex-direction: column;
      transition: box-shadow 0.15s;
    }
    .member-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .member-card.no-activity { opacity: 0.5; }

    .member-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .member-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: #fff; font-weight: 700; flex-shrink: 0;
    }
    .member-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--ink); }
    .no-activity-icon { font-size: 16px; color: var(--soft); }

    .member-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; }

    /* ── Summary sections ── */
    .summary-section { display: flex; flex-direction: column; gap: 6px; }
    .sum-header { display: flex; align-items: center; gap: 6px; }
    .sum-icon { font-size: 15px; }
    .sum-icon.green { color: #22c55e; }
    .sum-icon.blue { color: var(--violet); }
    .sum-title { font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.04em; }
    .sum-items { display: flex; flex-direction: column; gap: 4px; padding-left: 21px; }
    .sum-item { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: var(--ink-4); line-height: 1.5; }
    .item-dot {
      width: 4px; height: 4px; border-radius: 50%; background: var(--muted);
      flex-shrink: 0; margin-top: 6px;
    }

    .no-activity-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
    .no-activity-row .material-icons-round { font-size: 15px; }

    /* ── History ── */
    .history-section { display: flex; flex-direction: column; gap: 4px; }
    .history-row {
      display: flex; align-items: center; gap: 10px; padding: 9px 12px;
      border: 1px solid var(--border); border-radius: var(--r-md); cursor: pointer;
      background: var(--white); transition: background 0.12s;
    }
    .history-row:hover { background: var(--surface); }
    .history-cal-icon { font-size: 15px; color: var(--muted); }
    .history-date { font-size: 13px; color: var(--ink); flex: 1; }
    .history-chevron { font-size: 18px; color: var(--muted); transition: transform 0.15s; margin-left: auto; }
    .history-chevron.open { transform: rotate(90deg); }
    .history-expanded { padding: 12px 0 0; }
  `],
})
export class UpdatesTabComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private updatesService = inject(UpdatesService);

  loading = signal(true);
  generating = signal(false);
  isEnabled = signal(false);
  scheduledTime = signal('08:00');
  latestReport = signal<StandupReport | null>(null);
  history = signal<StandupReportSummary[]>([]);
  expandedId = signal<string | null>(null);
  expandedReport = signal<StandupReport | null>(null);

  ngOnInit(): void {
    this.loadSettings();
    this.loadReports();
  }

  private loadSettings(): void {
    this.updatesService.getSettings(this.projectId).subscribe(s => {
      this.isEnabled.set(s.isEnabled);
      this.scheduledTime.set(s.scheduledTime);
    });
  }

  private loadReports(): void {
    this.loading.set(true);
    this.updatesService.getReports(this.projectId).subscribe({
      next: reports => {
        this.history.set(reports.slice(1));
        if (reports.length > 0) {
          this.updatesService.getReport(this.projectId, reports[0].id).subscribe(r => {
            this.latestReport.set(r);
            this.loading.set(false);
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  toggleEnabled(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.isEnabled.set(enabled);
    this.updatesService.updateSettings(this.projectId, {
      isEnabled: enabled, scheduledTime: this.scheduledTime(),
    }).subscribe();
  }

  onTimeChange(time: string): void {
    this.scheduledTime.set(time);
    this.updatesService.updateSettings(this.projectId, {
      isEnabled: this.isEnabled(), scheduledTime: time,
    }).subscribe();
  }

  generate(): void {
    this.generating.set(true);
    this.updatesService.generate(this.projectId).subscribe({
      next: report => {
        this.latestReport.set(report);
        this.history.update(h =>
          [{ id: report.id, generatedAt: report.generatedAt, isScheduled: report.isScheduled }, ...h]
            .slice(0, 29));
        this.generating.set(false);
      },
      error: () => this.generating.set(false),
    });
  }

  toggleHistory(id: string): void {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.expandedReport.set(null);
      return;
    }
    this.expandedId.set(id);
    this.updatesService.getReport(this.projectId, id).subscribe(r => this.expandedReport.set(r));
  }

  parseSummary(summary: string): SummarySection[] {
    const sections: SummarySection[] = [];
    let current: SummarySection | null = null;

    for (const raw of summary.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('✅')) {
        current = { icon: 'schedule', colorClass: 'green', title: 'Time logged', items: [] };
        sections.push(current);
      } else if (line.startsWith('🔄')) {
        current = { icon: 'bolt', colorClass: 'blue', title: 'Activity', items: [] };
        sections.push(current);
      } else if (line.startsWith('•') && current) {
        current.items.push(line.substring(1).trim());
      }
    }

    return sections;
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
