import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: string;
  role_id: number;
  approval_position: string | null;
  approval_position_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface HierarchyLevel {
  id: number;
  approval_level: number;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface GetUsersResponse {
  users: AdminUser[];
}

export interface CreateUserResponse {
  message: string;
  user: AdminUser;
  temporaryPassword: string;
}

export interface UpdateUserResponse {
  message: string;
  user: AdminUser;
}

export interface UpdateUserRoleResponse {
  message: string;
  user: AdminUser;
}

export interface DeleteUserResponse {
  message: string;
  user: {
    id: number;
    employee_code: string;
    name: string;
    email: string;
  };
}

export interface GetHierarchyResponse {
  hierarchy: HierarchyLevel[];
}

export interface CreateHierarchyResponse {
  message: string;
  hierarchy: HierarchyLevel[];
  added: HierarchyLevel;
}

export interface UpdateHierarchyResponse {
  message: string;
  hierarchy: HierarchyLevel[];
  updated: HierarchyLevel;
}

export interface DeleteHierarchyResponse {
  message: string;
  deleted_id: number;
  deleted_level: number;
  hierarchy: HierarchyLevel[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  deleteHierarchy(id: number) {
    throw new Error('Method not implemented.');
  }

  private apiUrl =
    'http://192.168.29.216:3001/api/admin';

  constructor(
    private http: HttpClient
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getUsers(): Observable<GetUsersResponse> {
    return this.http.get<GetUsersResponse>(
      `${this.apiUrl}/users`,
      {
        headers: this.getHeaders()
      }
    );
  }

  createUser(data: {
    name: string;
    email: string;
    role: string;
  }): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      `${this.apiUrl}/users`,
      data,
      {
        headers: this.getHeaders()
      }
    );
  }

  updateUser(
    id: number,
    data: {
      name: string;
      email: string;
      role: string;
    }
  ): Observable<UpdateUserResponse> {
    return this.http.put<UpdateUserResponse>(
      `${this.apiUrl}/users/${id}`,
      data,
      {
        headers: this.getHeaders()
      }
    );
  }

  updateUserRole(
    id: number,
    role: string
  ): Observable<UpdateUserRoleResponse> {
    return this.http.put<UpdateUserRoleResponse>(
      `${this.apiUrl}/users/${id}`,
      {
        role: role.trim().toUpperCase()
      },
      {
        headers: this.getHeaders()
      }
    );
  }

  deactivateUser(
    id: number
  ): Observable<UpdateUserResponse> {
    return this.http.patch<UpdateUserResponse>(
      `${this.apiUrl}/users/${id}/deactivate`,
      {},
      {
        headers: this.getHeaders()
      }
    );
  }

  reactivateUser(
    id: number
  ): Observable<UpdateUserResponse> {
    return this.http.patch<UpdateUserResponse>(
      `${this.apiUrl}/users/${id}/reactivate`,
      {},
      {
        headers: this.getHeaders()
      }
    );
  }

  deleteUser(
    id: number
  ): Observable<DeleteUserResponse> {
    return this.http.delete<DeleteUserResponse>(
      `${this.apiUrl}/users/${id}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  getHierarchy(): Observable<GetHierarchyResponse> {
    return this.http.get<GetHierarchyResponse>(
      `${this.apiUrl}/hierarchy`,
      {
        headers: this.getHeaders()
      }
    );
  }

  addHierarchyLevel(data: {
    approval_level: number;
    role: string;
  }): Observable<CreateHierarchyResponse> {
    return this.http.post<CreateHierarchyResponse>(
      `${this.apiUrl}/hierarchy`,
      data,
      {
        headers: this.getHeaders()
      }
    );
  }

  updateHierarchyLevel(
    id: number,
    data: {
      approval_level: number;
      role: string;
    }
  ): Observable<UpdateHierarchyResponse> {
    return this.http.put<UpdateHierarchyResponse>(
      `${this.apiUrl}/hierarchy/${id}`,
      data,
      {
        headers: this.getHeaders()
      }
    );
  }

  deleteHierarchyLevel(
    id: number
  ): Observable<DeleteHierarchyResponse> {
    return this.http.delete<DeleteHierarchyResponse>(
      `${this.apiUrl}/hierarchy/${id}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  // ============================================================
  // SYSTEM SETTINGS
  // ============================================================

  getSettings(): Observable<{ settings: Record<string, { value: string; description: string; updated_at: string }> }> {
    return this.http.get<any>(
      `${this.apiUrl}/settings`,
      { headers: this.getHeaders() }
    );
  }

  updateSetting(key: string, value: string | number): Observable<{ message: string; setting: { key: string; value: string } }> {
    return this.http.patch<any>(
      `${this.apiUrl}/settings/${key}`,
      { value: String(value) },
      { headers: this.getHeaders() }
    );
  }
}