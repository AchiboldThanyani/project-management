import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pm/auth/data-access';

@Component({
  selector: 'pm-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-split">

      <!-- LEFT: Art Panel -->
      <aside class="art-panel">
        <div class="art-inner">
          <div class="brand">
            <div class="brand-logo">
              <img src="logo-icon.png" alt="ProjectHub" />
            </div>
            <span class="brand-name">ProjectHub</span>
          </div>

          <div class="art-headline">
            <h2 class="art-title">Work better,<br>together.</h2>
          </div>

          <ul class="feat-list">
            <li><span class="feat-dot"></span>Real-time project tracking</li>
            <li><span class="feat-dot"></span>Team collaboration &amp; messaging</li>
            <li><span class="feat-dot"></span>AI-powered planning tools</li>
          </ul>
        </div>
      </aside>

      <!-- RIGHT: Form Panel -->
      <main class="form-panel">
        <div class="form-inner">

          <div class="form-heading">
            <h1 class="form-title">Welcome back</h1>
            <p class="form-sub">Sign in to continue to your workspace</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">

            <div class="field-group">
              <label class="field-label">Email address</label>
              <input class="field-input"
                     [class.err]="form.get('email')?.invalid && form.get('email')?.touched"
                     type="email" formControlName="email"
                     autocomplete="email" placeholder="you@company.com" />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <span class="field-error">Enter a valid email address</span>
              }
            </div>

            <div class="field-group">
              <label class="field-label">Password</label>
              <div class="pw-wrap" [class.err]="form.get('password')?.invalid && form.get('password')?.touched">
                <input class="field-input"
                       [type]="hidePassword ? 'password' : 'text'"
                       formControlName="password"
                       autocomplete="current-password"
                       placeholder="Your password" />
                <button type="button" class="eye-btn"
                        (click)="hidePassword = !hidePassword"
                        [title]="hidePassword ? 'Show password' : 'Hide password'">
                  <span class="material-icons-round">{{ hidePassword ? 'visibility' : 'visibility_off' }}</span>
                </button>
              </div>
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <span class="field-error">Password is required</span>
              }
            </div>

            @if (error) {
              <div class="api-error">{{ error }}</div>
            }

            <button type="submit" class="btn-submit" [disabled]="form.invalid || loading">
              @if (loading) { <span class="spinner"></span> }
              @if (!loading) {
                <span class="btn-label">
                  Sign in
                  <span class="material-icons-round">arrow_forward</span>
                </span>
              }
            </button>

          </form>

          <p class="form-footer">
            New to ProjectHub?
            <a routerLink="/auth/register" class="form-link">Create a free account</a>
          </p>

        </div>
      </main>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

    /* ── Split layout ── */
    .auth-split {
      min-height: 100vh;
      display: flex;
    }

    /* ── Art Panel ── */
    .art-panel {
      flex: 0 0 46%;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 64px 56px;
      background-color: #EEE7DA;
      background-image:
        linear-gradient(rgba(26,107,74,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(26,107,74,0.05) 1px, transparent 1px);
      background-size: 44px 44px;
    }

    .art-panel::before {
      content: '';
      position: absolute;
      width: 560px; height: 560px; border-radius: 50%;
      background: rgba(26,107,74,0.06);
      bottom: -200px; right: -180px;
      pointer-events: none;
    }
    .art-panel::after {
      content: '';
      position: absolute;
      width: 300px; height: 300px; border-radius: 50%;
      background: rgba(196,106,26,0.05);
      top: -90px; left: -90px;
      pointer-events: none;
    }

    .art-inner {
      position: relative; z-index: 1;
      display: flex; flex-direction: column; gap: 44px;
      max-width: 380px;
      animation: artIn 0.6s cubic-bezier(0.32,1,0.32,1) both;
    }
    @keyframes artIn {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .brand {
      display: flex; align-items: center; gap: 12px;
    }
    .brand-logo {
      width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
      background: #1A6B4A;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 18px rgba(26,107,74,0.32);
      overflow: hidden;
    }
    .brand-logo img { width: 24px; height: 24px; object-fit: contain; }
    .brand-name {
      font-family: 'Syne', sans-serif;
      font-weight: 700; font-size: 16px;
      color: #1C1210; letter-spacing: -0.3px;
    }

    .art-title {
      margin: 0 0 16px;
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 52px;
      line-height: 1.04; letter-spacing: -2.5px;
      color: #1C1210;
    }
    .art-desc {
      margin: 0;
      font-size: 15px; line-height: 1.65;
      color: #7A6A5A;
      font-family: 'DM Sans', sans-serif;
    }

    .feat-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: 13px;
    }
    .feat-list li {
      display: flex; align-items: center; gap: 11px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13.5px; color: #5A4A3A;
      font-weight: 500;
    }
    .feat-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      background: #1A6B4A;
      box-shadow: 0 0 0 3px rgba(26,107,74,0.14);
    }

    /* ── Form Panel ── */
    .form-panel {
      flex: 1;
      background: #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      padding: 64px 56px;
      border-left: 1px solid rgba(0,0,0,0.07);
    }

    .form-inner {
      width: 100%; max-width: 360px;
      animation: formIn 0.55s cubic-bezier(0.32,1,0.32,1) both;
      animation-delay: 0.08s;
    }
    @keyframes formIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .form-heading { margin-bottom: 40px; }
    .form-title {
      margin: 0 0 7px;
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 30px;
      letter-spacing: -1px; color: #1C1210; line-height: 1.15;
    }
    .form-sub {
      margin: 0;
      font-size: 14px; color: #9B8A7A;
      font-family: 'DM Sans', sans-serif;
    }

    .auth-form { display: flex; flex-direction: column; gap: 30px; }

    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.09em;
      color: #9B8A7A;
    }

    .field-input {
      width: 100%;
      padding: 10px 0;
      background: transparent;
      border: none;
      border-bottom: 1.5px solid rgba(0,0,0,0.13);
      border-radius: 0;
      color: #1C1210;
      font-family: 'DM Sans', sans-serif; font-size: 15px;
      outline: none;
      transition: border-color 0.22s;
      box-sizing: border-box;
    }
    .field-input::placeholder { color: rgba(0,0,0,0.22); }
    .field-input:focus { border-bottom-color: #1A6B4A; }
    .field-input.err   { border-bottom-color: #DC2626; }

    .pw-wrap {
      position: relative; display: flex; align-items: center;
    }
    .pw-wrap .field-input { padding-right: 34px; }
    .pw-wrap.err .field-input { border-bottom-color: #DC2626; }

    .eye-btn {
      position: absolute; right: 0;
      background: none; border: none; cursor: pointer; padding: 4px;
      color: rgba(0,0,0,0.28); display: flex; align-items: center;
      border-radius: 4px; transition: color 0.15s;
    }
    .eye-btn:hover { color: rgba(0,0,0,0.58); }
    .eye-btn .material-icons-round { font-size: 18px; }

    .field-error {
      font-size: 11px; color: #DC2626;
      font-family: 'DM Sans', sans-serif;
    }

    .api-error {
      background: #FEF2F2;
      border: 1px solid rgba(220,38,38,0.2);
      border-radius: 8px;
      color: #DC2626; font-size: 13px;
      padding: 10px 14px;
      font-family: 'DM Sans', sans-serif;
    }

    /* ── Button ── */
    .btn-submit {
      width: 100%; padding: 14px 24px;
      background: #1A6B4A;
      color: #fff; border: none; border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14.5px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(26,107,74,0.28);
      transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
      margin-top: 2px;
    }
    .btn-submit:hover:not(:disabled) {
      background: #155A3E;
      transform: translateY(-1px);
      box-shadow: 0 6px 26px rgba(26,107,74,0.38);
    }
    .btn-submit:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 12px rgba(26,107,74,0.22);
    }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-label {
      display: flex; align-items: center; gap: 8px;
    }
    .btn-label .material-icons-round {
      font-size: 18px; transition: transform 0.15s;
    }
    .btn-submit:hover:not(:disabled) .material-icons-round {
      transform: translateX(3px);
    }

    .spinner {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      animation: spin 0.65s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Footer ── */
    .form-footer {
      margin: 26px 0 0;
      font-size: 13.5px; color: #9B8A7A;
      font-family: 'DM Sans', sans-serif;
      text-align: center;
    }
    .form-link {
      color: #1A6B4A; font-weight: 600;
      text-decoration: none; transition: color 0.15s;
    }
    .form-link:hover { color: #155A3E; }

    /* ── Responsive ── */
    @media (max-width: 820px) {
      .auth-split { flex-direction: column; }
      .art-panel {
        flex: 0 0 auto;
        padding: 36px 32px 32px;
      }
      .art-headline, .feat-list { display: none; }
      .art-inner { gap: 0; }
      .form-panel {
        flex: 1;
        padding: 40px 32px;
        border-left: none;
        border-top: 1px solid rgba(0,0,0,0.07);
      }
    }
  `],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  hidePassword = true;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
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
        this.error = err?.error?.errors?.Password?.[0] ?? err?.error?.error ?? 'Login failed. Check your credentials.';
        this.loading = false;
      },
    });
  }
}
