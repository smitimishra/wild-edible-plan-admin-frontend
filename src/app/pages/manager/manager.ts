import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';

import { AuthService } from '../../services/auth';
import { RequestService } from '../../services/request';
import { SessionPopupComponent } from '../../components/session-popup/session-popup';

const API = 'http://192.168.29.217:3001/api';
const PLANT_IMAGE_BASE_URL = 'http://192.168.29.98:8080/';

@Component({
  selector: 'app-manager',
  imports: [FormsModule, DatePipe, TitleCasePipe, SessionPopupComponent],
  templateUrl: './manager.html',
})
export class Manager implements OnInit, OnDestroy {
  // USER

  user: any = null;

  // SIDEBAR

  activeMenu = 'dashboard';

  sidebarCollapsed = false;

  // PROFILE DROPDOWN

  profileMenuOpen = false;

  profileThemeExpanded = false;

  // THEME

  selectedTheme = 'default';

  private systemThemeMediaQuery: MediaQueryList | null = null;

  private readonly systemThemeListener = (event: MediaQueryListEvent): void => {
    if (this.selectedTheme === 'default') {
      this.applySystemTheme(event.matches);
    }
  };

  // REQUEST DATA

  requests: any[] = [];

  pendingRequests: any[] = [];

  approvedRequests: any[] = [];

  pendingCount = 0;

  approvedCount = 0;

  loading = false;

  loadingApproved = false;

  message = '';

  // APPROVAL FORM

  selectedRequest: any = null;

  scientificName = '';

  description = '';

  comments = '';
  duplicateConflict: any = null;
  compareRecord: any = null;
  compareNewRecord: any = null;
  showCompare = false;

  // REJECTION UI

  rejectingRequest = false;

  // IMAGE / ATTACHMENT MANAGEMENT

  selectedImageFile: File | null = null;

  uploadingAttachment = false;

  deletingAttachment = false;

  downloadingAttachment = false;

  // CONSTRUCTOR

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  // MOUSE ACTIVITY → SESSION CHECK

  @HostListener('document:mousemove')
  @HostListener('document:click')
  onUserActivity(): void {
    this.authService.checkSessionOnActivity();
  }

  // INITIALIZATION

  ngOnInit(): void {
    // LOAD SAVED THEME

    const savedTheme = localStorage.getItem('reviewer-theme');

    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'default') {
      this.selectedTheme = savedTheme;
    }

    // SYSTEM THEME LISTENER

    this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.systemThemeMediaQuery.addEventListener('change', this.systemThemeListener);

    // APPLY INITIAL THEME

    if (this.selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (this.selectedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      this.applySystemTheme(this.systemThemeMediaQuery.matches);
    }

    // JWT FROM URL

    this.route.queryParamMap.subscribe((params) => {
      const urlToken = params.get('token')?.trim() || null;

      // REVIEWER ROLE

      const reviewerRoles = ['REVIEWER'];

      // Keep this variable because the existing Reviewer
      // authentication flow uses this Manager component.
      void reviewerRoles;

      // TOKEN FOUND IN URL

      if (urlToken) {
        console.log('JWT token received from Reviewer URL');

        this.authService.saveToken(urlToken);
      }

      // AUTHENTICATED

      console.log('Reviewer authentication token is available');

      // START SESSION POLLING

      this.authService.startSessionPolling();

      // LOAD USER

      this.loadUser();
      this.loadProfileName();

      // LOAD REVIEWER REQUESTS

      this.loadPendingRequests();

      this.loadApprovedRequests();
    });
  }

  // DESTROY

  ngOnDestroy(): void {
    if (this.systemThemeMediaQuery) {
      this.systemThemeMediaQuery.removeEventListener('change', this.systemThemeListener);
    }
  }

  // SIDEBAR MENU

  selectMenu(menu: string): void {
    this.clearSelectedRequest();

    this.activeMenu = menu;

    // DASHBOARD

    if (menu === 'dashboard') {
      this.loadPendingRequests();

      this.loadApprovedRequests();

      return;
    }

    // PENDING APPROVALS

    if (menu === 'pending-approvals') {
      this.loadPendingRequests();

      return;
    }

    // APPROVED REQUESTS

    if (menu === 'approved-requests') {
      this.loadApprovedRequests();

      return;
    }
  }

  // REFRESH DASHBOARD

  refreshDashboard(): void {
    this.message = '';

    this.loadPendingRequests();

    this.loadApprovedRequests();
  }

  // TOGGLE SIDEBAR

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // TOGGLE PROFILE MENU

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;

    if (!this.profileMenuOpen) {
      this.profileThemeExpanded = false;
    }
  }

  // TOGGLE PROFILE THEME

  toggleProfileTheme(): void {
    if (!this.profileMenuOpen) {
      return;
    }

    this.profileThemeExpanded = !this.profileThemeExpanded;
  }

  // ACCOUNT SETTINGS

  selectAccountSettings(): void {
    this.profileMenuOpen = false;

    this.profileThemeExpanded = false;

    // Use the existing Account Settings page.
    this.router.navigate(['/admin/account-settings']);
  }

  // PROFILE DISPLAY NAME

  getProfileName(): string {
    /*
     * IMPORTANT:
     *
     * The Reviewer JWT should contain:
     *
     * {
     *   id,
     *   name,
     *   email,
     *   role,
     *   session_id
     * }
     *
     * We deliberately do NOT use name as a login credential.
     *
     * The name is only read from authenticated user data.
     */

    return (
      this.user?.name ||
      this.user?.user_name ||
      this.user?.username ||
      this.user?.email ||
      'Reviewer'
    );
  }

  // LOAD PROFILE NAME FROM MAIN DATABASE

  loadProfileName(): void {
    const token = this.authService.getToken();

    if (!token) {
      console.error('Reviewer - Cannot load profile name because JWT is missing.');
      return;
    }

    this.http
      .get<any>(`${API}/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .subscribe({
        next: (response: any) => {
          console.log('Reviewer profile response:', response);

          const userName =
            response?.user_name || response?.user?.user_name || response?.data?.user_name || '';

          if (userName) {
            this.user = {
              ...(this.user || {}),
              user_name: userName,
            };

            // Keep name available to the existing profile display logic.
            this.user.name = userName;

            console.log('Reviewer authenticated user_name:', userName);
            this.cdr.detectChanges();
          } else {
            console.warn('Reviewer profile API returned no user_name.');
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Failed to load reviewer profile:', error);
          console.error('Profile backend response:', error.error);

          if (error.status === 401) {
            console.error('Reviewer profile authentication failed.');
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }
        },
      });
  }

  // PROFILE INITIAL

  getProfileInitial(): string {
    const name = this.getProfileName().trim();

    return name ? name.charAt(0).toUpperCase() : 'R';
  }

  // SELECT THEME

  selectTheme(theme: string): void {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'default') {
      return;
    }

    this.selectedTheme = theme;

    this.profileMenuOpen = false;

    this.profileThemeExpanded = false;

    localStorage.setItem('reviewer-theme', theme);

    // LIGHT

    if (theme === 'light') {
      document.documentElement.classList.remove('dark');

      return;
    }

    // DARK

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');

      return;
    }

    // DEFAULT / SYSTEM

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.applySystemTheme(prefersDark);
  }

  // APPLY SYSTEM THEME

  private applySystemTheme(prefersDark: boolean): void {
    if (this.selectedTheme !== 'default') {
      return;
    }

    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // CHECK SELECTED THEME

  isThemeSelected(theme: string): boolean {
    return this.selectedTheme === theme;
  }

  // LOAD USER

  loadUser(): void {
    const token = this.authService.getToken();

    // JWT EXISTS

    if (token) {
      try {
        const tokenParts = token.split('.');

        if (tokenParts.length >= 2) {
          const payloadPart = tokenParts[1];

          // ----------------------------------------------------
          // NORMALIZE BASE64URL
          // ----------------------------------------------------

          const normalizedPayload = payloadPart
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), '=');

          // ----------------------------------------------------
          // DECODE JWT
          // ----------------------------------------------------

          const payload = JSON.parse(atob(normalizedPayload));

          console.log('Manager JWT payload:', payload);

          // ----------------------------------------------------
          // STORED USER
          // ----------------------------------------------------

          const storedUser = this.authService.getUser();

          // ----------------------------------------------------
          // MERGE USER DATA
          // ----------------------------------------------------

          this.user = {
            ...(storedUser || {}),
            ...payload,
          };

          console.log('Manager authenticated user:', this.user);

          console.log('Manager authenticated name:', this.user?.name);

          console.log('Manager authenticated user_name:', this.user?.user_name);

          // ----------------------------------------------------
          // FORCE UI UPDATE
          // ----------------------------------------------------

          this.cdr.detectChanges();
        }
      } catch (error) {
        console.error('Manager - Failed to decode JWT:', error);

        // Preserve existing behavior as fallback
        this.user = this.authService.getUser();

        this.cdr.detectChanges();
      }
    } else {
      this.user = this.authService.getUser();

      this.cdr.detectChanges();
    }
  }

  // LOAD PENDING REVIEWER REQUESTS

  loadPendingRequests(): void {
    const token = this.authService.getToken();

    // SAFETY CHECK

    if (!token) {
      console.error('Reviewer - Cannot load requests because JWT is missing.');

      this.router.navigate(['/login']);

      return;
    }

    this.loading = true;

    this.message = '';

    // CALL REVIEWER API

    this.requestService.getPendingReviewerRequests().subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (response: any) => {
        console.log('Pending reviewer requests:', response);

        if (Array.isArray(response)) {
          this.requests = response;
        } else {
          this.requests = response?.requests || response?.pendingRequests || [];
        }

        // Keep a separate reference for the template.

        this.pendingRequests = [...this.requests];

        this.pendingCount = this.requests.length;

        this.loading = false;

        this.cdr.detectChanges();

        // ----------------------------------------------------
        // LOAD COMPLETE REQUEST DETAILS
        // ----------------------------------------------------

        this.requests.forEach((request: any) => {
          if (request?.id) {
            this.loadRequestDetails(request.id);
          }
        });
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error('Failed to load reviewer requests:', error);

        console.error('Backend response:', error.error);

        this.loading = false;

        this.requests = [];

        this.pendingRequests = [];

        this.pendingCount = 0;

        this.message = error.error?.message || 'Failed to load pending reviewer requests.';

        // ----------------------------------------------------
        // UNAUTHORIZED
        // ----------------------------------------------------

        if (error.status === 401) {
          console.error('Reviewer authentication failed.');

          this.authService.logout();

          this.router.navigate(['/login']);

          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  // LOAD APPROVED REQUESTS

  loadApprovedRequests(): void {
    this.loadingApproved = true;

    this.requestService.getApprovedRequests().subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (response: any) => {
        console.log('Approved requests:', response);

        if (Array.isArray(response)) {
          this.approvedRequests = response;
        } else {
          this.approvedRequests = response?.requests || response?.approvedRequests || [];
        }

        this.approvedCount = this.approvedRequests.length;

        this.loadingApproved = false;

        this.cdr.detectChanges();
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error('Failed to load approved requests:', error);

        console.error('Backend response:', error.error);

        this.approvedRequests = [];

        this.approvedCount = 0;

        this.loadingApproved = false;

        // ----------------------------------------------------
        // UNAUTHORIZED
        // ----------------------------------------------------

        if (error.status === 401) {
          this.authService.logout();

          this.router.navigate(['/login']);

          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  // LOAD COMPLETE REQUEST DETAILS

  loadRequestDetails(requestId: number): void {
    if (!requestId) {
      console.error('Invalid request ID:', requestId);

      return;
    }

    this.requestService.getRequestById(requestId).subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (response: any) => {
        console.log('Reviewer request details:', response);

        // ----------------------------------------------------
        // UPDATE PENDING REQUEST
        // ----------------------------------------------------

        const pendingIndex = this.requests.findIndex((request: any) => request.id === requestId);

        if (pendingIndex !== -1) {
          const detailedRequest = response?.request || response;

          this.requests[pendingIndex] = {
            ...this.requests[pendingIndex],

            ...detailedRequest,

            attachments: response?.attachments || detailedRequest?.attachments || [],

            approval_history: response?.approval_history || detailedRequest?.approval_history || [],

            plant_details: response?.plant_details || detailedRequest?.plant_details || null,
          };

          this.pendingRequests = [...this.requests];
        }

        // ----------------------------------------------------
        // UPDATE APPROVED REQUEST
        // ----------------------------------------------------

        const approvedIndex = this.approvedRequests.findIndex(
          (request: any) => request.id === requestId,
        );

        if (approvedIndex !== -1) {
          const detailedRequest = response?.request || response;

          this.approvedRequests[approvedIndex] = {
            ...this.approvedRequests[approvedIndex],

            ...detailedRequest,

            attachments: response?.attachments || detailedRequest?.attachments || [],

            approval_history: response?.approval_history || detailedRequest?.approval_history || [],

            plant_details: response?.plant_details || detailedRequest?.plant_details || null,
          };
        }

        this.requests = [...this.requests];

        this.approvedRequests = [...this.approvedRequests];

        // ----------------------------------------------------
        // UPDATE SELECTED REQUEST
        // ----------------------------------------------------

        if (this.selectedRequest?.id === requestId) {
          const updatedRequest = response?.request || response;

          this.selectedRequest = {
            ...this.selectedRequest,

            ...updatedRequest,

            attachments: response?.attachments || updatedRequest?.attachments || [],

            approval_history: response?.approval_history || updatedRequest?.approval_history || [],

            plant_details: response?.plant_details || updatedRequest?.plant_details || null,
          };
        }

        this.cdr.detectChanges();

        console.log('Attachments loaded for request', requestId);
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error(`Failed to load request ${requestId}:`, error);

        console.error('Backend response:', error.error);
      },
    });
  }

  // VIEW REQUEST DETAILS

  viewRequest(id: number): void {
    const request =
      this.requests.find((item: any) => item?.id === id) ||
      this.pendingRequests.find((item: any) => item?.id === id) ||
      this.approvedRequests.find((item: any) => item?.id === id);

    if (!request) {
      console.error(`Request ${id} was not found in the loaded request lists.`);

      this.message = 'Unable to open the request details.';

      return;
    }

    // Keep request details inside the Manager panel.
    this.selectRequest(request);
  }

  // SELECT REQUEST

  selectRequest(request: any): void {
    this.selectedRequest = request;

    this.scientificName = request?.scientific_name || request?.request_data?.scientific_name || '';

    this.description = request?.description || request?.request_data?.description || '';

    this.comments = '';

    this.rejectingRequest = false;

    if (request?.id && !Array.isArray(request?.attachments)) {
      this.loadRequestDetails(request.id);
    }
  }

  // CLEAR SELECTED REQUEST

  clearSelectedRequest(): void {
    this.selectedRequest = null;

    this.scientificName = '';

    this.description = '';

    this.comments = '';

    this.rejectingRequest = false;

    this.selectedImageFile = null;
  }

  // REVIEWER APPROVE REQUEST

  // REVIEWER APPROVE REQUEST

  approveRequest(id: number): void {
    // Validate scientific name
    if (!this.scientificName.trim()) {
      this.message = 'Scientific name is required.';
      return;
    }

    // Validate description
    if (!this.description.trim()) {
      this.message = 'Description is required.';
      return;
    }

    this.message = '';

    const data = {
      scientific_name: this.scientificName.trim(),
      description: this.description.trim(),
      comments: this.comments.trim(),
    };

    this.requestService.reviewerApprove(id, data).subscribe({
      next: (response: any) => {
        console.log('Reviewer approval successful:', response);

        this.message = 'Request approved successfully.';

        // Clear the currently selected request
        this.clearSelectedRequest();

        // Refresh pending requests
        this.loadPendingRequests();

        // IMPORTANT:
        // Refresh approved requests so the counter changes
        // from 0 -> 1 immediately after approval.
        this.loadApprovedRequests();
      },

      error: (error: HttpErrorResponse) => {
        console.error('Reviewer approval failed:', error);
        console.error('Backend response:', error.error);

        if (error.status === 409 && error.error?.code === 'DUPLICATE_PLANT') {
          this.duplicateConflict = error.error.existing_record;
          this.compareRecord = null;
          return;
        }
        this.message = error.error?.message || 'Failed to approve request.';

        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  chooseNewVersion(): void {
    if (!this.selectedRequest?.id) return;
    this.duplicateConflict = null;
    this.approveWithDuplicateAction(this.selectedRequest.id, 'new');
  }

  openExistingComparison(): void {
    this.compareRecord = this.duplicateConflict;
    this.compareNewRecord = this.selectedRequest;
    this.showCompare = true;
  }

  closeDuplicateDialog(): void {
    this.duplicateConflict = null;
    this.compareRecord = null;
    this.compareNewRecord = null;
    this.showCompare = false;
  }

  saveNewRecordReplacingExisting(): void {
    if (!this.selectedRequest?.id) return;
    this.closeDuplicateDialog();
    this.approveWithDuplicateAction(this.selectedRequest.id, 'replace');
  }

  private approveWithDuplicateAction(id: number, action: 'new' | 'replace'): void {
    const data = {
      scientific_name: this.scientificName.trim(),
      description: this.description.trim(),
      comments: this.comments.trim(),
      duplicate_action: action,
    };
    this.requestService.reviewerApprove(id, data).subscribe({
      next: () => {
        this.message = 'Request approved successfully.';
        this.clearSelectedRequest();
        this.loadPendingRequests();
        this.loadApprovedRequests();
      },
      error: (error: HttpErrorResponse) => {
        this.message = error.error?.message || 'Failed to approve request.';
      },
    });
  }
  //###################################################33333

  // START REJECTION

  startRejecting(): void {
    this.rejectingRequest = true;

    this.comments = '';

    this.message = '';
  }

  // CANCEL REJECTION

  cancelRejecting(): void {
    this.rejectingRequest = false;

    this.comments = '';

    this.message = '';
  }

  // REJECT REQUEST

  rejectRequest(id: number): void {
    const trimmedComments = this.comments.trim();

    // COMMENTS REQUIRED

    if (!trimmedComments) {
      this.message = 'Please enter rejection comments.';

      return;
    }

    this.message = '';

    const data = {
      comments: trimmedComments,
    };

    // REJECTION API

    this.requestService.reject(id, data).subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (response: any) => {
        console.log('Reviewer request rejected:', response);

        this.message = 'Request rejected successfully.';

        this.clearSelectedRequest();

        this.loadPendingRequests();
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error('Request rejection failed:', error);

        console.error('Backend response:', error.error);

        this.message = error.error?.message || 'Failed to reject request.';

        if (error.status === 401) {
          this.authService.logout();

          this.router.navigate(['/login']);

          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  // IMAGE FILE SELECTED

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedImageFile = null;

      return;
    }

    const file = input.files[0];

    // IMAGE TYPE VALIDATION

    if (!file.type || !file.type.startsWith('image/')) {
      this.message = 'Please select a valid image file.';

      input.value = '';

      this.selectedImageFile = null;

      return;
    }

    // 5 MB SIZE VALIDATION

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      this.message = 'Image size must not exceed 5 MB.';

      input.value = '';

      this.selectedImageFile = null;

      return;
    }

    this.message = '';

    this.selectedImageFile = file;

    console.log('Selected image:', file.name);
  }

  // ADD IMAGE TO EXISTING REQUEST

  addImage(requestId: number): void {
    if (!this.selectedImageFile) {
      this.message = 'Please select an image first.';

      return;
    }

    if (!requestId) {
      this.message = 'Invalid request ID.';

      return;
    }

    this.uploadingAttachment = true;

    this.message = '';

    this.requestService.addAttachment(requestId, this.selectedImageFile).subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (response: any) => {
        console.log('Image uploaded successfully:', response);

        this.message = 'Image added successfully.';

        this.selectedImageFile = null;

        this.uploadingAttachment = false;

        // ----------------------------------------------------
        // RELOAD REQUEST
        // ----------------------------------------------------

        this.loadRequestDetails(requestId);

        this.loadPendingRequests();
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error('Image upload failed:', error);

        console.error('Backend response:', error.error);

        this.uploadingAttachment = false;

        this.message = error.error?.message || 'Failed to upload image.';

        if (error.status === 401) {
          this.authService.logout();

          this.router.navigate(['/login']);

          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  // DELETE IMAGE

  deleteImage(attachmentId: number, requestId?: number): void {
    if (!attachmentId) {
      this.message = 'Invalid attachment ID.';

      return;
    }

    this.deletingAttachment = true;

    this.message = '';

    this.requestService.deleteAttachment(attachmentId).subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (response: any) => {
        console.log('Image deleted successfully:', response);

        this.message = 'Image deleted successfully.';

        this.deletingAttachment = false;

        if (requestId) {
          this.loadRequestDetails(requestId);
        }

        this.loadPendingRequests();
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error('Image deletion failed:', error);

        console.error('Backend response:', error.error);

        this.deletingAttachment = false;

        this.message = error.error?.message || 'Failed to delete image.';

        if (error.status === 401) {
          this.authService.logout();

          this.router.navigate(['/login']);

          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  // CONFIRM BEFORE DELETE

  confirmDeleteImage(attachmentId: number, requestId?: number): void {
    const confirmed = window.confirm(
      'Are you sure you want to delete this image? This action cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    this.deleteImage(attachmentId, requestId);
  }

  // DOWNLOAD IMAGE

  downloadImage(attachmentId: number, fileName?: string): void {
    if (!attachmentId) {
      this.message = 'Invalid attachment ID.';

      return;
    }

    this.downloadingAttachment = true;

    this.message = '';

    this.requestService.downloadAttachment(attachmentId).subscribe({
      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      next: (blob: Blob) => {
        console.log('Image downloaded successfully.');

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;

        link.download = fileName || `plant-image-${attachmentId}`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

        this.downloadingAttachment = false;

        this.cdr.detectChanges();
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      error: (error: HttpErrorResponse) => {
        console.error('Image download failed:', error);

        this.downloadingAttachment = false;

        this.message = error.error?.message || 'Failed to download image.';

        if (error.status === 401) {
          this.authService.logout();

          this.router.navigate(['/login']);

          return;
        }

        this.cdr.detectChanges();
      },
    });
  }

  // GET IMAGE URL

  getImageUrl(filePath: string): string {
    return this.requestService.getImageUrl(filePath);
  }

  // GET ATTACHMENTS

  getAttachments(request: any): any[] {
    if (!request || !Array.isArray(request.attachments)) {
      return [];
    }

    return request.attachments;
  }

  // GET ATTACHMENT COUNT

  getAttachmentCount(request: any): number {
    return this.getAttachments(request).length;
  }

  // GET REQUEST DATA

  getRequestData(request: any): any {
    if (!request) {
      return {};
    }

    if (request.request_data && typeof request.request_data === 'object') {
      return request.request_data;
    }

    return {};
  }

  // GET PLANT NAME

  getPlantName(request: any): string {
    const data = this.getRequestData(request);

    return (
      request?.plant_name ||
      request?.plantName ||
      data?.plant_name ||
      data?.plantName ||
      request?.scientific_name ||
      data?.scientific_name ||
      'Unnamed Plant'
    );
  }

  // GET COMMON NAME

  getCommonName(request: any): string {
    const data = this.getRequestData(request);

    return (
      request?.common_name || request?.commonName || data?.common_name || data?.commonName || '-'
    );
  }

  // GET EMPLOYEE NAME

  getEmployeeName(request: any): string {
    const data = this.getRequestData(request);

    return (
      request?.employee_name ||
      request?.employeeName ||
      data?.employee_name ||
      data?.employeeName ||
      data?.user_name ||
      data?.userName ||
      'Unknown'
    );
  }

  // GET REQUEST NUMBER

  getRequestNumber(request: any): string {
    return request?.request_number || request?.requestNumber || `REQ-${request?.id || ''}`;
  }

  // GET REQUEST DATE

  getRequestDate(request: any): any {
    return (
      request?.created_at ||
      request?.submitted_at ||
      request?.created_date ||
      request?.request_data?.created_at ||
      null
    );
  }

  // GET DISPLAY VALUE

  getDisplayValue(value: any, fallback: string = 'N/A'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return fallback;
      }
    }

    return String(value);
  }

  // GET EMPLOYEE ID

  getEmployeeId(request: any): any {
    const data = this.getRequestData(request);

    return (
      request?.employee_id ?? request?.employeeId ?? data?.employee_id ?? data?.employeeId ?? null
    );
  }

  // GET EMPLOYEE EMAIL

  getEmployeeEmail(request: any): string {
    const data = this.getRequestData(request);

    return (
      request?.employee_email ||
      request?.employeeEmail ||
      data?.employee_email ||
      data?.employeeEmail ||
      data?.email ||
      'N/A'
    );
  }

  // GET REQUEST TYPE

  getRequestType(request: any): string {
    const data = this.getRequestData(request);

    return (
      request?.request_type ||
      request?.requestType ||
      data?.request_type ||
      data?.requestType ||
      'N/A'
    );
  }

  // GET APPROVAL LEVEL

  getApprovalLevel(request: any): any {
    return (
      request?.current_approval_level ??
      request?.currentApprovalLevel ??
      this.getRequestData(request)?.current_approval_level ??
      null
    );
  }

  // GET FAMILY

  getFamily(request: any): string {
    const data = this.getRequestData(request);

    return request?.family || data?.family || 'N/A';
  }

  // GET HABITAT

  getHabitat(request: any): string {
    const data = this.getRequestData(request);

    return request?.habitat || data?.habitat || 'N/A';
  }

  // GET LATITUDE

  getLatitude(request: any): any {
    const data = this.getRequestData(request);

    return request?.latitude ?? data?.latitude ?? null;
  }

  // GET LONGITUDE

  getLongitude(request: any): any {
    const data = this.getRequestData(request);

    return request?.longitude ?? data?.longitude ?? null;
  }

  // GET PLANT IMAGE

  getPlantImage(request: any): string {
    const data = this.getRequestData(request);

    const imagePath =
      request?.image_url ||
      request?.imageUrl ||
      data?.image_url ||
      data?.imageUrl ||
      '';

    if (!imagePath) {
      return '';
    }

    if (
      imagePath.startsWith('http://') ||
      imagePath.startsWith('https://')
    ) {
      return imagePath;
    }

    return `${PLANT_IMAGE_BASE_URL}${imagePath.replace(/^[/\\]+/, '')}`;
  }

  getCompareValue(record: any, field: string, isNew = false): string {
    if (isNew && field === 'scientific_name') {
      return this.scientificName || this.getRequestData(record)?.scientific_name || 'N/A';
    }

    if (field === 'common_name') return this.getCommonName(record);
    if (field === 'family') return this.getFamily(record);
    if (field === 'habitat') return this.getHabitat(record);
    if (field === 'latitude') return this.getDisplayValue(this.getLatitude(record));
    if (field === 'longitude') return this.getDisplayValue(this.getLongitude(record));
    if (field === 'plant_name') return this.getPlantName(record);

    return this.getDisplayValue(record?.[field] ?? this.getRequestData(record)?.[field]);
  }

  getComparisonImages(record: any, isNew = false): string[] {
    const paths: string[] = [];

    if (isNew) {
      this.getAttachments(record).forEach((attachment: any) => {
        const path = attachment?.file_path || attachment?.filePath;
        if (path) paths.push(path);
      });
    }

    const image = this.getPlantImage(record);
    if (image && !paths.includes(image)) paths.push(image);

    return paths;
  }

  // GET COMMENTS

  getRequestComments(request: any): string {
    return request?.comments || request?.comment || this.getRequestData(request)?.comments || '';
  }

  // GET APPROVAL HISTORY

  getApprovalHistory(request: any): any[] {
    if (!request) {
      return [];
    }

    if (Array.isArray(request.approval_history)) {
      return request.approval_history;
    }

    if (Array.isArray(request.approvalHistory)) {
      return request.approvalHistory;
    }

    return [];
  }

  // GET PLANT DETAILS

  getPlantDetails(request: any): any {
    return request?.plant_details || request?.plantDetails || null;
  }

  // GET COMPLETED DATE

  getCompletedDate(request: any): any {
    return request?.completed_at || request?.completedAt || null;
  }

  // LOGOUT

  logout(): void {
    this.profileMenuOpen = false;

    this.profileThemeExpanded = false;

    const confirmed = window.confirm('Are you sure you want to logout?');

    if (!confirmed) {
      return;
    }

    this.authService.logout('http://192.168.29.217:8200/');
  }
}
