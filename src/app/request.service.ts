import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RequestService {

  private apiUrl = 'http://192.168.29.51:3001/api/requests';

  constructor(private http: HttpClient) {}


  // ============================================================
  // EMPLOYEE - CREATE PLANT REQUEST
  // ============================================================

  createRequest(formData: FormData): Observable<any> {

    return this.http.post(
      this.apiUrl,
      formData
    );
  }


  // ============================================================
  // GET ALL REQUESTS
  // ============================================================

  getAllRequests(): Observable<any> {

    return this.http.get(
      this.apiUrl
    );
  }


  // ============================================================
  // EMPLOYEE - GET MY REQUESTS
  // ============================================================

  getMyRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/my`
    );
  }


  // ============================================================
  // MANAGER - GET PENDING REQUESTS
  // ============================================================

  getPendingManagerRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/pending-manager`
    );
  }


  // ============================================================
  // HR - GET PENDING REQUESTS
  // ============================================================

  getPendingHRRequests(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/pending-hr`
    );
  }


  // ============================================================
  // GET REQUEST DETAILS
  // ============================================================

  getRequestById(id: number): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/${id}`
    );
  }


  // ============================================================
  // MANAGER - APPROVE REQUEST
  //
  // data should contain:
  //
  // scientific_name
  // description
  // comments
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
      data
    );
  }


  // ============================================================
  // HR - APPROVE REQUEST
  //
  // data should contain:
  //
  // comments
  // ============================================================

  hrApprove(
    id: number,
    data: {
      comments?: string;
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/hr-approve`,
      data
    );
  }


  // ============================================================
  // MANAGER / HR - REJECT REQUEST
  //
  // data should contain:
  //
  // comments
  // ============================================================

  reject(
    id: number,
    data: {
      comments: string;
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/reject`,
      data
    );
  }


  // ============================================================
  // DOWNLOAD PLANT IMAGE
  // ============================================================

  downloadAttachment(
    attachmentId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/attachments/${attachmentId}/download`,
      {
        responseType: 'blob'
      }
    );
  }


  // ============================================================
  // GET IMAGE URL
  //
  // Useful for displaying uploaded images directly in <img>
  // if /uploads is exposed by the Express server.
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