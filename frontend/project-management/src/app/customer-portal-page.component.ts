import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '@pm/tasks/data-access';
import {
  Ticket, TicketStatus, TicketType, SlaStatus,
  TICKET_STATUS_LABELS, TICKET_TYPE_LABELS,
} from '@pm/shared/models';

@Component({
  selector: 'pm-customer-portal-page',
  standalone: true,
  imports: [DatePipe, NgClass, FormsModule, RouterModule],
  template: `
    <div class="portal-page">

      <!-- Header -->
      <div class="portal-header">
        <div>
          <h1 class="page-title">Customer Portal</h1>
          <p class="page-sub">Ticket overview across all projects</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else {

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-ico violet"><span class="material-icons-round">confirmation_number</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ totalCount() }}</span>
              <span class="stat-lbl">Total Tickets</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-ico blue"><span class="material-icons-round">pending</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ openCount() }}</span>
              <span class="stat-lbl">Open</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-ico amber"><span class="material-icons-round">schedule</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ atRiskCount() }}</span>
              <span class="stat-lbl">SLA At Risk</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-ico red"><span class="material-icons-round">warning_amber</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ breachedCount() }}</span>
              <span class="stat-lbl">SLA Breached</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-ico green"><span class="material-icons-round">check_circle</span></div>
            <div class="stat-body">
              <span class="stat-num">{{ resolvedCount() }}</span>
              <span class="stat-lbl">Resolved</span>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="filter-bar">
          <select class="filter-select" [(ngModel)]="filterProject">
            <option value="">All Projects</option>
            @for (p of projects(); track p) {
              <option [value]="p">{{ p }}</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="filterStatus">
            <option value="">All Statuses</option>
            <option value="0">New</option>
            <option value="1">Open</option>
            <option value="2">In Progress</option>
            <option value="3">Resolved</option>
            <option value="4">Closed</option>
          </select>
          <select class="filter-select" [(ngModel)]="filterType">
            <option value="">All Types</option>
            <option value="0">Bug</option>
            <option value="1">Feature Request</option>
            <option value="2">Question</option>
            <option value="3">Other</option>
          </select>
          <select class="filter-select" [(ngModel)]="filterSla">
            <option value="">All SLA</option>
            <option value="0">On Time</option>
            <option value="1">At Risk</option>
            <option value="2">Breached</option>
          </select>
          @if (hasFilter()) {
            <button class="clear-btn" (click)="clearFilters()">
              <span class="material-icons-round">filter_alt_off</span> Clear
            </button>
          }
          <span class="result-count">{{ filtered().length }} ticket{{ filtered().length !== 1 ? 's' : '' }}</span>
        </div>

        <!-- Table -->
        <div class="ticket-table-wrap">
          @if (filtered().length === 0) {
            <div class="empty-state">
              <span class="material-icons-round">confirmation_number</span>
              <p>No tickets match your filters</p>
            </div>
          } @else {
            <table class="ticket-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Submitted by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                @for (t of filtered(); track t.id) {
                  <tr class="ticket-row">
                    <td class="col-num">#{{ t.number }}</td>
                    <td class="col-subject">{{ t.subject }}</td>
                    <td class="col-project">
                      <span class="project-chip">{{ t.projectName ?? '—' }}</span>
                    </td>
                    <td class="col-type">
                      <span class="badge type-{{ t.type }}">{{ typeLabel(t.type) }}</span>
                    </td>
                    <td class="col-status">
                      <span class="badge status-{{ t.status }}">{{ statusLabel(t.status) }}</span>
                    </td>
                    <td class="col-sla">
                      <span class="badge sla-{{ t.slaStatus }}">{{ slaLabel(t.slaStatus) }}</span>
                    </td>
                    <td class="col-by">{{ t.submittedByName }}</td>
                    <td class="col-date">{{ t.createdAt | date:'MMM d, y' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

      }
    </div>
  `,
  styles: [`
    .portal-page { padding: 28px; display: flex; flex-direction: column; gap: 20px; height: 100%; overflow-y: auto; }
    .portal-header { display: flex; align-items: center; justify-content: space-between; }
    .page-title { font-size: 20px; font-weight: 700; color: var(--ink); }
    .page-sub { font-size: 13px; color: var(--soft); margin-top: 2px; }

    .loading-state { flex: 1; display: flex; align-items: center; justify-content: center; }
    .spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--violet); animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Stats */
    .stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .stat-card { flex: 1; min-width: 140px; background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md); padding: 16px; display: flex; align-items: center; gap: 14px; }
    .stat-ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-ico .material-icons-round { font-size: 20px; }
    .stat-ico.violet { background: var(--violet-mid); color: var(--violet); }
    .stat-ico.blue   { background: #dbeafe; color: #2563eb; }
    .stat-ico.amber  { background: #fef3c7; color: #d97706; }
    .stat-ico.red    { background: #fee2e2; color: #dc2626; }
    .stat-ico.green  { background: #d1fae5; color: #059669; }
    .stat-body { display: flex; flex-direction: column; gap: 2px; }
    .stat-num { font-size: 24px; font-weight: 700; color: var(--ink); line-height: 1; }
    .stat-lbl { font-size: 11px; color: var(--soft); text-transform: uppercase; letter-spacing: .05em; }

    /* Filters */
    .filter-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .filter-select { padding: 7px 10px; background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md); font-size: 13px; color: var(--ink); cursor: pointer; outline: none; }
    .filter-select:focus { border-color: var(--violet); }
    .clear-btn { display: flex; align-items: center; gap: 4px; padding: 7px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); font-size: 13px; color: var(--soft); cursor: pointer; }
    .clear-btn .material-icons-round { font-size: 14px; }
    .clear-btn:hover { color: var(--ink); border-color: var(--ink-4); }
    .result-count { margin-left: auto; font-size: 12px; color: var(--soft); }

    /* Table */
    .ticket-table-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; }
    .ticket-table { width: 100%; border-collapse: collapse; }
    .ticket-table thead tr { background: var(--surface); border-bottom: 1px solid var(--border); }
    .ticket-table th { padding: 10px 14px; font-size: 11px; font-weight: 600; color: var(--soft); text-align: left; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }
    .ticket-row { border-bottom: 1px solid var(--border); transition: background 0.1s; }
    .ticket-row:last-child { border-bottom: none; }
    .ticket-row:hover { background: var(--surface); }
    .ticket-table td { padding: 10px 14px; font-size: 13px; color: var(--ink-4); vertical-align: middle; }
    .col-num { font-size: 12px; font-weight: 600; color: var(--soft); white-space: nowrap; }
    .col-subject { font-weight: 500; color: var(--ink); max-width: 280px; }
    .col-project .project-chip { font-size: 12px; color: var(--soft); }
    .col-by { font-size: 12px; color: var(--soft); white-space: nowrap; }
    .col-date { font-size: 12px; color: var(--soft); white-space: nowrap; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--r-full); font-size: 11px; font-weight: 600; white-space: nowrap; }
    /* Type */
    .type-0 { background: #fee2e2; color: #dc2626; }
    .type-1 { background: var(--violet-mid); color: var(--violet); }
    .type-2 { background: #fef3c7; color: #d97706; }
    .type-3 { background: var(--surface); color: var(--soft); }
    /* Status */
    .status-0 { background: var(--surface); color: var(--soft); }
    .status-1 { background: #dbeafe; color: #2563eb; }
    .status-2 { background: #fef3c7; color: #d97706; }
    .status-3 { background: #d1fae5; color: #059669; }
    .status-4 { background: var(--surface); color: var(--soft); }
    /* SLA */
    .sla-0 { background: #d1fae5; color: #059669; }
    .sla-1 { background: #fef3c7; color: #d97706; }
    .sla-2 { background: #fee2e2; color: #dc2626; }

    /* Empty */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 60px 40px; color: var(--soft); }
    .empty-state .material-icons-round { font-size: 36px; opacity: 0.35; }
    .empty-state p { font-size: 13px; }
  `],
})
export class CustomerPortalPageComponent implements OnInit {
  private ticketService = inject(TicketService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);

  filterProject = '';
  filterStatus  = '';
  filterType    = '';
  filterSla     = '';

  ngOnInit() {
    this.ticketService.getAdminPortalTickets().subscribe({
      next: t => { this.tickets.set(t); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  projects = computed(() =>
    [...new Set(this.tickets().map(t => t.projectName).filter((n): n is string => !!n))].sort()
  );

  filtered = computed(() => {
    let list = this.tickets();
    if (this.filterProject) list = list.filter(t => t.projectName === this.filterProject);
    if (this.filterStatus  !== '') list = list.filter(t => t.status  === +this.filterStatus);
    if (this.filterType    !== '') list = list.filter(t => t.type    === +this.filterType);
    if (this.filterSla     !== '') list = list.filter(t => t.slaStatus === +this.filterSla);
    return list;
  });

  totalCount    = computed(() => this.tickets().length);
  openCount     = computed(() => this.tickets().filter(t => t.status <= TicketStatus.InProgress).length);
  atRiskCount   = computed(() => this.tickets().filter(t => t.slaStatus === SlaStatus.AtRisk).length);
  breachedCount = computed(() => this.tickets().filter(t => t.slaStatus === SlaStatus.Breached).length);
  resolvedCount = computed(() => this.tickets().filter(t => t.status >= TicketStatus.Resolved).length);

  hasFilter = computed(() => !!(this.filterProject || this.filterStatus || this.filterType || this.filterSla));

  clearFilters() {
    this.filterProject = '';
    this.filterStatus  = '';
    this.filterType    = '';
    this.filterSla     = '';
  }

  statusLabel(s: TicketStatus) { return TICKET_STATUS_LABELS[s] ?? s; }
  typeLabel(t: TicketType)     { return TICKET_TYPE_LABELS[t]   ?? t; }
  slaLabel(s: SlaStatus) {
    return s === SlaStatus.Breached ? 'Breached' : s === SlaStatus.AtRisk ? 'At Risk' : 'On Time';
  }
}
