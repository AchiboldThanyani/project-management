import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

// Messages for status codes that we want to surface globally.
// 401 is handled by the auth interceptor (redirect to login).
// 400 Validation errors are handled per-form; suppress them here.
const STATUS_MESSAGES: Record<number, string> = {
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The resource may have been modified.',
  429: 'Too many requests. Please slow down.',
  500: 'A server error occurred. Please try again later.',
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Let auth interceptor handle 401; let components handle 400 validation
      if (err.status !== 401 && err.status !== 400) {
        const message = STATUS_MESSAGES[err.status] ?? 'An unexpected error occurred.';
        snackBar.open(message, 'Dismiss', {
          duration: 5000,
          panelClass: ['snack-error'],
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
        });
      }
      return throwError(() => err);
    })
  );
};
