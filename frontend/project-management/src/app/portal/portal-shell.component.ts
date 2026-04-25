import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@pm/auth/data-access';

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="portal-layout">
      <aside class="portal-sidebar">
        <div class="portal-logo">
          <span class="material-icons-round" style="color:var(--violet)">support_agent</span>
          <span>Customer Portal</span>
        </div>
        <nav class="portal-nav">
          <a routerLink="/portal/tickets" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
            <span class="material-icons-round">confirmation_number</span> My Tickets
          </a>
          <a routerLink="/portal/tickets/new" routerLinkActive="active">
            <span class="material-icons-round">add_circle_outline</span> New Ticket
          </a>
        </nav>
        <div class="portal-user">
          <span class="material-icons-round">account_circle</span>
          <span>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</span>
          <button (click)="auth.logout()" title="Sign out">
            <span class="material-icons-round">logout</span>
          </button>
        </div>
      </aside>
      <main class="portal-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .portal-layout { display: flex; height: 100vh; background: var(--surface); }
    .portal-sidebar {
      width: 220px; background: var(--white); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; padding: 24px 0;
    }
    .portal-logo {
      display: flex; align-items: center; gap: 10px; padding: 0 20px 24px;
      font-size: 15px; font-weight: 600; color: var(--ink);
    }
    .portal-nav { flex: 1; padding: 0 12px; }
    .portal-nav a {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border-radius: 8px; text-decoration: none; color: var(--muted);
      font-size: 14px; font-weight: 500; margin-bottom: 4px;
      transition: all .15s;
    }
    .portal-nav a:hover, .portal-nav a.active {
      background: var(--violet-c); color: var(--violet);
    }
    .portal-nav a .material-icons-round { font-size: 18px; }
    .portal-user {
      display: flex; align-items: center; gap: 8px; padding: 16px 20px 0;
      border-top: 1px solid var(--border); font-size: 13px; color: var(--muted);
    }
    .portal-user button {
      background: none; border: none; cursor: pointer; color: var(--muted);
      margin-left: auto; display: flex; align-items: center;
    }
    .portal-main { flex: 1; overflow-y: auto; }
  `],
})
export class PortalShellComponent {
  auth = inject(AuthService);
}
