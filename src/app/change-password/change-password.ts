import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserSessionService } from '../services/user-session.service';

const API = 'http://192.168.29.217:8080/api';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePasswordComponent {

  currentPassword  = '';
  newPassword      = '';
  confirmPassword  = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  loading          = false;
  errorMsg         = '';
  successMsg       = '';

  constructor(
    private http:    HttpClient,
    private router:  Router,
    private session: UserSessionService,
  ) {}

  submit(): void {
    this.errorMsg   = '';
    this.successMsg = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMsg = 'All fields are required'; return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'New passwords do not match'; return;
    }
    if (this.newPassword.length < 6) {
      this.errorMsg = 'New password must be at least 6 characters'; return;
    }

    this.loading = true;
    const email  = this.session.get()?.email ?? '';

    this.http.post<any>(`${API}/auth/change-password`, {
      emailId:         email,
      currentPassword: this.currentPassword,
      newPassword:     this.newPassword,
    }).subscribe({
      next: () => {
        this.loading    = false;
        this.successMsg = '✅ Password changed successfully!';
        setTimeout(() => this.router.navigate(['/']), 1500);
      },
      error: err => {
        this.loading  = false;
        this.errorMsg = err.error?.error ?? 'Failed to change password';
      },
    });
  }

  cancel(): void { this.router.navigate(['/']); }
}
