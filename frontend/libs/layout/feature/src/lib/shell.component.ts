import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@pm/auth/data-access';
import { SignalRService, NotificationService } from '@pm/shared/util';
import { AiAssistantComponent } from './ai-assistant.component';
import { NotificationBellComponent } from './notification-bell.component';

@Component({
  selector: 'pm-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, AiAssistantComponent, NotificationBellComponent],
  template: `
    <div class="app-layout">

      <!-- ─── SIDEBAR ────────────────────────────────── -->
      <aside class="sidebar">
        <div class="sb-brand">
          <div class="brand-ico">
            <span class="material-icons-round">hub</span>
          </div>
          <span class="brand-name">ProjectHub</span>
          <pm-notification-bell class="sb-bell" />
        </div>

        <div class="sb-user" *ngIf="auth.user() as user">
          <div class="user-ava">{{ initials(user.firstName, user.lastName) }}</div>
          <div>
            <div class="user-name">{{ user.firstName }} {{ user.lastName }}</div>
            <div class="user-role">{{ user.email }}</div>
          </div>
        </div>

        <nav class="sb-nav">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
            <span class="material-icons-round">home</span> Dashboard
          </a>
          <a class="nav-item" routerLink="/projects" routerLinkActive="active">
            <span class="material-icons-round">folder</span> Projects
          </a>
          <a class="nav-item" routerLink="/teams" routerLinkActive="active">
            <span class="material-icons-round">group</span> Teams
          </a>
          <a class="nav-item" routerLink="/messages" routerLinkActive="active">
            <span class="material-icons-round">chat_bubble_outline</span> Messages
          </a>
          <a class="nav-item" routerLink="/sprint-board" routerLinkActive="active">
            <span class="material-icons-round">checklist</span> My Work
          </a>
          <a class="nav-item" routerLink="/activity" routerLinkActive="active">
            <span class="material-icons-round">history</span> Activity
          </a>
        </nav>

        <div class="sb-footer">
          <a class="nav-item" routerLink="/profile" routerLinkActive="active">
            <span class="material-icons-round">manage_accounts</span> Profile
          </a>
          <div class="nav-item signout" (click)="auth.logout()">
            <span class="material-icons-round">logout</span> Sign out
          </div>
        </div>
      </aside>

      <!-- ─── MAIN ────────────────────────────────────── -->
      <div class="main">
        <router-outlet></router-outlet>
      </div>

      <!-- ─── AI ASSISTANT (floating) ───────────────── -->
      <app-ai-assistant class="ai-fab" />

    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--page);
    }

    /* ─── Sidebar ─── */
    .sidebar {
      width: 220px;
      min-width: 220px;
      background: var(--ink);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    /* Grid texture */
    .sidebar::before {
      content: '';
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    /* Violet glow */
    .sidebar::after {
      content: '';
      position: absolute; bottom: -60px; left: -40px;
      width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, var(--violet-mid) 0%, transparent 70%);
      pointer-events: none;
    }

    .sb-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      position: relative; z-index: 1;
      text-decoration: none;
    }

    .brand-ico {
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--violet);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(58,138,69,0.4);
      flex-shrink: 0;
    }
    .brand-ico .material-icons-round { font-size: 16px; color: #fff; }
    .brand-name { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.2px; flex: 1; }
    .sb-bell { margin-left: auto; }

    .sb-user {
      display: flex; align-items: center; gap: 9px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 4px;
      position: relative; z-index: 1;
    }

    .user-ava {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .user-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85); }
    .user-role { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }

    .sb-nav {
      flex: 1;
      padding: 4px 8px;
      position: relative; z-index: 1;
      display: flex;
      flex-direction: column;
    }

    .nav-item {
      display: flex; align-items: center; gap: 9px;
      padding: 8px 10px; border-radius: var(--r-md);
      cursor: pointer;
      font-size: 13px; font-weight: 500;
      color: rgba(255,255,255,0.45);
      transition: background 0.15s, color 0.15s;
      margin-bottom: 1px;
      text-decoration: none;
    }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
    .nav-item.active { background: var(--violet-mid); color: #fff; }
    .nav-item .material-icons-round { font-size: 17px; }
    .nav-item.signout { color: rgba(255,255,255,0.3); }
    .nav-item.signout:hover { background: rgba(244,63,94,0.12); color: var(--rose); }

    .sb-footer {
      padding: 10px 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
      position: relative; z-index: 1;
    }

    .ai-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 300;
    }

    /* ─── Main ─── */
    .main {
      flex: 1;
      overflow-y: auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly signalr = inject(SignalRService);
  private readonly notifSvc = inject(NotificationService);

  ngOnInit(): void {
    this.signalr.connect().then(() => this.notifSvc.init());
  }

  initials(first: string, last: string): string {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  }
}
