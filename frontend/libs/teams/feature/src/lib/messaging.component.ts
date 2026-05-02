import {
  Component, Input, OnInit, OnDestroy, AfterViewChecked,
  signal, inject, ElementRef, ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from '@pm/teams/data-access';
import { AuthService } from '@pm/auth/data-access';
import { Message } from '@pm/shared/models';

const AVATAR_PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f97316','#22c55e','#14b8a6','#0ea5e9','#eab308'];

@Component({
  selector: 'pm-messaging',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <div class="chat-wrap">

      <!-- ─── Messages feed ─── -->
      <div class="messages-container" #messagesContainer>

        @if (loading()) {
          <div class="center-state">
            <div class="typing-dots"><span></span><span></span><span></span></div>
            <p>Loading messages…</p>
          </div>
        }

        @if (!loading() && messages().length === 0) {
          <div class="center-state">
            <div class="empty-icon-wrap">
              <span class="material-icons-round empty-ico">forum</span>
            </div>
            <p class="empty-title">No messages yet</p>
            <p class="empty-sub">Be the first to say something!</p>
          </div>
        }

        @if (!loading()) {
          <div class="message-list">
            @for (msg of messages(); track msg.id; let i = $index) {

              @if (showDateSep(i)) {
                <div class="date-sep">
                  <span class="date-sep-line"></span>
                  <span class="date-sep-label">{{ msg.createdAt | date:'EEEE, MMMM d' }}</span>
                  <span class="date-sep-line"></span>
                </div>
              }

              <div class="msg-row" [class.own]="isOwn(msg)" [class.continued]="!showAvatar(i)">

                @if (!isOwn(msg)) {
                  <div class="msg-left">
                    @if (showAvatar(i)) {
                      <div class="msg-ava" [style.background]="avatarColor(msg.authorId)">
                        {{ initials(msg.authorName) }}
                      </div>
                    } @else {
                      <div class="msg-ava-gap"></div>
                    }
                  </div>
                }

                <div class="msg-body" [class.own-body]="isOwn(msg)">
                  @if (showAvatar(i)) {
                    <div class="msg-meta" [class.own-meta]="isOwn(msg)">
                      @if (!isOwn(msg)) {
                        <span class="author-name">{{ msg.authorName }}</span>
                      }
                      <span class="msg-time">{{ msg.createdAt | date:'h:mm a' }}</span>
                    </div>
                  }
                  <div class="msg-bubble" [class.own-bubble]="isOwn(msg)">{{ msg.content }}</div>
                </div>

                @if (isOwn(msg)) {
                  <div class="msg-left">
                    @if (showAvatar(i)) {
                      <div class="msg-ava own-ava" [style.background]="avatarColor(msg.authorId)">
                        {{ initials(msg.authorName) }}
                      </div>
                    } @else {
                      <div class="msg-ava-gap"></div>
                    }
                  </div>
                }

              </div>
            }
          </div>
        }
      </div>

      <!-- ─── Input area ─── -->
      <div class="input-area">
        <form [formGroup]="form" (ngSubmit)="send()" class="input-form">
          <div class="input-card" [class.focused]="inputFocused">
            <textarea
              #msgInput
              class="msg-input"
              formControlName="content"
              placeholder="Message the team…"
              rows="1"
              (input)="autoResize(msgInput)"
              (focus)="inputFocused = true"
              (blur)="inputFocused = false"
              (keydown.enter)="onEnter($event)"
            ></textarea>
            <button type="submit" class="send-btn" [disabled]="form.invalid || sending()">
              @if (sending()) {
                <span class="send-spinner"></span>
              } @else {
                <span class="material-icons-round">send</span>
              }
            </button>
          </div>
          <p class="input-hint">Enter to send &middot; Shift+Enter for new line</p>
        </form>
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    /* ─── Layout ─── */
    .chat-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--white);
    }

    /* ─── Messages container ─── */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0 4px;
      display: flex;
      flex-direction: column;
    }

    /* ─── Center states ─── */
    .center-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 60px 24px;
      color: var(--soft);
    }
    .center-state p { margin: 0; font-size: 13px; }
    .empty-icon-wrap {
      width: 56px; height: 56px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .empty-ico { font-size: 26px; color: var(--soft); }
    .empty-title { font-size: 14px; font-weight: 700; color: var(--ink-3); margin-top: 4px !important; }
    .empty-sub { font-size: 12px; color: var(--soft); }

    /* Typing dots (loading) */
    .typing-dots {
      display: flex; gap: 5px; align-items: center;
      margin-bottom: 8px;
    }
    .typing-dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--border);
      animation: dotPulse 1.2s ease-in-out infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
      40%            { transform: scale(1.1); opacity: 1; }
    }

    /* ─── Message list ─── */
    .message-list { display: flex; flex-direction: column; }

    /* ─── Date separator ─── */
    .date-sep {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 20px 8px;
    }
    .date-sep-line { flex: 1; height: 1px; background: var(--border); }
    .date-sep-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.07em;
      color: var(--muted);
      white-space: nowrap;
    }

    /* ─── Message row ─── */
    .msg-row {
      display: flex;
      align-items: flex-start;
      gap: 0;
      padding: 2px 16px 2px 12px;
      border-radius: 0;
      position: relative;
      transition: background 0.1s;
      animation: msgIn 0.18s ease both;
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .msg-row:hover { background: var(--surface); }
    .msg-row:hover .hover-time { opacity: 1; }
    .msg-row.continued { padding-top: 1px; padding-bottom: 1px; }

    /* Own message — right-aligned */
    .msg-row.own { background: transparent; justify-content: flex-end; }
    .msg-row.own:hover { background: var(--surface); }

    /* ─── Avatar ─── */
    .msg-left { width: 44px; flex-shrink: 0; padding-top: 1px; }
    .msg-ava {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .msg-ava-gap { width: 32px; height: 32px; flex-shrink: 0; }

    /* ─── Message body ─── */
    .msg-body { flex: 1; min-width: 0; padding: 1px 0; display: flex; flex-direction: column; align-items: flex-start; }
    .msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
    .author-name { font-size: 13px; font-weight: 700; color: var(--ink); }
    .msg-time { font-size: 10px; color: var(--soft); }
    .msg-bubble {
      font-size: 13px; color: var(--ink-3);
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
    }

    /* Own message bubble */
    .own-body { align-items: flex-end; }
    .own-meta { justify-content: flex-end; }
    .own-bubble {
      background: var(--violet);
      color: #fff;
      border-radius: 16px 4px 16px 16px;
      padding: 8px 12px;
      max-width: 420px;
    }
    .msg-bubble:not(.own-bubble) {
      background: var(--surface);
      border-radius: 4px 16px 16px 16px;
      padding: 8px 12px;
      max-width: 420px;
    }
    .own-ava { margin-left: 4px; }

    /* Hover timestamp (for continued messages) */
    .hover-time {
      position: absolute;
      right: 18px; top: 50%; transform: translateY(-50%);
      font-size: 10px; color: var(--soft);
      opacity: 0;
      transition: opacity 0.1s;
      white-space: nowrap;
      pointer-events: none;
    }
    .msg-meta ~ .hover-time { display: none; }

    /* ─── Input area ─── */
    .input-area {
      padding: 10px 16px 12px;
      background: var(--white);
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .input-form { display: flex; flex-direction: column; gap: 5px; }
    .input-card {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 8px 8px 8px 14px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input-card.focused {
      border-color: var(--violet);
      box-shadow: 0 0 0 3px var(--violet-mid);
      background: var(--white);
    }
    .msg-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: var(--ink);
      resize: none;
      line-height: 1.5;
      max-height: 120px;
      overflow-y: auto;
      padding: 0;
    }
    .msg-input::placeholder { color: var(--soft); }
    .send-btn {
      width: 34px; height: 34px; border-radius: var(--r-md);
      background: var(--violet);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      transition: opacity 0.15s, transform 0.1s;
      flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.05); }
    .send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
    .send-btn .material-icons-round { font-size: 17px; }
    .send-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      animation: spin 0.65s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .input-hint {
      font-size: 10px; color: var(--soft);
      margin: 0; text-align: right;
      padding-right: 2px;
    }
  `],
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input({ required: true }) projectId!: string;
  @ViewChild('messagesContainer') private container!: ElementRef<HTMLElement>;
  @ViewChild('msgInput') private msgInput!: ElementRef<HTMLTextAreaElement>;

  private messageService = inject(MessageService);
  private authService    = inject(AuthService);
  private fb             = inject(FormBuilder);

  messages     = signal<Message[]>([]);
  loading      = signal(true);
  sending      = signal(false);
  inputFocused = false;

  private shouldScroll = false;
  private pollInterval?: ReturnType<typeof setInterval>;

  form = this.fb.group({ content: ['', [Validators.required, Validators.maxLength(4000)]] });

  currentUserId() { return this.authService.user()?.userId ?? ''; }
  isOwn(msg: Message) { return msg.authorId === this.currentUserId(); }

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
        if (this.msgInput) this.msgInput.nativeElement.style.height = 'auto';
      },
      error: () => this.sending.set(false),
    });
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) { ke.preventDefault(); this.send(); }
  }

  autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  showAvatar(i: number): boolean {
    if (i === 0) return true;
    const msgs = this.messages();
    return msgs[i].authorId !== msgs[i - 1].authorId ||
           new Date(msgs[i].createdAt).toDateString() !== new Date(msgs[i - 1].createdAt).toDateString();
  }

  showDateSep(i: number): boolean {
    if (i === 0) return true;
    const msgs = this.messages();
    return new Date(msgs[i].createdAt).toDateString() !== new Date(msgs[i - 1].createdAt).toDateString();
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  avatarColor(authorId: string): string {
    const idx = (authorId.charCodeAt(0) + (authorId.charCodeAt(1) ?? 0)) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[idx];
  }

  private scrollToBottom() {
    try { this.container.nativeElement.scrollTop = this.container.nativeElement.scrollHeight; } catch {}
  }
}
