import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html'
})
export class Register {

  employee_code = '';
  name = '';
  email = '';
  password = '';

  message = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register(): void {

    this.message = '';

    if (
      !this.employee_code ||
      !this.name ||
      !this.email ||
      !this.password
    ) {
      this.message = 'All fields are required';
      return;
    }

    this.loading = true;

    const user = {
      employee_code: this.employee_code,
      name: this.name,
      email: this.email,
      password: this.password
    };

    this.authService.register(user)
      .subscribe({

        next: (response) => {

          console.log('Registration successful:', response);

          this.loading = false;

          this.message =
            'Account created successfully. Redirecting to login...';

           this.router.navigate(['/login']);
        },

        error: (error) => {

          console.error('Registration error:', error);

          this.loading = false;

          this.message =
            error.error?.message ||
            'Registration failed.';
        }

      });
  }
}