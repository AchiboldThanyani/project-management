import { Component, inject } from '@angular/core';
import { AuthService } from '@pm/auth/data-access';

@Component({
  selector: 'pm-profile',
  standalone: true,
  imports: [],
  template: `
    @if (auth.user(); as user) {
      <div class="profile-page">

        <!-- Header -->
        <div class="profile-header">
          <div class="avatar">{{ initials(user.firstName, user.lastName) }}</div>
          <div class="header-info">
            <h1 class="display-name">{{ user.firstName }} {{ user.lastName }}</h1>
            <span class="role-badge role-{{ user.role.toLowerCase() }}">{{ roleLabel(user.role) }}</span>
          </div>
        </div>

        <!-- Account details -->
        <div class="section-card">
          <div class="section-title">Account details</div>
          <div class="field-list">
            <div class="field-row">
              <span class="field-ico"><span class="material-icons-round">person</span></span>
              <div class="field-body">
                <span class="field-label">Full name</span>
                <span class="field-value">{{ user.firstName }} {{ user.lastName }}</span>
              </div>
            </div>
            <div class="field-row">
              <span class="field-ico"><span class="material-icons-round">email</span></span>
              <div class="field-body">
                <span class="field-label">Email</span>
                <span class="field-value">{{ user.email }}</span>
              </div>
            </div>
            <div class="field-row">
              <span class="field-ico"><span class="material-icons-round">badge</span></span>
              <div class="field-body">
                <span class="field-label">Role</span>
                <span class="field-value">{{ roleLabel(user.role) }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .profile-page {
      padding: 32px;
      max-width: 560px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Header ── */
    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: var(--r-full);
      background: var(--violet-mid);
      color: var(--violet);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .display-name {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.2;
    }

    .role-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: var(--r-full);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      width: fit-content;
    }
    .role-admin          { background: var(--violet-mid); color: var(--violet); }
    .role-projectmanager { background: #dbeafe; color: #2563eb; }
    .role-staff          { background: var(--surface); color: var(--soft); }
    .role-client         { background: #fef3c7; color: #d97706; }

    /* ── Section card ── */
    .section-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .section-title {
      padding: 12px 20px;
      font-size: 11px;
      font-weight: 600;
      color: var(--soft);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .field-list { display: flex; flex-direction: column; }

    .field-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
    }
    .field-row:last-child { border-bottom: none; }

    .field-ico {
      width: 32px;
      height: 32px;
      border-radius: var(--r-md);
      background: var(--surface);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .field-ico .material-icons-round { font-size: 16px; color: var(--soft); }

    .field-body {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .field-label { font-size: 11px; color: var(--soft); }
    .field-value { font-size: 13px; color: var(--ink); font-weight: 500; }
  `],
})
export class ProfileComponent {
  readonly auth = inject(AuthService);

  initials(first: string, last: string): string {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      Admin: 'Admin',
      ProjectManager: 'Project Manager',
      Staff: 'Staff',
      Client: 'Client',
    };
    return map[role] ?? role;
  }
}
