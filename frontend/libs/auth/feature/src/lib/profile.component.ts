import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@pm/auth/data-access';
import { environment } from '@pm/shared/util';

interface TokenDto {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedTokenDto extends TokenDto {
  token: string;
}

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

        <!-- Developer Tokens -->
        <div class="section-card">
          <div class="section-title-row">
            <span class="section-title-text">Developer tokens</span>
            <button class="btn-new-token" (click)="showForm.set(!showForm())">
              <span class="material-icons-round">{{ showForm() ? 'close' : 'add' }}</span>
              {{ showForm() ? 'Cancel' : 'New token' }}
            </button>
          </div>

          @if (showForm()) {
            <div class="token-form">
              <input
                class="token-label-input"
                placeholder="Token label (e.g. Claude Code laptop)"
                [(value)]="newLabel"
                (input)="newLabel = $any($event.target).value" />
              <button class="btn-generate" [disabled]="!newLabel.trim() || generating()" (click)="generateToken()">
                @if (generating()) { <span class="spinner-sm"></span> }
                Generate
              </button>
            </div>
          }

          @if (newToken()) {
            <div class="token-reveal">
              <span class="material-icons-round reveal-icon">key</span>
              <div class="reveal-body">
                <p class="reveal-label">Copy your token now — it won't be shown again.</p>
                <code class="reveal-value">{{ newToken()!.token }}</code>
              </div>
              <button class="btn-copy" (click)="copy(newToken()!.token)" [title]="copied() ? 'Copied!' : 'Copy'">
                <span class="material-icons-round">{{ copied() ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
          }

          @if (tokens().length === 0 && !newToken()) {
            <p class="empty-tokens">No tokens yet. Generate one to use with Claude Code or the MCP server.</p>
          }

          @if (tokens().length > 0) {
            <div class="token-list">
              @for (token of tokens(); track token.id) {
                <div class="token-row">
                  <span class="material-icons-round token-icon">vpn_key</span>
                  <div class="token-meta">
                    <span class="token-name">{{ token.label }}</span>
                    <span class="token-prefix">{{ token.prefix }}...</span>
                  </div>
                  <div class="token-dates">
                    <span class="token-date">Created {{ formatDate(token.createdAt) }}</span>
                    @if (token.lastUsedAt) {
                      <span class="token-date">Last used {{ formatDate(token.lastUsedAt) }}</span>
                    } @else {
                      <span class="token-date muted">Never used</span>
                    }
                  </div>
                  <button class="btn-revoke" (click)="revoke(token.id)" title="Revoke token">
                    <span class="material-icons-round">delete_outline</span>
                  </button>
                </div>
              }
            </div>
          }
        </div>

      </div>
    }
  `,
  styles: [`
    .profile-page {
      padding: 32px;
      max-width: 600px;
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
      width: 64px; height: 64px;
      border-radius: var(--r-full);
      background: var(--violet-mid);
      color: var(--violet);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .header-info { display: flex; flex-direction: column; gap: 6px; }

    .display-name {
      margin: 0;
      font-size: 20px; font-weight: 700;
      color: var(--ink); line-height: 1.2;
    }

    .role-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: var(--r-full);
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase;
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
      font-size: 11px; font-weight: 600;
      color: var(--soft); text-transform: uppercase; letter-spacing: 0.06em;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .section-title-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 10px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .section-title-text {
      font-size: 11px; font-weight: 600;
      color: var(--soft); text-transform: uppercase; letter-spacing: 0.06em;
    }

    .btn-new-token {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 12px;
      background: var(--violet-mid); color: var(--violet);
      border: none; border-radius: var(--r-md);
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: background 0.15s;
    }
    .btn-new-token:hover { background: var(--violet); color: #fff; }
    .btn-new-token .material-icons-round { font-size: 15px; }

    /* ── Form ── */
    .token-form {
      display: flex; gap: 10px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
    }

    .token-label-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--surface);
      color: var(--ink); font-size: 13px;
      outline: none;
    }
    .token-label-input:focus { border-color: var(--violet); }

    .btn-generate {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      background: var(--violet); color: #fff;
      border: none; border-radius: var(--r-md);
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-generate:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── Reveal ── */
    .token-reveal {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 20px;
      background: #f0fdf4;
      border-bottom: 1px solid #bbf7d0;
    }
    .reveal-icon { color: #16a34a; margin-top: 2px; }
    .reveal-body { flex: 1; min-width: 0; }
    .reveal-label { margin: 0 0 6px; font-size: 12px; color: #15803d; font-weight: 500; }
    .reveal-value {
      display: block;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      color: #166534;
      word-break: break-all;
      background: #dcfce7;
      padding: 6px 10px;
      border-radius: 6px;
    }

    .btn-copy {
      background: none; border: none; cursor: pointer;
      color: #16a34a; padding: 4px;
      border-radius: 6px; transition: background 0.12s;
      flex-shrink: 0;
    }
    .btn-copy:hover { background: #dcfce7; }
    .btn-copy .material-icons-round { font-size: 18px; }

    /* ── Token list ── */
    .empty-tokens {
      margin: 0; padding: 20px;
      font-size: 13px; color: var(--soft); text-align: center;
    }

    .token-list { display: flex; flex-direction: column; }

    .token-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
    }
    .token-row:last-child { border-bottom: none; }

    .token-icon { font-size: 18px; color: var(--soft); flex-shrink: 0; }

    .token-meta { flex: 1; min-width: 0; }
    .token-name { display: block; font-size: 13px; font-weight: 600; color: var(--ink); }
    .token-prefix {
      font-family: 'Fira Code', monospace;
      font-size: 11px; color: var(--soft);
    }

    .token-dates { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .token-date { font-size: 11px; color: var(--soft); }
    .token-date.muted { opacity: 0.6; }

    .btn-revoke {
      background: none; border: none; cursor: pointer;
      color: var(--soft); padding: 4px;
      border-radius: 6px; transition: color 0.12s, background 0.12s;
      flex-shrink: 0;
    }
    .btn-revoke:hover { color: var(--rose); background: rgba(244,63,94,0.08); }
    .btn-revoke .material-icons-round { font-size: 18px; }

    /* ── Field list (account details) ── */
    .field-list { display: flex; flex-direction: column; }

    .field-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
    }
    .field-row:last-child { border-bottom: none; }

    .field-ico {
      width: 32px; height: 32px;
      border-radius: var(--r-md);
      background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .field-ico .material-icons-round { font-size: 16px; color: var(--soft); }

    .field-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .field-label { font-size: 11px; color: var(--soft); }
    .field-value { font-size: 13px; color: var(--ink); font-weight: 500; }

    /* ── Spinner ── */
    .spinner-sm {
      width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly tokens = signal<TokenDto[]>([]);
  readonly newToken = signal<CreatedTokenDto | null>(null);
  readonly showForm = signal(false);
  readonly generating = signal(false);
  readonly copied = signal(false);
  newLabel = '';

  ngOnInit() {
    this.loadTokens();
  }

  private loadTokens() {
    this.http.get<TokenDto[]>(`${environment.apiUrl}/tokens`)
      .subscribe({ next: t => this.tokens.set(t) });
  }

  generateToken() {
    if (!this.newLabel.trim()) return;
    this.generating.set(true);
    this.http.post<CreatedTokenDto>(`${environment.apiUrl}/tokens`, { label: this.newLabel.trim() })
      .subscribe({
        next: created => {
          this.newToken.set(created);
          this.tokens.update(list => [created, ...list]);
          this.newLabel = '';
          this.showForm.set(false);
          this.generating.set(false);
        },
        error: () => this.generating.set(false),
      });
  }

  revoke(id: string) {
    this.http.delete(`${environment.apiUrl}/tokens/${id}`)
      .subscribe({
        next: () => {
          this.tokens.update(list => list.filter(t => t.id !== id));
          if (this.newToken()?.id === id) this.newToken.set(null);
        },
      });
  }

  copy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  initials(first: string, last: string): string {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      Admin: 'Admin', ProjectManager: 'Project Manager', Staff: 'Staff', Client: 'Client',
    };
    return map[role] ?? role;
  }
}
