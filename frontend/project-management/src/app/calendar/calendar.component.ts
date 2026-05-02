import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarService } from './calendar.service';

interface CalendarStats { tasks: number; sprints: number; overdue: number; }

@Component({
  selector: 'pm-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  template: `
    <div class="cal-page">

      <!-- ─── Page Header ─── -->
      <div class="cal-header">
        <div class="cal-title-block">
          <span class="cal-icon material-icons-round">calendar_month</span>
          <div>
            <h1 class="cal-title">Calendar</h1>
            <p class="cal-subtitle">Tasks, sprints & deadlines in one view</p>
          </div>
        </div>

        <div class="cal-stats">
          <div class="stat-pill stat-tasks">
            <span class="material-icons-round">task_alt</span>
            <span class="stat-value">{{ stats().tasks }}</span>
            <span class="stat-label">tasks</span>
          </div>
          <div class="stat-pill stat-sprints">
            <span class="material-icons-round">sprint</span>
            <span class="stat-value">{{ stats().sprints }}</span>
            <span class="stat-label">sprints</span>
          </div>
          @if (stats().overdue > 0) {
            <div class="stat-pill stat-overdue">
              <span class="material-icons-round">warning_amber</span>
              <span class="stat-value">{{ stats().overdue }}</span>
              <span class="stat-label">overdue</span>
            </div>
          }
        </div>
      </div>

      <!-- ─── Legend ─── -->
      <div class="cal-legend">
        <span class="legend-label">Priority</span>
        <div class="legend-pills">
          <span class="legend-pill" style="--c:#ef4444">
            <span class="legend-dot"></span>Critical
          </span>
          <span class="legend-pill" style="--c:#f97316">
            <span class="legend-dot"></span>High
          </span>
          <span class="legend-pill" style="--c:#3b82f6">
            <span class="legend-dot"></span>Medium
          </span>
          <span class="legend-pill" style="--c:#22c55e">
            <span class="legend-dot"></span>Low
          </span>
        </div>
        <span class="legend-divider"></span>
        <span class="legend-pill" style="--c:#6366f1">
          <span class="legend-dot"></span>Sprint
        </span>
      </div>

      <!-- ─── Calendar Card ─── -->
      <div class="cal-card" [class.is-loading]="loading()">
        @if (loading()) {
          <div class="shimmer-overlay">
            <div class="shimmer-row shimmer-toolbar"></div>
            <div class="shimmer-grid">
              @for (cell of shimmerCells; track $index) {
                <div class="shimmer-cell"></div>
              }
            </div>
          </div>
        }
        <full-calendar [options]="calendarOptions" />
      </div>

    </div>
  `,
  styles: [`
    /* ─── Page ─── */
    .cal-page {
      padding: 28px 32px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 18px;
      background: var(--page);
      overflow-y: auto;
      animation: fadeUp 0.3s ease both;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ─── Header ─── */
    .cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .cal-title-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .cal-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--r-lg);
      background: var(--violet-mid);
      color: var(--violet);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }
    .cal-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--ink);
      margin: 0;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .cal-subtitle {
      font-size: 12px;
      color: var(--muted);
      margin: 2px 0 0;
      font-weight: 400;
    }

    /* ─── Stats ─── */
    .cal-stats {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .stat-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px 6px 10px;
      border-radius: var(--r-full);
      font-size: 12px;
      font-weight: 600;
      border: 1px solid transparent;
      transition: transform 0.15s;
    }
    .stat-pill .material-icons-round { font-size: 15px; }
    .stat-pill .stat-value { font-size: 14px; font-weight: 700; }
    .stat-pill .stat-label { font-weight: 500; opacity: 0.75; }
    .stat-tasks   { background: var(--blue-c);    color: var(--blue);    border-color: rgba(59,130,246,0.2); }
    .stat-sprints { background: var(--violet-c);  color: var(--violet);  border-color: rgba(58,138,69,0.2); }
    .stat-overdue { background: var(--rose-c);    color: var(--rose);    border-color: rgba(244,63,94,0.2); }

    /* ─── Legend ─── */
    .cal-legend {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .legend-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
    }
    .legend-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .legend-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px 3px 7px;
      border-radius: var(--r-full);
      font-size: 11px;
      font-weight: 500;
      color: var(--c, #888);
      background: color-mix(in srgb, var(--c, #888) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--c, #888) 20%, transparent);
    }
    .legend-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--c, #888);
      flex-shrink: 0;
    }
    .legend-divider {
      width: 1px;
      height: 16px;
      background: var(--border);
    }

    /* ─── Calendar Card ─── */
    .cal-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-xl);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
      flex: 1;
      min-height: 500px;
      transition: opacity 0.2s;
    }
    .cal-card.is-loading { opacity: 0.5; pointer-events: none; }

    /* ─── Shimmer Loader ─── */
    .shimmer-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      padding: 20px;
      background: var(--white);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position: 600px 0; }
    }
    .shimmer-row, .shimmer-cell {
      background: linear-gradient(
        90deg,
        var(--surface) 25%,
        var(--border) 50%,
        var(--surface) 75%
      );
      background-size: 600px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: var(--r-md);
    }
    .shimmer-toolbar { height: 36px; width: 60%; }
    .shimmer-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(6, 1fr);
      gap: 4px;
    }
    .shimmer-cell { border-radius: var(--r-sm); }

    /* ─── FullCalendar Overrides ─── */
    :host ::ng-deep {

      /* Remove all default borders/backgrounds */
      .fc { font-family: 'DM Sans', sans-serif; height: 100%; }
      .fc-scrollgrid { border: none !important; }
      .fc-scrollgrid td, .fc-scrollgrid th { border-color: var(--border) !important; }
      .fc-col-header-cell { border: none !important; }

      /* Toolbar */
      .fc-toolbar { margin-bottom: 16px !important; }
      .fc-toolbar-title {
        font-size: 17px !important;
        font-weight: 700 !important;
        color: var(--ink) !important;
        letter-spacing: -0.3px;
      }
      .fc-button {
        background: var(--surface) !important;
        border: 1px solid var(--border) !important;
        color: var(--ink-3) !important;
        border-radius: var(--r-md) !important;
        font-family: 'DM Sans', sans-serif !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        padding: 5px 12px !important;
        box-shadow: none !important;
        transition: background 0.15s, color 0.15s !important;
      }
      .fc-button:hover {
        background: var(--border) !important;
        color: var(--ink) !important;
      }
      .fc-button-active, .fc-button:focus {
        background: var(--violet-mid) !important;
        color: var(--violet) !important;
        border-color: rgba(58,138,69,0.25) !important;
        outline: none !important;
        box-shadow: none !important;
      }
      .fc-button-group .fc-button { border-radius: 0 !important; }
      .fc-button-group .fc-button:first-child { border-radius: var(--r-md) 0 0 var(--r-md) !important; }
      .fc-button-group .fc-button:last-child  { border-radius: 0 var(--r-md) var(--r-md) 0 !important; }

      /* Column headers */
      .fc-col-header-cell-cushion {
        font-size: 10px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        color: var(--muted) !important;
        text-decoration: none !important;
        padding: 8px 4px !important;
      }

      /* Day cells */
      .fc-daygrid-day {
        background: transparent !important;
        transition: background 0.1s;
      }
      .fc-daygrid-day:hover { background: var(--surface) !important; }
      .fc-daygrid-day-number {
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--ink-4) !important;
        text-decoration: none !important;
        padding: 6px 8px !important;
      }

      /* Today */
      .fc-day-today {
        background: color-mix(in srgb, var(--violet) 6%, transparent) !important;
      }
      .fc-day-today .fc-daygrid-day-number {
        color: var(--violet) !important;
        background: var(--violet-mid);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 !important;
        margin: 4px;
        font-weight: 700 !important;
      }

      /* Other month days */
      .fc-day-other .fc-daygrid-day-number { color: var(--soft) !important; }
      .fc-day-other { background: color-mix(in srgb, var(--ink) 2%, transparent) !important; }

      /* Events */
      .fc-event {
        border: none !important;
        border-radius: 5px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        font-family: 'DM Sans', sans-serif !important;
        padding: 2px 6px !important;
        cursor: pointer !important;
        transition: filter 0.15s, transform 0.15s !important;
        margin: 1px 2px !important;
      }
      .fc-event:hover {
        filter: brightness(1.1) !important;
        transform: translateY(-1px) !important;
      }
      .fc-event-title { font-weight: 600 !important; }
      .fc-event.completed {
        opacity: 0.45 !important;
        text-decoration: line-through !important;
      }

      /* All-day sprint events — thinner band */
      .fc-daygrid-block-event .fc-event-main {
        padding: 2px 6px !important;
      }

      /* More link */
      .fc-daygrid-more-link {
        font-size: 10px !important;
        font-weight: 700 !important;
        color: var(--muted) !important;
      }

      /* List view */
      .fc-list { border: none !important; border-radius: var(--r-lg) !important; }
      .fc-list-day-cushion { background: var(--surface) !important; }
      .fc-list-day-text, .fc-list-day-side-text {
        font-size: 12px !important;
        font-weight: 700 !important;
        color: var(--ink) !important;
        text-decoration: none !important;
      }
      .fc-list-event:hover td { background: var(--surface) !important; }
      .fc-list-event-title a {
        color: var(--ink) !important;
        text-decoration: none !important;
        font-size: 12px !important;
        font-weight: 500 !important;
      }
      .fc-list-event-dot { border-radius: 50% !important; }
      .fc-list-empty { color: var(--muted) !important; font-size: 13px !important; }

      /* ─── More-events popover ─── */
      .fc-popover {
        background: var(--white) !important;
        border: 1px solid var(--border) !important;
        border-radius: var(--r-lg) !important;
        box-shadow: var(--shadow-lg) !important;
        overflow: hidden !important;
        min-width: 200px !important;
        animation: popoverIn 0.15s ease both !important;
      }
      @keyframes popoverIn {
        from { opacity: 0; transform: scale(0.96) translateY(-4px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .fc-popover-header {
        background: var(--surface) !important;
        border-bottom: 1px solid var(--border) !important;
        padding: 10px 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .fc-popover-title {
        font-size: 12px !important;
        font-weight: 700 !important;
        color: var(--ink) !important;
        font-family: 'DM Sans', sans-serif !important;
        letter-spacing: -0.1px !important;
      }
      .fc-popover-close {
        color: var(--muted) !important;
        font-size: 16px !important;
        opacity: 1 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        transition: color 0.15s !important;
        background: none !important;
        border: none !important;
        padding: 0 !important;
      }
      .fc-popover-close:hover { color: var(--ink) !important; }
      .fc-popover-body {
        padding: 8px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        max-height: 260px !important;
        overflow-y: auto !important;
      }
      .fc-popover-body .fc-event {
        margin: 0 !important;
        border-radius: var(--r-sm) !important;
      }
      .fc-popover-body .sprint-event { display: none !important; }

      /* Table borders */
      .fc-theme-standard td, .fc-theme-standard th {
        border-color: var(--border) !important;
      }
      .fc-theme-standard .fc-scrollgrid { border-color: var(--border) !important; }
    }
  `],
})
export class CalendarComponent {
  private readonly calSvc = inject(CalendarService);

  readonly loading = signal(false);
  readonly stats = signal<CalendarStats>({ tasks: 0, sprints: 0, overdue: 0 });
  readonly shimmerCells = Array(42);

  readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listWeek',
    },
    dayMaxEvents: 3,
    events: (info, successCallback, failureCallback) => {
      this.loadEvents(info.startStr, info.endStr, successCallback, failureCallback);
    },
    eventDidMount: (info) => {
      const props = info.event.extendedProps as {
        isCompleted?: boolean;
        type?: string;
        priority?: string;
        projectName?: string;
      };
      if (props.isCompleted) info.el.classList.add('completed');
      info.el.setAttribute(
        'title',
        props.type === 'Sprint'
          ? `Sprint | ${props.projectName}`
          : `${props.priority} priority | ${props.projectName}`
      );
    },
  };

  private loadEvents(
    start: string,
    end: string,
    success: (events: object[]) => void,
    failure: (err: Error) => void
  ): void {
    this.loading.set(true);
    this.calSvc.getEvents(start, end).subscribe({
      next: (events) => {
        const now = new Date().toISOString();
        this.stats.set({
          tasks:   events.filter((e) => e.type === 'Task').length,
          sprints: events.filter((e) => e.type === 'Sprint').length,
          overdue: events.filter((e) => e.type === 'Task' && !e.isCompleted && e.end < now).length,
        });
        const mapped = events.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          backgroundColor: e.color,
          borderColor: e.color,
          allDay: e.type === 'Sprint',
          classNames: e.type === 'Sprint' ? ['sprint-event'] : ['task-event'],
          extendedProps: {
            type: e.type,
            projectName: e.projectName,
            priority: e.priority,
            isCompleted: e.isCompleted,
          },
        }));
        this.loading.set(false);
        success(mapped);
      },
      error: (err) => {
        this.loading.set(false);
        failure(err instanceof Error ? err : new Error(String(err)));
      },
    });
  }
}
