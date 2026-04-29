import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UpdatesService } from '@pm/projects/data-access';
import {
  StandupSettings, StandupReport, StandupReportSummary,
} from '@pm/shared/models';

@Component({
  selector: 'pm-updates-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="updates-toolbar">
      <div class="schedule-wrap">
        <label class="toggle-label">
          <span class="toggle-text">Schedule</span>
          <input type="checkbox" class="toggle-input" [checked]="isEnabled()"
                 (change)="toggleEnabled($event)" />
          <span class="toggle-pill" [class.on]="isEnabled()">
            {{ isEnabled() ? 'ON' : 'OFF' }}
          </span>
        </label>
        <input *ngIf="isEnabled()" type="time" class="time-input"
               [ngModel]="scheduledTime()" (ngModelChange)="onTimeChange($event)" />
      </div>
      <button class="btn-primary btn-sm" (click)="generate()" [disabled]="generating()">
        <span class="material-icons-round" style="font-size:14px">
          {{ generating() ? 'hourglass_empty' : 'play_arrow' }}
        </span>
        {{ generating() ? 'Generating…' : 'Generate Now' }}
      </button>
    </div>

    <div class="updates-body">
      <div *ngIf="loading()" class="empty-state">
        <span class="material-icons-round spin">sync</span>
        <p>Loading…</p>
      </div>

      <div *ngIf="!loading() && !latestReport() && !generating()" class="empty-state">
        <span class="material-icons-round" style="font-size:40px; color:var(--soft)">update</span>
        <p class="empty-title">No updates generated yet</p>
        <p class="empty-sub">Click Generate to create the first standup summary.</p>
      </div>

      <div *ngIf="latestReport()" class="report-section">
        <div class="report-meta">
          <span class="report-date">Latest · {{ latestReport()!.generatedAt | date:'MMM d, y · h:mm a' }}</span>
          <span class="report-badge" [class.scheduled]="latestReport()!.isScheduled">
            {{ latestReport()!.isScheduled ? 'Scheduled' : 'Manual' }}
          </span>
        </div>
        <div class="member-grid">
          <div *ngFor="let member of latestReport()!.members" class="member-card"
               [class.no-activity]="member.summary === 'No activity recorded.'">
            <div class="member-name">
              <div class="member-avatar">{{ initials(member.name) }}</div>
              {{ member.name }}
            </div>
            <pre class="member-summary">{{ member.summary }}</pre>
          </div>
        </div>
      </div>

      <div *ngIf="history().length > 0" class="history-section">
        <div class="history-label">History</div>
        <div *ngFor="let item of history()" class="history-row" (click)="toggleHistory(item.id)">
          <span class="history-date">{{ item.generatedAt | date:'MMM d, y' }}</span>
          <span class="history-badge" [class.scheduled]="item.isScheduled">
            {{ item.isScheduled ? 'Scheduled' : 'Manual' }}
          </span>
          <span class="material-icons-round history-chevron"
                [class.open]="expandedId() === item.id">chevron_right</span>
        </div>
        <div *ngIf="expandedReport()" class="history-expanded">
          <div class="member-grid">
            <div *ngFor="let member of expandedReport()!.members" class="member-card"
                 [class.no-activity]="member.summary === 'No activity recorded.'">
              <div class="member-name">
                <div class="member-avatar">{{ initials(member.name) }}</div>
                {{ member.name }}
              </div>
              <pre class="member-summary">{{ member.summary }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .updates-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; border-bottom: 1px solid var(--border);
      background: var(--white); flex-shrink: 0;
    }
    .schedule-wrap { display: flex; align-items: center; gap: 12px; }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--ink-4); }
    .toggle-input { display: none; }
    .toggle-pill {
      padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
      transition: background 0.15s;
    }
    .toggle-pill.on { background: var(--violet); color: #fff; border-color: var(--violet); }
    .time-input {
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 4px 8px; font-size: 13px; background: var(--surface); color: var(--ink);
    }

    .updates-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 24px; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; color: var(--muted); padding: 48px; }
    .empty-title { font-size: 15px; font-weight: 600; color: var(--ink-4); margin: 0; }
    .empty-sub { font-size: 13px; margin: 0; }
    .spin { animation: spin 1.2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .report-section { display: flex; flex-direction: column; gap: 12px; }
    .report-meta { display: flex; align-items: center; gap: 10px; }
    .report-date { font-size: 13px; font-weight: 600; color: var(--ink); }
    .report-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
    }
    .report-badge.scheduled { background: var(--violet-mid); color: var(--violet); border-color: var(--violet); }

    .member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .member-card {
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg);
      padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
    }
    .member-card.no-activity { opacity: 0.55; }
    .member-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
    .member-avatar {
      width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center; font-size: 10px;
      color: #fff; font-weight: 700; flex-shrink: 0;
    }
    .member-summary { font-size: 12px; line-height: 1.6; color: var(--ink-4); white-space: pre-wrap; margin: 0; font-family: inherit; }

    .history-section { display: flex; flex-direction: column; gap: 4px; }
    .history-label { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px; }
    .history-row {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px;
      border: 1px solid var(--border); border-radius: var(--r-md); cursor: pointer;
      background: var(--white);
    }
    .history-row:hover { background: var(--surface); }
    .history-date { font-size: 13px; color: var(--ink); flex: 1; }
    .history-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: var(--surface); color: var(--muted); border: 1px solid var(--border);
    }
    .history-badge.scheduled { background: var(--violet-mid); color: var(--violet); border-color: var(--violet); }
    .history-chevron { font-size: 18px; color: var(--muted); transition: transform 0.15s; }
    .history-chevron.open { transform: rotate(90deg); }
    .history-expanded { padding: 12px 0; }

    .btn-sm { padding: 6px 14px; border-radius: var(--r-md); font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; border: none; }
    .btn-primary { background: var(--violet); color: #fff; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
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

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
