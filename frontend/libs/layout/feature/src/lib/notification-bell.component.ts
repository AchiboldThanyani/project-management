import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '@pm/shared/util';

@Component({
  selector: 'pm-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bell-wrap">
      <button class="bell-btn" (click)="toggle()" [class.active]="open()">
        <span class="material-icons-round">notifications</span>
        @if (svc.unreadCount() > 0) {
          <span class="badge">{{ svc.unreadCount() > 9 ? '9+' : svc.unreadCount() }}</span>
        }
      </button>

      @if (open()) {
        <div class="panel">
          <div class="panel-header">
            <span>Notifications</span>
            @if (svc.unreadCount() > 0) {
              <button class="mark-all" (click)="svc.markAllRead()">Mark all read</button>
            }
          </div>

          <div class="panel-body">
            @if (svc.notifications().length === 0) {
              <div class="empty">You're all caught up!</div>
            }
            @for (n of svc.notifications(); track n.id) {
              <div class="item" [class.unread]="!n.isRead" (click)="svc.markRead(n.id)">
                <span class="item-icon material-icons-round">{{ iconFor(n.type) }}</span>
                <div class="item-text">
                  <div class="item-title">{{ n.title }}</div>
                  <div class="item-body">{{ n.body }}</div>
                  <div class="item-time">{{ n.createdAt | date:'MMM d, h:mm a' }}</div>
                </div>
                @if (!n.isRead) { <div class="dot"></div> }
              </div>
            }
          </div>
        </div>

        <div class="backdrop" (click)="open.set(false)"></div>
      }
    </div>
  `,
  styles: [`
    .bell-wrap { position: relative; }

    .bell-btn {
      position: relative;
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    .bell-btn:hover, .bell-btn.active { background: rgba(255,255,255,0.12); color: #fff; }
    .bell-btn .material-icons-round { font-size: 20px; }

    .badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 17px; height: 17px; border-radius: 9px;
      background: #f43f5e; color: #fff;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      padding: 0 3px;
      border: 2px solid var(--ink);
    }

    .panel {
      position: fixed; top: 58px; left: 228px;
      width: 340px;
      background: rgba(255,255,255,.95);
      backdrop-filter: blur(24px) saturate(160%);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      z-index: 500;
      overflow: hidden;
    }

    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 10px;
      font-size: 13px; font-weight: 700; color: #1e1b4b;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }

    .mark-all {
      font-size: 11px; font-weight: 600; color: #6366f1;
      background: none; border: none; cursor: pointer;
    }
    .mark-all:hover { text-decoration: underline; }

    .panel-body { max-height: 360px; overflow-y: auto; }

    .empty {
      padding: 32px 16px; text-align: center;
      font-size: 13px; color: #94a3b8;
    }

    .item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid rgba(0,0,0,0.04);
      transition: background 0.12s;
      position: relative;
    }
    .item:hover { background: rgba(99,102,241,0.05); }
    .item.unread { background: rgba(99,102,241,0.04); }

    .item-icon {
      font-size: 18px; color: #6366f1;
      margin-top: 2px; flex-shrink: 0;
    }

    .item-text { flex: 1; min-width: 0; }
    .item-title { font-size: 12px; font-weight: 600; color: #1e1b4b; margin-bottom: 2px; }
    .item-body { font-size: 12px; color: #475569; line-height: 1.4; }
    .item-time { font-size: 10px; color: #94a3b8; margin-top: 4px; }

    .dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #6366f1; flex-shrink: 0; margin-top: 6px;
    }

    .backdrop {
      position: fixed; inset: 0; z-index: 499;
    }
  `]
})
export class NotificationBellComponent {
  readonly svc = inject(NotificationService);
  readonly open = signal(false);

  toggle(): void { this.open.update(v => !v); }

  iconFor(type: number): string {
    switch (type) {
      case 0: return 'assignment_ind';
      case 1: return 'block';
      case 2: return 'schedule';
      case 3: return 'reply';
      case 4: return 'warning';
      default: return 'notifications';
    }
  }
}
