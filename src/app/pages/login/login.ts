import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../services/auth';


@Component({
  selector: 'app-login',

  imports: [
    FormsModule,
    RouterLink
  ],

  templateUrl: './login.html'
})
export class Login {

  // ============================================================
  // LOGIN
  // ============================================================

  showPassword = false;

  email = '';

  password = '';

  message = '';

  loading = false;


  // ============================================================
  // ACTIVE SESSION POPUP
  // Shown when the backend returns 409 active_session_exists
  // ============================================================

  showActiveSessionPopup    = false;

  activeSessionPopupLoading = false;

  /** session_id from the 409 response */
  conflictSessionId = '';

  /** stash credentials so we can re-login after force-logout */
  private pendingEmail    = '';
  private pendingPassword = '';


  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  showForgotPassword = false;

  forgotEmail = '';

  forgotMessage = '';

  forgotError = '';

  forgotLoading = false;

  forgotSubmitted = false;


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}


  // ============================================================
  // TOGGLE PASSWORD VISIBILITY
  // ============================================================

  togglePassword(): void {

    this.showPassword = !this.showPassword;

  }


  // ============================================================
  // LOGIN  (validates inputs then calls doLogin)
  // ============================================================

  login(): void {

    this.message = '';

    if (!this.email || !this.email.trim()) {
      this.message = 'Email is required.';
      return;
    }

    if (!this.password) {
      this.message = 'Password is required.';
      return;
    }

    this.loading = true;

    console.log('================================================');
    console.log('LOGIN STARTED');
    console.log('Email:', this.email.trim());

    this.doLogin(this.email.trim(), this.password);

  }


  // ============================================================
  // DO LOGIN
  // Shared by login() and forceLogoutAndRelogin()
  // ============================================================

  private doLogin(email: string, password: string): void {

    this.authService
      .login(email, password)
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log('LOGIN RESPONSE:', response);

          if (!response) {
            this.loading = false;
            this.message = 'Login failed. Empty response from server.';
            return;
          }

          const token =
            response.token ||
            response.accessToken ||
            response.jwt ||
            null;

          console.log('TOKEN RECEIVED:', !!token);

          if (!token) {
            console.error('LOGIN ERROR: Backend did not return a JWT token.');
            console.error('Response keys:', Object.keys(response));
            this.loading = false;
            this.message = 'Login failed because no authentication token was received.';
            return;
          }

          // Save token
          this.authService.saveToken(token);

          const savedToken        = this.authService.getToken();
          const localStorageToken = localStorage.getItem('token');

          console.log('TOKEN AFTER saveToken():', !!savedToken);
          console.log('TOKEN IN localStorage:',   !!localStorageToken);

          if (!savedToken || !localStorageToken) {
            this.loading = false;
            this.message = 'Login failed because the authentication token could not be saved.';
            return;
          }

          // Save user
          if (response.user) {
            this.authService.saveUser(response.user);
            console.log('LOGIN USER:', response.user);
          } else {
            console.warn('LOGIN WARNING: Backend response does not contain user.');
          }

          // Start session polling — will redirect to login portal if
          // another device forces this session out
          this.authService.startSessionPolling();

          // Determine role
          const rawRole = response?.user?.role;
          const role    = rawRole?.toString().trim().toUpperCase();

          console.log('NORMALIZED LOGIN ROLE:', role);

          this.loading = false;

          // Navigate by role
          switch (role) {

            case 'ADMIN':
              this.router.navigate(['/admin'], { queryParams: { token } })
                .then(s => console.log('ADMIN navigation result:', s));
              break;

            case 'MANAGER':
              this.router.navigate(['/manager'], { queryParams: { token } })
                .then(s => console.log('MANAGER navigation result:', s));
              break;

            case 'REVIEWER':
              this.router.navigate(['/reviewer'], { queryParams: { token } })
                .then(s => console.log('REVIEWER navigation result:', s));
              break;

            case 'HR':
              this.router.navigate(['/hr'], { queryParams: { token } })
                .then(s => console.log('HR navigation result:', s));
              break;

            case 'EMPLOYEE':
              this.router.navigate(['/employee'], { queryParams: { token } })
                .then(s => console.log('EMPLOYEE navigation result:', s));
              break;

            default:
              console.error('UNKNOWN USER ROLE:', rawRole);
              this.authService.logout();
              this.message = 'Unknown user role. Please contact the administrator.';
              break;

          }

          console.log('LOGIN PROCESS COMPLETED');
          console.log('================================================');

        },

        // ======================================================
        // ERROR
        // ======================================================

        error: (error: any) => {

          console.error('LOGIN HTTP ERROR:', error);
          console.error('Backend error response:', error?.error);

          // --------------------------------------------------
          // 409 — active session exists on another device
          // --------------------------------------------------

          if (
            error?.status === 409 &&
            error?.error?.message === 'active_session_exists'
          ) {

            this.loading = false;

            // Stash credentials for the re-login after force-logout
            this.pendingEmail    = email;
            this.pendingPassword = password;

            this.conflictSessionId =
              error?.error?.existing_session_id || '';

            this.showActiveSessionPopup = true;

            return;

          }

          this.loading = false;

          this.message =
            error?.error?.message ||
            error?.message ||
            'Login failed. Please check your credentials.';

          console.log('LOGIN FAILED');
          console.log('================================================');

        }

      });

  }


  // ============================================================
  // FORCE LOGOUT AND RE-LOGIN
  // Called when user clicks OK on the active-session popup
  // ============================================================

  forceLogoutAndRelogin(): void {

    if (!this.conflictSessionId) {
      this.showActiveSessionPopup = false;
      this.loading = true;
      this.doLogin(this.pendingEmail, this.pendingPassword);
      return;
    }

    this.activeSessionPopupLoading = true;

    this.authService
      .forceLogoutSession(this.conflictSessionId)
      .subscribe({

        next: () => {

          this.activeSessionPopupLoading = false;
          this.showActiveSessionPopup    = false;
          this.conflictSessionId         = '';
          this.loading                   = true;

          // Old session is invalidated — re-login now
          this.doLogin(this.pendingEmail, this.pendingPassword);

        },

        error: (err: any) => {

          console.error('Force logout error:', err);

          this.activeSessionPopupLoading = false;
          this.showActiveSessionPopup    = false;

          this.message =
            'Could not invalidate the previous session. Please try again.';

        }

      });

  }


  // ============================================================
  // CLOSE ACTIVE SESSION POPUP  (user cancels)
  // ============================================================

  closeActiveSessionPopup(): void {

    this.showActiveSessionPopup = false;
    this.conflictSessionId      = '';
    this.pendingEmail           = '';
    this.pendingPassword        = '';

  }


  // ============================================================
  // OPEN FORGOT PASSWORD
  // ============================================================

  openForgotPassword(): void {

    this.showForgotPassword = true;
    this.forgotEmail        = '';
    this.forgotMessage      = '';
    this.forgotError        = '';
    this.forgotSubmitted    = false;

  }


  // ============================================================
  // CLOSE FORGOT PASSWORD
  // ============================================================

  closeForgotPassword(): void {

    this.showForgotPassword = false;
    this.forgotEmail        = '';
    this.forgotMessage      = '';
    this.forgotError        = '';
    this.forgotSubmitted    = false;

  }


  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  forgotPassword(): void {

    this.forgotMessage = '';
    this.forgotError   = '';

    if (!this.forgotEmail || !this.forgotEmail.trim()) {
      this.forgotError = 'Please enter your email address.';
      return;
    }

    this.forgotLoading = true;

    this.authService
      .forgotPassword(this.forgotEmail.trim())
      .subscribe({

        next: (response: any) => {

          console.log('FORGOT PASSWORD RESPONSE:', response);

          this.forgotLoading   = false;
          this.forgotSubmitted = true;

          this.forgotMessage =
            response?.message ||
            'If an account exists with this email, a password reset link has been sent.';

        },

        error: (error: any) => {

          console.error('FORGOT PASSWORD ERROR:', error);

          this.forgotLoading = false;

          this.forgotError =
            error?.error?.message ||
            error?.message ||
            'Unable to process password reset request. Please try again.';

        }

      });

  }

}
