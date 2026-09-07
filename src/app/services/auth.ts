import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

// ============================================================
// When a session is invalidated by another device logging in,
// the user is shown a popup then redirected here.
// ============================================================

const LOGIN_PORTAL_URL = 'http://192.168.29.216:8200/welcome';
const POLL_INTERVAL_MS = 15_000;          // background poll — 15 s
const MOUSE_DEBOUNCE_MS = 5_000;          // mouse check — at most every 5 s

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {

  private apiUrl = 'http://192.168.29.216:3000/api/auth';

  // URL for the wildplant portal backend (port 8080)
  // The admin/manager/reviewer JWT tokens are issued by this backend.
  private portalApiUrl = 'http://192.168.29.216:8080/api/auth';

  // ── Session-invalid signal ──────────────────────────────────
  // Components subscribe to this and show the popup when true.
  private _sessionInvalid$ = new BehaviorSubject<boolean>(false);
  readonly sessionInvalid$: Observable<boolean> =
    this._sessionInvalid$.asObservable();

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastMouseCheck = 0;      // epoch ms of last mouse-triggered check

  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) {}


  // ============================================================
  // LOGIN
  // ============================================================

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  forceLogoutSession(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/force-logout-session`, {
      session_id: sessionId,
    });
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword });
  }


  // ============================================================
  // TOKEN / USER STORAGE
  // ============================================================

  saveToken(token: string): void { localStorage.setItem('token', token); }
  getToken(): string | null       { return localStorage.getItem('token'); }

  saveUser(user: any): void { localStorage.setItem('user', JSON.stringify(user)); }
  getUser(): any {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  getTokenRole(token: string | null = this.getToken()): string | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return typeof payload.role === 'string'
        ? payload.role.trim().toUpperCase() : null;
    } catch { return null; }
  }

  isTokenExpired(token: string | null = this.getToken()): boolean {
    if (!token) return true;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return typeof payload.exp !== 'number' ||
        payload.exp * 1000 <= Date.now();
    } catch { return true; }
  }

  isLoggedIn(): boolean { return !!this.getToken(); }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(redirectUrl?: string): void {
    this.stopSessionPolling();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  }


  // ============================================================
  // SESSION POLLING  (background — every 15 s)
  // ============================================================

  startSessionPolling(): void {
    this.stopSessionPolling();
    // Reset any stale invalid flag when a fresh session starts
    this._sessionInvalid$.next(false);

    this.zone.runOutsideAngular(() => {
      this.pollTimer = setInterval(() => this.checkSession(), POLL_INTERVAL_MS);
    });
  }

  stopSessionPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }


  // ============================================================
  // MOUSE-MOVEMENT SESSION CHECK
  // Call this from (mousemove) / (click) on dashboard pages.
  // Debounced to at most once every 5 s so it is never spammy.
  // ============================================================

  checkSessionOnActivity(): void {
    const now = Date.now();
    if (now - this.lastMouseCheck < MOUSE_DEBOUNCE_MS) return;
    this.lastMouseCheck = now;
    this.checkSession();
  }


  // ============================================================
  // CORE SESSION CHECK  (used by both polling + mouse)
  // ============================================================

  private checkSession(): void {
    const token = this.getToken();
    if (!token) { this.stopSessionPolling(); return; }

    // Use the wildplant backend (port 8080) because the JWT token
    // stored in localStorage on this portal was issued by that backend.
    // native fetch bypasses Angular HttpClient interceptor.
    fetch(`${this.portalApiUrl}/validate-session`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(res => {
        if (res.status === 401) this.markSessionInvalid();
      })
      .catch(() => { /* network blip — do not force logout */ });
  }

  // ── Called when validate-session returns 401 ──────────────
  private markSessionInvalid(): void {
    this.zone.run(() => {
      this.stopSessionPolling();
      // Signal all subscribed components to show the popup
      this._sessionInvalid$.next(true);
    });
  }

  // ── Called by the popup's OK button ───────────────────────
  acknowledgeSessionInvalid(): void {
    this._sessionInvalid$.next(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = LOGIN_PORTAL_URL;
  }


  ngOnDestroy(): void { this.stopSessionPolling(); }
}
