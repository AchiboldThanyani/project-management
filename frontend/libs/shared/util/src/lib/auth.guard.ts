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
  if (role === 'Customer') return router.createUrlTree(['/portal/tickets']);
  if (role === 'Admin') return router.createUrlTree(['/admin']);
  return router.createUrlTree(['/dashboard']);
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
  const role = getStoredRole();
  if (role === 'Internal' || role === 'Admin') return true;
  return router.createUrlTree(['/portal/tickets']);
};

export const customerGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!localStorage.getItem('access_token')) return router.createUrlTree(['/auth/login']);
  if (getStoredRole() === 'Customer') return true;
  return router.createUrlTree(['/dashboard']);
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!localStorage.getItem('access_token')) return router.createUrlTree(['/auth/login']);
  if (getStoredRole() === 'Admin') return true;
  return router.createUrlTree(['/dashboard']);
};
