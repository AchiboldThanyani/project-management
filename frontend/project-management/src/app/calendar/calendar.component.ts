import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarService } from './calendar.service';

@Component({
  selector: 'pm-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  template: `
    <div class="cal-page">
      <div class="cal-header">
        <h1 class="cal-title">Calendar</h1>
        <div class="cal-legend">
          <span class="legend-item"><span class="dot" style="background:#ef4444"></span> Critical</span>
          <span class="legend-item"><span class="dot" style="background:#f97316"></span> High</span>
          <span class="legend-item"><span class="dot" style="background:#3b82f6"></span> Medium</span>
          <span class="legend-item"><span class="dot" style="background:#22c55e"></span> Low</span>
          <span class="legend-item"><span class="dot" style="background:#6366f1"></span> Sprint</span>
        </div>
      </div>

      @if (loading()) {
        <div class="cal-loading">Loading events...</div>
      }

      <full-calendar [options]="calendarOptions" />
    </div>
  `,
  styles: [`
    .cal-page {
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .cal-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary, #fff);
      margin: 0;
    }
    .cal-legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary, rgba(255,255,255,0.55));
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .cal-loading {
      font-size: 13px;
      color: var(--text-secondary, rgba(255,255,255,0.45));
    }
    :host ::ng-deep .fc {
      flex: 1;
      font-family: inherit;
    }
    :host ::ng-deep .fc-toolbar-title {
      font-size: 16px;
      font-weight: 600;
    }
    :host ::ng-deep .fc-event {
      border: none;
      border-radius: 4px;
      font-size: 11px;
      padding: 1px 4px;
      cursor: pointer;
    }
    :host ::ng-deep .fc-event.completed {
      opacity: 0.45;
      text-decoration: line-through;
    }
  `],
})
export class CalendarComponent {
  private readonly calSvc = inject(CalendarService);

  readonly loading = signal(false);

  readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listWeek',
    },
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
      if (props.isCompleted) {
        info.el.classList.add('completed');
      }
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
        const mapped = events.map((e) => ({
          id: e.id,
          title: e.type === 'Sprint' ? `[Sprint] ${e.title}` : e.title,
          start: e.start,
          end: e.end,
          backgroundColor: e.color,
          borderColor: e.color,
          allDay: e.type === 'Sprint',
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
