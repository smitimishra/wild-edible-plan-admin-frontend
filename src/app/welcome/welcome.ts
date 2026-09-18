import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

const API = 'http://192.168.29.217:8080/api';

// Icon map for role names
const ROLE_ICONS: Record<string, string> = {
  'admin':          '🔧',
  'field operator': '🌿',
  'reviewer':       '🔍',
};

interface Role { roleId: number; roleName: string; }

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent implements OnInit, OnDestroy {

  roles: Role[] = [];       // loaded from API
  rolesLoading  = true;

  selectedRole  = '';
  emailId       = '';
  password      = '';
  showPassword  = false;    // eye icon toggle
  loading       = false;
  errorMsg      = '';
  lockoutSeconds = 0;
  private lockedEmail = '';
  private lockedUserName = '';
  private lockoutTimer?: ReturnType<typeof setInterval>;

  constructor(
    private http:   HttpClient,
    private router: Router,
    private cdr:    ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Load all roles from role_table
    this.http.get<Role[]>(`${API}/roles/all`).subscribe({
      next: roles => {
        this.roles        = roles;
        this.rolesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // Fallback to static if API unavailable
        // this.roles = [
        //   { roleId: 1, roleName: 'Admin'          },
        //   { roleId: 2, roleName: 'Field Operator' },
        //   { roleId: 3, roleName: 'Reviewer'       },
        // ];
        this.rolesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.stopLockoutTimer();
  }

  roleIcon(name: string): string {
    return ROLE_ICONS[name.toLowerCase().trim()] ?? '👤';
  }

  selectRole(roleName: string): void {
    this.selectedRole = roleName;
    this.errorMsg     = '';
    this.cdr.markForCheck();
  }

  get formVisible(): boolean { return !!this.selectedRole; }

  get isAdmin(): boolean {
    return this.selectedRole.trim().toLowerCase() === 'admin';
  }

  get isLocked(): boolean {
    return this.lockoutSeconds > 0
      && this.emailId.trim().toLowerCase() === this.lockedEmail
      && !this.isAdmin;
  }

  onEmailChange(): void {
    this.errorMsg = this.isLocked
      ? 'This user is blocked for 1 hour. Please try again after 1 hour.'
      : '';
    this.cdr.markForCheck();
  }

  private startLockoutTimer(lockedUntil: string, fallbackMinutes: number): void {
    const endTime = new Date(lockedUntil).getTime();
    const fallbackEndTime = Date.now() + fallbackMinutes * 60 * 1000;
    const targetTime = Number.isNaN(endTime) ? fallbackEndTime : endTime;

    this.stopLockoutTimer();
    const update = () => {
      this.lockoutSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
      if (this.lockoutSeconds === 0) {
        this.stopLockoutTimer();
        this.errorMsg = '';
        if (typeof window !== 'undefined') {
          window.alert(`${this.lockedUserName} can login now. The 1-hour block has ended.`);
        }
      }
      this.cdr.markForCheck();
    };

    update();
    this.lockoutTimer = setInterval(update, 1000);
  }

  private stopLockoutTimer(): void {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = undefined;
    }
  }

  login(): void {
    if (!this.selectedRole || !this.emailId.trim() || !this.password || this.isLocked) return;

    this.loading  = true;
    this.errorMsg = '';

    this.http.post<any>(`${API}/auth/login`, {
      emailId:  this.emailId.trim(),
      password: this.password,
      roleName: this.selectedRole,
    }).subscribe({
      next: res => {
        this.loading = false;
        this.cdr.markForCheck();
        sessionStorage.setItem('pendingUserId',   String(res.userId));
        sessionStorage.setItem('pendingUserName',  res.userName);
        sessionStorage.setItem('pendingRoleName',  this.selectedRole);
        sessionStorage.setItem('emailMasked',      res.emailMasked ?? '');
        if (res.otp) sessionStorage.setItem('devOtp', res.otp);
        this.router.navigate(['/verify-otp']);
      },
      error: err => {
        if (err.status === 429 && err.error?.error === 'account_locked') {
          const lockedUserName = err.error.userName ?? this.emailId.trim();
          this.lockedEmail = this.emailId.trim().toLowerCase();
          this.lockedUserName = lockedUserName;
          this.errorMsg = 'This user is blocked for 1 hour. Please try again after 1 hour.';
          if (typeof window !== 'undefined') {
            window.alert(`${lockedUserName} is blocked for 1 hour after 3 failed attempts.`);
          }
          this.startLockoutTimer(err.error.lockedUntil, err.error.minutesLeft ?? 60);
        } else {
          this.errorMsg = err.error?.error ?? 'Login failed';
        }
        this.loading  = false;
        this.cdr.markForCheck();
      },
    });
  }
}
