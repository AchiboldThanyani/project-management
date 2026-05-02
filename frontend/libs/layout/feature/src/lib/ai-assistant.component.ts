import { Component, signal, computed, inject, Input, OnInit, ElementRef, ViewChild, AfterViewChecked, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { AiService, ChatMessage, PlanConversationMessage, PlanConversationPhase, PlanTaskItem } from '@pm/shared/util';
import { AuthService } from '@pm/auth/data-access';
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
    <button class="ai-fab" (mousedown)="startDrag($event)" (click)="onFabClick()" [class.open]="open()">
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
          <!-- Mode toggle — PM/Admin only -->
          @if (canUsePlanMode()) {
            <div class="mode-row">
              <button class="mode-chip" [class.active]="mode() === 'ask'" (click)="switchMode('ask')">
                <span class="material-icons-round">chat</span> Ask
              </button>
              <button class="mode-chip" [class.active]="mode() === 'plan'" (click)="switchMode('plan')">
                <span class="material-icons-round">auto_fix_high</span> Plan
              </button>
              @if (mode() === 'ask') {
                <span class="mode-divider"></span>
                <button class="mode-chip deep-chip" [class.active]="deepThinking()" (click)="toggleDeepThinking()" title="Deep Thinking — Claude selects only the data it needs">
                  <span class="material-icons-round">psychology</span> Deep
                </button>
              }
            </div>
          }
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

        @if (mode() === 'ask') {
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
                          {{ deepThinking() ? 'Analyzing...' : 'Thinking' }}
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

          <!-- Suggested follow-ups -->
          @if (suggestions().length > 0 && !loading()) {
            <div class="suggestions">
              @for (s of suggestions(); track s) {
                <button class="suggestion-chip" (click)="sendQuick(s)">
                  <span class="material-icons-round">arrow_forward</span>
                  {{ s }}
                </button>
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
        }

        <!-- ── Plan Mode ─────────────────────────────────── -->
        @if (mode() === 'plan') {
          <div class="plan-body">

            @if (planPhase() === 'clarifying' || planPhase() === 'generating') {
              <div class="messages" #planMessageList>
                @if (planMessages().length === 0) {
                  <div class="plan-welcome">
                    <div class="plan-icon"><span class="material-icons-round">auto_fix_high</span></div>
                    <p class="plan-hint">
                      @if (selectedProjectId) {
                        Describe a feature you want to plan for <strong>{{ projectName() }}</strong>.
                      } @else {
                        Describe the project you want to build. I'll ask a few questions, then generate a spec and task list.
                      }
                    </p>
                  </div>
                }
                @for (msg of planMessages(); track $index) {
                  <div class="msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                    @if (msg.role === 'assistant') {
                      <div class="msg-avatar" [class.pulsing]="$last && planLoading()">
                        <img src="bot.jpg" alt="bot" class="bot-img" />
                      </div>
                    }
                    <div class="msg-bubble" [class.thinking]="$last && planLoading() && msg.content === ''">
                      @if ($last && planLoading() && msg.content === '') {
                        <div class="thinking-body">
                          <div class="thinking-label"><span class="thinking-dot"></span>Thinking</div>
                          <div class="shimmer-lines">
                            <div class="shimmer-line w80"></div>
                            <div class="shimmer-line w60"></div>
                            <div class="shimmer-line w90"></div>
                          </div>
                        </div>
                      } @else if (msg.role === 'assistant') {
                        <div class="msg-text md-body" [innerHTML]="toHtml(msg.content)"></div>
                      } @else {
                        <pre class="msg-text">{{ msg.content }}</pre>
                      }
                    </div>
                  </div>
                }
              </div>

              @if (planError()) {
                <div class="plan-error">{{ planError() }}</div>
              }

              @if (planMessages().length >= 4 && !planLoading()) {
                <div class="plan-generate-row">
                  <button class="generate-btn" (click)="generateSpec()" [disabled]="planLoading()">
                    <span class="material-icons-round">rocket_launch</span> Generate spec &amp; tasks
                  </button>
                </div>
              }

              <div class="input-area">
                <div class="input-shell" [class.focused]="focused" [class.disabled]="planLoading()">
                  <textarea
                    [(ngModel)]="input"
                    (keydown.enter)="onPlanEnter($event)"
                    (focus)="focused = true"
                    (blur)="focused = false"
                    [disabled]="planLoading()"
                    placeholder="Describe your idea or answer the question…"
                    rows="1"
                    class="ai-input"
                  ></textarea>
                  <button class="send-btn" (click)="sendPlan()" [disabled]="!input.trim() || planLoading()">
                    <span class="material-icons-round">{{ planLoading() ? 'hourglass_top' : 'arrow_upward' }}</span>
                  </button>
                </div>
                <p class="input-hint">Enter to send · Shift+Enter for new line</p>
              </div>
            }

            @if (planPhase() === 'confirming') {
              <div class="confirm-panel">
                @if (!selectedProjectId) {
                  <label class="confirm-label">Project name</label>
                  <input class="confirm-input" [value]="newProjectName()" (input)="newProjectName.set($any($event.target).value)" />
                  <label class="confirm-label">Description</label>
                  <textarea class="confirm-textarea" [value]="newProjectDesc()" (input)="newProjectDesc.set($any($event.target).value)" rows="3"></textarea>
                }
                <div class="confirm-tasks-header">
                  <span class="confirm-tasks-title">Tasks ({{ confirmedTaskCount() }} / {{ pendingTasks().length }} selected)</span>
                </div>
                <div class="confirm-tasks">
                  @for (task of pendingTasks(); track $index) {
                    <label class="task-row" [class.unchecked]="!checkedTasks()[$index]">
                      <input type="checkbox" [checked]="checkedTasks()[$index]" (change)="toggleTask($index)" />
                      <div class="task-info">
                        <span class="task-title">{{ task.title }}</span>
                        <span class="task-desc">{{ task.description }}</span>
                      </div>
                      <span class="priority-badge" [class]="'p-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                    </label>
                  }
                </div>
                @if (planError()) {
                  <div class="plan-error">{{ planError() }}</div>
                }
                <button class="apply-btn" (click)="applyPlan()" [disabled]="confirmedTaskCount() === 0">
                  <span class="material-icons-round">check_circle</span>
                  Apply {{ confirmedTaskCount() }} task{{ confirmedTaskCount() !== 1 ? 's' : '' }}
                </button>
              </div>
            }

            @if (planPhase() === 'applying') {
              <div class="plan-applying">
                <span class="material-icons-round spinning">sync</span>
                Applying plan…
              </div>
            }

          </div>
        }

      </div>
    }
  `,
  styles: [`
    /* ── FAB ─────────────────────────────────────────── */
    :host { user-select: none; }
    :host(.dragging) { cursor: grabbing !important; }
    :host(.dragging) .ai-fab { cursor: grabbing !important; transform: scale(1.06); }

    .ai-fab {
      display: flex; align-items: center; gap: 8px;
      height: 46px; padding: 0 20px; border-radius: 23px;
      background: linear-gradient(135deg, var(--violet) 0%, #818cf8 100%);
      border: none; color: #fff;
      cursor: grab; font-size: 13.5px; font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 4px 20px rgba(99,102,241,.4), 0 1px 0 rgba(255,255,255,.15) inset;
      transition: transform .2s, box-shadow .2s, border-radius .2s, padding .2s;
      white-space: nowrap;
    }
    .ai-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,.52); }
    .ai-fab.open {
      padding: 0 14px; border-radius: 13px;
      background: var(--surface); color: var(--ink);
      border: 1px solid var(--border); box-shadow: none; cursor: grab;
    }
    .ai-fab .fab-icon { font-size: 19px; }
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
    .header-title { font-size: 15px; font-weight: 700; color: var(--ink); line-height: 1.2; }
    .header-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }
    .header-actions { display: flex; align-items: center; gap: 4px; }
    .icon-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: none; border: none; cursor: pointer;
      color: var(--muted); display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s;
    }
    .icon-btn:hover { background: var(--surface); color: var(--ink); }
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
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
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
      animation: orbBreath 3.5s ease-in-out infinite;
    }
    .welcome-orb .material-icons-round { font-size: 30px; color: #fff; }
    @keyframes orbBreath {
      0%, 100% { box-shadow: 0 8px 24px rgba(99,102,241,.35); transform: scale(1); }
      50%       { box-shadow: 0 10px 32px rgba(99,102,241,.52); transform: scale(1.04); }
    }
    .welcome-title { font-size: 18px; font-weight: 700; color: var(--ink); margin: 0; }
    .welcome-sub { font-size: 13px; color: var(--muted); margin: 0; max-width: 280px; line-height: 1.5; }

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
    .quick-text { font-size: 12px; color: var(--ink); line-height: 1.4; font-weight: 500; }

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
      box-shadow: 0 2px 10px rgba(99,102,241,.35);
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
      background: rgba(255,255,255,.7); color: var(--ink);
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
    .md-body strong { font-weight: 700; color: var(--ink); }
    .md-body em { font-style: italic; }
    .md-body h1, .md-body h2, .md-body h3 { margin: 10px 0 4px; font-weight: 700; color: var(--ink); }
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

    /* ── Suggestions ─────────────────────────────────── */
    .suggestions {
      padding: 8px 16px; display: flex; flex-direction: column; gap: 5px;
      flex-shrink: 0; border-top: 1px solid rgba(99,102,241,.08);
    }
    .suggestion-chip {
      display: flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,.6); border: 1px solid rgba(99,102,241,.18);
      border-radius: 10px; padding: 7px 12px;
      font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--ink);
      cursor: pointer; text-align: left; transition: border-color .15s, background .15s;
    }
    .suggestion-chip:hover { border-color: var(--violet); background: rgba(238,242,255,.8); color: var(--violet); }
    .suggestion-chip .material-icons-round { font-size: 13px; color: var(--violet); flex-shrink: 0; }

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
      font-size: 13.5px; color: var(--ink); font-family: 'DM Sans', sans-serif;
      resize: none; max-height: 110px; overflow-y: auto; line-height: 1.5;
      padding: 4px 0;
    }
    .ai-input::placeholder { color: var(--muted); }
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
      margin: 6px 0 0; font-size: 11px; color: var(--muted);
      text-align: center; letter-spacing: .1px;
    }

    /* ── Dark Mode ────────────────────────────────────── */
    :host-context([data-theme="dark"]) .ai-panel {
      background: rgba(22,22,31,.92);
      border-left-color: rgba(255,255,255,.08);
      box-shadow: -6px 0 40px rgba(0,0,0,.5), -1px 0 0 rgba(255,255,255,.06);
    }
    :host-context([data-theme="dark"]) .ai-panel::before {
      background:
        radial-gradient(ellipse 65% 38% at 100%  0%,  rgba(74,163,86,.12) 0%, transparent 100%),
        radial-gradient(ellipse 55% 42% at   0% 100%, rgba(74,163,86,.08) 0%, transparent 100%),
        radial-gradient(ellipse 40% 28% at  50%  50%, rgba(74,163,86,.06) 0%, transparent 100%);
    }
    :host-context([data-theme="dark"]) .ai-header {
      background: linear-gradient(135deg, rgba(30,30,44,.98) 0%, rgba(22,22,31,.85) 100%);
      border-bottom-color: rgba(255,255,255,.06);
    }
    :host-context([data-theme="dark"]) .header-glow {
      background: radial-gradient(circle, rgba(74,163,86,.15) 0%, transparent 65%);
    }
    :host-context([data-theme="dark"]) .ai-header::after {
      background: radial-gradient(circle, rgba(74,163,86,.1) 0%, transparent 70%);
    }
    :host-context([data-theme="dark"]) .scope-select {
      background: rgba(30,30,44,.8);
      border-color: rgba(255,255,255,.1);
      color: var(--ink);
    }
    :host-context([data-theme="dark"]) .welcome {
      background: linear-gradient(180deg, rgba(30,30,44,.6) 0%, transparent 50%);
    }
    :host-context([data-theme="dark"]) .msg.assistant .msg-bubble {
      background: rgba(30,30,44,.85);
      border-color: rgba(255,255,255,.08);
      color: var(--ink);
    }
    :host-context([data-theme="dark"]) .shimmer-line {
      background: linear-gradient(90deg,
        rgba(74,163,86,.2) 0%, rgba(74,163,86,.08) 40%, rgba(74,163,86,.2) 100%);
      background-size: 300% 100%;
    }
    :host-context([data-theme="dark"]) .suggestions {
      border-top-color: rgba(255,255,255,.06);
    }
    :host-context([data-theme="dark"]) .suggestion-chip {
      background: rgba(30,30,44,.8);
      border-color: rgba(255,255,255,.1);
      color: var(--ink);
    }
    :host-context([data-theme="dark"]) .suggestion-chip:hover {
      border-color: var(--violet);
      background: rgba(74,163,86,.12);
      color: var(--violet);
    }
    :host-context([data-theme="dark"]) .input-area {
      background: linear-gradient(0deg, rgba(22,22,31,.8) 0%, transparent 100%);
      border-top-color: rgba(255,255,255,.06);
    }
    :host-context([data-theme="dark"]) .input-shell {
      background: rgba(30,30,44,.8);
      border-color: rgba(255,255,255,.1);
    }
    :host-context([data-theme="dark"]) .input-shell.focused {
      background: rgba(30,30,44,.95);
      box-shadow: 0 0 0 3px rgba(74,163,86,.2);
    }
    :host-context([data-theme="dark"]) .ai-input { color: var(--ink); background: transparent; }
    :host-context([data-theme="dark"]) .ai-input::placeholder { color: var(--muted); }
    :host-context([data-theme="dark"]) .ai-fab.open {
      background: var(--surface);
      border-color: var(--border);
      color: var(--ink);
    }

    /* ── Plan Mode ────────────────────────────────────── */
    .mode-row {
      display: flex; gap: 6px; margin-top: 10px; position: relative; z-index: 1;
    }
    .mode-chip {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 14px; border-radius: 20px; border: 1.5px solid rgba(99,102,241,.2);
      background: rgba(255,255,255,.6); font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer;
      transition: all .15s;
    }
    .mode-chip .material-icons-round { font-size: 14px; }
    .mode-chip.active {
      background: var(--violet); color: #fff; border-color: var(--violet);
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
    }
    .mode-chip:not(.active):hover { border-color: var(--violet); color: var(--violet); }
    .mode-divider { width: 1px; height: 16px; background: var(--border); margin: 0 2px; align-self: center; }
    .deep-chip.active { background: var(--violet-mid); color: var(--violet); border-color: var(--violet); box-shadow: none; }

    .plan-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .plan-welcome {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 32px 24px; text-align: center;
    }
    .plan-icon {
      width: 56px; height: 56px; border-radius: 18px;
      background: linear-gradient(135deg, var(--violet), #818cf8);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px rgba(99,102,241,.35);
    }
    .plan-icon .material-icons-round { font-size: 26px; color: #fff; }
    .plan-hint { font-size: 13px; color: var(--muted); max-width: 280px; line-height: 1.5; margin: 0; }

    .plan-generate-row {
      padding: 8px 16px; flex-shrink: 0;
    }
    .generate-btn {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px; border-radius: 12px; border: none;
      background: var(--violet); color: #fff; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 3px 12px rgba(99,102,241,.35);
      transition: opacity .15s, transform .15s;
    }
    .generate-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: .92; }
    .generate-btn:disabled { opacity: .45; cursor: not-allowed; }
    .generate-btn .material-icons-round { font-size: 16px; }

    .plan-error {
      margin: 6px 16px; padding: 8px 12px; border-radius: 8px;
      background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
      color: #dc2626; font-size: 12px; line-height: 1.4;
    }

    .confirm-panel {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .confirm-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
    .confirm-input {
      width: 100%; padding: 8px 12px; border-radius: 10px;
      border: 1.5px solid rgba(99,102,241,.2); background: rgba(255,255,255,.7);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      outline: none; transition: border-color .15s;
      box-sizing: border-box;
    }
    .confirm-input:focus { border-color: var(--violet); }
    .confirm-textarea {
      width: 100%; padding: 8px 12px; border-radius: 10px;
      border: 1.5px solid rgba(99,102,241,.2); background: rgba(255,255,255,.7);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      outline: none; resize: vertical; transition: border-color .15s;
      box-sizing: border-box;
    }
    .confirm-textarea:focus { border-color: var(--violet); }
    .confirm-tasks-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 0;
    }
    .confirm-tasks-title { font-size: 12px; font-weight: 600; color: var(--muted); }
    .confirm-tasks { display: flex; flex-direction: column; gap: 6px; }
    .task-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      border: 1px solid rgba(99,102,241,.12);
      background: rgba(255,255,255,.6); cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .task-row:hover { border-color: rgba(99,102,241,.3); }
    .task-row.unchecked { opacity: .5; }
    .task-row input[type=checkbox] { margin-top: 2px; flex-shrink: 0; accent-color: var(--violet); }
    .task-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .task-title { font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.3; }
    .task-desc { font-size: 11.5px; color: var(--muted); line-height: 1.4; }
    .priority-badge {
      flex-shrink: 0; padding: 2px 8px; border-radius: 20px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
      margin-top: 1px;
    }
    .p-low    { background: rgba(107,114,128,.12); color: #6b7280; }
    .p-medium { background: rgba(245,158,11,.12);  color: #d97706; }
    .p-high   { background: rgba(239,68,68,.12);   color: #dc2626; }

    .apply-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 12px; border-radius: 12px; border: none;
      background: var(--violet); color: #fff; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
      box-shadow: 0 3px 12px rgba(99,102,241,.35);
      transition: opacity .15s, transform .15s;
      margin-top: 4px;
    }
    .apply-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .apply-btn:disabled { opacity: .45; cursor: not-allowed; }
    .apply-btn .material-icons-round { font-size: 18px; }

    .plan-applying {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; color: var(--muted); font-size: 14px;
    }
    .plan-applying .material-icons-round { font-size: 32px; color: var(--violet); }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `],
})
export class AiAssistantComponent implements OnInit, AfterViewChecked {
  @Input() set projectId(id: string | undefined) {
    if (id) this.selectedProjectId = id;
  }
  @ViewChild('messageList')     private messageList?:     ElementRef<HTMLDivElement>;
  @ViewChild('planMessageList') private planMessageList?: ElementRef<HTMLDivElement>;

  @HostBinding('class.dragging') isDragging = false;

  private aiSvc = inject(AiService);
  private projectSvc = inject(ProjectService);
  private sanitizer = inject(DomSanitizer);
  private authSvc = inject(AuthService);
  private el = inject(ElementRef);

  // Plan Mode state
  mode            = signal<'ask' | 'plan'>('ask');
  canUsePlanMode  = computed(() => this.authSvc.isProjectManager() || this.authSvc.isAdmin());
  planPhase       = signal<'clarifying' | 'generating' | 'confirming' | 'applying'>('clarifying');
  planMessages    = signal<PlanConversationMessage[]>([]);
  planLoading     = signal(false);
  planError       = signal('');
  pendingSpec     = signal('');
  pendingTasks    = signal<PlanTaskItem[]>([]);
  checkedTasks    = signal<boolean[]>([]);
  newProjectName  = signal('');
  newProjectDesc  = signal('');
  confirmedTaskCount = computed(() => this.checkedTasks().filter(Boolean).length);

  open          = signal(false);
  loading       = signal(false);
  deepThinking  = signal(localStorage.getItem('ai-deep-thinking') === 'true');
  messages      = signal<Message[]>([]);
  projects      = signal<Project[]>([]);
  suggestions   = signal<string[]>([]);
  input         = '';
  focused       = false;
  selectedProjectId: string | null = null;
  quickPrompts = QUICK_PROMPTS;

  private shouldScroll = false;
  private dragMoved = false;
  private readonly FAB_POS_KEY = 'ai-fab-pos';

  ngOnInit() {
    this.projectSvc.getAll().subscribe(list => this.projects.set(list));
    const saved = localStorage.getItem(this.FAB_POS_KEY);
    if (saved) {
      try {
        const { top, left } = JSON.parse(saved) as { top: number; left: number };
        this.applyPos(top, left);
      } catch { /* ignore corrupt data */ }
    }
  }

  startDrag(event: MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();

    const host = this.el.nativeElement as HTMLElement;
    const rect = host.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = rect.top;
    const startLeft = rect.left;
    this.dragMoved = false;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!this.dragMoved && Math.hypot(dx, dy) < 5) return;
      if (!this.dragMoved) { this.dragMoved = true; this.isDragging = true; }
      const newTop  = Math.max(8, Math.min(window.innerHeight - rect.height - 8, startTop  + dy));
      const newLeft = Math.max(8, Math.min(window.innerWidth  - rect.width  - 8, startLeft + dx));
      this.applyPos(newTop, newLeft);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.isDragging = false;
      if (this.dragMoved) {
        const r = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
        localStorage.setItem(this.FAB_POS_KEY, JSON.stringify({ top: r.top, left: r.left }));
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private applyPos(top: number, left: number) {
    const s = (this.el.nativeElement as HTMLElement).style;
    s.top = top + 'px';
    s.left = left + 'px';
    s.bottom = 'auto';
    s.right = 'auto';
  }

  onFabClick() {
    if (this.dragMoved) { this.dragMoved = false; return; }
    this.open.update(v => !v);
  }

  toHtml(text: string): SafeHtml {
    const html = marked.parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  projectName(): string {
    return this.projects().find(p => p.id === this.selectedProjectId)?.name ?? '';
  }

  close() { this.open.set(false); }
  clearChat() { this.messages.set([]); this.suggestions.set([]); }

  switchMode(m: 'ask' | 'plan') {
    this.mode.set(m);
    this.messages.set([]);
    this.suggestions.set([]);
    this.planMessages.set([]);
    this.planPhase.set('clarifying');
    this.planError.set('');
    this.pendingSpec.set('');
    this.pendingTasks.set([]);
    this.checkedTasks.set([]);
    this.newProjectName.set('');
    this.newProjectDesc.set('');
  }

  sendPlan() {
    const text = this.input.trim();
    if (!text || this.planLoading()) return;

    this.planError.set('');
    const history = [...this.planMessages()];
    this.planMessages.update(msgs => [
      ...msgs,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);
    this.input = '';
    this.planLoading.set(true);
    this.shouldScroll = true;

    this.aiSvc.planConversation(history, text, 'Clarifying').subscribe({
      next: ({ response }) => {
        this.planMessages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', content: response ?? '' },
        ]);
        this.planLoading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.planMessages.update(msgs => msgs.slice(0, -2));
        this.planError.set('Something went wrong. Try again.');
        this.planLoading.set(false);
      },
    });
  }

  onPlanEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) { event.preventDefault(); this.sendPlan(); }
  }

  generateSpec() {
    if (this.planLoading()) return;
    this.planError.set('');
    this.planPhase.set('generating');
    this.planLoading.set(true);

    const history = this.planMessages().filter(m => m.content !== '');
    this.aiSvc.planConversation(history, '', 'Generating').subscribe({
      next: ({ response }) => {
        this.pendingSpec.set(response ?? '');
        this.extractTasks(response ?? '');
      },
      error: () => {
        this.planPhase.set('clarifying');
        this.planError.set('Failed to generate spec. Try again.');
        this.planLoading.set(false);
      },
    });
  }

  private extractTasks(spec: string) {
    this.aiSvc.planConversation([], spec, 'Extracting').subscribe({
      next: ({ tasks }) => {
        if (!tasks || tasks.length === 0) {
          this.planError.set("Claude couldn't extract tasks. Try rephrasing and generate again.");
          this.planPhase.set('clarifying');
          this.planLoading.set(false);
          return;
        }
        const h1Match = spec.match(/^#\s+(.+)$/m);
        const paraMatch = spec.match(/^(?!#)[^\n]+\n/m);
        this.newProjectName.set(h1Match ? h1Match[1].trim() : 'New Project');
        this.newProjectDesc.set(paraMatch ? paraMatch[0].trim() : '');
        this.pendingTasks.set(tasks);
        this.checkedTasks.set(tasks.map(() => true));
        this.planPhase.set('confirming');
        this.planLoading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.planPhase.set('clarifying');
        this.planError.set('Failed to extract tasks. Try again.');
        this.planLoading.set(false);
      },
    });
  }

  toggleTask(index: number) {
    this.checkedTasks.update(arr => {
      const copy = [...arr];
      copy[index] = !copy[index];
      return copy;
    });
  }

  applyPlan() {
    const tasks = this.pendingTasks().filter((_, i) => this.checkedTasks()[i]);
    if (tasks.length === 0) return;
    this.planPhase.set('applying');
    this.planError.set('');

    if (this.selectedProjectId) {
      this.aiSvc.addPlanTasks(this.selectedProjectId, tasks).subscribe({
        next: () => this.onPlanApplied('Tasks added to backlog.'),
        error: () => {
          this.planPhase.set('confirming');
          this.planError.set('Failed to add tasks. Try again.');
        },
      });
    } else {
      this.aiSvc.createProjectFromPlan({
        name: this.newProjectName(),
        description: this.newProjectDesc(),
        tasks,
      }).subscribe({
        next: (p) => this.onPlanApplied(`Project "${p.name}" created with ${tasks.length} tasks.`),
        error: () => {
          this.planPhase.set('confirming');
          this.planError.set('Failed to create project. Try again.');
        },
      });
    }
  }

  private onPlanApplied(message: string) {
    this.planPhase.set('clarifying');
    this.planMessages.set([
      { role: 'assistant', content: `✅ ${message} Switch to Ask mode to query your new data.` },
    ]);
    this.pendingTasks.set([]);
    this.checkedTasks.set([]);
    this.pendingSpec.set('');
    this.planLoading.set(false);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      const el = (this.messageList ?? this.planMessageList)?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
        this.shouldScroll = false;
      }
    }
  }

  onEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) { event.preventDefault(); this.send(); }
  }

  sendQuick(label: string) { this.input = label; this.send(); }

  toggleDeepThinking() {
    const next = !this.deepThinking();
    this.deepThinking.set(next);
    localStorage.setItem('ai-deep-thinking', String(next));
  }

  send() {
    const text = this.input.trim();
    if (!text || this.loading()) return;

    this.suggestions.set([]);
    const history: ChatMessage[] = this.messages()
      .filter(m => !m.loading)
      .map(m => ({ role: m.role, content: m.text }));

    this.input = '';
    this.loading.set(true);
    this.messages.update(msgs => [
      ...msgs,
      { role: 'user', text },
      { role: 'assistant', text: '', loading: true },
    ]);
    this.shouldScroll = true;

    this.aiSvc.ask(text, this.selectedProjectId ?? undefined, history, this.deepThinking()).subscribe({
      next: ({ answer, suggestions }) => {
        this.messages.update(msgs => [
          ...msgs.slice(0, -1),
          { role: 'assistant', text: answer, html: this.toHtml(answer) },
        ]);
        this.suggestions.set(suggestions ?? []);
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
