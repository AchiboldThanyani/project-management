import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TicketService } from '@pm/tasks/data-access';
import { Ticket, TicketComment, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, TicketStatus } from '@pm/shared/models';
import { NotificationType } from '@pm/shared/models';
import { SignalRService } from '@pm/shared/util';

const PRIORITY_LABELS: Record<number, string> = { 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical' };
const PRIORITY_CLASSES: Record<number, string> = { 0: 'p-low', 1: 'p-med', 2: 'p-high', 3: 'p-crit' };

@Component({
  selector: 'app-portal-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (ticket()) {
      <div class="page-wrap">
        <div class="topbar">
          <button class="back-btn" (click)="back()">
            <span class="material-icons-round">arrow_back</span>
          </button>
          <div class="topbar-title">Ticket #{{ ticket()!.number }}</div>
          <div class="topbar-chips">
            <span [class]="'priority-badge ' + priorityClass(ticket()!.priority)">{{ priorityLabel(ticket()!.priority) }}</span>
            <span class="status-badge" [class]="'status-' + ticket()!.status">{{ statusLabel(ticket()!.status) }}</span>
          </div>
        </div>

        <div class="content">
          <div class="ticket-body">
            <div class="ticket-header">
              <h2>{{ ticket()!.subject }}</h2>
              <div class="ticket-meta">
                <span>{{ typeLabel(ticket()!.type) }}</span>
                <span>·</span>
                <span>Submitted {{ ticket()!.createdAt | date:'mediumDate' }}</span>
                @if (ticket()!.convertedToTaskId) {
                  <span>· <span class="converted-badge">Converted to task</span></span>
                }
              </div>
            </div>
            @if (ticket()!.description) {
              <div class="ticket-description">{{ ticket()!.description }}</div>
            }

            <div class="comments-section">
              <div class="comments-header">
                <h3>Conversation</h3>
                @if (liveUpdate()) {
                  <span class="live-badge"><span class="live-dot"></span> New reply</span>
                }
              </div>
              @for (c of comments(); track c.id) {
                <div class="comment" [class.from-customer]="c.isFromCustomer" [class.from-team]="!c.isFromCustomer">
                  <div class="comment-author">
                    {{ c.authorName }}
                    <span class="author-tag">{{ c.isFromCustomer ? 'You' : 'Support Team' }}</span>
                  </div>
                  <div class="comment-content">{{ c.content }}</div>
                  <div class="comment-time">{{ c.createdAt | date:'short' }}</div>
                </div>
              }
              @if (comments().length === 0) {
                <div class="no-comments">No replies yet.</div>
              }

              <div class="reply-box">
                <textarea [(ngModel)]="replyText" placeholder="Add a reply..." rows="3"></textarea>
                <button (click)="addComment()" [disabled]="!replyText.trim() || sending()">
                  {{ sending() ? 'Sending...' : 'Send Reply' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading { display: flex; justify-content: center; padding: 60px; }
    .page-wrap { padding: 0; }
    .topbar { display: flex; align-items: center; gap: 12px; padding: 20px 28px; border-bottom: 1px solid var(--border); }
    .back-btn { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; }
    .topbar-title { font-size: 18px; font-weight: 600; color: var(--ink); flex: 1; }
    .topbar-chips { display: flex; align-items: center; gap: 8px; }
    .priority-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .p-low  { background: var(--emerald-c); color: var(--emerald); }
    .p-med  { background: var(--amber-c);   color: var(--amber); }
    .p-high { background: var(--rose-c);    color: var(--rose); }
    .p-crit { background: var(--rose-c);    color: var(--rose); font-weight: 700; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-0 { background: var(--surface); color: var(--muted); }
    .status-1 { background: var(--blue-c);  color: var(--blue); }
    .status-2 { background: var(--amber-c); color: var(--amber); }
    .status-3 { background: var(--violet-c); color: var(--violet); }
    .status-4 { background: var(--surface); color: var(--soft); }
    .content { padding: 28px; max-width: 700px; }
    .ticket-body { display: flex; flex-direction: column; gap: 24px; }
    .ticket-header h2 { font-size: 20px; font-weight: 600; color: var(--ink); margin: 0 0 8px; }
    .ticket-meta { display: flex; gap: 8px; font-size: 13px; color: var(--muted); }
    .converted-badge { background: var(--violet-c); color: var(--violet); padding: 2px 8px; border-radius: 10px; font-size: 11px; }
    .ticket-description { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; font-size: 14px; color: var(--ink); white-space: pre-wrap; }
    .comments-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .comments-header h3 { font-size: 15px; font-weight: 600; color: var(--ink); margin: 0; }
    .live-badge { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--violet); font-weight: 500; }
    .live-dot { width: 7px; height: 7px; background: var(--violet); border-radius: 50%; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
    .comment { padding: 14px 16px; border-radius: 10px; margin-bottom: 10px; }
    .from-customer { background: var(--violet-c); border: 1px solid rgba(58,138,69,.2); }
    .from-team { background: var(--white); border: 1px solid var(--border); }
    .comment-author { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
    .author-tag { font-size: 11px; font-weight: 400; background: var(--surface); border: 1px solid var(--border); padding: 1px 6px; border-radius: 8px; margin-left: 6px; color: var(--muted); }
    .comment-content { font-size: 14px; color: var(--ink); margin-bottom: 4px; }
    .comment-time { font-size: 11px; color: var(--muted); }
    .no-comments { color: var(--muted); font-size: 14px; padding: 16px 0; }
    .reply-box { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
    .reply-box textarea { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--ink); background: var(--white); resize: vertical; outline: none; }
    .reply-box textarea:focus { border-color: var(--violet); }
    .reply-box button { align-self: flex-end; background: var(--violet); color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .reply-box button:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class PortalTicketDetailComponent implements OnInit, OnDestroy {
  private ticketSvc = inject(TicketService);
  private signalr = inject(SignalRService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ticket = signal<Ticket | null>(null);
  comments = signal<TicketComment[]>([]);
  loading = signal(true);
  sending = signal(false);
  liveUpdate = signal(false);
  replyText = '';

  private ticketId = '';
  private sub?: Subscription;
  private liveTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.ticketId = this.route.snapshot.paramMap.get('id')!;
    this.ticketSvc.getMyTicketById(this.ticketId).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.ticketSvc.getPortalComments(this.ticketId).subscribe(c => {
          this.comments.set(c);
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false),
    });

    this.sub = this.signalr.events$.subscribe(({ event, payload }) => {
      if (event !== 'Notification') return;
      const n = payload as { type: number; relatedEntityId?: string };
      if (n.type === NotificationType.TicketReplied && n.relatedEntityId === this.ticketId) {
        this.ticketSvc.getPortalComments(this.ticketId).subscribe(c => {
          this.comments.set(c);
          this.flashLive();
        });
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    clearTimeout(this.liveTimer);
  }

  private flashLive() {
    this.liveUpdate.set(true);
    clearTimeout(this.liveTimer);
    this.liveTimer = setTimeout(() => this.liveUpdate.set(false), 4000);
  }

  addComment() {
    if (!this.replyText.trim()) return;
    this.sending.set(true);
    this.ticketSvc.addPortalComment(this.ticketId, this.replyText).subscribe({
      next: (c) => { this.comments.update(cs => [...cs, c]); this.replyText = ''; this.sending.set(false); },
      error: () => this.sending.set(false),
    });
  }

  statusLabel(s: TicketStatus) { return TICKET_STATUS_LABELS[s] ?? String(s); }
  typeLabel(t: number) { return TICKET_TYPE_LABELS[t as keyof typeof TICKET_TYPE_LABELS] ?? String(t); }
  priorityLabel(p: number) { return PRIORITY_LABELS[p] ?? String(p); }
  priorityClass(p: number) { return PRIORITY_CLASSES[p] ?? ''; }
  back() { this.router.navigate(['/portal/tickets']); }
}
