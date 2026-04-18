import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TicketService } from '@pm/tasks/data-access';
import { ProjectService } from '@pm/projects/data-access';
import { TicketType, Project } from '@pm/shared/models';

@Component({
  selector: 'app-portal-new-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-wrap">
      <div class="topbar">
        <button class="back-btn" (click)="back()">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div class="topbar-title">New Ticket</div>
      </div>
      <div class="content">
        <form class="ticket-form" (ngSubmit)="submit()">
          <div class="field">
            <label>Project</label>
            <select [(ngModel)]="projectId" name="projectId" required>
              <option value="">Select a project...</option>
              @for (p of projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Subject</label>
            <input [(ngModel)]="subject" name="subject" placeholder="Brief description of the issue" required />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea [(ngModel)]="description" name="description" rows="5" placeholder="Provide details, steps to reproduce, expected vs actual behavior..."></textarea>
          </div>
          <div class="row">
            <div class="field">
              <label>Type</label>
              <select [(ngModel)]="type" name="type">
                <option [value]="0">Bug</option>
                <option [value]="1">Feature Request</option>
                <option [value]="2">Question</option>
                <option [value]="3">Other</option>
              </select>
            </div>
            <div class="field">
              <label>Priority</label>
              <select [(ngModel)]="priority" name="priority">
                <option [value]="0">Low</option>
                <option [value]="1">Medium</option>
                <option [value]="2">High</option>
                <option [value]="3">Critical</option>
              </select>
            </div>
          </div>
          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="back()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="submitting()">
              {{ submitting() ? 'Submitting...' : 'Submit Ticket' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { padding: 0; }
    .topbar { display: flex; align-items: center; gap: 12px; padding: 20px 28px; border-bottom: 1px solid var(--border); }
    .back-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; }
    .topbar-title { font-size: 18px; font-weight: 600; color: var(--text); }
    .content { padding: 32px 28px; max-width: 600px; }
    .ticket-form { display: flex; flex-direction: column; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
    input, select, textarea {
      border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
      font-size: 14px; color: var(--text); background: var(--card); outline: none;
      transition: border-color .15s; resize: vertical;
    }
    input:focus, select:focus, textarea:focus { border-color: var(--violet); }
    .error-msg { color: #c0392b; font-size: 13px; background: #fdecea; padding: 10px 14px; border-radius: 8px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-primary { background: var(--violet); color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; }
  `],
})
export class PortalNewTicketComponent implements OnInit {
  private ticketSvc = inject(TicketService);
  private projectSvc = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  projects = signal<Project[]>([]);
  projectId = '';
  subject = '';
  description = '';
  type = TicketType.Bug;
  priority = 1;
  submitting = signal(false);
  error = signal('');

  ngOnInit() {
    this.projectSvc.getAll().subscribe((p) => this.projects.set(p));
    const qp = this.route.snapshot.queryParamMap.get('projectId');
    if (qp) this.projectId = qp;
  }

  submit() {
    if (!this.projectId || !this.subject.trim()) return;
    this.submitting.set(true);
    this.error.set('');
    this.ticketSvc.submitTicket(this.projectId, {
      subject: this.subject,
      description: this.description || undefined,
      type: this.type,
      priority: this.priority,
    }).subscribe({
      next: () => this.router.navigate(['/portal/tickets']),
      error: () => { this.error.set('Failed to submit ticket.'); this.submitting.set(false); },
    });
  }

  back() { this.router.navigate(['/portal/tickets']); }
}
