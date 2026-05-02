import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pm/auth/data-access';

@Component({
  selector: 'pm-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-split">

      <!-- LEFT: Form Panel -->
      <main class="form-panel">
        <div class="form-inner">

          <div class="form-heading">
            <h1 class="form-title">Create account</h1>
            <p class="form-sub">Join your team on ProjectHub</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">

            <div class="name-row">
              <div class="field-group">
                <label class="field-label">First name</label>
                <input class="field-input"
                       [class.err]="form.get('firstName')?.invalid && form.get('firstName')?.touched"
                       formControlName="firstName"
                       autocomplete="given-name" placeholder="Jane" />
                @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
                  <span class="field-error">Required</span>
                }
              </div>
              <div class="field-group">
                <label class="field-label">Last name</label>
                <input class="field-input"
                       [class.err]="form.get('lastName')?.invalid && form.get('lastName')?.touched"
                       formControlName="lastName"
                       autocomplete="family-name" placeholder="Doe" />
                @if (form.get('lastName')?.invalid && form.get('lastName')?.touched) {
                  <span class="field-error">Required</span>
                }
              </div>
            </div>

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
                       autocomplete="new-password"
                       placeholder="Min 8 chars, 1 uppercase, 1 digit" />
                <button type="button" class="eye-btn"
                        (click)="hidePassword = !hidePassword"
                        [title]="hidePassword ? 'Show password' : 'Hide password'">
                  <span class="material-icons-round">{{ hidePassword ? 'visibility' : 'visibility_off' }}</span>
                </button>
              </div>
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <span class="field-error">Min 8 chars · 1 uppercase · 1 digit</span>
              } @else {
                <span class="field-hint">Min 8 chars · 1 uppercase · 1 digit</span>
              }
            </div>

            @if (error) {
              <div class="api-error">{{ error }}</div>
            }

            <button type="submit" class="btn-submit" [disabled]="form.invalid || loading">
              @if (loading) { <span class="spinner"></span> }
              @if (!loading) {
                <span class="btn-label">
                  Create account
                  <span class="material-icons-round">arrow_forward</span>
                </span>
              }
            </button>

          </form>

          <p class="form-footer">
            Already have an account?
            <a routerLink="/auth/login" class="form-link">Sign in</a>
          </p>

        </div>
      </main>

      <!-- RIGHT: Art Panel -->
      <aside class="art-panel">
        <div class="art-inner">
          <div class="brand">
            <div class="brand-logo">
              <img src="logo-icon.png" alt="ProjectHub" />
            </div>
            <span class="brand-name">ProjectHub</span>
          </div>

          <div class="art-headline">
            <h2 class="art-title">Start something<br>great today.</h2>
          </div>
        </div>
      </aside>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

    /* ── Split layout ── */
    .auth-split {
      min-height: 100vh;
      display: flex;
    }

    /* ── Form Panel (LEFT for register) ── */
    .form-panel {
      flex: 1;
      background: #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      padding: 64px 56px;
      border-right: 1px solid rgba(0,0,0,0.07);
    }

    .form-inner {
      width: 100%; max-width: 380px;
      animation: formIn 0.55s cubic-bezier(0.32,1,0.32,1) both;
      animation-delay: 0.08s;
    }
    @keyframes formIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .form-heading { margin-bottom: 36px; }
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

    .auth-form { display: flex; flex-direction: column; gap: 26px; }

    .name-row {
      display: flex; gap: 20px;
    }
    .name-row .field-group { flex: 1; min-width: 0; }

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
    .field-hint {
      font-size: 11px; color: rgba(0,0,0,0.3);
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

    /* ── Art Panel (RIGHT for register) ── */
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
      width: 520px; height: 520px; border-radius: 50%;
      background: rgba(26,107,74,0.06);
      bottom: -180px; left: -180px;
      pointer-events: none;
    }
    .art-panel::after {
      content: '';
      position: absolute;
      width: 280px; height: 280px; border-radius: 50%;
      background: rgba(196,106,26,0.05);
      top: -80px; right: -80px;
      pointer-events: none;
    }

    .art-inner {
      position: relative; z-index: 1;
      display: flex; flex-direction: column; gap: 44px;
      max-width: 380px;
      animation: artIn 0.6s cubic-bezier(0.32,1,0.32,1) both;
    }
    @keyframes artIn {
      from { opacity: 0; transform: translateX(20px); }
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
    /* ── Responsive ── */
    @media (max-width: 820px) {
      .auth-split { flex-direction: column-reverse; }
      .art-panel {
        flex: 0 0 auto;
        padding: 36px 32px 32px;
        border-right: none;
      }
      .art-headline, .feat-list { display: none; }
      .art-inner { gap: 0; }
      .form-panel {
        flex: 1;
        padding: 40px 32px;
        border-right: none;
        border-top: 1px solid rgba(0,0,0,0.07);
      }
    }
  `],
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  hidePassword = true;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(8), Validators.pattern(/(?=.*[A-Z])(?=.*[0-9])/)]],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    this.authService.register(this.form.value).subscribe({
      next: () => {
        const route = this.authService.isClient() ? '/portal/tickets' : '/dashboard';
        this.router.navigate([route]);
      },
      error: (err: any) => {
        this.error = err?.error?.errors?.Identity?.[0] ?? err?.error?.error ?? 'Registration failed';
        this.loading = false;
      },
    });
  }
}
