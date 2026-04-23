import { Component, signal, inject, Input, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '@pm/shared/util';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  loading?: boolean;
}

const QUICK_PROMPTS = [
  'How is the team performing this sprint?',
  'Who has the most overdue tasks?',
  "What's blocking the current sprint?",
  'Which team member has the lightest workload?',
  'Summarize open customer tickets by priority.',
  'Who has been most productive recently?',
];

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Trigger button -->
    <button class="ai-trigger" (click)="toggle()" [class.active]="open()" title="AI Assistant">
      <span class="material-icons-round">auto_awesome</span>
    </button>

    <!-- Panel -->
    @if (open()) {
      <div class="ai-backdrop" (click)="close()"></div>
      <div class="ai-panel">
        <div class="ai-header">
          <div class="ai-header-left">
            <span class="material-icons-round" style="color:var(--violet)">auto_awesome</span>
            <span>AI Assistant</span>
          </div>
          <button class="close-btn" (click)="close()">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- Quick prompts (shown when no messages yet) -->
        @if (messages().length === 0) {
          <div class="welcome">
            <div class="welcome-icon">
              <span class="material-icons-round">smart_toy</span>
            </div>
            <p class="welcome-title">What would you like to know?</p>
            <p class="welcome-sub">Ask about project progress, team workload, blockers, or performance.</p>
            <div class="quick-prompts">
              @for (q of quickPrompts; track q) {
                <button class="quick-btn" (click)="sendQuick(q)">{{ q }}</button>
              }
            </div>
          </div>
        } @else {
          <!-- Message thread -->
          <div class="messages" #messageList>
            @for (msg of messages(); track $index) {
              <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                @if (msg.role === 'assistant') {
                  <div class="msg-avatar"><span class="material-icons-round">smart_toy</span></div>
                }
                <div class="msg-bubble">
                  @if (msg.loading) {
                    <div class="typing"><span></span><span></span><span></span></div>
                  } @else {
                    <pre class="msg-text">{{ msg.text }}</pre>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Input -->
        <div class="ai-input-row">
          <textarea
            [(ngModel)]="input"
            (keydown.enter)="onEnter($event)"
            [disabled]="loading()"
            placeholder="Ask about your projects..."
            rows="1"
            class="ai-input"
          ></textarea>
          <button class="send-btn" (click)="send()" [disabled]="!input.trim() || loading()">
            <span class="material-icons-round">{{ loading() ? 'hourglass_empty' : 'send' }}</span>
          </button>
        </div>
        <p class="ai-hint">Shift+Enter for new line · Enter to send · Powered by Claude</p>
      </div>
    }
  `,
  styles: [`
    /* Trigger */
    .ai-trigger {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--violet-c); border: 1px solid var(--violet);
      color: var(--violet); cursor: pointer; transition: all .15s;
      margin: 0 auto;
    }
    .ai-trigger:hover, .ai-trigger.active { background: var(--violet); color: #fff; }
    .ai-trigger .material-icons-round { font-size: 20px; }

    /* Backdrop */
    .ai-backdrop {
      position: fixed; inset: 0; z-index: 199;
      background: rgba(0,0,0,0.2);
    }

    /* Panel */
    .ai-panel {
      position: fixed; right: 0; top: 0; bottom: 0;
      width: 440px; max-width: 100vw;
      background: var(--card); border-left: 1px solid var(--border);
      display: flex; flex-direction: column;
      z-index: 200; box-shadow: -8px 0 32px rgba(0,0,0,0.12);
    }

    .ai-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .ai-header-left { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: var(--text); }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 4px; border-radius: 6px; }
    .close-btn:hover { background: var(--surface); }

    /* Welcome */
    .welcome {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 32px 24px; gap: 12px; text-align: center;
    }
    .welcome-icon {
      width: 56px; height: 56px; border-radius: 16px;
      background: var(--violet-c); display: flex; align-items: center; justify-content: center;
    }
    .welcome-icon .material-icons-round { font-size: 28px; color: var(--violet); }
    .welcome-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
    .welcome-sub { font-size: 13px; color: var(--text-muted); margin: 0; max-width: 300px; }
    .quick-prompts { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 340px; margin-top: 8px; }
    .quick-btn {
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 14px; font-size: 13px; color: var(--text); cursor: pointer;
      text-align: left; transition: all .15s;
    }
    .quick-btn:hover { border-color: var(--violet); color: var(--violet); background: var(--violet-c); }

    /* Messages */
    .messages {
      flex: 1; overflow-y: auto; padding: 16px 16px; display: flex; flex-direction: column; gap: 16px;
    }
    .msg { display: flex; gap: 10px; align-items: flex-start; }
    .msg.user { flex-direction: row-reverse; }
    .msg-avatar {
      width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
      background: var(--violet-c); display: flex; align-items: center; justify-content: center;
    }
    .msg-avatar .material-icons-round { font-size: 16px; color: var(--violet); }
    .msg-bubble {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      font-size: 13px; line-height: 1.55;
    }
    .msg.user .msg-bubble { background: var(--violet); color: #fff; border-bottom-right-radius: 4px; }
    .msg.assistant .msg-bubble { background: var(--surface); color: var(--text); border-bottom-left-radius: 4px; border: 1px solid var(--border); }
    .msg-text { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: 'DM Sans', sans-serif; font-size: 13px; }

    /* Typing indicator */
    .typing { display: flex; gap: 4px; align-items: center; padding: 2px 0; }
    .typing span {
      width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted);
      animation: bounce 1.2s infinite;
    }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: .5; } 40% { transform: scale(1); opacity: 1; } }

    /* Input */
    .ai-input-row {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 12px 16px; border-top: 1px solid var(--border); flex-shrink: 0;
    }
    .ai-input {
      flex: 1; background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 12px; font-size: 13px; color: var(--text);
      font-family: 'DM Sans', sans-serif; resize: none; outline: none;
      max-height: 120px; overflow-y: auto; transition: border-color .15s;
    }
    .ai-input:focus { border-color: var(--violet); }
    .ai-input:disabled { opacity: .5; }
    .send-btn {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      background: var(--violet); border: none; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: opacity .15s;
    }
    .send-btn:disabled { opacity: .5; cursor: not-allowed; }
    .send-btn .material-icons-round { font-size: 18px; }
    .ai-hint { margin: 0; padding: 0 16px 10px; font-size: 11px; color: var(--text-muted); text-align: center; flex-shrink: 0; }
  `],
})
export class AiAssistantComponent implements AfterViewChecked {
  @Input() projectId?: string;
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  private aiSvc = inject(AiService);

  open = signal(false);
  loading = signal(false);
  messages = signal<Message[]>([]);
  input = '';
  quickPrompts = QUICK_PROMPTS;

  private shouldScroll = false;

  toggle() { this.open.update(v => !v); }
  close() { this.open.set(false); }

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

  sendQuick(q: string) { this.input = q; this.send(); }

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

    this.aiSvc.ask(text, this.projectId).subscribe({
      next: (reply) => {
        this.messages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', text: reply },
        ]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', text: 'Something went wrong. Make sure the backend is running and `claude` CLI is authenticated.' },
        ]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
    });
  }
}
