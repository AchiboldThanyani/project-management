import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@pm/auth/data-access';
import { SignalRService, NotificationService, ThemeService } from '@pm/shared/util';
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
          <img class="brand-logo" src="logo-icon.png" alt="ProjectHub" />
          <span class="brand-name">ProjectHub</span>
          <pm-notification-bell class="sb-bell" />
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
<a class="nav-item" routerLink="/sprint-board" routerLinkActive="active">
            <span class="material-icons-round">checklist</span> My Work
          </a>
          <a class="nav-item" routerLink="/calendar" routerLinkActive="active">
            <span class="material-icons-round">calendar_month</span> Calendar
          </a>
          @if (auth.isAdmin() || auth.isProjectManager()) {
            <div class="nav-divider"></div>
            <a class="nav-item" routerLink="/support" routerLinkActive="active">
              <span class="material-icons-round">support_agent</span> Customer Portal
            </a>
          }
          @if (auth.isAdmin()) {
            <a class="nav-item admin-link" routerLink="/admin" routerLinkActive="active">
              <span class="material-icons-round">admin_panel_settings</span> Admin
            </a>
          }
        </nav>

        <div class="sb-footer">
          <a class="nav-item" routerLink="/profile" routerLinkActive="active">
            <span class="material-icons-round">manage_accounts</span> Profile
          </a>
          <div class="nav-item theme-toggle" (click)="theme.toggle()">
            <span class="material-icons-round">{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</span>
            {{ theme.isDark() ? 'Light mode' : 'Dark mode' }}
          </div>
          <div class="nav-item signout" (click)="auth.logout()">
            <span class="material-icons-round">logout</span> Sign out
          </div>
        </div>
      </aside>

      <!-- ─── MAIN ────────────────────────────────────── -->
      <div class="main">
        <router-outlet></router-outlet>
      </div>

      <!-- ─── AI ASSISTANT (floating) — PM + Admin only ─ -->
      @if (auth.isAdmin() || auth.isProjectManager()) {
        <app-ai-assistant class="ai-fab" />
      }

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
      background: var(--sidebar-bg, #0D0D13);
      border-right: 1px solid rgba(255,255,255,0.055);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }

    /* Subtle top accent line */
    .sidebar::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent);
      pointer-events: none;
    }

    /* Faint bottom fade */
    .sidebar::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 100px;
      background: linear-gradient(to top, rgba(99,102,241,0.04), transparent);
      pointer-events: none;
    }

    /* ─── Brand ─── */
    .sb-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.055);
      position: relative; z-index: 1;
    }

    .brand-logo {
      width: 28px; height: 28px; border-radius: 7px;
      object-fit: contain; flex-shrink: 0;
    }
    .brand-name {
      font-size: 13.5px; font-weight: 700;
      color: rgba(255,255,255,0.92); letter-spacing: -0.2px;
      flex: 1;
    }
    .sb-bell { margin-left: auto; }

    /* ─── Nav ─── */
    .sb-nav {
      flex: 1;
      padding: 6px 8px;
      position: relative; z-index: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .nav-divider {
      height: 1px;
      background: rgba(255,255,255,0.055);
      margin: 6px 2px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 9px;
      padding: 7.5px 10px 7.5px 13px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 13px; font-weight: 500;
      color: rgba(255,255,255,0.4);
      transition: background 0.13s, color 0.13s;
      margin-bottom: 1px;
      text-decoration: none;
      position: relative;
      overflow: hidden;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.055);
      color: rgba(255,255,255,0.78);
    }
    .nav-item.active {
      background: rgba(255,255,255,0.07);
      color: #fff;
    }
    /* Left indicator bar */
    .nav-item.active::before {
      content: '';
      position: absolute; left: 0; top: 18%; height: 64%;
      width: 2.5px; border-radius: 0 2px 2px 0;
      background: var(--violet);
    }
    .nav-item .material-icons-round {
      font-size: 17px;
      color: inherit;
      opacity: 0.7;
      flex-shrink: 0;
    }
    .nav-item.active .material-icons-round { opacity: 1; }
    .nav-item:hover .material-icons-round   { opacity: 0.9; }

    .nav-item.signout { color: rgba(255,255,255,0.28); }
    .nav-item.signout:hover { background: rgba(244,63,94,0.1); color: var(--rose); }

    .nav-item.admin-link { color: rgba(245,158,11,0.65); }
    .nav-item.admin-link:hover { background: rgba(245,158,11,0.08); color: var(--amber); }
    .nav-item.admin-link.active {
      background: rgba(245,158,11,0.1);
      color: var(--amber);
    }
    .nav-item.admin-link.active::before { background: var(--amber); }

    .nav-item.theme-toggle { color: rgba(255,255,255,0.4); }
    .nav-item.theme-toggle:hover { background: rgba(255,255,255,0.055); color: rgba(255,255,255,0.78); }

    /* ─── Footer ─── */
    .sb-footer {
      padding: 8px 8px 10px;
      border-top: 1px solid rgba(255,255,255,0.055);
      position: relative; z-index: 1;
    }

    /* ─── AI FAB ─── */
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
  readonly theme = inject(ThemeService);
  private readonly signalr = inject(SignalRService);
  private readonly notifSvc = inject(NotificationService);

  ngOnInit(): void {
    this.theme.init();
    this.signalr.connect().then(() => this.notifSvc.init());
  }

  initials(first: string, last: string): string {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  }
}
