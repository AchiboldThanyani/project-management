import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '@pm/tasks/data-access';
import { Project, Ticket, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, TicketStatus } from '@pm/shared/models';

const PRIORITY_LABELS: Record<number, string> = { 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical' };
const PRIORITY_CLASSES: Record<number, string> = { 0: 'p-low', 1: 'p-med', 2: 'p-high', 3: 'p-crit' };

@Component({
  selector: 'app-portal-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-wrap">
      <div class="topbar">
        <div class="topbar-title">My Tickets</div>
        <div class="topbar-controls">
          <select class="filter-select" [(ngModel)]="selectedProjectId" (ngModelChange)="load()">
            <option value="">All Projects</option>
            @for (p of projects(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
          <a routerLink="/portal/tickets/new" class="add-btn">
            <span class="material-icons-round">add</span> New Ticket
          </a>
        </div>
      </div>
      <div class="content">
        @if (loading()) {
          <div class="empty-state"><div class="spinner"></div></div>
        } @else if (tickets().length === 0) {
          <div class="empty-state">
            <span class="material-icons-round" style="font-size:48px;color:var(--muted)">confirmation_number</span>
            <p>No tickets yet. <a routerLink="/portal/tickets/new">Submit your first one.</a></p>
          </div>
        } @else {
          <div class="ticket-list">
            @for (t of tickets(); track t.id) {
              <a class="ticket-row" [routerLink]="['/portal/tickets', t.id]">
                <span class="ticket-num">#{{ t.number }}</span>
                <div class="ticket-info">
                  <div class="ticket-subject">{{ t.subject }}</div>
                  <div class="ticket-meta">
                    <span class="badge-type">{{ typeLabel(t.type) }}</span>
                    <span class="meta-sep">·</span>
                    <span [class]="'priority-badge ' + priorityClass(t.priority)">{{ priorityLabel(t.priority) }}</span>
                    <span class="meta-sep">·</span>
                    <span>{{ t.createdAt | date:'mediumDate' }}</span>
                  </div>
                </div>
                <span class="status-badge" [class]="'status-' + t.status">{{ statusLabel(t.status) }}</span>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { padding: 0; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid var(--border); }
    .topbar-title { font-size: 18px; font-weight: 600; color: var(--ink); }
    .topbar-controls { display: flex; align-items: center; gap: 10px; }
    .filter-select {
      border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px;
      font-size: 13px; color: var(--ink); background: var(--white); outline: none;
    }
    .filter-select:focus { border-color: var(--violet); }
    .add-btn { display: flex; align-items: center; gap: 6px; background: var(--violet); color: #fff; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; }
    .content { padding: 24px 28px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--muted); }
    .ticket-list { display: flex; flex-direction: column; gap: 10px; }
    .ticket-row {
      display: flex; align-items: center; gap: 16px; padding: 16px 20px;
      background: var(--white); border: 1px solid var(--border); border-radius: 10px;
      text-decoration: none; color: inherit; transition: border-color .15s;
    }
    .ticket-row:hover { border-color: var(--violet); }
    .ticket-num { font-size: 13px; color: var(--muted); min-width: 36px; }
    .ticket-info { flex: 1; }
    .ticket-subject { font-size: 15px; font-weight: 500; color: var(--ink); margin-bottom: 4px; }
    .ticket-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
    .badge-type { background: var(--surface); border: 1px solid var(--border); padding: 2px 8px; border-radius: 12px; }
    .meta-sep { color: var(--border); }
    .priority-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .p-low  { background: var(--emerald-c); color: var(--emerald); }
    .p-med  { background: var(--amber-c);   color: var(--amber); }
    .p-high { background: var(--rose-c);    color: var(--rose); }
    .p-crit { background: var(--rose-c);    color: var(--rose); font-weight: 700; }
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .status-0 { background: var(--surface); color: var(--muted); }
    .status-1 { background: var(--blue-c);  color: var(--blue); }
    .status-2 { background: var(--amber-c); color: var(--amber); }
    .status-3 { background: var(--violet-c); color: var(--violet); }
    .status-4 { background: var(--surface); color: var(--soft); }
  `],
})
export class PortalTicketsComponent implements OnInit {
  private ticketSvc = inject(TicketService);

  tickets = signal<Ticket[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(true);
  selectedProjectId = '';

  ngOnInit() {
    this.ticketSvc.getMyProjects().subscribe(p => this.projects.set(p));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.ticketSvc.getMyTickets(this.selectedProjectId || undefined).subscribe({
      next: (t) => { this.tickets.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: TicketStatus) { return TICKET_STATUS_LABELS[s] ?? String(s); }
  typeLabel(t: number) { return TICKET_TYPE_LABELS[t as keyof typeof TICKET_TYPE_LABELS] ?? String(t); }
  priorityLabel(p: number) { return PRIORITY_LABELS[p] ?? String(p); }
  priorityClass(p: number) { return PRIORITY_CLASSES[p] ?? ''; }
}
