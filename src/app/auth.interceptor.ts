import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// ============================================================
// When a 401 is received on any API call, the session is no
// longer valid.  Clear local storage and redirect the user
// back to the login portal.
// ============================================================

const LOGIN_PORTAL_URL = 'http://192.168.29.216:8200/';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const token = localStorage.getItem('token');

  const handleError = (error: HttpErrorResponse) => {

    if (error.status === 401) {

      // Clear session data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Hard redirect to login portal
      window.location.href = LOGIN_PORTAL_URL;

    }

    return throwError(() => error);
  };

  // Attach token to every outgoing request if available
  if (token) {

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(authReq).pipe(catchError(handleError));
  }

  return next(req).pipe(catchError(handleError));

};
