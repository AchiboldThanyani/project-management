import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, RegisterRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

export interface StoredUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(this.loadValidToken());
  private readonly _user = signal<StoredUser | null>(this.loadUserFromStorage());

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  constructor(private http: HttpClient, private router: Router) {
    // If token was cleared due to expiry, clean up storage and state
    if (!this._token() && localStorage.getItem('access_token')) {
      this.clearSession();
    }
  }

  register(request: RegisterRequest) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
      .pipe(tap((res) => this.setSession(res)));
  }

  login(request: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap((res) => this.setSession(res)));
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem('access_token', res.accessToken);
    if (res.refreshToken) {
      localStorage.setItem('refresh_token', res.refreshToken);
    }
    const user: StoredUser = { userId: res.userId, email: res.email, firstName: res.firstName, lastName: res.lastName };
    localStorage.setItem('auth_user', JSON.stringify(user));
    this._token.set(res.accessToken);
    this._user.set(user);
  }

  private clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    this._token.set(null);
    this._user.set(null);
  }

  private loadValidToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    if (this.isTokenExpired(token)) return null;
    return token;
  }

  private loadUserFromStorage(): StoredUser | null {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // JWT exp is in seconds; Date.now() is in milliseconds
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
