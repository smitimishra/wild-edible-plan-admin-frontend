import {
  Component,
  HostListener,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { FormsModule } from '@angular/forms';

import {
  DatePipe,
  DecimalPipe
} from '@angular/common';

import {
  AuthService
} from '../../services/auth';

import {
  RequestService
} from '../../services/request';

import { SessionPopupComponent } from '../../components/session-popup/session-popup';


@Component({
  selector: 'app-manager',

  imports: [
    FormsModule,
    DecimalPipe,
    DatePipe,
    SessionPopupComponent
  ],

  templateUrl: './manager.html'
})
export class Manager implements OnInit {

  // ============================================================
  // USER
  // ============================================================

  user: any = null;


  // ============================================================
  // REQUEST DATA
  // ============================================================

  requests: any[] = [];

  pendingCount = 0;

  loading = false;

  message = '';


  // ============================================================
  // APPROVAL FORM
  // ============================================================

  selectedRequest: any = null;

  scientificName = '';

  description = '';

  comments = '';


  // ============================================================
  // IMAGE / ATTACHMENT MANAGEMENT
  // ============================================================

  selectedImageFile: File | null = null;

  uploadingAttachment = false;

  deletingAttachment = false;

  downloadingAttachment = false;


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private router: Router,
    private route: ActivatedRoute,
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
  // INITIALIZATION
  // ============================================================

  ngOnInit(): void {

    /*
     * ==========================================================
     * JWT FROM URL
     * ==========================================================
     *
     * Expected URL:
     *
     * /manager?token=YOUR_JWT_TOKEN
     *
     * This follows the same authentication pattern already used
     * by admin.ts.
     *
     * The token from the URL is first saved into localStorage.
     * Only after that do we load Manager data.
     */

    this.route.queryParamMap.subscribe(params => {

      const urlToken =
        params.get('token')?.trim() || null;

      const managerRoles = [
        'MANAGER',
        'GENERAL MANAGER',
        'ASSISTANT MANAGER'
      ];


      // --------------------------------------------------------
      // TOKEN FOUND IN URL
      // --------------------------------------------------------

      if (urlToken) {

        console.log(
          'JWT token received from Manager URL'
        );

        this.authService.saveToken(
          urlToken
        );

      }

      const token =
        this.authService.getToken();

      const tokenRole =
        this.authService.getTokenRole(token);


      // --------------------------------------------------------
      // CHECK TOKEN
      // --------------------------------------------------------

      if (
        !token ||
        this.authService.isTokenExpired(token) ||
        !managerRoles.includes(tokenRole || '')
      ) {

        console.error(
          'Manager - A valid manager token is required.'
        );

        this.authService.logout();

        this.router.navigate([
          '/login'
        ]);

        return;
      }


      console.log(
        'Manager authentication token is available'
      );


      // --------------------------------------------------------
      // START SESSION POLLING
      // Redirects to login portal if session is invalidated
      // --------------------------------------------------------

      this.authService.startSessionPolling();


      // --------------------------------------------------------
      // LOAD USER
      // --------------------------------------------------------

      this.loadUser();


      // --------------------------------------------------------
      // LOAD MANAGER REQUESTS
      // --------------------------------------------------------

      this.loadPendingRequests();

    });

  }


  // ============================================================
  // LOAD CURRENT USER
  // ============================================================

  loadUser(): void {

    // First try the user object maintained by AuthService.
    this.user = this.authService.getUser();

    // In the Manager SSO flow the JWT can be valid even when no user
    // object has been stored in localStorage. Decode the same token
    // used for authentication so Manager pages still know the role.
    if (!this.user) {

      const token = this.authService.getToken();

      if (token) {
        try {
          const payload = JSON.parse(
            atob(
              token.split('.')[1]
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(
                  token.split('.')[1].length +
                  (4 - token.split('.')[1].length % 4) % 4,
                  '='
                )
            )
          );

          this.user = payload;
        } catch (error) {
          console.error('Manager - Failed to decode JWT:', error);
        }
      }
    }

    console.log('Manager user:', this.user);

  }


  // ============================================================
  // LOAD PENDING MANAGER REQUESTS
  // ============================================================

  loadPendingRequests(): void {

    const token =
      this.authService.getToken();


    // ----------------------------------------------------------
    // SAFETY CHECK
    // ----------------------------------------------------------

    if (!token) {

      console.error(
        'Manager - Cannot load requests because JWT is missing.'
      );

      this.router.navigate([
        '/login'
      ]);

      return;
    }


    this.loading = true;

    this.message = '';


    this.requestService
      .getPendingManagerRequests()
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Pending manager requests:',
            response
          );


          /*
           * Backend may return:
           *
           * [
           *   ...
           * ]
           *
           * OR:
           *
           * {
           *   requests: [...]
           * }
           */

          if (Array.isArray(response)) {

            this.requests =
              response;

          } else {

            this.requests =
              response?.requests || [];

          }


          this.pendingCount =
            this.requests.length;


          this.loading = false;


          this.cdr.detectChanges();


          // ----------------------------------------------------
          // LOAD COMPLETE REQUEST DETAILS
          // ----------------------------------------------------

          this.requests.forEach(
            (request: any) => {

              if (request?.id) {

                this.loadRequestDetails(
                  request.id
                );

              }

            }
          );

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Failed to load manager requests:',
            error
          );

          console.error(
            'Backend response:',
            error.error
          );


          this.loading = false;


          this.message =
            error.error?.message ||
            'Failed to load pending requests.';


          /*
           * If the backend says the token is invalid/expired,
           * send the Manager back to login.
           */

          if (
            error.status === 401
          ) {

            console.error(
              'Manager authentication failed.'
            );

            this.authService.logout();

            this.router.navigate([
              '/login'
            ]);

            return;
          }


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // LOAD COMPLETE REQUEST DETAILS
  // ============================================================

  loadRequestDetails(
    requestId: number
  ): void {

    if (!requestId) {

      console.error(
        'Invalid request ID:',
        requestId
      );

      return;
    }


    this.requestService
      .getRequestById(requestId)
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Request details:',
            response
          );


          const index =
            this.requests.findIndex(
              (request: any) =>
                request.id === requestId
            );


          if (index === -1) {

            console.warn(
              'Request not found in current list:',
              requestId
            );

            return;
          }


          const detailedRequest =
            response?.request ||
            response;


          this.requests[index] = {

            ...this.requests[index],

            ...detailedRequest,

            attachments:
              response?.attachments ||
              detailedRequest?.attachments ||
              [],

            approval_history:
              response?.approval_history ||
              detailedRequest?.approval_history ||
              [],

            plant_details:
              response?.plant_details ||
              detailedRequest?.plant_details ||
              null

          };


          this.requests = [
            ...this.requests
          ];


          this.cdr.detectChanges();


          console.log(
            'Attachments loaded for request',
            requestId,
            this.requests[index].attachments
          );

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            `Failed to load request ${requestId}:`,
            error
          );

          console.error(
            'Backend response:',
            error.error
          );

        }

      });

  }


  // ============================================================
  // VIEW REQUEST DETAILS
  // ============================================================

  viewRequest(
    id: number
  ): void {

    const token =
      this.authService.getToken();


    if (!token) {

      console.error(
        'Cannot open request details: JWT token is missing.'
      );

      this.router.navigate([
        '/login'
      ]);

      return;
    }


    /*
     * IMPORTANT:
     *
     * We also pass the JWT through the URL when opening
     * Manager request details.
     *
     * This keeps the authentication flow consistent across
     * Manager pages.
     */

    this.router.navigate(
      [
        '/manager/request',
        id
      ],
      {
        queryParams: {
          token: token
        }
      }
    );

  }


  // ============================================================
  // SELECT REQUEST
  // ============================================================

  selectRequest(
    request: any
  ): void {

    this.selectedRequest =
      request;


    this.scientificName =
      request?.scientific_name || '';


    this.description =
      request?.description || '';


    this.comments = '';


    if (
      request?.id &&
      !Array.isArray(
        request?.attachments
      )
    ) {

      this.loadRequestDetails(
        request.id
      );

    }

  }


  // ============================================================
  // CLEAR SELECTED REQUEST
  // ============================================================

  clearSelectedRequest(): void {

    this.selectedRequest = null;

    this.scientificName = '';

    this.description = '';

    this.comments = '';

    this.selectedImageFile = null;

  }


  // ============================================================
  // MANAGER APPROVE REQUEST
  // ============================================================

  approveRequest(
    id: number
  ): void {

    if (
      !this.scientificName.trim()
    ) {

      this.message =
        'Scientific name is required.';

      return;
    }


    if (
      !this.description.trim()
    ) {

      this.message =
        'Description is required.';

      return;
    }


    this.message = '';


    const data = {

      scientific_name:
        this.scientificName.trim(),

      description:
        this.description.trim(),

      comments:
        this.comments.trim()

    };


    this.requestService
      .managerApprove(
        id,
        data
      )
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Manager approval successful:',
            response
          );


          this.message =
            'Request approved successfully.';


          this.clearSelectedRequest();


          this.loadPendingRequests();

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Manager approval failed:',
            error
          );

          console.error(
            'Backend response:',
            error.error
          );


          this.message =
            error.error?.message ||
            'Failed to approve request.';


          if (
            error.status === 401
          ) {

            this.authService.logout();

            this.router.navigate([
              '/login'
            ]);

            return;
          }


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

    const trimmedComments =
      this.comments.trim();


    if (!trimmedComments) {

      this.message =
        'Please enter rejection comments.';

      return;
    }


    this.message = '';


    const data = {

      comments:
        trimmedComments

    };


    this.requestService
      .reject(
        id,
        data
      )
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Request rejected:',
            response
          );


          this.message =
            'Request rejected successfully.';


          this.clearSelectedRequest();


          this.loadPendingRequests();

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Request rejection failed:',
            error
          );

          console.error(
            'Backend response:',
            error.error
          );


          this.message =
            error.error?.message ||
            'Failed to reject request.';


          if (
            error.status === 401
          ) {

            this.authService.logout();

            this.router.navigate([
              '/login'
            ]);

            return;
          }


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // IMAGE FILE SELECTED
  // ============================================================

  onImageSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {

      this.selectedImageFile =
        null;

      return;
    }


    const file =
      input.files[0];


    // ----------------------------------------------------------
    // IMAGE TYPE VALIDATION
    // ----------------------------------------------------------

    if (
      !file.type ||
      !file.type.startsWith('image/')
    ) {

      this.message =
        'Please select a valid image file.';

      input.value = '';

      this.selectedImageFile =
        null;

      return;
    }


    // ----------------------------------------------------------
    // 5 MB SIZE VALIDATION
    // ----------------------------------------------------------

    const maxSize =
      5 * 1024 * 1024;


    if (
      file.size > maxSize
    ) {

      this.message =
        'Image size must not exceed 5 MB.';

      input.value = '';

      this.selectedImageFile =
        null;

      return;
    }


    this.message = '';

    this.selectedImageFile =
      file;


    console.log(
      'Selected image:',
      file.name
    );

  }


  // ============================================================
  // ADD IMAGE TO EXISTING REQUEST
  // ============================================================

  addImage(
    requestId: number
  ): void {

    if (!this.selectedImageFile) {

      this.message =
        'Please select an image first.';

      return;
    }


    if (!requestId) {

      this.message =
        'Invalid request ID.';

      return;
    }


    this.uploadingAttachment =
      true;

    this.message = '';


    this.requestService
      .addAttachment(
        requestId,
        this.selectedImageFile
      )
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Image uploaded successfully:',
            response
          );


          this.message =
            'Image added successfully.';


          this.selectedImageFile =
            null;


          this.uploadingAttachment =
            false;


          this.loadPendingRequests();

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Image upload failed:',
            error
          );

          console.error(
            'Backend response:',
            error.error
          );


          this.uploadingAttachment =
            false;


          this.message =
            error.error?.message ||
            'Failed to upload image.';


          if (
            error.status === 401
          ) {

            this.authService.logout();

            this.router.navigate([
              '/login'
            ]);

            return;
          }


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // DELETE IMAGE
  // ============================================================

  deleteImage(
    attachmentId: number,
    requestId?: number
  ): void {

    if (!attachmentId) {

      this.message =
        'Invalid attachment ID.';

      return;
    }


    this.deletingAttachment =
      true;

    this.message = '';


    this.requestService
      .deleteAttachment(
        attachmentId
      )
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Image deleted successfully:',
            response
          );


          this.message =
            'Image deleted successfully.';


          this.deletingAttachment =
            false;


          this.loadPendingRequests();

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Image deletion failed:',
            error
          );

          console.error(
            'Backend response:',
            error.error
          );


          this.deletingAttachment =
            false;


          this.message =
            error.error?.message ||
            'Failed to delete image.';


          if (
            error.status === 401
          ) {

            this.authService.logout();

            this.router.navigate([
              '/login'
            ]);

            return;
          }


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // CONFIRM BEFORE DELETE
  // ============================================================

  confirmDeleteImage(
    attachmentId: number,
    requestId?: number
  ): void {

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this image? This action cannot be undone.'
      );


    if (!confirmed) {

      return;
    }


    this.deleteImage(
      attachmentId,
      requestId
    );

  }


  // ============================================================
  // DOWNLOAD IMAGE
  // ============================================================

  downloadImage(
    attachmentId: number,
    fileName?: string
  ): void {

    if (!attachmentId) {

      this.message =
        'Invalid attachment ID.';

      return;
    }


    this.downloadingAttachment =
      true;

    this.message = '';


    this.requestService
      .downloadAttachment(
        attachmentId
      )
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (blob: Blob) => {

          console.log(
            'Image downloaded successfully.'
          );


          const url =
            window.URL.createObjectURL(
              blob
            );


          const link =
            document.createElement('a');


          link.href =
            url;


          link.download =
            fileName ||
            `plant-image-${attachmentId}`;


          link.click();


          window.URL.revokeObjectURL(
            url
          );


          this.downloadingAttachment =
            false;


          this.cdr.detectChanges();

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (error: HttpErrorResponse) => {

          console.error(
            'Image download failed:',
            error
          );


          this.downloadingAttachment =
            false;


          this.message =
            'Failed to download image.';


          if (
            error.status === 401
          ) {

            this.authService.logout();

            this.router.navigate([
              '/login'
            ]);

            return;
          }


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // GET IMAGE URL
  // ============================================================

  getImageUrl(
    filePath: string
  ): string {

    return this.requestService
      .getImageUrl(
        filePath
      );

  }


  // ============================================================
  // GET ATTACHMENTS
  // ============================================================

  getAttachments(
    request: any
  ): any[] {

    if (
      !request ||
      !Array.isArray(
        request.attachments
      )
    ) {

      return [];

    }


    return request.attachments;

  }


  // ============================================================
  // GET ATTACHMENT COUNT
  // ============================================================

  getAttachmentCount(
    request: any
  ): number {

    return this.getAttachments(
      request
    ).length;

  }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {

    const confirmed =
      confirm(
        'Are you sure you want to logout?'
      );


    if (!confirmed) {

      return;
    }


    this.authService.logout(
      'http://192.168.29.216:8200/'
    );

  }

}