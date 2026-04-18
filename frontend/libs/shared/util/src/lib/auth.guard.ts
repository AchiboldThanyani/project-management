import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (localStorage.getItem('access_token')) return true;
  return router.createUrlTree(['/auth/login']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!localStorage.getItem('access_token')) return true;
  const role = getStoredRole();
  return router.createUrlTree([role === 'Customer' ? '/portal/tickets' : '/dashboard']);
};

function getStoredRole(): string {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw).role ?? 'Internal' : 'Internal';
  } catch { return 'Internal'; }
}

export const internalGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!localStorage.getItem('access_token')) return router.createUrlTree(['/auth/login']);
  if (getStoredRole() === 'Internal') return true;
  return router.createUrlTree(['/portal/tickets']);
};

export const customerGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!localStorage.getItem('access_token')) return router.createUrlTree(['/auth/login']);
  if (getStoredRole() === 'Customer') return true;
  return router.createUrlTree(['/dashboard']);
};
