import { Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamService } from '@pm/teams/data-access';
import { MessageService } from '@pm/teams/data-access';
import { AuthService } from '@pm/auth/data-access';
import { Team, Message } from '@pm/shared/models';

@Component({
  selector: 'pm-messaging',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="msg-layout">

      <!-- ── Channels sidebar ───────────────── -->
      <div class="channels-sidebar">
        <div class="sidebar-header">
          <span class="material-icons-round sidebar-ico">forum</span>
          <span>Channels</span>
        </div>

        <div *ngIf="loadingTeams()" class="sidebar-loading">
          <div class="spinner-sm"></div>
        </div>

        <div class="channel-list">
          <button *ngFor="let team of teams()"
                  class="channel-item"
                  [class.active]="selectedTeam()?.id === team.id"
                  (click)="selectTeam(team)">
            <span class="material-icons-round ch-ico">tag</span>
            <span class="ch-name">{{ team.name }}</span>
            <span class="ch-count">{{ team.members.length }}</span>
          </button>
          <p *ngIf="teams().length === 0 && !loadingTeams()" class="no-channels">
            You're not in any teams yet.
          </p>
        </div>
      </div>

      <!-- ── Chat area ──────────────────────── -->
      <div class="chat-area" *ngIf="selectedTeam(); else noTeam">

        <div class="chat-header">
          <span class="material-icons-round ch-header-ico">tag</span>
          <span class="chat-title">{{ selectedTeam()!.name }}</span>
          <span class="member-count">{{ selectedTeam()!.members.length }} members</span>
        </div>

        <div class="messages-container" #messagesContainer>

          <div *ngIf="loadingMessages()" class="messages-loading">
            <div class="spinner"></div>
          </div>

          <div *ngIf="!loadingMessages()" class="message-list">

            <div *ngIf="messages().length === 0" class="empty-messages">
              <span class="material-icons-round empty-ico">chat_bubble_outline</span>
              <p>No messages yet. Start the conversation!</p>
            </div>

            <ng-container *ngFor="let msg of messages(); let i = index">
              <div *ngIf="showDateSeparator(i)" class="date-sep">
                <span>{{ msg.createdAt | date:'MMMM d, y' }}</span>
              </div>

              <div class="message-item" [class.own]="msg.authorId === currentUserId()">
                <div class="msg-avatar" *ngIf="showAvatar(i)">{{ initials(msg.authorName) }}</div>
                <div class="msg-avatar placeholder" *ngIf="!showAvatar(i)"></div>
                <div class="msg-body">
                  <div class="msg-meta" *ngIf="showAvatar(i)">
                    <span class="author-name">{{ msg.authorId === currentUserId() ? 'You' : msg.authorName }}</span>
                    <span class="msg-time">{{ msg.createdAt | date:'h:mm a' }}</span>
                  </div>
                  <div class="msg-bubble">{{ msg.content }}</div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Input -->
        <div class="input-area">
          <form [formGroup]="form" (ngSubmit)="send()" class="input-form">
            <input class="msg-input" formControlName="content"
                   [placeholder]="'Message #' + selectedTeam()!.name"
                   (keydown.enter)="onEnter($event)" />
            <button type="submit" class="send-btn" [disabled]="form.invalid || sending()">
              <span class="material-icons-round">send</span>
            </button>
          </form>
        </div>
      </div>

      <ng-template #noTeam>
        <div class="no-team">
          <span class="material-icons-round no-team-ico">forum</span>
          <p>Select a channel to start messaging</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    .msg-layout {
      display: flex;
      height: calc(100vh - 0px);
      overflow: hidden;
    }

    /* ── Channels sidebar ── */
    .channels-sidebar {
      width: 220px; min-width: 220px;
      background: var(--ink-2);
      display: flex; flex-direction: column;
      border-right: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .sidebar-header {
      display: flex; align-items: center; gap: 8px;
      padding: 16px;
      color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sidebar-ico { font-size: 18px; color: var(--violet-2); }

    .sidebar-loading { display: flex; justify-content: center; padding: 16px; }
    .spinner-sm {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--violet-2);
      animation: spin 0.7s linear infinite;
    }

    .channel-list { flex: 1; overflow-y: auto; padding: 6px; }

    .channel-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 7px 10px;
      background: transparent; border: none;
      color: rgba(255,255,255,0.45); border-radius: var(--r-md);
      cursor: pointer; text-align: left; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 500;
      transition: background 0.12s, color 0.12s;
      margin-bottom: 1px;
    }
    .channel-item:hover  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
    .channel-item.active { background: var(--violet-mid); color: #fff; }

    .ch-ico { font-size: 15px; opacity: 0.6; }
    .ch-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ch-count {
      font-size: 10px; color: rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.06); border-radius: var(--r-full);
      padding: 1px 6px;
    }
    .no-channels { color: rgba(255,255,255,0.25); font-size: 12px; padding: 12px; text-align: center; }

    /* ── Chat area ── */
    .chat-area {
      flex: 1; display: flex; flex-direction: column; min-width: 0;
      background: var(--page);
    }

    .chat-header {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 20px;
      background: var(--white);
      border-bottom: 1px solid var(--border);
    }
    .ch-header-ico { font-size: 18px; color: var(--violet); }
    .chat-title { font-size: 14px; font-weight: 700; color: var(--ink); }
    .member-count { font-size: 12px; color: var(--soft); margin-left: 4px; }

    .messages-container {
      flex: 1; overflow-y: auto; padding: 16px 20px;
      display: flex; flex-direction: column;
    }

    .messages-loading { display: flex; justify-content: center; padding: 40px; }
    .spinner {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--violet);
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .message-list { display: flex; flex-direction: column; gap: 1px; }

    .empty-messages {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; flex: 1; gap: 8px;
      color: var(--soft); padding: 48px;
    }
    .empty-ico { font-size: 40px; opacity: 0.4; }
    .empty-messages p { margin: 0; font-size: 13px; }

    .date-sep {
      display: flex; align-items: center; gap: 10px;
      margin: 14px 0 8px; color: var(--soft); font-size: 11px;
    }
    .date-sep::before, .date-sep::after {
      content: ''; flex: 1; height: 1px; background: var(--border);
    }

    .message-item { display: flex; gap: 10px; padding: 2px 0; border-radius: var(--r-md); }
    .message-item:hover { background: var(--surface); }

    .msg-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
    }
    .msg-avatar.placeholder { background: transparent; }

    .msg-body { flex: 1; min-width: 0; }
    .msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
    .author-name { font-size: 13px; font-weight: 700; color: var(--ink); }
    .own .author-name { color: var(--violet); }
    .msg-time { font-size: 10px; color: var(--soft); }
    .msg-bubble {
      font-size: 13px; color: var(--ink-4); line-height: 1.5;
      word-break: break-word; white-space: pre-wrap;
    }

    /* Input */
    .input-area {
      padding: 12px 16px;
      background: var(--white);
      border-top: 1px solid var(--border);
    }
    .input-form { display: flex; align-items: center; gap: 8px; }
    .msg-input {
      flex: 1; padding: 10px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      outline: none; transition: border-color 0.15s;
    }
    .msg-input::placeholder { color: var(--soft); }
    .msg-input:focus { border-color: var(--violet); background: var(--white); }

    .send-btn {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--violet); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #fff; transition: background 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { background: var(--violet-2); }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn .material-icons-round { font-size: 18px; }

    /* No team */
    .no-team {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 10px; color: var(--soft);
    }
    .no-team-ico { font-size: 48px; opacity: 0.3; }
    .no-team p { margin: 0; font-size: 13px; }
  `],
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLElement>;

  private teamService = inject(TeamService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  teams = signal<Team[]>([]);
  selectedTeam = signal<Team | null>(null);
  messages = signal<Message[]>([]);
  loadingTeams = signal(true);
  loadingMessages = signal(false);
  sending = signal(false);
  private shouldScroll = false;
  private pollInterval?: ReturnType<typeof setInterval>;

  form = this.fb.group({ content: ['', [Validators.required, Validators.maxLength(4000)]] });

  currentUserId() { return this.authService.user()?.userId ?? ''; }

  ngOnInit() {
    this.teamService.getMyTeams().subscribe({
      next: (t) => { this.teams.set(t); this.loadingTeams.set(false); if (t.length > 0) this.selectTeam(t[0]); },
      error: () => this.loadingTeams.set(false),
    });
  }

  ngOnDestroy() { this.stopPolling(); }

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  selectTeam(team: Team) {
    this.stopPolling();
    this.selectedTeam.set(team);
    this.messages.set([]);
    this.loadMessages(team.id);
    this.pollInterval = setInterval(() => this.loadMessages(team.id), 5000);
  }

  private loadMessages(teamId: string) {
    this.loadingMessages.set(this.messages().length === 0);
    this.messageService.getByTeam(teamId).subscribe({
      next: (msgs) => {
        const hadMessages = this.messages().length > 0;
        const gotNew = msgs.length > this.messages().length;
        this.messages.set(msgs);
        this.loadingMessages.set(false);
        if (!hadMessages || gotNew) this.shouldScroll = true;
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  send() {
    if (this.form.invalid || !this.selectedTeam()) return;
    const content = this.form.value.content!.trim();
    if (!content) return;
    this.sending.set(true);
    this.messageService.send(this.selectedTeam()!.id, { content }).subscribe({
      next: (msg) => {
        this.messages.update((all) => [...all, msg]);
        this.form.reset();
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: () => this.sending.set(false),
    });
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) { ke.preventDefault(); this.send(); }
  }

  showAvatar(index: number): boolean {
    if (index === 0) return true;
    const msgs = this.messages();
    return msgs[index].authorId !== msgs[index - 1].authorId;
  }

  showDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const msgs = this.messages();
    return new Date(msgs[index].createdAt).toDateString() !== new Date(msgs[index - 1].createdAt).toDateString();
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  private scrollToBottom() {
    try { this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight; } catch {}
  }

  private stopPolling() { if (this.pollInterval) clearInterval(this.pollInterval); }
}
