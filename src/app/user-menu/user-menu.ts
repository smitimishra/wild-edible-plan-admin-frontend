import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserSessionService } from '../services/user-session.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {

  menuOpen = false;

  constructor(
    public session: UserSessionService,
    private router: Router,
  ) {}

  get userName(): string {
    return this.session.get()?.name ?? 'User';
  }

  get initials(): string {
    const name = this.userName;
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu():  void { this.menuOpen = false; }

  changePassword(): void {
    this.menuOpen = false;
    this.router.navigate(['/change-password']);
  }

  logout(): void {
    this.menuOpen = false;
    this.session.logout();
    this.router.navigate(['/welcome']);
  }
}
