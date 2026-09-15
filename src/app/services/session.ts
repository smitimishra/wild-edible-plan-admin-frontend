import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DeviceSession {
  id: number;

  user_id?: number;
  session_id?: string;

  device_type: string;

  location: string;
  ip_address: string;

  created_at?: string;
  last_activity?: string;

  loginTime: string;
  last_active: string;

  active: boolean;
  is_active?: boolean;

  expires_at?: string;
  invalidated_at?: string;
  invalidation_reason?: string;
}

export interface LoggedInDevicesResponse {
  success: boolean;
  data: DeviceSession[];
  message?: string;
}

export interface LogoutAllDevicesResponse {
  success: boolean;
  message: string;
}

export interface UpdateLocationResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private readonly apiUrl =
    'http://192.168.29.216:3001/api/sessions';

  constructor(
    private http: HttpClient
  ) {}

  // Get JWT token and attach it to every session request
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // ============================================================
  // GET LOGGED-IN DEVICES
  // ============================================================

  getLoggedInDevices(): Observable<LoggedInDevicesResponse> {

    console.log(
      'SessionService: requesting logged-in devices'
    );

    console.log(
      'Session API:',
      `${this.apiUrl}/logged-in-devices`
    );

    return this.http.get<LoggedInDevicesResponse>(
      `${this.apiUrl}/logged-in-devices`,
      {
        headers: this.getHeaders()
      }
    );
  }

  // ============================================================
  // UPDATE CURRENT SESSION LOCATION
  // ============================================================

  updateCurrentSessionLocation(
    location: string
  ): Observable<UpdateLocationResponse> {

    console.log(
      'SessionService: updating current session location:',
      location
    );

    console.log(
      'Session API:',
      `${this.apiUrl}/update-location`
    );

    return this.http.post<UpdateLocationResponse>(
      `${this.apiUrl}/update-location`,
      {
        location: location
      },
      {
        headers: this.getHeaders()
      }
    );
  }

  // ============================================================
  // LOGOUT ALL DEVICES
  // ============================================================

  logoutAllDevices(): Observable<LogoutAllDevicesResponse> {

    console.log(
      'SessionService: logging out all devices'
    );

    console.log(
      'Session API:',
      `${this.apiUrl}/logout-all`
    );

    return this.http.post<LogoutAllDevicesResponse>(
      `${this.apiUrl}/logout-all`,
      {},
      {
        headers: this.getHeaders()
      }
    );
  }
}