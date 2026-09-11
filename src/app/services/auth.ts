import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

const LOGIN_PORTAL_URL = 'http://192.168.29.51:8200/welcome';

const POLL_INTERVAL_MS = 15_000;
const MOUSE_DEBOUNCE_MS = 5_000;

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // BACKEND API

  private apiUrl = 'http://192.168.29.51:3001/api/auth';

  // SESSION STATE

  private _sessionInvalid$ = new BehaviorSubject<boolean>(false);

  readonly sessionInvalid$: Observable<boolean> = this._sessionInvalid$.asObservable();

  // SESSION POLLING

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private lastMouseCheck = 0;

  // CONSTRUCTOR

  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) {}

  // LOGIN

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, {
      email,
      password,
    });
  }

  // FORCE LOGOUT SESSION

  forceLogoutSession(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/force-logout-session`, {
      session_id: sessionId,
    });
  }

  // REGISTER

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  // FORGOT PASSWORD

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, {
      email,
    });
  }

  // RESET PASSWORD

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, {
      token,
      newPassword,
    });
  }

  // SAVE TOKEN

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // GET TOKEN

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // SAVE USER

  saveUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // GET USER

  getUser(): any {
    const user = localStorage.getItem('user');

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('Failed to parse stored user:', error);

      return null;
    }
  }

  // GET ROLE FROM JWT

  getTokenRole(token: string | null = this.getToken()): string | null {
    if (!token) {
      return null;
    }

    try {
      const parts = token.split('.');

      if (parts.length !== 3) {
        return null;
      }

      let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');

      base64Payload += '='.repeat((4 - (base64Payload.length % 4)) % 4);

      const payload = JSON.parse(atob(base64Payload));

      return typeof payload.role === 'string' ? payload.role.trim().toUpperCase() : null;
    } catch (error) {
      console.error('Failed to decode JWT role:', error);

      return null;
    }
  }

  // CHECK TOKEN EXPIRATION

  isTokenExpired(token: string | null = this.getToken()): boolean {
    if (!token) {
      return true;
    }

    try {
      const parts = token.split('.');

      if (parts.length !== 3) {
        return true;
      }

      let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');

      base64Payload += '='.repeat((4 - (base64Payload.length % 4)) % 4);

      const payload = JSON.parse(atob(base64Payload));

      return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
    } catch (error) {
      console.error('Failed to check JWT expiration:', error);

      return true;
    }
  }

  // LOGIN STATE

  isLoggedIn(): boolean {
    const token = this.getToken();

    return !!token && !this.isTokenExpired(token);
  }

  // LOGOUT

  logout(redirectUrl?: string): void {
    this.stopSessionPolling();

    localStorage.removeItem('token');

    localStorage.removeItem('user');

    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  }

  // START SESSION POLLING

  startSessionPolling(): void {
    this.stopSessionPolling();

    this._sessionInvalid$.next(false);

    this.zone.runOutsideAngular(() => {
      this.pollTimer = setInterval(() => this.checkSession(), POLL_INTERVAL_MS);
    });
  }

  // STOP SESSION POLLING

  stopSessionPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);

      this.pollTimer = null;
    }
  }

  // CHECK SESSION ON USER ACTIVITY

  checkSessionOnActivity(): void {
    const now = Date.now();

    if (now - this.lastMouseCheck < MOUSE_DEBOUNCE_MS) {
      return;
    }

    this.lastMouseCheck = now;

    this.checkSession();
  }

  // VALIDATE CURRENT SESSION
  //
  // IMPORTANT:
  // This uses PORT 3001 because your /validate-session
  // endpoint is implemented in the same authentication
  // backend as /login.

  // VALIDATE CURRENT SESSION

  private checkSession(): void {
    const token = this.getToken();

    if (!token) {
      this.stopSessionPolling();
      return;
    }

    // Optional local expiration check first
    if (this.isTokenExpired(token)) {
      this.markSessionInvalid();
      return;
    }

    // VALIDATE SESSION USING BACKEND

    fetch(`${this.apiUrl}/validate-session`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({}),
    })
      .then((response) => {
        if (response.status === 401) {
          console.warn('Session validation returned 401 Unauthorized');

          this.markSessionInvalid();

          return;
        }

        if (!response.ok) {
          console.warn('Session validation returned HTTP status:', response.status);

          return;
        }

        return response.json();
      })
      .then((data) => {
        if (data) {
          console.log('Session validation successful:', data);
        }
      })
      .catch((error) => {
        // Network failure should not
        // immediately log the user out.

        console.warn('Session validation request failed:', error);
      });
  }

  // MARK SESSION INVALID

  private markSessionInvalid(): void {
    this.zone.run(() => {
      this.stopSessionPolling();

      this._sessionInvalid$.next(true);
    });
  }

  // ACKNOWLEDGE INVALID SESSION

  acknowledgeSessionInvalid(): void {
    this._sessionInvalid$.next(false);

    localStorage.removeItem('token');

    localStorage.removeItem('user');

    if (typeof window !== 'undefined') {
      window.location.href = LOGIN_PORTAL_URL;
    }
  }

  // DESTROY

  ngOnDestroy(): void {
    this.stopSessionPolling();
  }
}
