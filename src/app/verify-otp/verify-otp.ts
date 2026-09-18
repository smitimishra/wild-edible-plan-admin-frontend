
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { UserSessionService } from '../services/user-session.service';

const API = 'http://192.168.29.217:8080/api';
const DESTINATION_APP = 'http://192.168.29.217:4200';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyOtpComponent implements OnInit {

  otpCode = '';
  loading = false;
  errorMsg = '';

  phoneMasked = '';
  userName = '';
  devOtp = '';

  // ──────────────────────────────────────────────────────────
  // ACTIVE SESSION POPUP
  // ──────────────────────────────────────────────────────────

  showActiveSessionPopup = false;
  activeSessionPopupLoading = false;

  /**
   * Session ID returned by the backend when another active
   * session already exists.
   *
   * This is used only for force-logout-session.
   */
  conflictSessionId = '';

  /**
   * Pending user ID created during the login step.
   *
   * This is intentionally kept in sessionStorage because the
   * OTP page is part of the existing login flow.
   */
  private userId = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private session: UserSessionService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ──────────────────────────────────────────────────────────
  // INITIALIZE OTP PAGE
  // ──────────────────────────────────────────────────────────

  ngOnInit(): void {

    this.userId =
      sessionStorage.getItem('pendingUserId') ?? '';

    this.userName =
      sessionStorage.getItem('pendingUserName') ?? '';

    this.phoneMasked =
      sessionStorage.getItem('emailMasked') ?? '';

    this.devOtp =
      sessionStorage.getItem('devOtp') ?? '';

    if (!this.userId) {
      this.router.navigate(['/welcome']);
    }
  }

  // ──────────────────────────────────────────────────────────
  // VERIFY OTP
  // ──────────────────────────────────────────────────────────

  verify(): void {

    if (!this.otpCode.trim()) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    /*
     * IMPORTANT:
     * Do not send device information from the browser.
     *
     * The backend now determines:
     *   - device_type
     *   - ip_address
     *   - location
     *   - session_id
     *
     * from the authenticated request/session creation.
     *
     * This keeps the existing login/OTP logic untouched.
     */
    this.http.post<any>(
      `${API}/auth/verify-otp`,
      {
        userId: Number(this.userId),
        otpCode: this.otpCode.trim(),
      }
    ).subscribe({

      // ──────────────────────────────────────────────────────
      // OTP VERIFIED SUCCESSFULLY
      // ──────────────────────────────────────────────────────

      next: res => {
        this.handleSuccess(res);
      },

      // ──────────────────────────────────────────────────────
      // ERROR HANDLING
      // ──────────────────────────────────────────────────────

      error: err => {

        // ────────────────────────────────────────────────────
        // 409 = ACTIVE SESSION ALREADY EXISTS
        // ────────────────────────────────────────────────────
        //
        // This is the existing single-device login behavior.
        //
        // We do NOT automatically allow multiple devices.
        // Instead, the user is shown the existing popup and
        // can choose to invalidate the previous session.
        //
        if (
          err.status === 409 &&
          err.error?.message === 'active_session_exists'
        ) {

          this.loading = false;

          this.conflictSessionId =
            err.error?.existing_session_id ?? '';

          this.showActiveSessionPopup = true;

          this.cdr.markForCheck();

          return;
        }

        // ────────────────────────────────────────────────────
        // OTP EXPIRED / NOT FOUND
        // ────────────────────────────────────────────────────

        const errMsg: string =
          err.error?.error ?? '';

        if (
          errMsg.toLowerCase().includes('no pending otp') ||
          errMsg.toLowerCase().includes('otp expired')
        ) {

          this.loading = false;

          this.showActiveSessionPopup = false;

          this.cdr.markForCheck();

          setTimeout(() => {

            window.location.href =
              'http://192.168.29.217:8200/welcome';

          }, 100);

          return;
        }

        // ────────────────────────────────────────────────────
        // OTHER OTP ERRORS
        // ────────────────────────────────────────────────────

        this.errorMsg =
          errMsg || 'OTP verification failed';

        this.loading = false;

        this.cdr.markForCheck();
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // HANDLE SUCCESS
  //
  // Used by:
  //   1. verify-otp
  //   2. issue-token
  //
  // The backend token already contains the sessionId.
  // That sessionId is what the Admin application uses for
  // single-session validation.
  // ──────────────────────────────────────────────────────────

  private handleSuccess(res: any): void {

    const roleName =
      sessionStorage.getItem('pendingRoleName') ?? '';

    // ────────────────────────────────────────────────────────
    // CLEAR TEMPORARY LOGIN DATA
    // ────────────────────────────────────────────────────────

    sessionStorage.removeItem('pendingUserId');
    sessionStorage.removeItem('pendingUserName');
    sessionStorage.removeItem('pendingRoleName');
    sessionStorage.removeItem('phoneMasked');
    sessionStorage.removeItem('emailMasked');
    sessionStorage.removeItem('devOtp');

    this.loading = false;

    this.cdr.markForCheck();

    // ────────────────────────────────────────────────────────
    // TOKEN CREATED BY BACKEND
    // ────────────────────────────────────────────────────────

    const token = res.token;

    const normalizedRoleName =
      roleName.trim().toLowerCase();

    // ────────────────────────────────────────────────────────
    // FIELD STAFF / FIELD OPERATOR
    // ────────────────────────────────────────────────────────

    if (
      normalizedRoleName === 'field staff' ||
      normalizedRoleName === 'field operator'
    ) {

      const features: string[] =
        (res.featureAllowed ?? '')
          .split(',')
          .map((f: string) => f.trim());

      const permission =
        features.includes('4')
          ? 'both'
          : 'view';

      this.session.save({
        name:
          res.userName ?? this.userName,

        phone:
          res.phoneNumber ?? '',

        email:
          res.emailId ?? '',

        permission,

        token:
          res.token ?? '',
      });

      this.router.navigate(['/']);

      return;
    }

    // ────────────────────────────────────────────────────────
    // ADMIN / REVIEWER / MANAGER
    // ────────────────────────────────────────────────────────
    //
    // Admin → /admin
    // Reviewer / Manager → /manager
    //
    // The JWT contains the unique sessionId generated by the
    // backend. Nothing needs to be changed here.
    // ────────────────────────────────────────────────────────

    const destination =
      normalizedRoleName === 'admin'
        ? 'admin'
        : 'manager';

    window.location.assign(
      `${DESTINATION_APP}/${destination}?token=${encodeURIComponent(token)}`
    );
  }

  // ──────────────────────────────────────────────────────────
  // FORCE LOGOUT → ISSUE NEW TOKEN
  //
  // Called when the user clicks OK on the active-session popup.
  //
  // Flow:
  //
  // Current login attempt
  //        ↓
  // Existing active session found
  //        ↓
  // 409 active_session_exists
  //        ↓
  // Popup shown
  //        ↓
  // User clicks OK
  //        ↓
  // force-logout-session
  //        ↓
  // Old session is_active = false
  //        ↓
  // issue-token
  //        ↓
  // New session created
  //        ↓
  // New JWT returned
  //        ↓
  // Admin / Manager redirect
  //
  // This preserves the existing single-device behavior.
  // ──────────────────────────────────────────────────────────

  forceLogoutAndReVerify(): void {

    // ────────────────────────────────────────────────────────
    // NO CONFLICT SESSION ID
    // ────────────────────────────────────────────────────────
    //
    // Keep the existing fallback behavior.
    //

    if (!this.conflictSessionId) {

      this.showActiveSessionPopup = false;

      this.loading = true;

      this.cdr.markForCheck();

      this.issueToken();

      return;
    }

    // ────────────────────────────────────────────────────────
    // SHOW POPUP LOADING STATE
    // ────────────────────────────────────────────────────────

    this.activeSessionPopupLoading = true;

    this.cdr.markForCheck();

    // ────────────────────────────────────────────────────────
    // STEP 1:
    // INVALIDATE PREVIOUS SESSION
    // ────────────────────────────────────────────────────────

    this.http.post<any>(
      `${API}/auth/force-logout-session`,
      {
        session_id: this.conflictSessionId,
      }
    ).subscribe({

      // ──────────────────────────────────────────────────────
      // OLD SESSION INVALIDATED
      // ──────────────────────────────────────────────────────

      next: () => {

        this.conflictSessionId = '';

        // ────────────────────────────────────────────────────
        // STEP 2:
        // CREATE NEW SESSION + JWT
        // ────────────────────────────────────────────────────

        this.issueToken();
      },

      // ──────────────────────────────────────────────────────
      // FORCE LOGOUT FAILED
      // ──────────────────────────────────────────────────────

      error: err => {

        console.error(
          'Force logout error:',
          err
        );

        this.activeSessionPopupLoading = false;

        this.showActiveSessionPopup = false;

        this.errorMsg =
          'Could not invalidate the previous session. Please try again.';

        this.cdr.markForCheck();
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // ISSUE TOKEN
  //
  // Called after the previous session has been invalidated.
  //
  // The backend creates:
  //   - new session_id
  //   - new user_sessions row
  //   - device_type
  //   - ip_address
  //   - location
  //   - new JWT
  //
  // No device information needs to be sent from Angular.
  // ──────────────────────────────────────────────────────────

  private issueToken(): void {

    this.http.post<any>(
      `${API}/auth/issue-token`,
      {
        userId: Number(this.userId),
      }
    ).subscribe({

      // ──────────────────────────────────────────────────────
      // NEW SESSION CREATED
      // ──────────────────────────────────────────────────────

      next: res => {

        this.activeSessionPopupLoading = false;

        this.showActiveSessionPopup = false;

        this.loading = false;

        this.cdr.markForCheck();

        this.handleSuccess(res);
      },

      // ──────────────────────────────────────────────────────
      // NEW SESSION CREATION FAILED
      // ──────────────────────────────────────────────────────

      error: err => {

        console.error(
          'Issue token error:',
          err
        );

        this.activeSessionPopupLoading = false;

        this.showActiveSessionPopup = false;

        this.loading = false;

        this.errorMsg =
          err.error?.error ??
          'Failed to create session. Please try again.';

        this.cdr.markForCheck();
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // CLOSE ACTIVE SESSION POPUP
  //
  // Cancel means:
  //   - Do not invalidate the old session
  //   - Do not create a new session
  //   - Stay on OTP page
  // ──────────────────────────────────────────────────────────

  closeActiveSessionPopup(): void {

    this.showActiveSessionPopup = false;

    this.conflictSessionId = '';

    this.activeSessionPopupLoading = false;

    this.cdr.markForCheck();
  }

  // ──────────────────────────────────────────────────────────
  // BACK
  // ──────────────────────────────────────────────────────────

  back(): void {
    this.router.navigate(['/welcome']);
  }
}
