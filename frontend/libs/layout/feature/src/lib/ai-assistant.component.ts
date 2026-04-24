import { Component, signal, inject, Input, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { AiService } from '@pm/shared/util';
import { ProjectService } from '@pm/projects/data-access';
import { Project } from '@pm/shared/models';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  html?: SafeHtml;
  loading?: boolean;
}

const QUICK_PROMPTS: { icon: string; label: string }[] = [
  { icon: 'speed',            label: 'How is the team performing this sprint?' },
  { icon: 'warning_amber',    label: "What's blocking the current sprint?" },
  { icon: 'schedule',         label: 'Who has the most overdue tasks?' },
  { icon: 'balance',          label: 'Which team member has the lightest workload?' },
  { icon: 'confirmation_number', label: 'Summarize open tickets by priority.' },
  { icon: 'emoji_events',     label: 'Who has been most productive recently?' },
];

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating trigger -->
    <button class="ai-fab" (click)="toggle()" [class.open]="open()">
      <span class="material-icons-round fab-icon">{{ open() ? 'close' : 'auto_awesome' }}</span>
      @if (!open()) { <span class="fab-label">Ask AI</span> }
    </button>

    @if (open()) {
      <div class="ai-backdrop" (click)="close()"></div>

      <div class="ai-panel">

        <!-- Header -->
        <div class="ai-header">
          <div class="header-glow"></div>
          <div class="header-top">
            <div class="header-brand">
              <div class="header-icon">
                <span class="material-icons-round">auto_awesome</span>
              </div>
              <div>
                <div class="header-title">AI Assistant</div>
                <div class="header-sub">Powered by Claude</div>
              </div>
            </div>
            <div class="header-actions">
              @if (messages().length > 0) {
                <button class="icon-btn" (click)="clearChat()" title="New conversation">
                  <span class="material-icons-round">add_comment</span>
                </button>
              }
              <button class="icon-btn" (click)="close()" title="Close">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>
          <!-- Project scope selector -->
          <div class="scope-row">
            <span class="material-icons-round scope-ico">folder</span>
            <select class="scope-select" [(ngModel)]="selectedProjectId">
              <option [value]="null">All Projects</option>
              @for (p of projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Welcome screen -->
        @if (messages().length === 0) {
          <div class="welcome">
            <div class="welcome-hero">
              <div class="welcome-orb">
                <span class="material-icons-round">smart_toy</span>
              </div>
              <h2 class="welcome-title">What can I help with?</h2>
              <p class="welcome-sub">
                @if (selectedProjectId) {
                  Scoped to <strong>{{ projectName() }}</strong>. Ask anything about this project.
                } @else {
                  Ask anything about your projects, team, or sprint.
                }
              </p>
            </div>
            <div class="quick-grid">
              @for (q of quickPrompts; track q.label) {
                <button class="quick-card" (click)="sendQuick(q.label)">
                  <span class="material-icons-round quick-icon">{{ q.icon }}</span>
                  <span class="quick-text">{{ q.label }}</span>
                </button>
              }
            </div>
          </div>
        } @else {
          <!-- Message thread -->
          <div class="messages" #messageList>
            @for (msg of messages(); track $index) {
              <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                @if (msg.role === 'assistant') {
                  <div class="msg-avatar" [class.pulsing]="msg.loading">
                    <span class="material-icons-round">auto_awesome</span>
                  </div>
                }
                <div class="msg-bubble" [class.thinking]="msg.loading">
                  @if (msg.loading) {
                    <div class="thinking-body">
                      <div class="thinking-label">
                        <span class="thinking-dot"></span>
                        Thinking
                      </div>
                      <div class="shimmer-lines">
                        <div class="shimmer-line w80"></div>
                        <div class="shimmer-line w60"></div>
                        <div class="shimmer-line w90"></div>
                      </div>
                    </div>
                  } @else if (msg.role === 'assistant') {
                    <div class="msg-text md-body" [innerHTML]="msg.html"></div>
                  } @else {
                    <pre class="msg-text">{{ msg.text }}</pre>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Input area -->
        <div class="input-area">
          <div class="input-shell" [class.focused]="focused" [class.disabled]="loading()">
            <textarea
              [(ngModel)]="input"
              (keydown.enter)="onEnter($event)"
              (focus)="focused = true"
              (blur)="focused = false"
              [disabled]="loading()"
              [placeholder]="selectedProjectId ? 'Ask about ' + projectName() + '…' : 'Ask about your projects…'"
              rows="1"
              class="ai-input"
            ></textarea>
            <button class="send-btn" (click)="send()" [disabled]="!input.trim() || loading()">
              <span class="material-icons-round">{{ loading() ? 'hourglass_top' : 'arrow_upward' }}</span>
            </button>
          </div>
          <p class="input-hint">Enter to send · Shift+Enter for new line</p>
        </div>

      </div>
    }
  `,
  styles: [`
    /* ── FAB ─────────────────────────────────────────── */
    .ai-fab {
      display: flex; align-items: center; gap: 8px;
      height: 48px; padding: 0 20px; border-radius: 24px;
      background: var(--violet); border: none; color: #fff;
      cursor: pointer; font-size: 14px; font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 4px 24px rgba(99,102,241,.45);
      transition: transform .2s, box-shadow .2s, border-radius .2s, padding .2s;
      white-space: nowrap;
    }
    .ai-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(99,102,241,.55); }
    .ai-fab.open {
      padding: 0 14px; border-radius: 14px;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--border); box-shadow: none;
    }
    .ai-fab .fab-icon { font-size: 20px; }
    .fab-label { letter-spacing: .1px; }

    /* ── Backdrop ─────────────────────────────────────── */
    .ai-backdrop {
      position: fixed; inset: 0; z-index: 299;
      background: rgba(0,0,0,.25);
      backdrop-filter: blur(2px);
      animation: fadeIn .2s ease;
    }

    /* ── Panel ────────────────────────────────────────── */
    .ai-panel {
      position: fixed; right: 0; top: 0; bottom: 0;
      width: 460px; max-width: 100vw;
      background: rgba(255,255,255,.78);
      backdrop-filter: blur(32px) saturate(160%);
      -webkit-backdrop-filter: blur(32px) saturate(160%);
      border-left: 1px solid rgba(255,255,255,.65);
      display: flex; flex-direction: column;
      z-index: 300;
      box-shadow: -6px 0 40px rgba(99,102,241,.1), -1px 0 0 rgba(255,255,255,.6);
      animation: slideIn .25s cubic-bezier(.32,1,.32,1);
      overflow: hidden;
    }
    /* Pastel ambient blobs visible through the frosted glass */
    .ai-panel::before {
      content: '';
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background:
        radial-gradient(ellipse 65% 38% at 100%  0%,  rgba(199,210,254,.6) 0%, transparent 100%),
        radial-gradient(ellipse 55% 42% at   0% 100%, rgba(221,214,254,.5) 0%, transparent 100%),
        radial-gradient(ellipse 40% 28% at  50%  50%, rgba(238,242,255,.4) 0%, transparent 100%);
    }
    .ai-header, .welcome, .messages, .input-area { position: relative; z-index: 1; }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }

    /* ── Header ───────────────────────────────────────── */
    .ai-header {
      position: relative; overflow: hidden; flex-shrink: 0;
      padding: 20px 20px 16px;
      border-bottom: 1px solid rgba(99,102,241,.1);
      background: linear-gradient(135deg,
        rgba(238,242,255,.95) 0%,
        rgba(255,255,255,.75) 100%);
    }
    .header-glow {
      position: absolute; top: -50px; right: -50px;
      width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, rgba(199,210,254,.7) 0%, transparent 65%);
      pointer-events: none;
    }
    .ai-header::after {
      content: '';
      position: absolute; bottom: -24px; left: -16px;
      width: 100px; height: 100px; border-radius: 50%;
      background: radial-gradient(circle, rgba(221,214,254,.5) 0%, transparent 70%);
      pointer-events: none;
    }
    .header-top {
      display: flex; align-items: center; justify-content: space-between;
      position: relative; z-index: 1;
    }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--violet); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(99,102,241,.4);
    }
    .header-icon .material-icons-round { font-size: 20px; color: #fff; }
    .header-title { font-size: 15px; font-weight: 700; color: var(--text); line-height: 1.2; }
    .header-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
    .header-actions { display: flex; align-items: center; gap: 4px; }
    .icon-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s;
    }
    .icon-btn:hover { background: var(--surface); color: var(--text); }
    .icon-btn .material-icons-round { font-size: 18px; }

    /* ── Project scope selector ──────────────────────── */
    .scope-row {
      display: flex; align-items: center; gap: 7px;
      margin-top: 12px; position: relative; z-index: 1;
    }
    .scope-ico { font-size: 15px; color: var(--violet); flex-shrink: 0; }
    .scope-select {
      flex: 1; appearance: none;
      background: rgba(255,255,255,.7); border: 1.5px solid rgba(99,102,241,.2);
      border-radius: 10px; padding: 7px 30px 7px 11px;
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text);
      outline: none; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 8px center;
      transition: border-color .15s, box-shadow .15s;
    }
    .scope-select:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(199,210,254,.4); }

    /* ── Welcome ──────────────────────────────────────── */
    .welcome {
      flex: 1; display: flex; flex-direction: column;
      padding: 24px 20px 16px; gap: 24px; overflow-y: auto;
      background: linear-gradient(180deg, rgba(238,242,255,.5) 0%, transparent 50%);
    }
    .welcome-hero { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
    .welcome-orb {
      width: 64px; height: 64px; border-radius: 20px;
      background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(99,102,241,.35);
    }
    .welcome-orb .material-icons-round { font-size: 30px; color: #fff; }
    .welcome-title { font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
    .welcome-sub { font-size: 13px; color: var(--text-muted); margin: 0; max-width: 280px; line-height: 1.5; }

    .quick-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .quick-card {
      display: flex; flex-direction: column; gap: 8px; align-items: flex-start;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      padding: 12px; cursor: pointer; text-align: left;
      transition: border-color .15s, background .15s, transform .15s;
    }
    .quick-card:hover {
      border-color: var(--violet); background: var(--violet-c);
      transform: translateY(-1px);
    }
    .quick-icon { font-size: 18px; color: var(--violet); }
    .quick-text { font-size: 12px; color: var(--text); line-height: 1.4; font-weight: 500; }

    /* ── Messages ─────────────────────────────────────── */
    .messages {
      flex: 1; overflow-y: auto; padding: 20px 16px;
      display: flex; flex-direction: column; gap: 20px;
      scrollbar-width: thin; scrollbar-color: var(--border) transparent;
    }
    .msg { display: flex; gap: 10px; align-items: flex-end; }
    .msg.user { flex-direction: row-reverse; }

    .msg-avatar {
      width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
      margin-bottom: 2px;
    }
    .msg-avatar .material-icons-round { font-size: 15px; color: #fff; }

    .msg-bubble {
      max-width: 82%; padding: 11px 14px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.6;
    }
    .msg.user .msg-bubble {
      background: var(--violet); color: #fff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 12px rgba(99,102,241,.3);
    }
    .msg.assistant .msg-bubble {
      background: rgba(255,255,255,.7); color: var(--text);
      border: 1px solid rgba(99,102,241,.12); border-bottom-left-radius: 4px;
      backdrop-filter: blur(8px);
    }
    .msg-text {
      margin: 0; white-space: pre-wrap; word-break: break-word;
      font-family: 'DM Sans', sans-serif; font-size: 13.5px;
    }
    .md-body { white-space: normal; word-break: break-word; font-family: 'DM Sans', sans-serif; font-size: 13.5px; line-height: 1.65; }
    .md-body p  { margin: 0 0 8px; }
    .md-body p:last-child { margin-bottom: 0; }
    .md-body ul, .md-body ol { margin: 4px 0 8px; padding-left: 20px; }
    .md-body li { margin-bottom: 4px; }
    .md-body strong { font-weight: 700; color: var(--text); }
    .md-body em { font-style: italic; }
    .md-body h1, .md-body h2, .md-body h3 { margin: 10px 0 4px; font-weight: 700; color: var(--text); }
    .md-body h1 { font-size: 15px; }
    .md-body h2 { font-size: 14px; }
    .md-body h3 { font-size: 13.5px; }
    .md-body code { background: rgba(99,102,241,.1); border-radius: 4px; padding: 1px 5px; font-size: 12.5px; font-family: monospace; }
    .md-body pre { background: rgba(99,102,241,.08); border-radius: 8px; padding: 10px 12px; overflow-x: auto; margin: 6px 0; }
    .md-body pre code { background: none; padding: 0; }
    .md-body hr { border: none; border-top: 1px solid var(--border); margin: 10px 0; }

    /* ── Thinking animation ───────────────────────────── */
    .msg-avatar.pulsing {
      animation: avatarPulse 1.8s ease-in-out infinite;
    }
    @keyframes avatarPulse {
      0%, 100% { box-shadow: 0 2px 8px rgba(99,102,241,.3); }
      50%       { box-shadow: 0 0 0 6px rgba(99,102,241,.15), 0 2px 16px rgba(99,102,241,.5); }
    }

    .msg-bubble.thinking {
      background: var(--surface);
      border: 1px solid var(--border);
      min-width: 200px;
    }

    .thinking-body { display: flex; flex-direction: column; gap: 10px; }

    .thinking-label {
      display: flex; align-items: center; gap: 7px;
      font-size: 12px; font-weight: 600; color: var(--violet);
      letter-spacing: .3px;
    }
    .thinking-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--violet);
      animation: dotPulse 1.2s ease-in-out infinite;
    }
    @keyframes dotPulse {
      0%, 100% { opacity: .4; transform: scale(.85); }
      50%       { opacity: 1;  transform: scale(1.15); }
    }

    .shimmer-lines { display: flex; flex-direction: column; gap: 7px; }
    .shimmer-line {
      height: 9px; border-radius: 6px;
      background: linear-gradient(90deg,
        rgba(199,210,254,.5) 0%, rgba(238,242,255,.9) 40%, rgba(199,210,254,.5) 100%);
      background-size: 300% 100%;
      animation: shimmer 1.6s ease-in-out infinite;
    }
    .shimmer-line.w80 { width: 80%; }
    .shimmer-line.w60 { width: 60%; }
    .shimmer-line.w90 { width: 90%; }
    @keyframes shimmer {
      0%   { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    /* ── Input ────────────────────────────────────────── */
    .input-area {
      padding: 12px 16px 10px; flex-shrink: 0;
      border-top: 1px solid rgba(99,102,241,.1);
      background: linear-gradient(0deg, rgba(238,242,255,.6) 0%, transparent 100%);
      backdrop-filter: blur(12px);
    }
    .input-shell {
      display: flex; align-items: flex-end; gap: 0;
      background: rgba(255,255,255,.65);
      border: 1.5px solid rgba(99,102,241,.18);
      border-radius: 16px; padding: 6px 6px 6px 14px;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .input-shell.focused {
      border-color: var(--violet);
      background: rgba(255,255,255,.85);
      box-shadow: 0 0 0 3px rgba(199,210,254,.4);
    }
    .input-shell.disabled { opacity: .55; }
    .ai-input {
      flex: 1; background: none; border: none; outline: none;
      font-size: 13.5px; color: var(--text); font-family: 'DM Sans', sans-serif;
      resize: none; max-height: 110px; overflow-y: auto; line-height: 1.5;
      padding: 4px 0;
    }
    .ai-input::placeholder { color: var(--text-muted); }
    .send-btn {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      background: var(--violet); border: none; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .15s, transform .15s;
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.07); }
    .send-btn:disabled { opacity: .4; cursor: not-allowed; }
    .send-btn .material-icons-round { font-size: 17px; }
    .input-hint {
      margin: 6px 0 0; font-size: 11px; color: var(--text-muted);
      text-align: center; letter-spacing: .1px;
    }
  `],
})
export class AiAssistantComponent implements OnInit, AfterViewChecked {
  @Input() set projectId(id: string | undefined) {
    if (id) this.selectedProjectId = id;
  }
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  private aiSvc = inject(AiService);
  private projectSvc = inject(ProjectService);
  private sanitizer = inject(DomSanitizer);

  open     = signal(false);
  loading  = signal(false);
  messages = signal<Message[]>([]);
  projects = signal<Project[]>([]);
  input    = '';
  focused  = false;
  selectedProjectId: string | null = null;
  quickPrompts = QUICK_PROMPTS;

  private shouldScroll = false;

  ngOnInit() {
    this.projectSvc.getAll().subscribe(list => this.projects.set(list));
  }

  private toHtml(text: string): SafeHtml {
    const html = marked.parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  projectName(): string {
    return this.projects().find(p => p.id === this.selectedProjectId)?.name ?? '';
  }

  toggle() { this.open.update(v => !v); }
  close()  { this.open.set(false); }
  clearChat() { this.messages.set([]); }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messageList) {
      const el = this.messageList.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  onEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) { event.preventDefault(); this.send(); }
  }

  sendQuick(label: string) { this.input = label; this.send(); }

  send() {
    const text = this.input.trim();
    if (!text || this.loading()) return;

    this.input = '';
    this.loading.set(true);
    this.messages.update(msgs => [
      ...msgs,
      { role: 'user', text },
      { role: 'assistant', text: '', loading: true },
    ]);
    this.shouldScroll = true;

    this.aiSvc.ask(text, this.selectedProjectId ?? undefined).subscribe({
      next: (reply) => {
        this.messages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', text: reply, html: this.toHtml(reply) },
        ]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', text: 'Something went wrong.', html: this.toHtml('Something went wrong. Make sure the backend is running and Claude CLI is authenticated.') },
        ]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
    });
  }
}
