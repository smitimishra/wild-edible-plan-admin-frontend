import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


// ============================================================
// DEVICE SESSION MODEL
// ============================================================

export interface DeviceSession {
  id: number;

  device_name: string;
  browser: string;

  deviceType: string;
  platform: string;

  os: string;
  osVersion: string;

  loginTime: string;
  last_active: string;

  location: string;
  ip_address: string;

  active: boolean;
}


// ============================================================
// LOGGED-IN DEVICES RESPONSE
// ============================================================

export interface LoggedInDevicesResponse {
  success: boolean;
  data: DeviceSession[];
  message?: string;
}


// ============================================================
// LOGOUT ALL DEVICES RESPONSE
// ============================================================

export interface LogoutAllDevicesResponse {
  success: boolean;
  message: string;
}


// ============================================================
// SESSION SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private readonly apiUrl =
    'http://192.168.29.51:8080/api/sessions';


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // GET LOGGED-IN DEVICES
  // ==========================================================

  getLoggedInDevices(): Observable<LoggedInDevicesResponse> {

    console.log(
      'SessionService: requesting logged-in devices'
    );

    console.log(
      'Session API:',
      `${this.apiUrl}/logged-in-devices`
    );

    return this.http.get<LoggedInDevicesResponse>(
      `${this.apiUrl}/logged-in-devices`
    );
  }


  // ==========================================================
  // LOGOUT ALL DEVICES
  // ==========================================================

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
      {}
    );
  }

}