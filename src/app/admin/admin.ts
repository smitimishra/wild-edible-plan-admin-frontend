import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  AdminService,
  AdminUser,
  HierarchyLevel,
  HealthResponse
} from '../services/admin.service';

import { AuthService } from '../services/auth';
import { SessionPopupComponent } from '../components/session-popup/session-popup';


type AdminMenu =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'health-analysis'
  | 'hierarchy'
  | 'settings';


type UserStatusFilter =
  | 'all'
  | 'active'
  | 'inactive';


@Component({
  selector: 'app-admin',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    SessionPopupComponent
  ],

  templateUrl: './admin.html'
})
export class Admin implements OnInit, OnDestroy {

  // Navigation

  activeMenu: AdminMenu = 'dashboard';


  // Users

  users: AdminUser[] = [];

  filteredUsers: AdminUser[] = [];

  userSearchTerm = '';

  userStatusFilter: UserStatusFilter = 'all';


  // User pagination

  readonly pageSize = 5;

  currentPage = 1;


  // Role management

  roleSearchTerm = '';

  showRoleModal = false;

  selectedRole = '';

  selectedRoleUser: AdminUser | null = null;


  // Role pagination

  readonly rolePageSize = 5;

  roleCurrentPage = 1;


  // UI

  loading = false;

  saving = false;

  errorMessage = '';

  successMessage = '';

  health: HealthResponse | null = null;
  healthLoading = false;
  healthError = '';
  private healthRefreshTimer: ReturnType<typeof setInterval> | null = null;


  // User modal

  showUserModal = false;

  editingUser: AdminUser | null = null;


  // User form

  userForm = {
    employee_code: '',
    name: '',
    email: '',
    phone_number: '',
    role: ''
  };

  // Action menu
  openActionMenuId: number | null = null;

  // Settings dropdown (sidebar)
  settingsMenuOpen = false;
  themeMenuOpen = false;

  // Theme
  currentTheme: 'light' | 'dark' | 'system' = 'system';


  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}


  // ============================================================
  // INIT + URL TOKEN
  // ============================================================

  ngOnInit(): void {
  this.loadStoredTheme();

  this.route.queryParamMap.subscribe(params => {
    const urlToken = params.get('token');

    if (urlToken) {
      console.log('JWT token received from URL');
      this.authService.saveToken(urlToken);
    }

    const token = this.authService.getToken();

    if (!token || this.authService.isTokenExpired(token)) {
      console.error('No valid authentication token found.');
      this.authService.logout();
      return;
    }

    console.log('Admin authentication token is available');

    this.authService.startSessionPolling();

    this.loadUsers();
  });
}


  // ============================================================
  // SESSION ACTIVITY
  // ============================================================

  @HostListener('document:mousemove')
  @HostListener('document:click')
  onUserActivity(): void {

    this.authService.checkSessionOnActivity();

  }


  // ============================================================
  // NAVIGATION
  // ============================================================

  setActiveMenu(
    menu: AdminMenu
  ): void {

    this.activeMenu = menu;

    this.clearMessages();

    if (menu !== 'settings') {
      this.settingsMenuOpen = false;
      this.themeMenuOpen = false;
    }

    if (menu === 'health-analysis') {
      this.loadHealth();
      this.startHealthRefresh();
    } else {
      this.stopHealthRefresh();
    }


    if (menu === 'users') {

      this.currentPage = 1;

    }


    if (menu === 'roles') {

      this.roleCurrentPage = 1;

    }

    if (menu === 'hierarchy') {

      this.loadHierarchy();

    }

    if (menu === 'settings') {
      this.loadSettings();
    }

  }


  // ============================================================
  // DASHBOARD
  // ============================================================

  showAllUsers(): void {

    this.activeMenu = 'users';

    this.userStatusFilter = 'all';

    this.currentPage = 1;

    this.clearMessages();

  }


  showActiveUsers(): void {

    this.activeMenu = 'users';

    this.userStatusFilter = 'active';

    this.currentPage = 1;

    this.clearMessages();

  }


  showInactiveUsers(): void {

    this.activeMenu = 'users';

    this.userStatusFilter = 'inactive';

    this.currentPage = 1;

    this.clearMessages();

  }


  // ============================================================
  // DASHBOARD COUNTS
  // ============================================================

  get activeUsers(): AdminUser[] {

    return this.users.filter(
      user => user.is_active === true
    );

  }


  get inactiveUsers(): AdminUser[] {

    return this.users.filter(
      user => user.is_active === false
    );

  }


  get adminUsers(): AdminUser[] {

    return this.users.filter(
      user =>
        (user.role || '')
          .trim()
          .toUpperCase() === 'ADMIN'
    );

  }


  get employeeUsers(): AdminUser[] {

    return this.users.filter(
      user =>
        (user.role || '')
          .trim()
          .toUpperCase() === 'EMPLOYEE'
    );

  }


  get reviewerUsers(): AdminUser[] {

    return this.users.filter(
      user =>
        (user.role || '')
          .trim()
          .toUpperCase() === 'REVIEWER'
    );

  }


  // ============================================================
  // LOAD USERS
  // ============================================================

  loadUsers(): void {

    this.loading = true;

    this.errorMessage = '';


    this.adminService.getUsers().subscribe({

      next: (response) => {

        this.users =
          response.users || [];


        this.applySearch();


        this.loading = false;

        this.cdr.detectChanges();

      },


      error: (error) => {

        console.error(
          'Failed to load users:',
          error
        );


        this.errorMessage =
          error?.error?.message ||
          'Unable to load users';


        this.loading = false;

        this.cdr.detectChanges();

      }

    });

  }


  get loadingUsers(): boolean {

    return this.loading;

  }


  // ============================================================
  // USER SEARCH
  // ============================================================

  applySearch(): void {

    const term =
      this.userSearchTerm
        .trim()
        .toLowerCase();


    if (!term) {

      this.filteredUsers =
        [...this.users];

    } else {

      this.filteredUsers =
        this.users.filter(user => {

          return (

            (user.name || '')
              .toLowerCase()
              .includes(term)

            ||

            (user.email || '')
              .toLowerCase()
              .includes(term)

            ||

            (user.employee_code || '')
              .toLowerCase()
              .includes(term)

            ||

            (user.role || '')
              .toLowerCase()
              .includes(term)

            ||

            (user.approval_position || '')
              .toLowerCase()
              .includes(term)

          );

        });

    }


    this.currentPage = 1;

    this.correctUserPage();

  }


  onUserSearch(): void {

    this.currentPage = 1;

    this.applySearch();

  }


  // ============================================================
  // USER STATUS FILTER
  // ============================================================

  get filteredUsersByStatus(): AdminUser[] {

    if (
      this.userStatusFilter === 'active'
    ) {

      return this.filteredUsers.filter(
        user => user.is_active === true
      );

    }


    if (
      this.userStatusFilter === 'inactive'
    ) {

      return this.filteredUsers.filter(
        user => user.is_active === false
      );

    }


    return this.filteredUsers;

  }


  // ============================================================
  // USER PAGINATION
  // ============================================================

  get paginatedUsers(): AdminUser[] {

    const start =
      (this.currentPage - 1) *
      this.pageSize;


    return this.filteredUsersByStatus.slice(
      start,
      start + this.pageSize
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredUsersByStatus.length /
        this.pageSize
      )
    );

  }


  get pageNumbers(): number[] {

    return Array.from(
      {
        length: this.totalPages
      },
      (_, index) => index + 1
    );

  }


  get paginationStart(): number {

    if (
      this.filteredUsersByStatus.length === 0
    ) {

      return 0;

    }


    return (
      (this.currentPage - 1) *
      this.pageSize
    ) + 1;

  }


  get paginationEnd(): number {

    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredUsersByStatus.length
    );

  }


  goToPage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.totalPages
    ) {

      return;

    }


    this.currentPage = page;

  }


  previousPage(): void {

    if (this.currentPage > 1) {

      this.currentPage--;

    }

  }


  nextPage(): void {

    if (
      this.currentPage < this.totalPages
    ) {

      this.currentPage++;

    }

  }


  correctUserPage(): void {

    if (
      this.currentPage > this.totalPages
    ) {

      this.currentPage =
        this.totalPages;

    }


    if (this.currentPage < 1) {

      this.currentPage = 1;

    }

  }


  // ============================================================
  // ROLE SEARCH
  // ============================================================

  get filteredRoleUsers(): AdminUser[] {

    const term =
      this.roleSearchTerm
        .trim()
        .toLowerCase();


    if (!term) {

      return [...this.users];

    }


    return this.users.filter(user => {

      return (

        (user.name || '')
          .toLowerCase()
          .includes(term)

        ||

        (user.email || '')
          .toLowerCase()
          .includes(term)

        ||

        (user.employee_code || '')
          .toLowerCase()
          .includes(term)

        ||

        (user.role || '')
          .toLowerCase()
          .includes(term)

      );

    });

  }


  applyRoleSearch(): void {

    this.roleCurrentPage = 1;

    this.correctRolePage();

  }


  onRoleSearch(): void {

    this.roleCurrentPage = 1;

    this.applyRoleSearch();

  }


  // ============================================================
  // ROLE PAGINATION
  // ============================================================

  get paginatedRoleUsers(): AdminUser[] {

    const start =
      (this.roleCurrentPage - 1) *
      this.rolePageSize;


    return this.filteredRoleUsers.slice(
      start,
      start + this.rolePageSize
    );

  }


  get roleTotalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredRoleUsers.length /
        this.rolePageSize
      )
    );

  }


  get rolePageNumbers(): number[] {

    return Array.from(
      {
        length: this.roleTotalPages
      },
      (_, index) => index + 1
    );

  }


  get rolePaginationStart(): number {

    if (
      this.filteredRoleUsers.length === 0
    ) {

      return 0;

    }


    return (
      (this.roleCurrentPage - 1) *
      this.rolePageSize
    ) + 1;

  }


  get rolePaginationEnd(): number {

    return Math.min(
      this.roleCurrentPage *
      this.rolePageSize,

      this.filteredRoleUsers.length
    );

  }


  goToRolePage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.roleTotalPages
    ) {

      return;

    }


    this.roleCurrentPage = page;

  }


  previousRolePage(): void {

    if (
      this.roleCurrentPage > 1
    ) {

      this.roleCurrentPage--;

    }

  }


  nextRolePage(): void {

    if (
      this.roleCurrentPage <
      this.roleTotalPages
    ) {

      this.roleCurrentPage++;

    }

  }


  correctRolePage(): void {

    if (
      this.roleCurrentPage >
      this.roleTotalPages
    ) {

      this.roleCurrentPage =
        this.roleTotalPages;

    }


    if (
      this.roleCurrentPage < 1
    ) {

      this.roleCurrentPage = 1;

    }

  }


  // ============================================================
  // ROLE MODAL
  // ============================================================

  openRoleModal(
    user: AdminUser
  ): void {

    if (
      (user.role || '')
        .trim()
        .toUpperCase() === 'ADMIN'
    ) {

      this.errorMessage =
        'The ADMIN account role cannot be changed';

      return;

    }


    this.selectedRoleUser = user;

    this.selectedRole =
      user.role || '';


    this.clearMessages();

    this.showRoleModal = true;

  }


  closeRoleModal(): void {

    if (this.saving) {

      return;

    }


    this.showRoleModal = false;

    this.selectedRoleUser = null;

    this.selectedRole = '';

  }


  updateUserRole(): void {

  this.clearMessages();

  if (!this.selectedRoleUser) {
    this.errorMessage = 'Please select a user';
    return;
  }

  const role =
    this.selectedRole
      .trim()
      .toUpperCase();

  if (!role) {
    this.errorMessage = 'Please select a role';
    return;
  }

  if (
    role !== 'EMPLOYEE' &&
    role !== 'REVIEWER'
  ) {
    this.errorMessage =
      'Only Employee / Field Staff or Reviewer can be assigned';
    return;
  }

  if (
    (this.selectedRoleUser.role || '')
      .trim()
      .toUpperCase() === 'ADMIN'
  ) {
    this.errorMessage =
      'The ADMIN account role cannot be changed';
    return;
  }

  if (
    (this.selectedRoleUser.role || '')
      .trim()
      .toUpperCase() === role
  ) {
    this.errorMessage =
      'Please select a different role';
    return;
  }

  this.saving = true;

  // Update role using the full user payload
  this.adminService.updateUser(
    this.selectedRoleUser.id,
    {
      name: this.selectedRoleUser.name,
      email: this.selectedRoleUser.email,
      role: role
    }
  ).subscribe({

    next: () => {

      this.saving = false;

      this.showRoleModal = false;

      this.selectedRoleUser = null;

      this.selectedRole = '';

      this.successMessage =
        'User role updated successfully';

      this.loadUsers();

    },

    error: (error) => {

      console.error(
        'Update user role error:',
        error
      );

      this.saving = false;

      this.errorMessage =
        error?.error?.message ||
        'Unable to update user role';

    }

  });

}

  // ============================================================
  // ADD USER
  // ============================================================

  openAddUser(): void {

    this.activeMenu = 'users';

    this.userStatusFilter = 'all';

    this.editingUser = null;

    this.resetForm();

    this.clearMessages();

    this.showUserModal = true;

  }


  openCreateUser(): void {

    this.openAddUser();

  }


  // ============================================================
  // EDIT USER
  // ============================================================

  openEditUser(
    user: AdminUser
  ): void {

    this.editingUser = user;

    this.clearMessages();


    this.userForm = {

      employee_code:
        user.employee_code || '',

      name:
        user.name || '',

      email:
        user.email || '',

      phone_number:
        user.phone_number || '',

      role:
        user.role || ''

    };


    this.showUserModal = true;

  }


  // ============================================================
  // CLOSE USER MODAL
  // ============================================================

  closeUserModal(): void {

    if (this.saving) {

      return;

    }


    this.showUserModal = false;

    this.editingUser = null;

    this.resetForm();

  }


  // ============================================================
  // RESET FORM
  // ============================================================

  resetForm(): void {

    this.userForm = {

      employee_code: '',

      name: '',

      email: '',

      phone_number: '',

      role: ''

    };

  }


  // ============================================================
  // APPROVAL POSITION
  // ============================================================

  getApprovalPosition():
    string | null {

    const role =
      this.userForm.role
        .trim()
        .toUpperCase();


    if (
      role === 'REVIEWER'
    ) {

      return 'REVIEWER';

    }


    return null;

  }


  // ============================================================
  // SAVE USER
  // ============================================================

  saveUser(): void {

    this.clearMessages();


    if (
      !this.userForm.name.trim() ||
      !this.userForm.email.trim() ||
      !this.userForm.role.trim()
    ) {

      this.errorMessage =
        'Please fill in all required fields';

      return;

    }


    const role =
      this.userForm.role
        .trim()
        .toUpperCase();


    if (
      role !== 'ADMIN' &&
      role !== 'EMPLOYEE' &&
      role !== 'REVIEWER'
    ) {

      this.errorMessage =
        'Invalid role selected';

      return;

    }


    this.saving = true;


    /*
     * Current AdminService accepts:
     * name, email, phone_number and role.
     *
     * Employee code and approval position
     * are returned by the backend.
     */

    if (!this.editingUser) {

      this.adminService.createUser({

        name:
          this.userForm.name.trim(),

        email:
          this.userForm.email.trim(),

        phone_number:
          this.userForm.phone_number.trim(),

        role

      }).subscribe({

        next: (response) => {

          this.saving = false;

          this.showUserModal = false;

          this.resetForm();

          this.successMessage =
            'User created successfully';


          this.loadUsers();


          if (
            response?.temporaryPassword
          ) {

            alert(
              `User created successfully.\n\n` +
              `Temporary password:\n` +
              `${response.temporaryPassword}`
            );

          }

        },


        error: (error) => {

          console.error(
            'Create user error:',
            error
          );


          this.saving = false;

          this.errorMessage =
            error?.error?.message ||
            'Unable to create user';

        }

      });


      return;

    }


    // Update existing user

    this.adminService.updateUser(

      this.editingUser.id,

      {

        name:
          this.userForm.name.trim(),

        email:
          this.userForm.email.trim(),

        phone_number:
          this.userForm.phone_number.trim(),

        role

      }

    ).subscribe({

      next: () => {

        this.saving = false;

        this.showUserModal = false;

        this.editingUser = null;

        this.resetForm();

        this.successMessage =
          'User updated successfully';


        this.loadUsers();

      },


      error: (error) => {

        console.error(
          'Update user error:',
          error
        );


        this.saving = false;

        this.errorMessage =
          error?.error?.message ||
          'Unable to update user';

      }

    });

  }


  // ============================================================
  // DEACTIVATE USER
  // ============================================================

  deactivateUser(
    user: AdminUser
  ): void {

    if (
      (user.role || '')
        .trim()
        .toUpperCase() === 'ADMIN'
    ) {

      this.errorMessage =
        'The ADMIN account cannot be deactivated';

      return;

    }


    const confirmed =
      confirm(
        `Are you sure you want to deactivate ${user.name}?`
      );


    if (!confirmed) {

      return;

    }


    this.clearMessages();


    this.adminService
      .deactivateUser(user.id)
      .subscribe({

        next: () => {

          this.successMessage =
            'User deactivated successfully';


          this.loadUsers();

        },


        error: (error) => {

          console.error(
            'Deactivate user error:',
            error
          );


          this.errorMessage =
            error?.error?.message ||
            'Unable to deactivate user';

        }

      });

  }


  // ============================================================
  // REACTIVATE USER
  // ============================================================

  reactivateUser(
    user: AdminUser
  ): void {

    this.clearMessages();


    this.adminService
      .reactivateUser(user.id)
      .subscribe({

        next: () => {

          this.successMessage =
            'User reactivated successfully';


          this.loadUsers();

        },


        error: (error) => {

          console.error(
            'Reactivate user error:',
            error
          );


          this.errorMessage =
            error?.error?.message ||
            'Unable to reactivate user';

        }

      });

  }


  // ============================================================
  // DELETE USER
  // ============================================================

  deleteUser(
    user: AdminUser
  ): void {

    if (
      (user.role || '')
        .trim()
        .toUpperCase() === 'ADMIN'
    ) {

      this.errorMessage =
        'The ADMIN account cannot be permanently deleted';

      return;

    }


    const confirmed =
      confirm(

        `WARNING!\n\n` +

        `You are about to permanently delete:\n\n` +

        `${user.name}\n` +

        `${user.email}\n\n` +

        `This action cannot be undone.\n\n` +

        `Do you want to continue?`

      );


    if (!confirmed) {

      return;

    }


    this.clearMessages();


    this.adminService
      .deleteUser(user.id)
      .subscribe({

        next: () => {

          this.successMessage =
            'User permanently deleted';


          this.loadUsers();

        },


        error: (error) => {

          console.error(
            'Delete user error:',
            error
          );


          this.errorMessage =
            error?.error?.message ||
            'Unable to permanently delete user';

        }

      });

  }


  // ============================================================
  // ACTION MENU
  // ============================================================

  toggleActionMenu(userId: number): void {

    this.openActionMenuId =
      this.openActionMenuId === userId
        ? null
        : userId;

  }


  closeActionMenu(): void {

    this.openActionMenuId = null;

  }


  // ============================================================
  // HIERARCHY (rendered inline inside the Admin Panel)
  // ============================================================

  hierarchy: HierarchyLevel[] = [];

  hierarchyLoading = false;

  hierarchyLoadError = '';

  showHierarchyModal = false;

  editingHierarchy: HierarchyLevel | null = null;

  hierarchySaving = false;

  hierarchyErrorMessage = '';

  hierarchySuccessMessage = '';

  hierarchyForm = {
    approval_level: 1,
    role: ''
  };


  loadHierarchy(): void {

    this.hierarchyLoading = true;

    this.hierarchyLoadError = '';


    this.adminService.getHierarchy().subscribe({

      next: (response: any) => {

        this.hierarchy =
          response.hierarchy || [];


        this.hierarchy.sort(
          (a, b) =>
            a.approval_level -
            b.approval_level
        );


        this.hierarchyLoading = false;

        this.cdr.detectChanges();

      },

      error: (error: any) => {

        console.error(
          'Failed to load approval hierarchy:',
          error
        );

        this.hierarchyLoading = false;

        this.hierarchyLoadError =
          error.error?.message ||
          'Failed to load approval hierarchy.';

        this.cdr.detectChanges();

      }

    });

  }


  openAddHierarchy(): void {

    this.editingHierarchy = null;

    this.resetHierarchyForm();

    this.clearHierarchyMessages();

    this.showHierarchyModal = true;

  }


  openEditHierarchy(
    hierarchy: HierarchyLevel
  ): void {

    this.editingHierarchy =
      hierarchy;

    this.clearHierarchyMessages();


    this.hierarchyForm = {

      approval_level:
        hierarchy.approval_level,

      role:
        hierarchy.role || ''

    };


    this.showHierarchyModal = true;

  }


  closeHierarchyModal(): void {

    if (this.hierarchySaving) {

      return;

    }


    this.showHierarchyModal = false;

    this.editingHierarchy = null;

    this.resetHierarchyForm();

  }


  resetHierarchyForm(): void {

    this.hierarchyForm = {

      approval_level:
        this.hierarchy.length + 1,

      role: ''

    };

  }


  saveHierarchy(): void {

    this.clearHierarchyMessages();


    const level =
      Number(
        this.hierarchyForm.approval_level
      );


    const role =
      this.hierarchyForm.role
        .trim()
        .toUpperCase();


    if (
      !Number.isInteger(level) ||
      level <= 0
    ) {

      this.hierarchyErrorMessage =
        'Approval level must be a positive number';

      return;

    }


    if (!role) {

      this.hierarchyErrorMessage =
        'Role is required';

      return;

    }


    if (role === 'EMPLOYEE') {

      this.hierarchyErrorMessage =
        'EMPLOYEE cannot be an approval position';

      return;

    }


    this.hierarchySaving = true;


    if (!this.editingHierarchy) {

      this.adminService
        .addHierarchyLevel({

          approval_level:
            level,

          role:
            role

        })
        .subscribe({

          next: () => {

            this.hierarchySaving = false;

            this.hierarchySuccessMessage =
              'Approval hierarchy level added successfully';

            this.showHierarchyModal = false;

            this.resetHierarchyForm();

            this.loadHierarchy();

            this.cdr.detectChanges();

          },

          error: (error) => {

            console.error(
              'Add hierarchy level error:',
              error
            );

            this.hierarchySaving = false;

            this.hierarchyErrorMessage =
              error?.error?.message ||
              'Unable to add approval hierarchy level';

            this.cdr.detectChanges();

          }

        });


      return;

    }


    this.adminService
      .updateHierarchyLevel(
        this.editingHierarchy.id,
        {

          approval_level:
            level,

          role:
            role

        }
      )
      .subscribe({

        next: () => {

          this.hierarchySaving = false;

          this.hierarchySuccessMessage =
            'Approval hierarchy level updated successfully';

          this.showHierarchyModal = false;

          this.editingHierarchy = null;

          this.resetHierarchyForm();

          this.loadHierarchy();

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Update hierarchy level error:',
            error
          );

          this.hierarchySaving = false;

          this.hierarchyErrorMessage =
            error?.error?.message ||
            'Unable to update approval hierarchy level';

          this.cdr.detectChanges();

        }

      });

  }


  deleteHierarchy(
    hierarchy: HierarchyLevel
  ): void {

    const confirmed =
      confirm(
        `Are you sure you want to delete this approval level?\n\n` +
        `Level: ${hierarchy.approval_level}\n` +
        `Role: ${hierarchy.role}\n\n` +
        `This will remove this position from the approval workflow.`
      );


    if (!confirmed) {

      return;

    }


    this.clearHierarchyMessages();


    this.adminService
      .deleteHierarchyLevel(
        hierarchy.id
      )
      .subscribe({

        next: () => {

          this.hierarchySuccessMessage =
            'Approval hierarchy level deleted successfully';

          this.loadHierarchy();

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Delete hierarchy level error:',
            error
          );

          this.hierarchyErrorMessage =
            error?.error?.message ||
            'Unable to delete approval hierarchy level';

          this.cdr.detectChanges();

        }

      });

  }


  clearHierarchyMessages(): void {

    this.hierarchyErrorMessage = '';

    this.hierarchySuccessMessage = '';

  }


  // ============================================================
  // ACCOUNT SETTINGS (merged in — logged-in devices page)
  // ============================================================

  openLoggedInDevices(): void {

    this.router.navigate([
      '/admin/logged-in-devices'
    ]);

  }


  // ============================================================
  // SETTINGS DROPDOWN (sidebar)
  // ============================================================

  toggleSettingsMenu(): void {

    this.settingsMenuOpen = !this.settingsMenuOpen;

    if (!this.settingsMenuOpen) {
      this.themeMenuOpen = false;
    }

  }


  toggleThemeMenu(): void {

    this.themeMenuOpen = !this.themeMenuOpen;

  }


  // ============================================================
  // THEME
  // ============================================================

  loadStoredTheme(): void {

    const stored =
      (localStorage.getItem('admin-theme') as
        'light' | 'dark' | 'system' | null) || 'system';

    this.currentTheme = stored;

    this.applyTheme();

  }


  setTheme(
    theme: 'light' | 'dark' | 'system'
  ): void {

    this.currentTheme = theme;

    localStorage.setItem('admin-theme', theme);

    this.applyTheme();

  }


  applyTheme(): void {

    let isDark = false;

    if (this.currentTheme === 'dark') {
      isDark = true;
    } else if (this.currentTheme === 'system') {
      isDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
    }

    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle('dark', isDark);
    body.classList.toggle('dark', isDark);

    // Keep native browser controls (inputs, selects, scrollbars, etc.)
    // visually consistent with the selected theme.
    root.style.colorScheme = isDark ? 'dark' : 'light';
    body.style.colorScheme = isDark ? 'dark' : 'light';

  }


  // ============================================================
  // HEALTH ANALYSIS
  // ============================================================

  goToHealthAnalysis(): void {

    this.router.navigate([
      '/admin/health-analysis'
    ]);

  }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {

    const confirmed =
      confirm(
        'Are you sure you want to logout?'
      );


    if (!confirmed) {

      return;

    }


    this.authService.logout(
      'http://192.168.29.218:8200/'
    );

  }


  // ============================================================
  // HELPERS
  // ============================================================

  getRoleDisplayName(
    role: string | null | undefined
  ): string {

    const normalizedRole =
      (role || '')
        .trim()
        .toUpperCase();


    switch (normalizedRole) {

      case 'ADMIN':
        return 'Admin';

      case 'EMPLOYEE':
        return 'Employee / Field Staff';

      case 'REVIEWER':
        return 'Reviewer';

      default:
        return role || 'Unknown';

    }

  }


  getInitials(
    name: string | null | undefined
  ): string {

    if (!name) {

      return '';

    }


    const parts =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (parts.length === 1) {

      return parts[0]
        .substring(0, 2)
        .toUpperCase();

    }


    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();

  }


  trackByUserId(
    index: number,
    user: AdminUser
  ): number {

    return user.id;

  }


  clearMessages(): void {

    this.errorMessage = '';

    this.successMessage = '';

  }


  showHealthAnalysisMessage(): void {
    this.setActiveMenu('health-analysis');
  }

  loadHealth(): void {
    this.healthLoading = true;
    this.healthError = '';

    this.adminService.getHealth().subscribe({
      next: (health) => {
        this.health = health;
        this.healthLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.healthLoading = false;
        this.healthError = error?.error?.message ?? 'Health monitor output is not available yet.';
        this.cdr.detectChanges();
      }
    });
  }

  startHealthRefresh(): void {
    this.stopHealthRefresh();
    this.healthRefreshTimer = setInterval(() => this.loadHealth(), 10000);
  }

  stopHealthRefresh(): void {
    if (this.healthRefreshTimer) {
      clearInterval(this.healthRefreshTimer);
      this.healthRefreshTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopHealthRefresh();
  }

  healthStatusClass(status: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'CRITICAL' || normalized === 'DOWN') return 'text-red-600';
    if (normalized === 'WARNING') return 'text-amber-600';
    return 'text-emerald-600';
  }

  healthBadgeClass(status: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'CRITICAL' || normalized === 'DOWN') return 'bg-red-100 text-red-700';
    if (normalized === 'WARNING') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }

  healthBarClass(status: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'CRITICAL') return 'bg-red-500';
    if (normalized === 'WARNING') return 'bg-amber-400';
    return 'bg-emerald-500';
  }

  healthyServiceCount(health: HealthResponse): number {
    return this.healthServices(health)
      .map((item) => item.service)
      .filter((service) => service.status.toUpperCase() === 'UP')
      .length;
  }

  healthServices(health: HealthResponse): Array<{ key: string; label: string; service: import('../services/admin.service').HealthService }> {
    const services: Array<{ key: string; label: string; service: import('../services/admin.service').HealthService }> = [
      { key: 'angular', label: 'Angular Frontend', service: health.services.angular },
      { key: 'backend', label: 'Node API', service: health.services.backend }
    ];

    if (health.services.database) {
      services.push({
        key: 'database',
        label: 'Postgres Database',
        service: health.services.database
      });
    }

    return services;
  }

  healthServiceEndpoint(item: { service: import('../services/admin.service').HealthService }): string {
    const service = item.service;
    if (service.url) return service.url;
    if (service.name) return `${service.name} at ${service.host}:${service.port}`;
    return `${service.host ?? 'Unknown host'}:${service.port ?? ''}`;
  }

  healthServiceDetails(item: { service: import('../services/admin.service').HealthService }): string {
    const service = item.service;
    if (service.error) return service.error;
    if (service.httpStatus) return `HTTP ${service.httpStatus} OK`;
    if (service.checkType) return `${service.checkType} check passed`;
    return `Port ${service.port ?? ''} Open`;
  }

  // ============================================================
  // SETTINGS — login lockout
  // ============================================================

  settingsLoading  = false;
  settingsSaving   = false;
  settingsError    = '';
  settingsSuccess  = '';

  // Form fields (strings for input binding)
  settingMaxAttempts  = '3';
  settingLockoutHours = '1';

  loadSettings(): void {
    this.settingsLoading = true;
    this.settingsError   = '';

    this.adminService.getSettings().subscribe({
      next: (res) => {
        const s = res.settings ?? {};
        this.settingMaxAttempts  = s['login_max_attempts']?.value  ?? '3';
        this.settingLockoutHours = s['login_lockout_hours']?.value ?? '1';
        this.settingsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.settingsError   = err?.error?.message ?? 'Unable to load settings';
        this.settingsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  saveSettings(): void {
    this.settingsError   = '';
    this.settingsSuccess = '';

    const maxAttempts  = Number(this.settingMaxAttempts);
    const lockoutHours = Number(this.settingLockoutHours);

    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
      this.settingsError = 'Max attempts must be a whole number between 1 and 100';
      return;
    }

    if (!Number.isInteger(lockoutHours) || lockoutHours < 1 || lockoutHours > 168) {
      this.settingsError = 'Lockout hours must be a whole number between 1 and 168';
      return;
    }

    this.settingsSaving = true;

    // Save both settings sequentially
    this.adminService.updateSetting('login_max_attempts', maxAttempts).subscribe({
      next: () => {
        this.adminService.updateSetting('login_lockout_hours', lockoutHours).subscribe({
          next: () => {
            this.settingsSaving  = false;
            this.settingsSuccess = 'Settings saved successfully';
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.settingsSaving = false;
            this.settingsError  = err?.error?.message ?? 'Unable to save lockout hours';
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.settingsSaving = false;
        this.settingsError  = err?.error?.message ?? 'Unable to save max attempts';
        this.cdr.detectChanges();
      }
    });
  }

}