import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';
import { RequestService } from '../../services/request';
import { SessionPopupComponent } from '../../components/session-popup/session-popup';

@Component({
  selector: 'app-employee',
  imports: [SessionPopupComponent],
  templateUrl: './employee.html',
})
export class Employee implements OnInit {
  // USER

  user: any = null;

  // REQUESTS

  requests: any[] = [];

  // STATISTICS

  totalRequests = 0;

  pendingRequests = 0;

  approvedRequests = 0;

  rejectedRequests = 0;

  // UI STATE

  loading = false;

  message = '';

  // CONSTRUCTOR

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  // MOUSE ACTIVITY → SESSION CHECK

  @HostListener('document:mousemove')
  @HostListener('document:click')
  onUserActivity(): void {
    this.authService.checkSessionOnActivity();
  }

  // INITIALIZE

  ngOnInit(): void {
    console.log('EMPLOYEE ngOnInit');

    // Get logged-in user

    this.user = this.authService.getUser();

    console.log('Employee user:', this.user);

    // Check authentication

    if (!this.user) {
      this.router.navigate(['/login']);

      return;
    }

    // Start polling — redirects to login portal if session
    // is invalidated from another device
    this.authService.startSessionPolling();

    // Load employee requests

    this.loadRequests();
  }

  // LOAD EMPLOYEE REQUESTS

  loadRequests(): void {
    console.log('Loading employee requests...');

    // Prevent duplicate API calls

    if (this.loading) {
      console.log('Request already loading.');

      return;
    }

    this.loading = true;

    this.message = '';

    // API CALL

    this.requestService.getMyRequests().subscribe({
      // SUCCESS

      next: (response: any) => {
        console.log('My requests response:', response);

        // Safely read requests

        this.requests = Array.isArray(response?.requests) ? [...response.requests] : [];

        console.log('Requests assigned:', this.requests);

        // Calculate statistics

        this.calculateStatistics();

        // Finish loading

        this.loading = false;

        // Update UI

        this.cdr.detectChanges();

        console.log('Employee UI updated.');
      },

      // ERROR

      error: (error: HttpErrorResponse) => {
        console.error('Failed to load employee requests:', error);

        this.loading = false;

        this.requests = [];

        // Reset statistics

        this.totalRequests = 0;

        this.pendingRequests = 0;

        this.approvedRequests = 0;

        this.rejectedRequests = 0;

        // Display error

        this.message = error.error?.message || 'Failed to load your requests.';

        this.cdr.detectChanges();
      },
    });
  }

  // CALCULATE STATISTICS

  calculateStatistics(): void {
    this.totalRequests = this.requests.length;

    // Pending

    this.pendingRequests = this.requests.filter(
      (request: any) => request.status === 'PENDING_MANAGER' || request.status === 'PENDING_HR',
    ).length;

    // Approved

    this.approvedRequests = this.requests.filter(
      (request: any) => request.status === 'APPROVED',
    ).length;

    // Rejected

    this.rejectedRequests = this.requests.filter(
      (request: any) => request.status === 'REJECTED',
    ).length;

    console.log('Statistics:', {
      total: this.totalRequests,

      pending: this.pendingRequests,

      approved: this.approvedRequests,

      rejected: this.rejectedRequests,
    });
  }

  // NEW PLANT REQUEST

  newRequest(): void {
    this.router.navigate(['/employee/new-request']);
  }

  // VIEW REQUEST

  viewRequest(id: number): void {
    if (!id) {
      console.error('Invalid request ID:', id);

      return;
    }

    console.log('Opening plant request:', id);

    this.router.navigate(['/employee/request', id]);
  }

  // LOAD REQUEST DETAILS WITH ATTACHMENTS

  loadRequestDetails(requestId: number): void {
    if (!requestId) {
      this.message = 'Invalid request ID.';

      return;
    }

    console.log('Loading request details:', requestId);

    this.requestService.getRequestById(requestId).subscribe({
      // SUCCESS

      next: (response: any) => {
        console.log('Request details:', response);

        const index = this.requests.findIndex((request) => request.id === requestId);

        if (index === -1) {
          console.error('Request not found in manager list:', requestId);

          return;
        }

        // Merge the detailed response into the existing
        // request object.

        this.requests[index] = {
          ...this.requests[index],

          ...(response?.request || {}),

          attachments: response?.attachments || [],

          approval_history: response?.approval_history || [],

          plant_details: response?.plant_details || null,
        };

        // Trigger Angular UI update

        this.requests = [...this.requests];

        this.cdr.detectChanges();

        console.log('Updated request with attachments:', this.requests[index]);
      },

      // ERROR

      error: (error: HttpErrorResponse) => {
        console.error('Failed to load request details:', error);

        console.error('Backend response:', error.error);

        this.message = error.error?.message || 'Failed to load request details.';

        this.cdr.detectChanges();
      },
    });
  }

  // GET PLANT NAME
  //
  // request_data is stored as JSON in PostgreSQL.

  getPlantName(request: any): string {
    return request?.request_data?.plant_name || 'Unnamed Plant';
  }

  // GET COMMON NAME

  getCommonName(request: any): string {
    return request?.request_data?.common_name || '—';
  }

  // GET SCIENTIFIC NAME
  //
  // This will be populated after manager approval.

  getScientificName(request: any): string {
    return request?.request_data?.scientific_name || 'Not added yet';
  }

  // GET REQUEST STATUS

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_MANAGER':
        return 'Pending Manager';

      case 'PENDING_HR':
        return 'Pending HR';

      case 'APPROVED':
        return 'Approved';

      case 'REJECTED':
        return 'Rejected';

      default:
        return status || 'Unknown';
    }
  }

  // LOGOUT

  logout(): void {
    this.authService.logout('http://192.168.29.216:8200/');
  }
}
