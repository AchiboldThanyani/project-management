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
  return router.createUrlTree(['/dashboard']);
};
