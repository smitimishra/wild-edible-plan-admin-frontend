import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

export type PlantPermission = 'view' | 'download' | 'both';

export interface UserSession {
  name:        string;
  phone:       string;
  email:       string;
  permission:  PlantPermission;
  token?:      string;    // JWT — used for single-device validation; may be empty before auth completes
}

const API             = 'http://192.168.29.69:8080/api';
const POLL_INTERVAL   = 30_000;   // check every 30 seconds

@Injectable({ providedIn: 'root' })
export class UserSessionService implements OnDestroy {

  private session: UserSession | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http:   HttpClient,
    private router: Router,
    private zone:   NgZone,
  ) {}

  save(s: UserSession): void {
    this.session = s;
    this.startPolling();
  }

  get(): UserSession | null { return this.session; }

  canView():     boolean { return !!this.session; }
  canDownload(): boolean {
    const p = this.session?.permission;
    return p === 'download' || p === 'both';
  }

  // ── Single-device polling ────────────────────────────────
  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.checkSession(), POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private checkSession(): void {
    const token = this.session?.token ?? '';
    if (!token) return;

    this.http.post<{ valid: boolean }>(`${API}/auth/validate-session`, { token })
      .subscribe({
        next:  res => { if (!res.valid) this.forceLogout(); },
        error: ()  => this.forceLogout(),   // 401 = another device logged in
      });
  }

  private forceLogout(): void {
    this.zone.run(() => {
      this.clear();
      alert('⚠️ You have been logged out because your account was accessed from another device.');
      this.router.navigate(['/welcome']);
    });
  }

  // ── Logout ───────────────────────────────────────────────
  logout(): void {
    const token = this.session?.token ?? '';
    if (token) {
      // Notify server to clear session_token in DB
      this.http.post(`${API}/auth/logout`, { token }).subscribe();
    }
    this.clear();
  }

  clear(): void {
    this.stopPolling();
    this.session = null;
  }

  ngOnDestroy(): void { this.stopPolling(); }
}
