import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { AuthService } from './auth';


@Injectable({
  providedIn: 'root'
})
export class RequestService {

  // ============================================================
  // API URL
  // ============================================================

  private apiUrl =
    'http://192.168.29.51:3001/api/requests';


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}


  // ============================================================
  // AUTH HEADERS
  // ============================================================

  private getAuthHeaders(): HttpHeaders {

    const token =
      this.authService.getToken();


    console.log(
      'RequestService - JWT exists:',
      !!token
    );


    if (!token) {

      console.error(
        'RequestService - No JWT token found.'
      );


      return new HttpHeaders();

    }


    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

  }


  // ============================================================
  // EMPLOYEE - CREATE REQUEST
  // ============================================================

  createRequest(
    formData: FormData
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      formData,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // GET ALL REQUESTS
  // ============================================================

  getAllRequests(): Observable<any> {

    return this.http.get(
      this.apiUrl,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // EMPLOYEE - MY REQUESTS
  // ============================================================

  getMyRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/my`,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // REVIEWER - PENDING REQUESTS
  //
  // GET
  // /api/requests/pending-reviewer
  //
  // Role:
  // REVIEWER
  // ============================================================

  getPendingReviewerRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/pending-reviewer`,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // HR - PENDING REQUESTS
  //
  // GET
  // /api/requests/pending-hr
  //
  // Role:
  // HR
  // ============================================================

  getPendingHRRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/pending-hr`,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // APPROVED REQUESTS
  //
  // GET
  // /api/requests/approved
  // ============================================================

  getApprovedRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/approved`,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // GET REQUEST DETAILS
  //
  // GET
  // /api/requests/:id
  // ============================================================

  getRequestById(
    id: number
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/${id}`,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // REVIEWER - APPROVE REQUEST
  //
  // PUT
  // /api/requests/:id/reviewer-approve
  //
  // Body:
  //
  // {
  //   scientific_name: string,
  //   description: string,
  //   comments?: string
  // }
  // ============================================================

  reviewerApprove(
    id: number,
    data: {
      scientific_name: string;
      description: string;
      comments?: string;
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/reviewer-approve`,
      data,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // HR - APPROVE REQUEST
  //
  // PUT
  // /api/requests/:id/hr-approve
  //
  // Body:
  //
  // {
  //   comments?: string
  // }
  // ============================================================

  hrApprove(
    id: number,
    data: {
      comments?: string;
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/hr-approve`,
      data,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // REVIEWER / HR - REJECT REQUEST
  //
  // PUT
  // /api/requests/:id/reject
  //
  // Body:
  //
  // {
  //   comments: string
  // }
  // ============================================================

  reject(
    id: number,
    data: {
      comments?: string;
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/reject`,
      data,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // DOWNLOAD ATTACHMENT
  //
  // GET
  // /api/requests/attachments/:id/download
  // ============================================================

  downloadAttachment(
    attachmentId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/attachments/${attachmentId}/download`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );

  }


  // ============================================================
  // ADD ATTACHMENT
  //
  // POST
  // /api/requests/:id/attachments
  //
  // Field:
  // image
  // ============================================================

  addAttachment(
    requestId: number,
    file: File
  ): Observable<any> {

    const formData =
      new FormData();


    formData.append(
      'image',
      file
    );


    return this.http.post(
      `${this.apiUrl}/${requestId}/attachments`,
      formData,
      {
        headers: this.getAuthHeaders()
      }
    );

  }


  // ============================================================
  // DELETE ATTACHMENT
  //
  // DELETE
  // /api/requests/attachments/:id
  // ============================================================

  deleteAttachment(
    attachmentId: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/attachments/${attachmentId}`,
      {
        headers: this.getAuthHeaders()
      }
    );

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


    const normalizedPath =
      filePath.startsWith('/')
        ? filePath
        : `/${filePath}`;


    return `http://192.168.29.51:3001${normalizedPath}`;

  }

}