import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {

  token = '';

  newPassword = '';

  confirmPassword = '';

  message = '';

  errorMessage = '';

  loading = false;

  passwordResetSuccessful = false;


  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}


  ngOnInit(): void {

    this.route.queryParamMap.subscribe(params => {

      this.token = params.get('token') || '';

      if (!this.token) {

        this.errorMessage =
          'Invalid password reset link.';
      }
    });
  }


  resetPassword(): void {

    this.message = '';

    this.errorMessage = '';


    if (!this.token) {

      this.errorMessage =
        'Invalid password reset link.';

      return;
    }


    if (!this.newPassword || !this.confirmPassword) {

      this.errorMessage =
        'Please enter and confirm your new password.';

      return;
    }


    if (this.newPassword.length < 8) {

      this.errorMessage =
        'Password must be at least 8 characters long.';

      return;
    }


    if (this.newPassword !== this.confirmPassword) {

      this.errorMessage =
        'Passwords do not match.';

      return;
    }


    this.loading = true;


    this.authService
      .resetPassword(
        this.token,
        this.newPassword
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Password reset successful:',
            response
          );

          this.loading = false;

          this.passwordResetSuccessful = true;

          this.message =
            response.message ||
            'Password reset successfully.';
        },


        error: (error: any) => {

          console.error(
            'Reset password error:',
            error
          );

          this.loading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to reset password. Please try again.';
        }

      });
  }


  goToLogin(): void {

    this.router.navigate(['/login']);
  }
}