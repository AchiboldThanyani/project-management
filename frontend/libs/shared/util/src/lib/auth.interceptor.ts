import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError, switchMap, filter, take, catchError } from 'rxjs';
import { environment } from './environment';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Module-level state so concurrent 401s don't each trigger a separate refresh call
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

function attachToken(req: Parameters<HttpInterceptorFn>[0], token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function clearSession(router: Router): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  router.navigate(['/auth/login']);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // Auth endpoints must not be intercepted — avoids infinite loops on the refresh call
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');
  const authReq = token ? attachToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        clearSession(router);
        return throwError(() => err);
      }

      // Another request is already refreshing — queue this one
      if (isRefreshing) {
        return refreshSubject.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap(newToken => next(attachToken(req, newToken)))
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return http
        .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
        .pipe(
          switchMap(res => {
            isRefreshing = false;
            localStorage.setItem('access_token', res.accessToken);
            localStorage.setItem('refresh_token', res.refreshToken);
            refreshSubject.next(res.accessToken);
            return next(attachToken(req, res.accessToken));
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            refreshSubject.next(null);
            clearSession(router);
            return throwError(() => refreshErr);
          })
        );
    })
  );
};
