import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@pm/auth/data-access';

@Component({
  selector: 'pm-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">

        <!-- Brand -->
        <div class="brand">
          <div class="brand-ico">
            <span class="material-icons-round">hub</span>
          </div>
          <span class="brand-name">ProjectHub</span>
        </div>

        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to your account</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">

          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="input-wrap">
              <span class="material-icons-round input-ico">email</span>
              <input class="field-input" type="email" formControlName="email"
                     autocomplete="email" placeholder="you@example.com" />
            </div>
            <span class="field-error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
              Valid email required
            </span>
          </div>

          <div class="field-group">
            <label class="field-label">Password</label>
            <div class="input-wrap">
              <span class="material-icons-round input-ico">lock</span>
              <input class="field-input" [type]="hidePassword ? 'password' : 'text'"
                     formControlName="password" autocomplete="current-password" placeholder="••••••••" />
              <button type="button" class="eye-btn" (click)="hidePassword = !hidePassword">
                <span class="material-icons-round">{{ hidePassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            <span class="field-error" *ngIf="form.get('password')?.invalid && form.get('password')?.touched">
              Password required
            </span>
          </div>

          <div class="api-error" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
            <span class="spinner" *ngIf="loading"></span>
            <span *ngIf="!loading">Sign In</span>
          </button>

        </form>

        <p class="auth-footer">
          Don't have an account?
          <a routerLink="/auth/register" class="auth-link">Register</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      background: var(--ink);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    /* Background grid texture */
    .auth-page::before {
      content: '';
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    /* Violet glow */
    .auth-page::after {
      content: '';
      position: absolute; top: -80px; right: -60px;
      width: 320px; height: 320px; border-radius: 50%;
      background: radial-gradient(circle, rgba(58,138,69,0.2) 0%, transparent 70%);
      pointer-events: none;
    }

    .auth-card {
      width: 100%; max-width: 400px;
      background: var(--ink-2);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--r-xl);
      padding: 36px 32px;
      box-shadow: var(--shadow-lg);
      position: relative; z-index: 1;
    }

    .brand {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 28px;
    }
    .brand-ico {
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--violet);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(58,138,69,0.4);
    }
    .brand-ico .material-icons-round { font-size: 16px; color: #fff; }
    .brand-name { font-size: 14px; font-weight: 700; color: #fff; }

    .auth-title {
      margin: 0 0 4px;
      font-size: 22px; font-weight: 700;
      color: #fff;
    }
    .auth-sub {
      margin: 0 0 28px;
      font-size: 13px; color: rgba(255,255,255,0.4);
    }

    .auth-form { display: flex; flex-direction: column; gap: 16px; }

    .field-group { display: flex; flex-direction: column; gap: 5px; }
    .field-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); }

    .input-wrap {
      position: relative; display: flex; align-items: center;
    }
    .input-ico {
      position: absolute; left: 11px;
      font-size: 16px; color: rgba(255,255,255,0.25);
      pointer-events: none;
    }
    .field-input {
      width: 100%; padding: 10px 12px 10px 36px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--r-md);
      color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px;
      outline: none; transition: border-color 0.15s;
    }
    .field-input::placeholder { color: rgba(255,255,255,0.2); }
    .field-input:focus { border-color: var(--violet); }

    .eye-btn {
      position: absolute; right: 8px;
      background: none; border: none; cursor: pointer; padding: 4px;
      color: rgba(255,255,255,0.3); display: flex; align-items: center;
      transition: color 0.15s;
    }
    .eye-btn:hover { color: rgba(255,255,255,0.6); }
    .eye-btn .material-icons-round { font-size: 16px; }

    .field-error {
      font-size: 11px; color: var(--rose);
    }

    .api-error {
      background: rgba(244,63,94,0.12);
      border: 1px solid rgba(244,63,94,0.3);
      border-radius: var(--r-md);
      color: var(--rose); font-size: 12px;
      padding: 8px 12px;
    }

    .btn-primary {
      width: 100%; padding: 11px;
      background: var(--violet); color: #fff;
      border: none; border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background 0.15s, opacity 0.15s;
      display: flex; align-items: center; justify-content: center;
      margin-top: 4px;
    }
    .btn-primary:hover:not(:disabled) { background: var(--violet-2); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-footer {
      margin: 24px 0 0; text-align: center;
      font-size: 12px; color: rgba(255,255,255,0.35);
    }
    .auth-link { color: var(--violet-2); text-decoration: none; font-weight: 600; }
    .auth-link:hover { color: #fff; }
  `],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  hidePassword = true;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    this.authService.login(this.form.value).subscribe({
      next: () => {
          const route = this.authService.isClient() ? '/portal/tickets' : '/dashboard';
          this.router.navigate([route]);
        },
      error: (err: any) => {
        this.error = err?.error?.errors?.Password?.[0] ?? err?.error?.error ?? 'Login failed';
        this.loading = false;
      },
    });
  }
}
