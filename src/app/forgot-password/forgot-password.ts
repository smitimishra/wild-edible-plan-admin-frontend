import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

const API = 'http://192.168.29.69:8080/api';

type Step = 'email' | 'otp' | 'reset' | 'done';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  // Default change detection — Angular detects all state changes automatically
})
export class ForgotPasswordComponent {

  step: Step = 'email';

  // Step 1 — email
  emailId      = '';
  emailLoading = false;
  emailError   = '';
  emailMasked  = '';
  devOtp       = '';
  userId: number | null = null;

  // Step 2 — OTP
  otpCode    = '';
  otpLoading = false;
  otpError   = '';

  // Step 3 — new password
  newPassword     = '';
  confirmPassword = '';
  resetLoading    = false;
  resetError      = '';

  constructor(
    private http:   HttpClient,
    private router: Router,
    private cdr:     ChangeDetectorRef,
  ) {}

  // ── Step 1: send OTP to email ──────────────────────────
  sendOtp(): void {
    if (!this.emailId.trim()) return;
    this.emailLoading = true;
    this.emailError   = '';

    this.http.post<any>(`${API}/auth/forgot-password`, {
      step: 1,
      emailId: this.emailId.trim(),
    })
      .subscribe({
        next: res => {
          this.userId       = res.userId;
          this.emailMasked  = res.emailMasked ?? this.emailId;
          if (res.otp) this.devOtp = res.otp;
          this.emailLoading = false;
          this.step         = 'otp';
          this.cdr.markForCheck();
        },
        error: err => {
          this.emailError   = err.error?.error ?? 'Failed to send OTP';
          this.emailLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Step 2: verify OTP ─────────────────────────────────
  verifyOtp(): void {
    if (!this.otpCode.trim() || !this.userId) return;

    if (this.otpCode.trim().length !== 6) {
      this.otpError = 'Please enter the 6-digit OTP';
      return;
    }

    this.otpLoading = true;
    this.otpError   = '';

    this.http.post<any>(`${API}/auth/forgot-password`, {
      step: 2,
      userId: this.userId,
      otpCode: this.otpCode.trim(),
    }).subscribe({
      next: () => {
        this.otpLoading = false;
        this.step       = 'reset';
        this.cdr.markForCheck();
      },
      error: err => {
        this.otpError   = err.error?.error ?? 'OTP verification failed';
        this.otpLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Step 3: reset password ─────────────────────────────
  resetPassword(): void {
    if (!this.newPassword || !this.confirmPassword) return;

    if (this.newPassword !== this.confirmPassword) {
      this.resetError = 'Passwords do not match';
      return;
    }
    if (this.newPassword.length < 6) {
      this.resetError = 'Password must be at least 6 characters';
      return;
    }

    this.resetLoading = true;
    this.resetError   = '';

    this.http.post<any>(`${API}/auth/forgot-password`, {
      step: 3,
      userId:      this.userId,
      otpCode:     this.otpCode.trim(),
      newPassword: this.newPassword,
    }).subscribe({
      next: () => {
        this.resetLoading = false;
        this.step         = 'done';
        this.cdr.markForCheck();
        setTimeout(() => this.router.navigate(['/welcome']), 2000);
      },
      error: err => {
        this.resetError   = err.error?.error ?? 'Reset failed';
        this.resetLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  goToLogin(): void { this.router.navigate(['/welcome']); }
}
