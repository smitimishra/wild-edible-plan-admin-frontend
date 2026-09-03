import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { RequestService } from '../../../services/request';


@Component({
  selector: 'app-new-request',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-request.html'
})
export class NewRequest {

  // ============================================================
  // PLANT DETAILS
  // ============================================================

  plantName = '';

  commonName = '';

  description = '';

  comments = '';


  // ============================================================
  // IMAGES
  // ============================================================

  selectedImages: File[] = [];

  imagePreviews: string[] = [];


  // ============================================================
  // UI STATE
  // ============================================================

  loading = false;

  message = '';

  errorMessage = '';


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private requestService: RequestService,
    private router: Router
  ) {}


  // ============================================================
  // IMAGE SELECTION
  // ============================================================

  onImagesSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);


    // ----------------------------------------------------------
    // MAXIMUM 10 IMAGES
    // ----------------------------------------------------------

    if (
      this.selectedImages.length + files.length > 10
    ) {

      this.errorMessage =
        'You can upload a maximum of 10 images per plant.';

      input.value = '';

      return;
    }


    // ----------------------------------------------------------
    // VALIDATE FILES
    // ----------------------------------------------------------

    for (const file of files) {

      if (
        !file.type ||
        !file.type.startsWith('image/')
      ) {

        this.errorMessage =
          `"${file.name}" is not a valid image file.`;

        input.value = '';

        return;
      }


      // Maximum 5 MB per image

      if (
        file.size > 5 * 1024 * 1024
      ) {

        this.errorMessage =
          `Image "${file.name}" is larger than 5 MB.`;

        input.value = '';

        return;
      }

    }


    // ----------------------------------------------------------
    // ADD FILES
    // ----------------------------------------------------------

    for (const file of files) {

      this.selectedImages.push(file);

      const reader = new FileReader();

      reader.onload = () => {

        this.imagePreviews.push(
          reader.result as string
        );

      };

      reader.readAsDataURL(file);
    }


    this.errorMessage = '';

    input.value = '';
  }


  // ============================================================
  // REMOVE IMAGE
  // ============================================================

  removeImage(index: number): void {

    if (
      index < 0 ||
      index >= this.selectedImages.length
    ) {
      return;
    }

    this.selectedImages.splice(index, 1);

    this.imagePreviews.splice(index, 1);
  }


  // ============================================================
  // CLEAR IMAGES
  // ============================================================

  clearImages(): void {

    this.selectedImages = [];

    this.imagePreviews = [];
  }


  // ============================================================
  // VALIDATE FORM
  // ============================================================

  validateForm(): boolean {

    this.errorMessage = '';


    // ----------------------------------------------------------
    // PLANT NAME
    // ----------------------------------------------------------

    if (!this.plantName.trim()) {

      this.errorMessage =
        'Please enter the plant name.';

      return false;
    }


    // ----------------------------------------------------------
    // COMMON NAME
    // ----------------------------------------------------------

    if (!this.commonName.trim()) {

      this.errorMessage =
        'Please enter the common or local name.';

      return false;
    }


    // ----------------------------------------------------------
    // DESCRIPTION
    // ----------------------------------------------------------

    if (!this.description.trim()) {

      this.errorMessage =
        'Please enter a description of the plant.';

      return false;
    }


    // ----------------------------------------------------------
    // IMAGE
    // ----------------------------------------------------------

    if (this.selectedImages.length === 0) {

      this.errorMessage =
        'Please upload at least one image of the plant.';

      return false;
    }


    // ----------------------------------------------------------
    // MAXIMUM IMAGES
    // ----------------------------------------------------------

    if (this.selectedImages.length > 10) {

      this.errorMessage =
        'You can upload a maximum of 10 images.';

      return false;
    }


    return true;
  }


  // ============================================================
  // SUBMIT PLANT REQUEST
  // ============================================================

  submitRequest(): void {

    if (this.loading) {
      return;
    }


    // ----------------------------------------------------------
    // VALIDATE
    // ----------------------------------------------------------

    if (!this.validateForm()) {
      return;
    }


    this.loading = true;

    this.message = '';

    this.errorMessage = '';


    // ==========================================================
    // PLANT REQUEST DATA
    // ==========================================================

    const requestData = {

      plant_name:
        this.plantName.trim(),

      common_name:
        this.commonName.trim(),

      description:
        this.description.trim(),

      comments:
        this.comments.trim()

    };


    // ==========================================================
    // FORM DATA
    // ==========================================================

    const formData = new FormData();


    // IMPORTANT:
    // Backend currently requires request_type.
    //
    // Since this application is now ONLY for plant approval,
    // we use one fixed request type instead of asking the
    // employee to select one.

    formData.append(
      'request_type',
      'plant_approval'
    );


    // Plant information

    formData.append(
      'request_data',
      JSON.stringify(requestData)
    );


    // ==========================================================
    // IMAGES
    // ==========================================================

    for (
      const file of this.selectedImages
    ) {

      formData.append(
        'images',
        file,
        file.name
      );

    }


    // ==========================================================
    // DEBUG
    // ==========================================================

    console.log(
      'Submitting plant approval request'
    );

    console.log(
      'request_type:',
      'plant_approval'
    );

    console.log(
      'request_data:',
      requestData
    );

    console.log(
      'images:',
      this.selectedImages
    );


    // ==========================================================
    // SEND REQUEST
    // ==========================================================

    this.requestService
      .createRequest(formData)
      .subscribe({

        // ------------------------------------------------------
        // SUCCESS
        // ------------------------------------------------------

        next: (response: any) => {

          console.log(
            'Plant request submitted successfully:',
            response
          );

          this.loading = false;

          this.message =
            response?.message ||
            'Plant approval request submitted successfully.';


          // Return to employee dashboard

          setTimeout(() => {

            this.router.navigate([
              '/employee'
            ]);

          }, 1000);

        },


        // ------------------------------------------------------
        // ERROR
        // ------------------------------------------------------

        error: (error: HttpErrorResponse) => {

          console.error(
            'Plant request submission failed:',
            error
          );

          console.error(
            'Backend response:',
            error.error
          );

          this.loading = false;

          this.errorMessage =
            error.error?.message ||
            'Failed to submit plant approval request.';

        }

      });

  }


  // ============================================================
  // CANCEL
  // ============================================================

  cancel(): void {

    this.router.navigate([
      '/employee'
    ]);

  }

}