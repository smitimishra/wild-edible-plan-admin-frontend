import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Employee } from './pages/employee/employee';
import { NewRequest } from './pages/employee/new-request/new-request';
import { Manager } from './pages/manager/manager';
import { Hr } from './pages/hr/hr';
import { RequestDetails } from './pages/request-details/request-details';
import { ResetPassword } from './pages/reset-password/reset-password';

import { Admin } from './admin/admin';
import { Hierarchy } from './admin/hierarchy/hierarchy';


export const routes: Routes = [

  // LOGIN
  {
    path: 'login',
    component: Login
  },

  // REGISTER
  {
    path: 'register',
    component: Register
  },

  // RESET PASSWORD
  {
    path: 'reset-password',
    component: ResetPassword
  },

  // EMPLOYEE
  {
    path: 'employee',
    component: Employee
  },

  // EMPLOYEE - NEW REQUEST
  {
    path: 'employee/new-request',
    component: NewRequest
  },

  // EMPLOYEE - REQUEST DETAILS
  {
    path: 'employee/request/:id',
    component: RequestDetails
  },

  // MANAGER
  {
    path: 'manager',
    component: Manager
  },

  // MANAGER - REQUEST DETAILS
  {
    path: 'manager/request/:id',
    component: RequestDetails
  },

  // HR
  {
    path: 'hr',
    component: Hr
  },

  // HR - REQUEST DETAILS
  {
    path: 'hr/request/:id',
    component: RequestDetails
  },

  // ADMIN
  {
    path: 'admin',
    component: Admin
  },

  // ADMIN - HIERARCHY
  {
    path: 'admin/hierarchy',
    component: Hierarchy
  },

  // DEFAULT
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // UNKNOWN ROUTE
  {
    path: '**',
    redirectTo: 'login'
  }

];