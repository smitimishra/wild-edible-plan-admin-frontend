import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [],
  templateUrl: './account-settings.html'
})
export class AccountSettings {

  constructor(private router: Router) {}

  openLoggedInDevices(): void {
    this.router.navigate(['/admin/logged-in-devices']);
  }

  goBackToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}