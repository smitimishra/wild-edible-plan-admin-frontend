import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';
import { RequestService } from '../../services/request';
import { DatePipe } from '@angular/common';
import { SessionPopupComponent } from '../../components/session-popup/session-popup';

@Component({
  selector: 'app-hr',
  imports: [DatePipe, SessionPopupComponent],
  templateUrl: './hr.html'
})
export class Hr implements OnInit {

  // ============================================================
  // USER
  // ============================================================

  user: any = null;


  // ============================================================
  // REQUESTS
  // ============================================================

  requests: any[] = [];

  pendingCount = 0;


  // ============================================================
  // UI STATE
  // ============================================================

  loading = false;

  message = '';

  successMessage = '';


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // ============================================================
  // MOUSE ACTIVITY → SESSION CHECK
  // ============================================================

  @HostListener('document:mousemove')
  @HostListener('document:click')
  onUserActivity(): void {
    this.authService.checkSessionOnActivity();
  }


  // ============================================================
  // INITIALIZE
  // ============================================================

  ngOnInit(): void {

    console.log('HR dashboard initialized.');

    this.user = this.authService.getUser();

    console.log('Logged-in HR user:', this.user);

    if (!this.user) {

      this.router.navigate(['/login']);

      return;
    }

    // Start polling — redirects to login portal if session
    // is invalidated from another device
    this.authService.startSessionPolling();

    this.loadPendingRequests();
  }


  // ============================================================
  // LOAD PENDING REQUESTS
  // ============================================================

  loadPendingRequests(): void {

    this.loading = true;

    this.message = '';

    this.successMessage = '';

    this.requestService
      .getPendingHRRequests()
      .subscribe({

        next: (response: any) => {

          console.log(
            'Pending HR requests:',
            response
          );

          this.requests =
            Array.isArray(response?.requests)
              ? [...response.requests]
              : [];

          this.pendingCount =
            this.requests.length;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error: HttpErrorResponse) => {

          console.error(
            'Failed to load HR requests:',
            error
          );

          this.loading = false;

          this.requests = [];

          this.pendingCount = 0;

          this.message =
            error.error?.message ||
            'Failed to load pending HR requests.';

          this.cdr.detectChanges();
        }

      });
  }


  // ============================================================
  // VIEW REQUEST DETAILS
  //
  // Image management is handled by the common
  // request-details component.
  // ============================================================

  viewRequest(id: number): void {

    if (!id) {

      console.error(
        'Invalid request ID:',
        id
      );

      return;
    }

    console.log(
      'Opening HR request details:',
      id
    );

    this.router.navigate([
      '/hr/request',
      id
    ]);
  }


  // ============================================================
  // GET IMAGE URL
  // ============================================================

  getImageUrl(
    filePath: string
  ): string {

    if (!filePath) {

      return '';
    }

    return this.requestService.getImageUrl(
      filePath
    );
  }


  // ============================================================
  // DOWNLOAD IMAGE
  // ============================================================

  downloadImage(
    attachmentId: number
  ): void {

    if (!attachmentId) {

      console.error(
        'Invalid attachment ID:',
        attachmentId
      );

      return;
    }

    console.log(
      'Downloading plant image:',
      attachmentId
    );

    this.requestService
      .downloadAttachment(attachmentId)
      .subscribe({

        next: (blob: Blob) => {

          const url =
            window.URL.createObjectURL(blob);

          const link =
            document.createElement('a');

          link.href = url;

          link.download =
            `plant-image-${attachmentId}`;

          document.body.appendChild(link);

          link.click();

          document.body.removeChild(link);

          window.URL.revokeObjectURL(url);
        },

        error: (error: HttpErrorResponse) => {

          console.error(
            'Image download error:',
            error
          );

          this.message =
            error.error?.message ||
            'Failed to download image.';

          this.cdr.detectChanges();
        }

      });
  }


  // ============================================================
  // APPROVE REQUEST
  // ============================================================

  approveRequest(
    id: number
  ): void {

    if (!id) {

      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to approve this plant request?'
      );

    if (!confirmed) {

      return;
    }

    this.loading = true;

    this.message = '';

    this.successMessage = '';

    console.log(
      'Approving plant request:',
      id
    );

    const data = {

      comments:
        'Approved by HR'

    };

    this.requestService
      .hrApprove(
        id,
        data
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Plant approved successfully:',
            response
          );

          this.loading = false;

          this.successMessage =
            'Plant request approved successfully.';

          // Remove approved request immediately
          // from the dashboard.

          this.requests =
            this.requests.filter(
              request =>
                request.id !== id
            );

          this.pendingCount =
            this.requests.length;

          this.cdr.detectChanges();

          // Reload from backend to make sure
          // dashboard is synchronized.

          this.loadPendingRequests();
        },

        error: (error: HttpErrorResponse) => {

          console.error(
            'HR approval error:',
            error
          );

          this.loading = false;

          this.message =
            error.error?.message ||
            'Failed to approve plant request.';

          this.cdr.detectChanges();
        }

      });
  }


  // ============================================================
  // REJECT REQUEST
  // ============================================================

  rejectRequest(
    id: number
  ): void {

    if (!id) {

      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to reject this plant request?'
      );

    if (!confirmed) {

      return;
    }

    this.loading = true;

    this.message = '';

    this.successMessage = '';

    console.log(
      'Rejecting plant request:',
      id
    );

    const data = {

      comments:
        'Rejected by HR'

    };

    this.requestService
      .reject(
        id,
        data
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Plant request rejected:',
            response
          );

          this.loading = false;

          this.successMessage =
            'Plant request rejected successfully.';

          this.requests =
            this.requests.filter(
              request =>
                request.id !== id
            );

          this.pendingCount =
            this.requests.length;

          this.cdr.detectChanges();

          this.loadPendingRequests();
        },

        error: (error: HttpErrorResponse) => {

          console.error(
            'HR rejection error:',
            error
          );

          this.loading = false;

          this.message =
            error.error?.message ||
            'Failed to reject plant request.';

          this.cdr.detectChanges();
        }

      });
  }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {

    console.log(
      'HR logging out.'
    );

    this.authService.logout('http://192.168.29.51:64959/');
  }


  // ============================================================
  // ROLE DISPLAY NAME
  // ============================================================

  getRoleDisplayName(
    role: string
  ): string {

    if (!role) {

      return '';
    }

    return role
      .toLowerCase()
      .split('_')
      .map(
        word =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(' ');
  }


  // ============================================================
  // REQUEST TYPE DISPLAY
  // ============================================================

  getRequestType(
    request: any
  ): string {

    if (!request) {

      return 'Plant Request';
    }

    return (
      request.request_type ||
      request.type ||
      'Plant Request'
    );
  }


  // ============================================================
  // EMPLOYEE NAME
  // ============================================================

  getEmployeeName(
    request: any
  ): string {

    if (!request) {

      return 'Employee';
    }

    return (
      request.employee_name ||
      request.employee?.name ||
      request.created_by_name ||
      'Employee'
    );
  }


  // ============================================================
  // REQUEST DATE
  // ============================================================

  getRequestDate(
    request: any
  ): string {

    if (!request) {

      return '';
    }

    return (
      request.created_at ||
      request.createdAt ||
      ''
    );
  }


  // ============================================================
  // REQUEST ID
  // ============================================================

  getRequestId(
    request: any
  ): number {

    return Number(
      request?.id || 0
    );
  }


  // ============================================================
  // GET FIRST IMAGE
  // ============================================================

  getFirstImage(
    request: any
  ): string {

    if (!request) {

      return '';
    }

    const attachments =
      request.attachments ||
      request.images ||
      [];

    if (
      Array.isArray(attachments) &&
      attachments.length > 0
    ) {

      const first =
        attachments[0];

      return this.getImageUrl(
        first?.file_path ||
        first?.path ||
        first?.filePath ||
        ''
      );
    }

    return '';
  }

}