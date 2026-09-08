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

  private apiUrl =
    'http://192.168.29.216:3001/api/requests';


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
  // MANAGER - PENDING REQUESTS
  // ============================================================

  getPendingManagerRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/pending-manager`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }


  // ============================================================
  // HR - PENDING REQUESTS
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
  // GET REQUEST DETAILS
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
  // MANAGER - APPROVE
  // ============================================================

  managerApprove(
    id: number,
    data: {
      scientific_name: string;
      description: string;
      comments?: string;
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/manager-approve`,
      data,
      {
        headers: this.getAuthHeaders()
      }
    );
  }


  // ============================================================
  // HR - APPROVE
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
  // REJECT
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

    return `http://192.168.29.216:3001${normalizedPath}`;
  }
}