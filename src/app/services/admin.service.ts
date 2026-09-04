import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Observable } from 'rxjs';


// ============================================================
// USER MODEL
// ============================================================

export interface AdminUser {

  id: number;

  employee_code: string;

  name: string;

  email: string;

  role: string;

  approval_position: string | null;

  is_active: boolean;

  created_at: string;

}


// ============================================================
// APPROVAL WORKFLOW HIERARCHY MODEL
// ============================================================

export interface HierarchyLevel {

  id: number;

  approval_level: number;

  role: string;

  created_at?: string;

  updated_at?: string;

}


// ============================================================
// API RESPONSES
// ============================================================


// ============================================================
// GET USERS
// ============================================================

export interface GetUsersResponse {

  users: AdminUser[];

}


// ============================================================
// CREATE USER
// ============================================================

export interface CreateUserResponse {

  message: string;

  user: AdminUser;

  temporaryPassword: string;

}


// ============================================================
// UPDATE USER
// ============================================================

export interface UpdateUserResponse {

  message: string;

  user: AdminUser;

}

export interface UpdateUserRoleResponse {

  message: string;

  user: AdminUser;

}


// ============================================================
// DELETE USER
// ============================================================

export interface DeleteUserResponse {

  message: string;

  user: {

    id: number;

    employee_code: string;

    name: string;

    email: string;

  };

}


// ============================================================
// GET HIERARCHY
// ============================================================

export interface GetHierarchyResponse {

  hierarchy: HierarchyLevel[];

}


// ============================================================
// CREATE HIERARCHY LEVEL
// ============================================================

export interface CreateHierarchyResponse {

  message: string;

  hierarchy: HierarchyLevel[];

  added: HierarchyLevel;

}


// ============================================================
// UPDATE HIERARCHY LEVEL
// ============================================================

export interface UpdateHierarchyResponse {

  message: string;

  hierarchy: HierarchyLevel[];

  updated: HierarchyLevel;

}


// ============================================================
// DELETE HIERARCHY LEVEL
// ============================================================

export interface DeleteHierarchyResponse {

  message: string;

  deleted_id: number;

  deleted_level: number;

  hierarchy: HierarchyLevel[];

}


// ============================================================
// ADMIN SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl =
    'http://192.168.29.51:3001/api/admin';


  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // GET AUTHORIZATION HEADERS
  // ==========================================================

  private getHeaders(): HttpHeaders {

    const token =
      localStorage.getItem('token');


    return new HttpHeaders({

      Authorization:
        `Bearer ${token}`

    });

  }


  // ==========================================================
  // ==========================================================
  // USER MANAGEMENT
  // ==========================================================
  // ==========================================================


  // ==========================================================
  // GET ALL USERS
  // ==========================================================

  getUsers(): Observable<GetUsersResponse> {

    return this.http.get<GetUsersResponse>(

      `${this.apiUrl}/users`,

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // CREATE USER
  // ==========================================================

  createUser(data: {

    employee_code: string;

    name: string;

    email: string;

    role: string;

    approval_position: string | null;

  }): Observable<CreateUserResponse> {

    return this.http.post<CreateUserResponse>(

      `${this.apiUrl}/users`,

      data,

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // UPDATE USER
  // ==========================================================

  updateUser(

    id: number,

    data: {

      employee_code: string;

      name: string;

      email: string;

      role: string;

      approval_position: string | null;

    }

  //UPDATE USER ROLE   

  ): Observable<UpdateUserResponse> {

    return this.http.put<UpdateUserResponse>(

      `${this.apiUrl}/users/${id}`,

      data,

      {
        headers:
          this.getHeaders()
      }

    );

  }
  

  updateUserRole(

  id: number,

  role: string

): Observable<UpdateUserRoleResponse> {

  return this.http.put<UpdateUserRoleResponse>(

    `${this.apiUrl}/users/${id}/role`,

    {
      role: role.trim().toUpperCase()
    },

    {
      headers:
        this.getHeaders()
    }

  );

}

  // ==========================================================
  // DEACTIVATE USER
  // ==========================================================

  deactivateUser(

    id: number

  ): Observable<any> {

    return this.http.patch(

      `${this.apiUrl}/users/${id}/deactivate`,

      {},

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // REACTIVATE USER
  // ==========================================================

  reactivateUser(

    id: number

  ): Observable<any> {

    return this.http.patch(

      `${this.apiUrl}/users/${id}/reactivate`,

      {},

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // PERMANENTLY DELETE USER
  // ==========================================================

  deleteUser(

    id: number

  ): Observable<DeleteUserResponse> {

    return this.http.delete<DeleteUserResponse>(

      `${this.apiUrl}/users/${id}`,

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // ==========================================================
  // APPROVAL WORKFLOW HIERARCHY
  // ==========================================================
  // ==========================================================


  // ==========================================================
  // GET APPROVAL WORKFLOW HIERARCHY
  // ==========================================================

  getHierarchy():

    Observable<GetHierarchyResponse> {

    return this.http.get<GetHierarchyResponse>(

      `${this.apiUrl}/hierarchy`,

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // ADD APPROVAL WORKFLOW LEVEL
  // ==========================================================

  addHierarchyLevel(data: {

    approval_level: number;

    role: string;

  }): Observable<CreateHierarchyResponse> {

    return this.http.post<CreateHierarchyResponse>(

      `${this.apiUrl}/hierarchy`,

      data,

      {
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // UPDATE APPROVAL WORKFLOW LEVEL
  // ==========================================================

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
        headers:
          this.getHeaders()
      }

    );

  }


  // ==========================================================
  // DELETE APPROVAL WORKFLOW LEVEL
  // ==========================================================

  deleteHierarchyLevel(

    id: number

  ): Observable<DeleteHierarchyResponse> {

    return this.http.delete<DeleteHierarchyResponse>(

      `${this.apiUrl}/hierarchy/${id}`,

      {
        headers:
          this.getHeaders()
      }

    );

  }

}