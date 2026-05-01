import {
  Component, Input, OnInit, OnDestroy, AfterViewChecked,
  signal, inject, ElementRef, ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from '@pm/teams/data-access';
import { AuthService } from '@pm/auth/data-access';
import { Message } from '@pm/shared/models';

@Component({
  selector: 'pm-messaging',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <div class="chat-wrap">

      <!-- Messages -->
      <div class="messages-container" #messagesContainer>
        @if (loading()) {
          <div class="center-state"><div class="spinner"></div></div>
        }
        @if (!loading() && messages().length === 0) {
          <div class="center-state">
            <span class="material-icons-round empty-ico">chat_bubble_outline</span>
            <p>No messages yet — start the conversation!</p>
          </div>
        }
        @if (!loading()) {
          <div class="message-list">
            @for (msg of messages(); track msg.id; let i = $index) {
              @if (showDateSep(i)) {
                <div class="date-sep"><span>{{ msg.createdAt | date:'MMMM d, y' }}</span></div>
              }
              <div class="message-item" [class.own]="msg.authorId === currentUserId()">
                @if (showAvatar(i)) {
                  <div class="msg-ava">{{ initials(msg.authorName) }}</div>
                } @else {
                  <div class="msg-ava placeholder"></div>
                }
                <div class="msg-body">
                  @if (showAvatar(i)) {
                    <div class="msg-meta">
                      <span class="author-name">{{ msg.authorId === currentUserId() ? 'You' : msg.authorName }}</span>
                      <span class="msg-time">{{ msg.createdAt | date:'h:mm a' }}</span>
                    </div>
                  }
                  <div class="msg-bubble">{{ msg.content }}</div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Input -->
      <div class="input-area">
        <form [formGroup]="form" (ngSubmit)="send()" class="input-form">
          <input class="msg-input" formControlName="content"
                 placeholder="Send a message…"
                 (keydown.enter)="onEnter($event)" />
          <button type="submit" class="send-btn" [disabled]="form.invalid || sending()">
            <span class="material-icons-round">send</span>
          </button>
        </form>
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
    .chat-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--page); }
    .messages-container { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; }
    .center-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--soft); padding: 40px; }
    .empty-ico { font-size: 40px; opacity: 0.4; }
    .center-state p { margin: 0; font-size: 13px; }
    .spinner { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--violet); animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .message-list { display: flex; flex-direction: column; gap: 1px; }
    .date-sep { display: flex; align-items: center; gap: 10px; margin: 14px 0 8px; color: var(--soft); font-size: 11px; }
    .date-sep::before, .date-sep::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .message-item { display: flex; gap: 10px; padding: 3px 6px; border-radius: var(--r-md); }
    .message-item:hover { background: var(--surface); }
    .msg-ava { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: var(--violet-mid); color: var(--violet); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
    .msg-ava.placeholder { background: transparent; }
    .own .msg-ava { background: var(--violet); color: #fff; }
    .msg-body { flex: 1; min-width: 0; }
    .msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
    .author-name { font-size: 13px; font-weight: 700; color: var(--ink); }
    .own .author-name { color: var(--violet); }
    .msg-time { font-size: 10px; color: var(--soft); }
    .msg-bubble { font-size: 13px; color: var(--ink-4); line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
    .input-area { padding: 12px 16px; background: var(--white); border-top: 1px solid var(--border); flex-shrink: 0; }
    .input-form { display: flex; align-items: center; gap: 8px; }
    .msg-input { flex: 1; padding: 9px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-full); font-family: inherit; font-size: 13px; color: var(--ink); outline: none; transition: border-color 0.15s; }
    .msg-input::placeholder { color: var(--soft); }
    .msg-input:focus { border-color: var(--violet); background: var(--white); }
    .send-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--violet); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; transition: opacity 0.15s; flex-shrink: 0; }
    .send-btn:hover:not(:disabled) { opacity: 0.85; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn .material-icons-round { font-size: 18px; }
  `],
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input({ required: true }) projectId!: string;
  @ViewChild('messagesContainer') private container!: ElementRef<HTMLElement>;

  private messageService = inject(MessageService);
  private authService    = inject(AuthService);
  private fb             = inject(FormBuilder);

  messages     = signal<Message[]>([]);
  loading      = signal(true);
  sending      = signal(false);
  private shouldScroll = false;
  private pollInterval?: ReturnType<typeof setInterval>;

  form = this.fb.group({ content: ['', [Validators.required, Validators.maxLength(4000)]] });

  currentUserId() { return this.authService.user()?.userId ?? ''; }

  ngOnInit() {
    this.load();
    this.pollInterval = setInterval(() => this.load(false), 5000);
  }

  ngOnDestroy() { clearInterval(this.pollInterval); }

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  private load(showSpinner = true) {
    if (showSpinner) this.loading.set(true);
    this.messageService.getByProject(this.projectId).subscribe({
      next: msgs => {
        const gotNew = msgs.length > this.messages().length;
        this.messages.set(msgs);
        this.loading.set(false);
        if (gotNew || showSpinner) this.shouldScroll = true;
      },
      error: () => this.loading.set(false),
    });
  }

  send() {
    if (this.form.invalid || this.sending()) return;
    const content = this.form.value.content!.trim();
    if (!content) return;
    this.sending.set(true);
    this.messageService.send(this.projectId, { content }).subscribe({
      next: msg => {
        this.messages.update(all => [...all, msg]);
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

  showAvatar(i: number): boolean {
    if (i === 0) return true;
    const msgs = this.messages();
    return msgs[i].authorId !== msgs[i - 1].authorId;
  }

  showDateSep(i: number): boolean {
    if (i === 0) return true;
    const msgs = this.messages();
    return new Date(msgs[i].createdAt).toDateString() !== new Date(msgs[i - 1].createdAt).toDateString();
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  private scrollToBottom() {
    try { this.container.nativeElement.scrollTop = this.container.nativeElement.scrollHeight; } catch {}
  }
}
