import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

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
}


// ============================================================
// APPROVAL HISTORY
// ============================================================

interface ApprovalHistory {

  id: number;

  approval_level: number;

  action: string;

  comments: string | null;

  action_at: string;

  approver_id: number;

  approver_name: string;

  approver_role: string;
}


// ============================================================
// REQUEST MODEL
// ============================================================

interface RequestDetailsModel {

  id: number;

  request_number: string;

  employee_id: number;

  employee_name: string;

  employee_email: string;

  request_type: string;

  request_data: any;

  status: string;

  current_approval_level: number;

  submitted_at: string;

  completed_at: string | null;

  created_at: string;

  updated_at: string;
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
  // SELECTED IMAGE FOR UPLOAD
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
    'http://192.168.29.51:3001';


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
     
     console.log('paramMap id:', this.route.snapshot.paramMap.get('id'));
  console.log('full URL:', this.router.url);
    this.currentUser =
      this.authService.getUser();

    if (this.currentUser) {

      this.currentUserRole =
        String(
          this.currentUser.role || ''
        ).toUpperCase();

    }

    const id =
      Number(
        this.route.snapshot.paramMap.get('id')
      );

    if (!id || id <= 0) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }

    this.loadRequest(id);

  }


  // ============================================================
  // LOAD REQUEST
  //
  // NOTE:
  // The backend's GET /api/requests/:id endpoint returns a FLAT
  // object - the request fields, "attachments", and
  // "approval_history" are all top-level properties on the same
  // JSON object (see getRequestById in requestcontroller.js).
  //
  // It does NOT return a nested { request: {...} } wrapper.
  // The mapping below matches that flat shape.
  // ============================================================

  loadRequest(id: number): void {

    this.loading = true;

    this.errorMessage = '';

    this.requestService
      .getRequestById(id)
      .subscribe({

        next: (response: any) => {

          // ----------------------------------------------------
          // REQUEST
          //
          // The backend response IS the request object itself,
          // not response.request.
          // ----------------------------------------------------

          this.request =
            response || null;


          // ----------------------------------------------------
          // ATTACHMENTS
          // ----------------------------------------------------

          this.attachments =
            Array.isArray(
              response?.attachments
            )
              ? response.attachments
              : [];


          // ----------------------------------------------------
          // APPROVAL HISTORY
          // ----------------------------------------------------

          this.approvalHistory =
            Array.isArray(
              response?.approval_history
            )
              ? response.approval_history
              : [];


          // ----------------------------------------------------
          // RESET IMAGE VIEWER
          // ----------------------------------------------------

          this.currentImageIndex = 0;

          this.resetZoom();


          // ----------------------------------------------------
          // REQUEST DATA
          // ----------------------------------------------------

          const requestData =
            this.request?.request_data || {};


          this.scientificName =
            requestData.scientific_name || '';


          this.description =
            requestData.description || '';


          // ----------------------------------------------------
          // FINISH
          // ----------------------------------------------------

          this.loading = false;

          this.cdr.detectChanges();

        },


        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Failed to load request:',
            error
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
      filePath.startsWith(
        'http://'
      ) ||
      filePath.startsWith(
        'https://'
      )
    ) {

      return filePath;

    }


    if (
      filePath.startsWith('/')
    ) {

      return this.backendUrl +
        filePath;

    }


    return this.backendUrl +
      '/' +
      filePath;

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

    if (!attachment?.id) {

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
            document.createElement(
              'a'
            );


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
  //
  // Called by:
  //
  // (change)="onImageSelected($event)"
  //
  // in request-details.html
  // ============================================================

  onImageSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    // ----------------------------------------------------------
    // No file selected
    // ----------------------------------------------------------

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
    // Validate image type
    // ----------------------------------------------------------

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


    // ----------------------------------------------------------
    // Validate file size
    //
    // Backend limit = 5 MB
    // ----------------------------------------------------------

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


    // ----------------------------------------------------------
    // Store selected image
    // ----------------------------------------------------------

    this.selectedImageFile =
      file;


    this.errorMessage = '';

    this.message = '';

    this.cdr.detectChanges();

  }


  // ============================================================
  // ADD IMAGE
  //
  // Manager / HR only
  // ============================================================

  addImage(
    requestId: number
  ): void {

    // ----------------------------------------------------------
    // Validate request
    // ----------------------------------------------------------

    if (!requestId) {

      this.errorMessage =
        'Invalid request ID.';

      return;

    }


    // ----------------------------------------------------------
    // Check role
    // ----------------------------------------------------------

    if (
      !this.isManager() &&
      !this.isHR()
    ) {

      this.errorMessage =
        'You do not have permission to add images.';

      this.cdr.detectChanges();

      return;

    }


    // ----------------------------------------------------------
    // Check selected image
    // ----------------------------------------------------------

    if (!this.selectedImageFile) {

      this.errorMessage =
        'Please select an image first.';

      this.cdr.detectChanges();

      return;

    }


    // ----------------------------------------------------------
    // Prevent duplicate upload
    // ----------------------------------------------------------

    if (
      this.uploadingAttachment
    ) {

      return;

    }


    // ----------------------------------------------------------
    // Start upload
    // ----------------------------------------------------------

    this.uploadingAttachment =
      true;

    this.errorMessage = '';

    this.message = '';

    this.cdr.detectChanges();


    // ----------------------------------------------------------
    // Upload
    // ----------------------------------------------------------

    this.requestService
      .addAttachment(
        requestId,
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


          // ----------------------------------------------------
          // Clear selected file
          // ----------------------------------------------------

          this.selectedImageFile =
            null;


          // ----------------------------------------------------
          // Refresh request and image list
          // ----------------------------------------------------

          this.loadRequest(
            requestId
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
  // Manager / HR only
  // ============================================================

  deleteImage(
    attachmentId: number
  ): void {

    // ----------------------------------------------------------
    // Validate attachment
    // ----------------------------------------------------------

    if (!attachmentId) {

      this.errorMessage =
        'Invalid attachment ID.';

      return;

    }


    // ----------------------------------------------------------
    // Check role
    // ----------------------------------------------------------

    if (
      !this.isManager() &&
      !this.isHR()
    ) {

      this.errorMessage =
        'You do not have permission to delete images.';

      this.cdr.detectChanges();

      return;

    }


    // ----------------------------------------------------------
    // Prevent duplicate deletion
    // ----------------------------------------------------------

    if (
      this.deletingAttachmentId !== null
    ) {

      return;

    }


    // ----------------------------------------------------------
    // Confirmation
    // ----------------------------------------------------------

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this image?'
      );


    if (!confirmed) {

      return;

    }


    // ----------------------------------------------------------
    // Start deletion
    // ----------------------------------------------------------

    this.deletingAttachmentId =
      attachmentId;

    this.errorMessage = '';

    this.message = '';

    this.cdr.detectChanges();


    // ----------------------------------------------------------
    // Delete
    // ----------------------------------------------------------

    this.requestService
      .deleteAttachment(
        attachmentId
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


          // --------------------------------------------------
          // Refresh request and image list
          // --------------------------------------------------

          if (this.request?.id) {

            this.loadRequest(
              this.request.id
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

    if (!this.currentAttachment) {

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

    if (
      type === 'PLANT'
    ) {

      return 'Plant Approval';

    }


    return type ||
      'Plant Approval';

  }


  // ============================================================
  // STATUS LABEL
  // ============================================================

  getStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'PENDING_MANAGER':

        return 'Pending Manager Approval';


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
  // MANAGER
  // ============================================================

  isManager(): boolean {

    return (
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
  // MANAGER APPROVAL PERMISSION
  // ============================================================

  canManagerApprove(): boolean {

    return (
      this.isManager() &&
      this.request?.status ===
      'PENDING_MANAGER'
    );

  }


  // ============================================================
  // HR APPROVAL PERMISSION
  // ============================================================

  canHRApprove(): boolean {

    return (
      this.isHR() &&
      this.request?.status ===
      'PENDING_HR'
    );

  }


  // ============================================================
  // REJECT PERMISSION
  // ============================================================

  canReject(): boolean {

    if (!this.request) {

      return false;

    }


    return (

      (
        this.isManager() &&
        this.request.status ===
        'PENDING_MANAGER'
      )

      ||

      (
        this.isHR() &&
        this.request.status ===
        'PENDING_HR'
      )

    );

  }


  // ============================================================
  // APPROVE REQUEST
  // ============================================================

  approveRequest(): void {

    if (!this.request) {

      return;

    }


    const id =
      this.request.id;


    // ==========================================================
    // MANAGER APPROVAL
    // ==========================================================

    if (this.isManager()) {

      const scientificName =
        this.scientificName.trim();


      const description =
        this.description.trim();


      const managerComments =
        this.comments.trim();


      if (!scientificName) {

        this.errorMessage =
          'Please enter the scientific name before approving.';

        return;

      }


      if (!description) {

        this.errorMessage =
          'Please enter the plant description before approving.';

        return;

      }


      const data = {

        scientific_name:
          scientificName,

        description:
          description,

        comments:
          managerComments ||
          'Approved by manager'

      };


      this.actionLoading =
        true;


      this.errorMessage = '';

      this.message = '';


      this.requestService
        .managerApprove(
          id,
          data
        )
        .subscribe({

          next: () => {

            this.actionLoading =
              false;


            this.message =
              'Plant approved and sent to HR for review.';


            this.loadRequest(
              id
            );

          },


          error: (
            error: HttpErrorResponse
          ) => {

            console.error(
              'Manager approval error:',
              error
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


      this.requestService
        .hrApprove(
          id,
          data
        )
        .subscribe({

          next: () => {

            this.actionLoading =
              false;


            this.message =
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

    if (!this.request) {

      return;

    }


    const id =
      this.request.id;


    const rejectComments =
      this.comments.trim();


    const data = {

      comments:
        rejectComments ||
        (
          this.isManager()
            ? 'Rejected by manager'
            : 'Rejected by HR'
        )

    };


    this.actionLoading =
      true;


    this.errorMessage = '';

    this.message = '';


    this.requestService
      .reject(
        id,
        data
      )
      .subscribe({

        next: () => {

          this.actionLoading =
            false;


          this.message =
            this.isManager()
              ? 'Plant request rejected by manager.'
              : 'Plant request rejected by HR.';


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

    if (this.isManager()) {

      this.router.navigate([
        '/manager'
      ]);

      return;

    }


    if (this.isHR()) {

      this.router.navigate([
        '/hr'
      ]);

      return;

    }


    this.router.navigate([
      '/employee'
    ]);

  }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {

    this.authService.logout('http://192.168.29.51:64959/');
  }
}