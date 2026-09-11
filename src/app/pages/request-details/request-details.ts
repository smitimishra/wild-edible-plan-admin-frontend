import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule,
  DatePipe,
  DecimalPipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { AuthService } from '../../services/auth';

import { RequestService } from '../../services/request';


// ============================================================
// ATTACHMENT
// ============================================================

interface RequestAttachment {

  id: number;

  request_id: number;

  file_name: string;

  file_path: string;

  mime_type: string;

  file_size: number | string;

  created_at: string;

  image_type?: string;

}


// ============================================================
// APPROVAL HISTORY
// ============================================================

interface ApprovalHistory {

  id: number;

  request_id?: number;

  approval_level: number;

  action: string;

  comments: string | null;

  action_at: string;

  approver_id: number;

  approver_name: string;

  approver_role: string;

}


// ============================================================
// REQUEST DATA
// ============================================================

interface RequestData {

  plant_name?: string;

  common_name?: string;

  scientific_name?: string;

  description?: string;

  family?: string;

  habitat?: string;

  distribution?: string;

  edible_parts?: string;

  nutritional_value?: string;

  flowering_season?: string;

  conservation_status?: string;

  latitude?: number | string;

  longitude?: number | string;

  [key: string]: any;

}


// ============================================================
// REQUEST MODEL
// ============================================================
//
// Current approval_requests table:
//
// id
// request_number
// status
// current_approval_level
// request_data
//
// Extra fields are optional because the backend may return
// employee information by joining user_table.
// ============================================================

interface RequestDetailsModel {

  id: number;

  request_number: string;

  status: string;

  current_approval_level: number;

  request_data: RequestData;

  attachments?: RequestAttachment[];

  approval_history?: ApprovalHistory[];

  employee_id?: number;

  employee_name?: string;

  employee_email?: string;

  employee_code?: string;

  created_at?: string;

  submitted_at?: string;

  updated_at?: string;

  completed_at?: string | null;

  [key: string]: any;

}


// ============================================================
// COMPONENT
// ============================================================

@Component({

  selector: 'app-request-details',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe
  ],

  templateUrl: './request-details.html'

})
export class RequestDetails implements OnInit {


  // ============================================================
  // REQUEST
  // ============================================================

  request: RequestDetailsModel | null = null;

  attachments: RequestAttachment[] = [];

  approvalHistory: ApprovalHistory[] = [];


  // ============================================================
  // PLANT DATA
  // ============================================================

  scientificName = '';

  description = '';

  comments = '';


  // ============================================================
  // IMAGE VIEWER
  // ============================================================

  currentImageIndex = 0;

  isImageZoomed = false;

  zoomScale = 1;

  readonly minZoom = 1;

  readonly maxZoom = 4;

  readonly zoomStep = 0.25;


  // ============================================================
  // IMAGE PAN
  // ============================================================

  panX = 0;

  panY = 0;


  // ============================================================
  // MOUSE DRAG
  // ============================================================

  isDragging = false;

  private dragStartX = 0;

  private dragStartY = 0;

  private initialPanX = 0;

  private initialPanY = 0;


  // ============================================================
  // TOUCH DRAG
  // ============================================================

  isTouching = false;

  private touchStartX = 0;

  private touchStartY = 0;

  private touchInitialPanX = 0;

  private touchInitialPanY = 0;


  // ============================================================
  // DOWNLOAD
  // ============================================================

  downloadingAttachmentId: number | null = null;


  // ============================================================
  // IMAGE MANAGEMENT
  // ============================================================

  uploadingAttachment = false;

  deletingAttachmentId: number | null = null;


  // ============================================================
  // SELECTED IMAGE
  // ============================================================

  selectedImageFile: File | null = null;


  // ============================================================
  // USER
  // ============================================================

  currentUser: any = null;

  currentUserRole = '';


  // ============================================================
  // UI STATE
  // ============================================================

  loading = false;

  actionLoading = false;

  message = '';

  errorMessage = '';


  // ============================================================
  // BACKEND
  // ============================================================

  private readonly backendUrl =
    'http://192.168.29.218:3001';


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(

    private route: ActivatedRoute,

    private router: Router,

    private requestService: RequestService,

    private authService: AuthService,

    private cdr: ChangeDetectorRef

  ) {}


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    console.log(
      'Request Details URL:',
      this.router.url
    );

    console.log(
      'Request Details route params:',
      this.route.snapshot.params
    );

    console.log(
      'Request Details ID:',
      this.route.snapshot.paramMap.get('id')
    );


    // ==========================================================
    // CURRENT USER
    // ==========================================================

    this.currentUser =
      this.authService.getUser();


    if (this.currentUser) {

      this.currentUserRole =
        String(
          this.currentUser.role || ''
        )
          .trim()
          .toUpperCase();

    }


    // ==========================================================
    // FALLBACK: LOAD USER ROLE FROM JWT
    // ==========================================================
    // The request-details page can still have a valid JWT even
    // when the user object is missing from localStorage.
    // The application now uses REVIEWER instead of MANAGER.
    if (!this.currentUserRole) {
      this.loadCurrentUserFromToken();
    }


    console.log(
      'Current User:',
      this.currentUser
    );

    console.log(
      'Current User Role:',
      this.currentUserRole
    );


    // ==========================================================
    // REQUEST ID
    // ==========================================================

    const rawId =
      this.route.snapshot.paramMap.get('id');


    if (!rawId) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    const id =
      Number(rawId);


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      console.error(
        'Invalid request ID:',
        rawId
      );

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    this.loadRequest(id);

  }


  // ============================================================
  // LOAD CURRENT USER FROM JWT
  // ============================================================
  // UI fallback only. Backend authorization remains authoritative.
  // ============================================================

  private loadCurrentUserFromToken(): void {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('No JWT token found.');
      return;
    }

    try {
      const parts = token.split('.');

      if (parts.length !== 3) {
        console.warn('Invalid JWT format.');
        return;
      }

      const base64Payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const paddedPayload =
        base64Payload +
        '='.repeat(
          (4 - (base64Payload.length % 4)) % 4
        );

      const payload = JSON.parse(
        atob(paddedPayload)
      );

      this.currentUser = payload;

      this.currentUserRole =
        String(
          payload.role || ''
        )
          .trim()
          .toUpperCase();

      console.log(
        'User loaded from JWT:',
        this.currentUser
      );

      console.log(
        'User role from JWT:',
        this.currentUserRole
      );

    } catch (error) {
      console.error(
        'Failed to decode JWT:',
        error
      );
    }
  }


  // ============================================================
  // LOAD REQUEST
  // ============================================================

  loadRequest(id: number): void {

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    this.loading = true;

    this.errorMessage = '';

    this.message = '';


    console.log(
      'Loading request ID:',
      id
    );


    this.requestService
      .getRequestById(id)
      .subscribe({

        // ======================================================
        // SUCCESS
        // ======================================================

        next: (response: any) => {

          console.log(
            'Request details response:',
            response
          );


          if (!response) {

            this.request = null;

            this.attachments = [];

            this.approvalHistory = [];

            this.loading = false;

            this.errorMessage =
              'Request not found.';

            this.cdr.detectChanges();

            return;

          }


          // ====================================================
          // NORMALIZE REQUEST
          // ====================================================

          const loadedRequest:
            RequestDetailsModel = {

              ...response,

              id:
                Number(response.id),

              request_number:
                String(
                  response.request_number || ''
                ),

              status:
                String(
                  response.status || ''
                )
                  .trim()
                  .toUpperCase(),

              current_approval_level:
                Number(
                  response.current_approval_level || 0
                ),

              request_data:
                this.normalizeRequestData(
                  response.request_data
                )

            };


          // IMPORTANT:
          // Store the local non-null object first.
          // This prevents "Object is possibly null".

          this.request =
            loadedRequest;


          // ====================================================
          // ATTACHMENTS
          // ====================================================

          const responseAttachments =
            response.attachments;


          this.attachments =
            Array.isArray(
              responseAttachments
            )
              ? responseAttachments
              : [];

          console.log(
            'Attachments loaded for request',
            id,
            this.attachments
          );

          if (this.attachments.length > 0) {
            console.log(
              'First attachment image URL:',
              this.getImageUrl(
                this.attachments[0].file_path
              )
            );
          }


          // ====================================================
          // APPROVAL HISTORY
          // ====================================================

          const responseHistory =
            response.approval_history;


          this.approvalHistory =
            Array.isArray(
              responseHistory
            )
              ? responseHistory
              : [];


          // ====================================================
          // REQUEST DATA
          // ====================================================

          const requestData:
            RequestData =
              loadedRequest.request_data || {};


          this.scientificName =
            String(
              requestData.scientific_name ||
              response.scientific_name ||
              ''
            );


          this.description =
            String(
              requestData.description ||
              response.description ||
              ''
            );


          // ====================================================
          // RESET IMAGE VIEWER
          // ====================================================

          this.currentImageIndex = 0;

          this.resetZoom();


          // ====================================================
          // FINISH
          // ====================================================

          this.loading = false;

          this.cdr.detectChanges();

        },


        // ======================================================
        // ERROR
        // ======================================================

        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Failed to load request:',
            error
          );


          console.error(
            'Backend response:',
            error.error
          );


          this.loading = false;

          this.request = null;

          this.attachments = [];

          this.approvalHistory = [];


          this.errorMessage =
            error.error?.message ||
            'Failed to load request details.';


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // NORMALIZE REQUEST DATA
  // ============================================================

  private normalizeRequestData(
    data: any
  ): RequestData {

    if (!data) {

      return {};

    }


    if (
      typeof data === 'string'
    ) {

      try {

        const parsed =
          JSON.parse(data);

        if (
          parsed &&
          typeof parsed === 'object'
        ) {

          return parsed;

        }

        return {};

      } catch (error) {

        console.error(
          'Unable to parse request_data:',
          error
        );

        return {};

      }

    }


    if (
      typeof data === 'object'
    ) {

      return data as RequestData;

    }


    return {};

  }


  // ============================================================
  // CURRENT ATTACHMENT
  // ============================================================

  get currentAttachment():
    RequestAttachment | null {

    if (
      this.attachments.length === 0
    ) {

      return null;

    }


    if (
      this.currentImageIndex < 0
    ) {

      this.currentImageIndex = 0;

    }


    if (
      this.currentImageIndex >=
      this.attachments.length
    ) {

      this.currentImageIndex = 0;

    }


    return this.attachments[
      this.currentImageIndex
    ];

  }


  // ============================================================
  // IMAGE URL
  // ============================================================

  getImageUrl(
    filePath: string
  ): string {

    if (!filePath) {

      return '';

    }


    if (
      filePath.startsWith('http://') ||
      filePath.startsWith('https://')
    ) {

      return filePath;

    }


    if (
      filePath.startsWith('/')
    ) {

      return (
        this.backendUrl +
        filePath
      );

    }


    return (
      this.backendUrl +
      '/' +
      filePath
    );

  }


  // ============================================================
  // NEXT IMAGE
  // ============================================================

  nextImage(): void {

    if (
      this.attachments.length <= 1
    ) {

      return;

    }


    this.currentImageIndex =
      (
        this.currentImageIndex + 1
      ) %
      this.attachments.length;


    this.resetZoom();

    this.cdr.detectChanges();

  }


  // ============================================================
  // PREVIOUS IMAGE
  // ============================================================

  previousImage(): void {

    if (
      this.attachments.length <= 1
    ) {

      return;

    }


    this.currentImageIndex =
      (
        this.currentImageIndex -
        1 +
        this.attachments.length
      ) %
      this.attachments.length;


    this.resetZoom();

    this.cdr.detectChanges();

  }


  // ============================================================
  // SELECT IMAGE
  // ============================================================

  selectImage(
    index: number
  ): void {

    if (
      index < 0 ||
      index >= this.attachments.length
    ) {

      return;

    }


    this.currentImageIndex =
      index;


    this.resetZoom();

    this.cdr.detectChanges();

  }


  // ============================================================
  // DOWNLOAD ATTACHMENT
  // ============================================================

  downloadAttachment(
    attachment: RequestAttachment
  ): void {

    if (
      !attachment ||
      !attachment.id
    ) {

      this.errorMessage =
        'Invalid attachment.';

      return;

    }


    this.downloadingAttachmentId =
      attachment.id;


    this.requestService
      .downloadAttachment(
        attachment.id
      )
      .subscribe({

        next: (blob: Blob) => {

          const url =
            window.URL.createObjectURL(
              blob
            );


          const link =
            document.createElement('a');


          link.href = url;


          link.download =
            attachment.file_name ||
            `plant-image-${attachment.id}`;


          document.body.appendChild(
            link
          );


          link.click();


          document.body.removeChild(
            link
          );


          window.URL.revokeObjectURL(
            url
          );


          this.downloadingAttachmentId =
            null;


          this.cdr.detectChanges();

        },


        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Download attachment error:',
            error
          );


          this.downloadingAttachmentId =
            null;


          this.errorMessage =
            error.error?.message ||
            'Failed to download image.';


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // IMAGE SELECTED
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


    // ==========================================================
    // IMAGE TYPE
    // ==========================================================

    if (
      !file.type ||
      !file.type.startsWith('image/')
    ) {

      this.selectedImageFile =
        null;

      this.errorMessage =
        'Please select a valid image file.';

      input.value = '';

      this.cdr.detectChanges();

      return;

    }


    // ==========================================================
    // IMAGE SIZE
    // ==========================================================

    const maxSize =
      5 * 1024 * 1024;


    if (
      file.size > maxSize
    ) {

      this.selectedImageFile =
        null;

      this.errorMessage =
        'Image size must be 5 MB or less.';

      input.value = '';

      this.cdr.detectChanges();

      return;

    }


    // ==========================================================
    // STORE FILE
    // ==========================================================

    this.selectedImageFile =
      file;

    this.errorMessage = '';

    this.message = '';

    this.cdr.detectChanges();

  }


  // ============================================================
  // ADD IMAGE
  //
  // REVIEWER / HR ONLY
  // ============================================================

  addImage(
    requestId: number
  ): void {

    const numericRequestId =
      Number(requestId);


    if (
      !Number.isInteger(
        numericRequestId
      ) ||
      numericRequestId <= 0
    ) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    if (
      !this.isReviewer() &&
      !this.isHR()
    ) {

      this.errorMessage =
        'You do not have permission to add images.';

      this.cdr.detectChanges();

      return;

    }


    if (!this.selectedImageFile) {

      this.errorMessage =
        'Please select an image first.';

      this.cdr.detectChanges();

      return;

    }


    if (
      this.uploadingAttachment
    ) {

      return;

    }


    this.uploadingAttachment =
      true;

    this.errorMessage = '';

    this.message = '';

    this.cdr.detectChanges();


    this.requestService
      .addAttachment(
        numericRequestId,
        this.selectedImageFile
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Image added successfully:',
            response
          );


          this.uploadingAttachment =
            false;


          this.message =
            response?.message ||
            'Image added successfully.';


          this.selectedImageFile =
            null;


          this.loadRequest(
            numericRequestId
          );

        },


        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Add image error:',
            error
          );


          console.error(
            'Backend response:',
            error.error
          );


          this.uploadingAttachment =
            false;


          this.errorMessage =
            error.error?.message ||
            'Failed to add image.';


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // DELETE IMAGE
  //
  // REVIEWER / HR ONLY
  // ============================================================

  deleteImage(
    attachmentId: number
  ): void {

    if (
      !Number.isInteger(
        Number(attachmentId)
      ) ||
      Number(attachmentId) <= 0
    ) {

      this.errorMessage =
        'Invalid attachment ID.';

      return;

    }


    if (
      !this.isReviewer() &&
      !this.isHR()
    ) {

      this.errorMessage =
        'You do not have permission to delete images.';

      this.cdr.detectChanges();

      return;

    }


    if (
      this.deletingAttachmentId !== null
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        'Are you sure you want to delete this image?'
      );


    if (!confirmed) {

      return;

    }


    this.deletingAttachmentId =
      Number(attachmentId);

    this.errorMessage = '';

    this.message = '';

    this.cdr.detectChanges();


    this.requestService
      .deleteAttachment(
        Number(attachmentId)
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Image deleted successfully:',
            response
          );


          this.deletingAttachmentId =
            null;


          this.message =
            response?.message ||
            'Image deleted successfully.';


          const loadedRequest =
            this.request;


          if (
            loadedRequest &&
            Number.isInteger(
              Number(loadedRequest.id)
            )
          ) {

            this.loadRequest(
              Number(loadedRequest.id)
            );

          } else {

            this.cdr.detectChanges();

          }

        },


        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Delete image error:',
            error
          );


          console.error(
            'Backend response:',
            error.error
          );


          this.deletingAttachmentId =
            null;


          this.errorMessage =
            error.error?.message ||
            'Failed to delete image.';


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // OPEN IMAGE ZOOM
  // ============================================================

  openImageZoom(): void {

    const attachment =
      this.currentAttachment;


    if (!attachment) {

      return;

    }


    this.isImageZoomed =
      true;

    this.zoomScale =
      this.minZoom;

    this.panX = 0;

    this.panY = 0;

    this.cdr.detectChanges();

  }


  // ============================================================
  // CLOSE IMAGE ZOOM
  // ============================================================

  closeImageZoom(): void {

    this.resetZoom();

    this.cdr.detectChanges();

  }


  // ============================================================
  // ZOOM IN
  // ============================================================

  zoomIn(): void {

    if (
      this.zoomScale >=
      this.maxZoom
    ) {

      return;

    }


    this.zoomScale =
      Math.min(
        this.maxZoom,
        Number(
          (
            this.zoomScale +
            this.zoomStep
          ).toFixed(2)
        )
      );


    this.cdr.detectChanges();

  }


  // ============================================================
  // ZOOM OUT
  // ============================================================

  zoomOut(): void {

    if (
      this.zoomScale <=
      this.minZoom
    ) {

      return;

    }


    this.zoomScale =
      Math.max(
        this.minZoom,
        Number(
          (
            this.zoomScale -
            this.zoomStep
          ).toFixed(2)
        )
      );


    if (
      this.zoomScale ===
      this.minZoom
    ) {

      this.panX = 0;

      this.panY = 0;

    }


    this.cdr.detectChanges();

  }


  // ============================================================
  // RESET ZOOM
  // ============================================================

  resetZoom(): void {

    this.zoomScale =
      this.minZoom;

    this.isImageZoomed =
      false;

    this.panX = 0;

    this.panY = 0;

    this.isDragging =
      false;

    this.isTouching =
      false;

  }


  // ============================================================
  // START MOUSE PAN
  // ============================================================

  startPan(
    event: MouseEvent
  ): void {

    if (
      this.zoomScale <=
      this.minZoom
    ) {

      return;

    }


    event.preventDefault();

    this.isDragging =
      true;

    this.dragStartX =
      event.clientX;

    this.dragStartY =
      event.clientY;

    this.initialPanX =
      this.panX;

    this.initialPanY =
      this.panY;

  }


  // ============================================================
  // MOVE MOUSE PAN
  // ============================================================

  movePan(
    event: MouseEvent
  ): void {

    if (!this.isDragging) {

      return;

    }


    event.preventDefault();


    const deltaX =
      event.clientX -
      this.dragStartX;


    const deltaY =
      event.clientY -
      this.dragStartY;


    this.panX =
      this.initialPanX +
      deltaX;


    this.panY =
      this.initialPanY +
      deltaY;

  }


  // ============================================================
  // STOP MOUSE PAN
  // ============================================================

  stopPan(): void {

    this.isDragging =
      false;

  }


  // ============================================================
  // START TOUCH PAN
  // ============================================================

  startTouchPan(
    event: TouchEvent
  ): void {

    if (
      this.zoomScale <=
      this.minZoom
    ) {

      return;

    }


    if (
      !event.touches ||
      event.touches.length !== 1
    ) {

      return;

    }


    const touch =
      event.touches[0];


    this.isTouching =
      true;


    this.touchStartX =
      touch.clientX;

    this.touchStartY =
      touch.clientY;

    this.touchInitialPanX =
      this.panX;

    this.touchInitialPanY =
      this.panY;

  }


  // ============================================================
  // MOVE TOUCH PAN
  // ============================================================

  moveTouchPan(
    event: TouchEvent
  ): void {

    if (!this.isTouching) {

      return;

    }


    if (
      !event.touches ||
      event.touches.length !== 1
    ) {

      return;

    }


    event.preventDefault();


    const touch =
      event.touches[0];


    const deltaX =
      touch.clientX -
      this.touchStartX;


    const deltaY =
      touch.clientY -
      this.touchStartY;


    this.panX =
      this.touchInitialPanX +
      deltaX;


    this.panY =
      this.touchInitialPanY +
      deltaY;

  }


  // ============================================================
  // STOP TOUCH PAN
  // ============================================================

  stopTouchPan(): void {

    this.isTouching =
      false;

  }


  // ============================================================
  // IMAGE TRANSFORM
  // ============================================================

  getImageTransform(): string {

    return `
      translate3d(
        ${this.panX}px,
        ${this.panY}px,
        0
      )
      scale(${this.zoomScale})
    `;

  }


  // ============================================================
  // MOUSE WHEEL ZOOM
  // ============================================================

  onImageWheel(
    event: WheelEvent
  ): void {

    event.preventDefault();


    if (
      event.deltaY < 0
    ) {

      this.zoomIn();

    } else {

      this.zoomOut();

    }

  }


  // ============================================================
  // KEYBOARD CONTROLS
  // ============================================================

  onZoomKeydown(
    event: KeyboardEvent
  ): void {

    switch (event.key) {

      case 'Escape':

        this.closeImageZoom();

        break;


      case 'ArrowRight':

        if (
          this.zoomScale <=
          this.minZoom
        ) {

          this.nextImage();

        }

        break;


      case 'ArrowLeft':

        if (
          this.zoomScale <=
          this.minZoom
        ) {

          this.previousImage();

        }

        break;


      case '+':

      case '=':

        event.preventDefault();

        this.zoomIn();

        break;


      case '-':

        event.preventDefault();

        this.zoomOut();

        break;


      case '0':

        event.preventDefault();

        this.resetZoom();

        break;

    }

  }


  // ============================================================
  // REQUEST TYPE LABEL
  // ============================================================

  getRequestTypeLabel(
    type: string
  ): string {

    if (!type) {

      return 'Plant Approval';

    }


    if (
      String(type).trim().toUpperCase() ===
      'PLANT'
    ) {

      return 'Plant Approval';

    }


    return type;

  }


  // ============================================================
  // STATUS LABEL
  // ============================================================

  getStatusLabel(
    status: string
  ): string {

    const normalizedStatus =
      String(status || '')
        .trim()
        .toUpperCase();


    switch (normalizedStatus) {

      case 'PENDING_REVIEWER':

        return 'Pending Reviewer Approval';


      case 'PENDING_HR':

        return 'Pending HR Approval';


      case 'APPROVED':

        return 'Approved';


      case 'REJECTED':

        return 'Rejected';


      default:

        return status ||
          'Unknown';

    }

  }


  // ============================================================
  // EMPLOYEE
  // ============================================================

  isEmployee(): boolean {

    return (
      this.currentUserRole ===
      'EMPLOYEE'
    );

  }


  // ============================================================
  // REVIEWER
  // ============================================================

  isReviewer(): boolean {

    // NOTE: The database/JWT may still issue the legacy role
    // name "MANAGER" for reviewer accounts even though the rest
    // of this app was migrated to use "REVIEWER". Accept both so
    // the reviewer UI (edit fields, approve/reject, add/delete
    // image) shows up regardless of which name the backend sends.
    // Once every account's role_table row is renamed to REVIEWER,
    // the "|| this.currentUserRole === 'MANAGER'" check below can
    // be safely removed.
    return (
      this.currentUserRole ===
      'REVIEWER' ||
      this.currentUserRole ===
      'MANAGER'
    );

  }


  // ============================================================
  // HR
  // ============================================================

  isHR(): boolean {

    return (
      this.currentUserRole ===
      'HR'
    );

  }


  // ============================================================
  // REVIEWER APPROVAL PERMISSION
  // ============================================================

  canReviewerApprove(): boolean {

    const currentRequest =
      this.request;


    if (!currentRequest) {

      return false;

    }


    return (
      this.isReviewer() &&
      currentRequest.status ===
      'PENDING_REVIEWER'
    );

  }


  // ============================================================
  // HR APPROVAL PERMISSION
  // ============================================================

  canHRApprove(): boolean {

    const currentRequest =
      this.request;


    if (!currentRequest) {

      return false;

    }


    return (
      this.isHR() &&
      currentRequest.status ===
      'PENDING_HR'
    );

  }


  // ============================================================
  // REJECT PERMISSION
  // ============================================================

  canReject(): boolean {

    const currentRequest =
      this.request;


    if (!currentRequest) {

      return false;

    }


    return (

      (
        this.isReviewer() &&
        currentRequest.status ===
        'PENDING_REVIEWER'
      )

      ||

      (
        this.isHR() &&
        currentRequest.status ===
        'PENDING_HR'
      )

    );

  }


  // ============================================================
  // APPROVE REQUEST
  // ============================================================

  approveRequest(): void {

    const currentRequest =
      this.request;


    // IMPORTANT:
    // Local variable guarantees non-null below.

    if (!currentRequest) {

      this.errorMessage =
        'Request information is not available.';

      return;

    }


    const id =
      Number(currentRequest.id);


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    // ==========================================================
    // REVIEWER APPROVAL
    // ==========================================================

    if (this.isReviewer()) {

      const scientificName =
        this.scientificName.trim();


      const plantDescription =
        this.description.trim();


      const reviewerComments =
        this.comments.trim();


      // --------------------------------------------------------
      // SCIENTIFIC NAME
      // --------------------------------------------------------

      if (!scientificName) {

        this.errorMessage =
          'Please enter the scientific name before approving.';

        return;

      }


      // --------------------------------------------------------
      // DESCRIPTION
      // --------------------------------------------------------

      if (!plantDescription) {

        this.errorMessage =
          'Please enter the plant description before approving.';

        return;

      }


      const data = {

        scientific_name:
          scientificName,

        description:
          plantDescription,

        comments:
          reviewerComments ||
          'Approved by reviewer'

      };


      this.actionLoading =
        true;

      this.errorMessage = '';

      this.message = '';


      console.log(
        'Reviewer approving request:',
        id,
        data
      );


      this.requestService
        .reviewerApprove(
          id,
          data
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              'Reviewer approval response:',
              response
            );


            this.actionLoading =
              false;


            this.message =
              response?.message ||
              'Plant approved by reviewer and sent to HR for review.';


            this.loadRequest(
              id
            );

          },


          error: (
            error: HttpErrorResponse
          ) => {

            console.error(
              'Reviewer approval error:',
              error
            );


            console.error(
              'Backend response:',
              error.error
            );


            this.actionLoading =
              false;


            this.errorMessage =
              error.error?.message ||
              'Failed to approve plant request.';


            this.cdr.detectChanges();

          }

        });


      return;

    }


    // ==========================================================
    // HR APPROVAL
    // ==========================================================

    if (this.isHR()) {

      const hrComments =
        this.comments.trim();


      const data = {

        comments:
          hrComments ||
          'Approved by HR'

      };


      this.actionLoading =
        true;

      this.errorMessage = '';

      this.message = '';


      console.log(
        'HR approving request:',
        id,
        data
      );


      this.requestService
        .hrApprove(
          id,
          data
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              'HR approval response:',
              response
            );


            this.actionLoading =
              false;


            this.message =
              response?.message ||
              'Plant approved successfully and stored permanently.';


            this.loadRequest(
              id
            );

          },


          error: (
            error: HttpErrorResponse
          ) => {

            console.error(
              'HR approval error:',
              error
            );


            console.error(
              'Backend response:',
              error.error
            );


            this.actionLoading =
              false;


            this.errorMessage =
              error.error?.message ||
              'Failed to approve plant request.';


            this.cdr.detectChanges();

          }

        });


      return;

    }


    this.errorMessage =
      'You do not have permission to approve this request.';


    this.cdr.detectChanges();

  }


  // ============================================================
  // REJECT REQUEST
  // ============================================================

  rejectRequest(): void {

    const currentRequest =
      this.request;


    if (!currentRequest) {

      this.errorMessage =
        'Request information is not available.';

      return;

    }


    const id =
      Number(currentRequest.id);


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    const rejectComments =
      this.comments.trim();

    // Reviewer must provide a reason when rejecting a request.
    // HR keeps the existing optional-comment behaviour.
    if (this.isReviewer() && !rejectComments) {
      this.errorMessage =
        'Please enter a reason for rejection in the comments box.';
      this.cdr.detectChanges();
      return;
    }


    let defaultComment =
      'Request rejected';


    if (this.isReviewer()) {

      defaultComment =
        'Rejected by reviewer';

    }

    else if (this.isHR()) {

      defaultComment =
        'Rejected by HR';

    }


    const data = {

      comments:
        rejectComments ||
        defaultComment

    };


    this.actionLoading =
      true;

    this.errorMessage = '';

    this.message = '';


    console.log(
      'Rejecting request:',
      id,
      data
    );


    this.requestService
      .reject(
        id,
        data
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Reject response:',
            response
          );


          this.actionLoading =
            false;


          if (this.isReviewer()) {

            this.message =
              response?.message ||
              'Plant request rejected by reviewer.';

          }

          else if (this.isHR()) {

            this.message =
              response?.message ||
              'Plant request rejected by HR.';

          }

          else {

            this.message =
              response?.message ||
              'Plant request rejected.';

          }


          this.loadRequest(
            id
          );

        },


        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Rejection error:',
            error
          );


          console.error(
            'Backend response:',
            error.error
          );


          this.actionLoading =
            false;


          this.errorMessage =
            error.error?.message ||
            'Failed to reject request.';


          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // BACK
  // ============================================================

  goBack(): void {

    // ----------------------------------------------------------
    // REVIEWER
    // ----------------------------------------------------------

    if (this.isReviewer()) {

      // Keep /manager because your existing dashboard component
      // is still named Manager and may still use /manager route.

      this.router.navigate([
        '/manager'
      ]);

      return;

    }


    // ----------------------------------------------------------
    // HR
    // ----------------------------------------------------------

    if (this.isHR()) {

      this.router.navigate([
        '/hr'
      ]);

      return;

    }


    // ----------------------------------------------------------
    // EMPLOYEE
    // ----------------------------------------------------------

    this.router.navigate([
      '/employee'
    ]);

  }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {

    this.authService.logout(
      'http://192.168.29.218:8200/'
    );

  }

}