import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InviteService } from '@pm/tasks/data-access';
import { AuthService } from '@pm/auth/data-access';
import { Invite } from '@pm/shared/models';

@Component({
  selector: 'app-join-project',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="join-page">
      <div class="join-card">
        <div class="join-logo">
          <span class="material-icons-round" style="font-size:40px;color:var(--violet)">support_agent</span>
        </div>

        @if (loading()) {
          <div class="spinner-center"><div class="spinner"></div></div>
        } @else if (invalid()) {
          <div class="invalid-state">
            <span class="material-icons-round" style="font-size:40px;color:#c0392b">error_outline</span>
            <h2>Invalid Invite</h2>
            <p>This invite link is invalid or has expired.</p>
            <a href="/auth/login" class="btn-primary">Back to Login</a>
          </div>
        } @else if (invite()) {
          <h2>You've been invited</h2>
          <p class="invite-desc">Register to access the customer portal for <strong>{{ invite()!.projectName }}</strong>.</p>

          <form (ngSubmit)="register()">
            <div class="field-row">
              <div class="field">
                <label>First Name</label>
                <input [(ngModel)]="firstName" name="firstName" required />
              </div>
              <div class="field">
                <label>Last Name</label>
                <input [(ngModel)]="lastName" name="lastName" required />
              </div>
            </div>
            <div class="field">
              <label>Email</label>
              <input [(ngModel)]="email" name="email" type="email" required />
            </div>
            <div class="field">
              <label>Password</label>
              <input [(ngModel)]="password" name="password" type="password" required />
            </div>
            @if (error()) { <div class="error-msg">{{ error() }}</div> }
            <button type="submit" class="btn-primary" [disabled]="submitting()">
              {{ submitting() ? 'Registering...' : 'Create Account & Join' }}
            </button>
          </form>

          <p class="login-link">Already have an account? <a routerLink="/auth/login">Sign in</a></p>
        }
      </div>
    </div>
  `,
  styles: [`
    .join-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--surface); }
    .join-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; width: 420px; max-width: 95vw; }
    .join-logo { text-align: center; margin-bottom: 24px; }
    h2 { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
    .invite-desc { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; }
    .spinner-center { display: flex; justify-content: center; padding: 32px; }
    .invalid-state { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
    form { display: flex; flex-direction: column; gap: 16px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
    input { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--text); background: var(--surface); outline: none; }
    input:focus { border-color: var(--violet); }
    .btn-primary { width: 100%; background: var(--violet); color: #fff; border: none; padding: 12px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 4px; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .error-msg { background: #fdecea; color: #c0392b; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
    .login-link { text-align: center; font-size: 13px; color: var(--text-muted); margin-top: 20px; }
    .login-link a { color: var(--violet); text-decoration: none; font-weight: 500; }
  `],
})
export class JoinProjectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inviteSvc = inject(InviteService);
  private authSvc = inject(AuthService);

  invite = signal<Invite | null>(null);
  loading = signal(true);
  invalid = signal(false);
  submitting = signal(false);
  error = signal('');

  firstName = '';
  lastName = '';
  email = '';
  password = '';

  private token = '';

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.inviteSvc.getInfo(this.token).subscribe({
      next: (inv) => { this.invite.set(inv); this.loading.set(false); },
      error: () => { this.invalid.set(true); this.loading.set(false); },
    });
  }

  register() {
    if (!this.firstName || !this.lastName || !this.email || !this.password) return;
    this.submitting.set(true);
    this.error.set('');
    this.authSvc.register({
      firstName: this.firstName, lastName: this.lastName,
      email: this.email, password: this.password,
      inviteToken: this.token,
    }).subscribe({
      next: () => this.router.navigate(['/portal/tickets']),
      error: (err) => {
        this.error.set(err?.error?.description ?? 'Registration failed.');
        this.submitting.set(false);
      },
    });
  }
}
