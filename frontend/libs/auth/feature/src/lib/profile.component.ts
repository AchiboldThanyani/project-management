import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@pm/auth/data-access';

@Component({
  selector: 'pm-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-page">
      <div class="topbar">
        <h1 class="page-title">My Profile</h1>
        <p class="page-sub">Manage your account details</p>
      </div>

      <div *ngIf="auth.user() as user" class="profile-card">
        <div class="avatar-wrap">
          <div class="avatar">{{ initials(user.firstName, user.lastName) }}</div>
          <div class="avatar-glow"></div>
        </div>
        <div class="user-info">
          <h2 class="user-name">{{ user.firstName }} {{ user.lastName }}</h2>
          <p class="user-email">
            <span class="material-icons-round email-ico">email</span>
            {{ user.email }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 28px 32px;
      max-width: 600px;
      display: flex; flex-direction: column; gap: 24px;
    }

    .topbar {}
    .page-title { margin: 0 0 2px; font-size: 20px; font-weight: 700; color: var(--ink); }
    .page-sub   { margin: 0; font-size: 13px; color: var(--muted); }

    .profile-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 28px 32px;
      display: flex; align-items: center; gap: 24px;
      box-shadow: var(--shadow-sm);
    }

    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; color: #fff;
      position: relative; z-index: 1;
    }
    .avatar-glow {
      position: absolute; inset: -4px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(102,68,221,0.3), rgba(0,184,160,0.3));
      filter: blur(8px);
      z-index: 0;
    }

    .user-info { display: flex; flex-direction: column; gap: 6px; }
    .user-name { margin: 0; font-size: 20px; font-weight: 700; color: var(--ink); }
    .user-email {
      margin: 0; display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: var(--muted);
    }
    .email-ico { font-size: 15px; color: var(--soft); }
  `],
})
export class ProfileComponent {
  readonly auth = inject(AuthService);

  initials(first: string, last: string): string {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  }
}
