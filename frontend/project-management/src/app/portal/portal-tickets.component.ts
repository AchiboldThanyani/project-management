import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TicketService } from '@pm/tasks/data-access';
import { Ticket, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, TicketStatus } from '@pm/shared/models';

@Component({
  selector: 'app-portal-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-wrap">
      <div class="topbar">
        <div class="topbar-title">My Tickets</div>
        <a routerLink="/portal/tickets/new" class="add-btn">
          <span class="material-icons-round">add</span> New Ticket
        </a>
      </div>
      <div class="content">
        @if (loading()) {
          <div class="empty-state"><div class="spinner"></div></div>
        } @else if (tickets().length === 0) {
          <div class="empty-state">
            <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">confirmation_number</span>
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
    .topbar-title { font-size: 18px; font-weight: 600; color: var(--text); }
    .add-btn { display: flex; align-items: center; gap: 6px; background: var(--violet); color: #fff; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; }
    .content { padding: 24px 28px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--text-muted); }
    .ticket-list { display: flex; flex-direction: column; gap: 10px; }
    .ticket-row {
      display: flex; align-items: center; gap: 16px; padding: 16px 20px;
      background: var(--card); border: 1px solid var(--border); border-radius: 10px;
      text-decoration: none; color: inherit; transition: border-color .15s;
    }
    .ticket-row:hover { border-color: var(--violet); }
    .ticket-num { font-size: 13px; color: var(--text-muted); min-width: 36px; }
    .ticket-info { flex: 1; }
    .ticket-subject { font-size: 15px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
    .ticket-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
    .badge-type { background: var(--surface); border: 1px solid var(--border); padding: 2px 8px; border-radius: 12px; }
    .meta-sep { color: var(--border); }
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-0 { background: #f0f0f0; color: #555; }
    .status-1 { background: #e8f4fd; color: #1a73c7; }
    .status-2 { background: #fff3e0; color: #e67d00; }
    .status-3 { background: #e6f4e8; color: var(--violet); }
    .status-4 { background: #f5f5f5; color: #888; }
  `],
})
export class PortalTicketsComponent implements OnInit {
  private ticketSvc = inject(TicketService);
  tickets = signal<Ticket[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.ticketSvc.getMyTickets().subscribe({
      next: (t) => { this.tickets.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: TicketStatus) { return TICKET_STATUS_LABELS[s] ?? String(s); }
  typeLabel(t: number) { return TICKET_TYPE_LABELS[t as keyof typeof TICKET_TYPE_LABELS] ?? String(t); }
}
