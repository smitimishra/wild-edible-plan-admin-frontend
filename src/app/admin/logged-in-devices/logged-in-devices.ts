import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SessionService } from '../../services/session';

import type {
  DeviceSession,
  LoggedInDevicesResponse,
  LogoutAllDevicesResponse,
} from '../../services/session';

// LOGGED-IN DEVICES COMPONENT

@Component({
  selector: 'app-logged-in-devices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logged-in-devices.html',
})
export class LoggedInDevices implements OnInit {
  // DATA

  devices: DeviceSession[] = [];

  loading = false;
  logoutLoading = false;

  errorMessage = '';
  successMessage = '';

  // PAGINATION

  readonly pageSize = 5;

  currentPage = 1;

  // CONSTRUCTOR

  constructor(
    private sessionService: SessionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  // INITIALIZE

  ngOnInit(): void {
    this.loadLoggedInDevices();
  }

  // LOAD LOGGED-IN DEVICES

  loadLoggedInDevices(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.currentPage = 1;

    console.log('LoggedInDevices: loading logged-in devices');

    this.sessionService.getLoggedInDevices().subscribe({
      // SUCCESS

      next: (response: LoggedInDevicesResponse): void => {
        console.log('LoggedInDevices API response:', response);

        if (response && response.success) {
          this.devices = Array.isArray(response.data) ? response.data : [];

          console.log('Logged-in devices:', this.devices);

          this.currentPage = 1;

          this.correctPage();
        } else {
          this.devices = [];

          this.errorMessage = response?.message || 'Unable to load logged-in devices.';
        }

        this.loading = false;

        this.cdr.detectChanges();
      },

      // ERROR

      error: (error: unknown): void => {
        console.error('LoggedInDevices API error:', error);

        this.devices = [];

        this.errorMessage = this.getErrorMessage(error);

        this.loading = false;

        this.cdr.detectChanges();
      },
    });
  }

  // LOGOUT ALL DEVICES

  logoutAllDevices(): void {
    if (this.logoutLoading) {
      return;
    }

    if (this.devices.length === 0) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to log out all devices?');

    if (!confirmed) {
      return;
    }

    this.logoutLoading = true;

    this.errorMessage = '';
    this.successMessage = '';

    console.log('LoggedInDevices: logging out all devices');

    this.sessionService.logoutAllDevices().subscribe({
      
      // SUCCESS

      next: (response: LogoutAllDevicesResponse): void => {
        console.log('Logout all devices response:', response);

        if (response && response.success) {
          this.successMessage =
            response.message || 'All devices have been logged out successfully.';

          /*
           * Reload the device list after logout.
           */
          this.loadLoggedInDevices();
        } else {
          this.errorMessage = response?.message || 'Unable to log out all devices.';
        }

        this.logoutLoading = false;

        this.cdr.detectChanges();
      },

      // ERROR

      error: (error: unknown): void => {
        console.error('Logout all devices error:', error);

        this.errorMessage = this.getErrorMessage(error);

        this.logoutLoading = false;

        this.cdr.detectChanges();
      },
    });
  }

  // TOTAL DEVICES

  get totalDevices(): number {
    return this.devices.length;
  }

  // ACTIVE DEVICES

  get activeDevices(): number {
    return this.devices.filter((device: DeviceSession): boolean => {
      return this.isDeviceActive(device);
    }).length;
  }

  // INACTIVE DEVICES

  get inactiveDevices(): number {
    return this.devices.filter((device: DeviceSession): boolean => {
      return !this.isDeviceActive(device);
    }).length;
  }

  // PAGINATION — PAGE SLICE

  get paginatedDevices(): DeviceSession[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.devices.slice(start, start + this.pageSize);
  }

  // PAGINATION — TOTAL PAGES

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.devices.length / this.pageSize));
  }

  // PAGINATION — PAGE NUMBERS

  get pageNumbers(): number[] {
    return Array.from(
      {
        length: this.totalPages,
      },
      (_, index) => index + 1,
    );
  }

  // PAGINATION — RANGE LABEL

  get paginationStart(): number {
    if (this.devices.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.devices.length);
  }

  // PAGINATION — NAVIGATION

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  private correctPage(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  // DEVICE STATUS

  isDeviceActive(device: DeviceSession): boolean {
    /*
     * Prefer the new `active` property.
     *
     * `is_active` is kept as a fallback so the page
     * can work with either API response format.
     */

    if (typeof device.active === 'boolean') {
      return device.active;
    }

    return device.is_active === true;
  }

  // DEVICE ICON

  getDeviceIcon(device: DeviceSession): string {
    /*
     * Only use the generic device_type.
     *
     * We intentionally do NOT inspect:
     * - device_name
     * - MacBook
     * - iPhone
     * - Windows
     * - Android model
     * - OS version
     *
     * This keeps the UI generic.
     */

    const deviceType = (device.device_type || '').trim().toLowerCase();

    if (deviceType === 'mobile' || deviceType === 'phone') {
      return 'smartphone';
    }

    if (deviceType === 'tablet') {
      return 'tablet';
    }

    if (deviceType === 'tv' || deviceType === 'smart tv') {
      return 'tv';
    }

    if (deviceType === 'desktop') {
      return 'desktop_windows';
    }

    if (deviceType === 'laptop') {
      return 'laptop';
    }

    if (deviceType === 'browser') {
      return 'language';
    }

    return 'devices';
  }

  // DEVICE TYPE

  getDeviceType(device: DeviceSession): string {
    const deviceType = (device.device_type || '').trim();

    if (!deviceType) {
      return 'Unknown Device';
    }

    /*
     * Normalize the values so the UI remains consistent.
     */

    const normalized = deviceType.toLowerCase();

    switch (normalized) {
      case 'mobile':
      case 'phone':
        return 'Mobile';

      case 'tablet':
        return 'Tablet';

      case 'tv':
      case 'smart tv':
        return 'TV';

      case 'desktop':
        return 'Desktop';

      case 'laptop':
        return 'Laptop';

      case 'browser':
        return 'Browser';

      default:
        return deviceType;
    }
  }

  // FORMAT DATE

  formatDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return 'N/A';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // LOGIN TIME

  getLoginTime(device: DeviceSession): string {
    return this.formatDate(device.loginTime || device.created_at);
  }

  // LAST ACTIVE

  getLastActive(device: DeviceSession): string {
    return this.formatDate(device.last_active || device.last_activity);
  }

  // GET ERROR MESSAGE

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const errorObject = error as {
        error?: {
          message?: string;
          error?: string;
        };
        message?: string;
      };

      if (errorObject.error && typeof errorObject.error.message === 'string') {
        return errorObject.error.message;
      }

      if (errorObject.error && typeof errorObject.error.error === 'string') {
        return errorObject.error.error;
      }

      if (typeof errorObject.message === 'string') {
        return errorObject.message;
      }
    }

    return 'Unable to connect to the session service. ' + 'Please try again.';
  }

  // BACK

  goBack(): void {
    this.router.navigate(['/admin/account-settings']);
  }
}
