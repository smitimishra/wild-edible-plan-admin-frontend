import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import {
  AdminService,
  AdminUser,
  HierarchyLevel,
  HealthResponse
} from '../services/admin.service';

import { AuthService } from '../services/auth';
import { SessionPopupComponent } from '../components/session-popup/session-popup';

import {
  SessionService,
  DeviceSession
} from '../services/session';


// ============================================================
// ADMIN MENU
// ============================================================

type AdminMenu =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'hierarchy'
  | 'health-analysis'
  | 'settings';

type UserStatusFilter =
  | 'all'
  | 'active'
  | 'inactive';

// ============================================================
// SETTINGS SUB-VIEW
// (replaces the separate AccountSettings / LoggedInDevices
// routed components — both now live inside Admin)
// ============================================================

type SettingsView =
  | 'main'
  | 'logged-in-devices';


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SessionPopupComponent
  ],
  templateUrl: './admin.html',
})
export class Admin implements OnInit, OnDestroy {

  // ============================================================
  // NAVIGATION
  // ============================================================

  activeMenu: AdminMenu = 'dashboard';

  // ============================================================
  // COLLAPSIBLE SIDEBAR
  // ============================================================

  sidebarCollapsed = false;

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }



  // ============================================================
  // USERS
  // ============================================================

  users: AdminUser[] = [];

  filteredUsers: AdminUser[] = [];

  userSearchTerm = '';

  userStatusFilter: UserStatusFilter = 'all';


  // ============================================================
  // USER PAGINATION
  // ============================================================

  readonly pageSize = 5;

  currentPage = 1;


  // ============================================================
  // ROLE MANAGEMENT
  // ============================================================

  roleSearchTerm = '';

  showRoleModal = false;

  selectedRole = '';

  selectedRoleUser: AdminUser | null = null;


  // ============================================================
  // ROLE PAGINATION
  // ============================================================

  readonly rolePageSize = 5;

  roleCurrentPage = 1;


  // ============================================================
  // UI
  // ============================================================

  loading = false;

  saving = false;

  errorMessage = '';

  successMessage = '';


  // ============================================================
  // USER MODAL
  // ============================================================

  showUserModal = false;

  editingUser: AdminUser | null = null;


  // ============================================================
  // USER FORM
  // ============================================================

  userForm = {
    employee_code: '',
    name: '',
    email: '',
    phone_number: '',
    role: ''
  };


  // ============================================================
  // ACTION MENU
  // ============================================================

  openActionMenuId: number | null = null;


  // ============================================================
  // ADMIN SESSION
  // ============================================================

  adminSessionRemainingSeconds = 0;


  // ============================================================
  // SETTINGS (merged from AccountSettings component)
  // ============================================================

  settingsView: SettingsView = 'main';



  // ============================================================
  // THEME SETTINGS
  // Light / Dark / System Default
  // ============================================================

  selectedTheme: 'light' | 'dark' | 'default' = 'default';
  settingsThemeMenuOpen = false;
  themeOptionsOpen = false;

  // ============================================================
  // TOP-RIGHT PROFILE DROPDOWN
  // (Account Settings / Theme / Logout, opened from the
  // top-right avatar — mirrors the sidebar Settings menu)
  // ============================================================

  profileMenuOpen = false;
  profileThemeOptionsOpen = false;

  // ============================================================
  // ADMIN PROFILE
  // Name is loaded from the main user_table using the
  // authenticated user's email.
  // ============================================================

  profileName = '';

  private readonly profileApiUrl =
    'http://192.168.29.217:3001/api/profile/me';

  private systemThemeMediaQuery: MediaQueryList | null = null;

  private readonly systemThemeListener = (
    event: MediaQueryListEvent
  ): void => {
    if (this.selectedTheme === 'default') {
      this.applySystemTheme(event.matches);
    }
  };

  // ============================================================
  // THEME FUNCTIONS
  // ============================================================

  toggleSettingsThemeMenu(): void {
    this.settingsThemeMenuOpen = !this.settingsThemeMenuOpen;

    if (!this.settingsThemeMenuOpen) {
      this.themeOptionsOpen = false;
    }
  }

  toggleThemeOptions(): void {
    this.themeOptionsOpen = !this.themeOptionsOpen;
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;

    if (!this.profileMenuOpen) {
      this.profileThemeOptionsOpen = false;
    }
  }

  toggleProfileThemeOptions(): void {
    this.profileThemeOptionsOpen = !this.profileThemeOptionsOpen;
  }

  selectTheme(theme: 'light' | 'dark' | 'default'): void {
    this.selectedTheme = theme;
    this.settingsThemeMenuOpen = false;
    this.themeOptionsOpen = false;
    this.profileMenuOpen = false;
    this.profileThemeOptionsOpen = false;

    // Save Admin Panel theme selection.
    localStorage.setItem('admin-theme', theme);

    if (theme === 'dark') {
      this.removeSystemThemeListener();
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      this.removeSystemThemeListener();
      document.documentElement.classList.remove('dark');
    } else {
      this.startSystemThemeListener();
    }
  }

  isThemeSelected(
    theme: 'light' | 'dark' | 'default'
  ): boolean {
    return this.selectedTheme === theme;
  }

  private startSystemThemeListener(): void {
    this.removeSystemThemeListener();

    this.systemThemeMediaQuery =
      window.matchMedia('(prefers-color-scheme: dark)');

    this.applySystemTheme(
      this.systemThemeMediaQuery.matches
    );

    this.systemThemeMediaQuery.addEventListener(
      'change',
      this.systemThemeListener
    );
  }

  private removeSystemThemeListener(): void {
    if (this.systemThemeMediaQuery) {
      this.systemThemeMediaQuery.removeEventListener(
        'change',
        this.systemThemeListener
      );

      this.systemThemeMediaQuery = null;
    }
  }

  private applySystemTheme(isDark: boolean): void {
    if (this.selectedTheme !== 'default') {
      return;
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }


  // ============================================================
  // LOGGED-IN DEVICES (merged from LoggedInDevices component)
  // ============================================================

  devices: DeviceSession[] = [];

  devicesLoading = false;

  devicesErrorMessage = '';

  // ============================================================
  // LOGGED-IN DEVICES PAGINATION
  // ============================================================

  readonly devicesPageSize = 5;

  devicesCurrentPage = 1;

  // ============================================================
  // HEALTH ANALYSIS
  // ============================================================

  healthData: HealthResponse | null = null;
  healthLoading = false;
  healthError = '';
  private healthRequestInFlight = false;
  private healthRefreshTimer: ReturnType<typeof setInterval> | null = null;


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private sessionService: SessionService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}


  // ============================================================
  // INIT + URL TOKEN
  // ============================================================

  ngOnInit(): void {

    // ----------------------------------------------------------
    // LOAD SAVED ADMIN THEME
    // ----------------------------------------------------------

    const savedTheme =
      localStorage.getItem('admin-theme');

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark' ||
      savedTheme === 'default'
    ) {
      this.selectedTheme = savedTheme;
    }

    // ----------------------------------------------------------
    // APPLY INITIAL ADMIN THEME
    // ----------------------------------------------------------

    if (this.selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (this.selectedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      this.startSystemThemeListener();
    }

    this.route.queryParamMap.subscribe((params) => {

      const urlToken = params.get('token');

      if (urlToken) {

        console.log(
          'JWT token received from URL'
        );

        this.authService.saveToken(urlToken);
      }


      const token = this.authService.getToken();

      if (
        !token ||
        this.authService.isTokenExpired(token)
      ) {

        console.error(
          'No valid authentication token found.'
        );

        this.authService.logout();

        return;
      }


      console.log(
        'Admin authentication token is available'
      );


      this.authService.startSessionPolling();

      // Load the logged-in Admin's display name from the
      // main user_table using the email from the authenticated JWT.
      this.loadProfileName();

      // Theme was initialized before authentication.
      // Do not reset the selected theme here.

      this.loadUsers();

    });

  }



  // ============================================================
  // ADMIN PROFILE
  // ============================================================

  loadProfileName(): void {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('Cannot load admin profile: no authentication token.');
      return;
    }

    this.http
      .get<{ user_name?: string }>(this.profileApiUrl)
      .subscribe({
        next: (response) => {
          this.profileName =
            response?.user_name?.trim() || 'Administrator';

          console.log(
            'Admin profile name loaded:',
            this.profileName
          );

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error(
            'Failed to load admin profile:',
            error
          );

          // Keep the existing Admin fallback if the profile
          // request fails. This does not affect authentication.
          this.profileName = 'Administrator';

          this.cdr.detectChanges();
        }
      });
  }

  getProfileName(): string {
    return this.profileName || 'Administrator';
  }

  getProfileInitial(): string {
    const name = this.getProfileName().trim();

    return name
      ? name.charAt(0).toUpperCase()
      : 'A';
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
  // PROFILE DROPDOWN — CLOSE ON OUTSIDE CLICK
  // ============================================================

  @HostListener('document:click', ['$event'])
  onDocumentClickForProfileMenu(event: MouseEvent): void {

    if (!this.profileMenuOpen) {
      return;
    }

    const target = event.target as HTMLElement;

    if (!target.closest('#admin-profile-menu')) {
      this.profileMenuOpen = false;
      this.profileThemeOptionsOpen = false;
    }

  }


  // ============================================================
  // NAVIGATION
  // ============================================================

  setActiveMenu(menu: AdminMenu): void {

    this.activeMenu = menu;

    this.clearMessages();

    if (menu === 'health-analysis') {
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

      this.settingsView = 'main';

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
      (user) =>
        user.is_active === true
    );

  }


  get inactiveUsers(): AdminUser[] {

    return this.users.filter(
      (user) =>
        user.is_active === false
    );

  }


  get adminUsers(): AdminUser[] {

    return this.users.filter(
      (user) =>
        (user.role || '')
          .trim()
          .toUpperCase() === 'ADMIN'
    );

  }


  get employeeUsers(): AdminUser[] {

    return this.users.filter(
      (user) =>
        (user.role || '')
          .trim()
          .toUpperCase() === 'EMPLOYEE'
    );

  }


  get reviewerUsers(): AdminUser[] {

    return this.users.filter(
      (user) =>
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
        this.users.filter((user) => {

          return (

            (user.name || '')
              .toLowerCase()
              .includes(term) ||

            (user.email || '')
              .toLowerCase()
              .includes(term) ||

            (user.employee_code || '')
              .toLowerCase()
              .includes(term) ||

            (user.role || '')
              .toLowerCase()
              .includes(term) ||

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
        (user) =>
          user.is_active === true
      );

    }


    if (
      this.userStatusFilter === 'inactive'
    ) {

      return this.filteredUsers.filter(
        (user) =>
          user.is_active === false
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
      (_, index) =>
        index + 1
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
      this.currentPage *
      this.pageSize,

      this.filteredUsersByStatus.length
    );

  }


  goToPage(page: number): void {

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
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  correctUserPage(): void {

    if (
      this.currentPage >
      this.totalPages
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


    return this.users.filter((user) => {

      return (

        (user.name || '')
          .toLowerCase()
          .includes(term) ||

        (user.email || '')
          .toLowerCase()
          .includes(term) ||

        (user.employee_code || '')
          .toLowerCase()
          .includes(term) ||

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
        length:
          this.roleTotalPages
      },
      (_, index) =>
        index + 1
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


  goToRolePage(page: number): void {

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

  openRoleModal(user: AdminUser): void {

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

      this.errorMessage =
        'Please select a user';

      return;

    }


    const role =
      this.selectedRole
        .trim()
        .toUpperCase();


    if (!role) {

      this.errorMessage =
        'Please select a role';

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


    this.adminService
      .updateUser(
        this.selectedRoleUser.id,
        {
          name:
            this.selectedRoleUser.name,

          email:
            this.selectedRoleUser.email,

          role: role
        }
      )
      .subscribe({

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

  getApprovalPosition(): string | null {

    const role =
      this.userForm.role
        .trim()
        .toUpperCase();


    if (role === 'REVIEWER') {

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


    if (!this.editingUser) {

      this.adminService
        .createUser({

          name:
            this.userForm.name.trim(),

          email:
            this.userForm.email.trim(),

          phone_number:
            this.userForm.phone_number.trim(),

          role

        })
        .subscribe({

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


    // ==========================================================
    // UPDATE EXISTING USER
    // ==========================================================

    this.adminService
      .updateUser(

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

      )
      .subscribe({

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

  toggleActionMenu(
    userId: number
  ): void {

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
          error?.error?.message ||
          'Failed to load approval hierarchy.';

        this.cdr.detectChanges();

      }

    });

  }


  goToHierarchy(): void {

    this.activeMenu = 'hierarchy';

    this.clearMessages();

    this.loadHierarchy();

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
          approval_level: level,
          role: role
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
          approval_level: level,
          role: role
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
      .deleteHierarchyLevel(hierarchy.id)
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
  // HEALTH ANALYSIS
  // ============================================================

  goToHealthAnalysis(): void {

    this.activeMenu =
      'health-analysis';

    this.clearMessages();
    this.startHealthRefresh();


    this.router.navigate([
      '/admin/health-analysis'
    ]);

  }


  // ============================================================
  // SETTINGS
  // (previously routed to /admin/account-settings, which
  // rendered the standalone AccountSettings component — that
  // component's only job, openLoggedInDevices(), is now
  // showLoggedInDevices() below)
  // ============================================================

  goToSettings(): void {

    this.activeMenu = 'settings';

    this.settingsView = 'main';

    this.clearMessages();

  }


  goToAccountSettings(): void {

    this.settingsThemeMenuOpen = false;
    this.themeOptionsOpen = false;
    this.profileMenuOpen = false;
    this.profileThemeOptionsOpen = false;
    this.goToSettings();

  }


  // ============================================================
  // LOGGED-IN DEVICES
  // (previously routed to /admin/logged-in-devices, which
  // rendered the standalone LoggedInDevices component — its
  // state and methods are merged in below)
  // ============================================================

  goToLoggedInDevices(): void {

    this.activeMenu = 'settings';

    this.settingsView = 'logged-in-devices';

    this.devicesCurrentPage = 1;
    this.clearMessages();

    this.loadLoggedInDevices();

  }


  backToSettingsMain(): void {

    this.settingsView = 'main';

  }


  loadLoggedInDevices(): void {

    console.log(
      'Calling logged-in-devices API...'
    );

    this.devicesLoading = true;

    this.devicesErrorMessage = '';


    this.sessionService
      .getLoggedInDevices()
      .subscribe({

        next: (response) => {

          console.log(
            'Logged-in devices API response:',
            response
          );

          if (response.success) {

            this.devices = Array.isArray(response.data)
              ? response.data
              : [];

            this.devicesCurrentPage = 1;
            this.correctDevicesPage();

            console.log(
              'Devices assigned to Angular:',
              this.devices
            );

          } else {

            this.devicesErrorMessage =
              'Unable to load logged-in devices.';

          }

          this.devicesLoading = false;

          /*
           * Force Angular to refresh the UI
           * after receiving the API response.
           */
          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Logged-in devices API error:',
            error
          );

          this.devicesErrorMessage =
            'Unable to connect to the backend server.';

          this.devicesCurrentPage = 1;
          this.devicesLoading = false;

          this.cdr.detectChanges();

        }

      });

  }


  get totalDevices(): number {

    return this.devices.length;

  }


  get activeDeviceCount(): number {

    return this.devices.filter(
      (device: DeviceSession) =>
        this.isDeviceActive(device)
    ).length;

  }


  // ============================================================
  // LOGGED-IN DEVICES PAGINATION
  // ============================================================

  get inactiveDeviceCount(): number {

    return this.devices.filter(
      (device: DeviceSession) => !this.isDeviceActive(device)
    ).length;
  }


  get paginatedDevices(): DeviceSession[] {

    const start =
      (this.devicesCurrentPage - 1) *
      this.devicesPageSize;

    return this.devices.slice(
      start,
      start + this.devicesPageSize
    );
  }


  get devicesTotalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.devices.length /
        this.devicesPageSize
      )
    );
  }


  get devicesPageNumbers(): number[] {

    return Array.from(
      { length: this.devicesTotalPages },
      (_, index) => index + 1
    );
  }


  get devicesPaginationStart(): number {

    if (this.devices.length === 0) {
      return 0;
    }

    return (
      (this.devicesCurrentPage - 1) *
      this.devicesPageSize
    ) + 1;
  }


  get devicesPaginationEnd(): number {

    return Math.min(
      this.devicesCurrentPage *
      this.devicesPageSize,
      this.devices.length
    );
  }


  goToDevicesPage(page: number): void {

    if (
      page < 1 ||
      page > this.devicesTotalPages
    ) {
      return;
    }

    this.devicesCurrentPage = page;
  }


  previousDevicesPage(): void {

    if (this.devicesCurrentPage > 1) {
      this.devicesCurrentPage--;
    }
  }


  nextDevicesPage(): void {

    if (this.devicesCurrentPage < this.devicesTotalPages) {
      this.devicesCurrentPage++;
    }
  }


  private correctDevicesPage(): void {

    if (this.devicesCurrentPage > this.devicesTotalPages) {
      this.devicesCurrentPage = this.devicesTotalPages;
    }

    if (this.devicesCurrentPage < 1) {
      this.devicesCurrentPage = 1;
    }
  }


  isDeviceActive(device: DeviceSession): boolean {

    if (typeof device.active === 'boolean') {
      return device.active;
    }

    return device.is_active === true;
  }


  getDeviceType(device: DeviceSession): string {

    const deviceType =
      (device.device_type || '').trim();

    if (!deviceType) {
      return 'Unknown Device';
    }

    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'phone':
        return 'Mobile';
      case 'tablet':
        return 'Tablet';
      case 'tv':
      case 'smart tv':
        return 'TV';
      case 'desktop':
        return 'Desktop';
      case 'laptop':
        return 'Laptop';
      case 'browser':
        return 'Browser';
      default:
        return deviceType;
    }
  }


  formatDeviceDate(
    value: string | null | undefined
  ): string {

    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }
    );
  }


  getDeviceLoginTime(device: DeviceSession): string {

    return this.formatDeviceDate(
      device.loginTime || device.created_at
    );
  }


  getDeviceLastActive(device: DeviceSession): string {

    return this.formatDeviceDate(
      device.last_active || device.last_activity
    );
  }


  logoutAllDevices(): void {

    if (this.devices.length === 0) {

      return;

    }


    const confirmed = window.confirm(
      'Are you sure you want to logout all devices?'
    );

    if (!confirmed) {

      return;

    }


    this.sessionService
      .logoutAllDevices()
      .subscribe({

        next: (response) => {

          console.log(
            'Logout all devices response:',
            response
          );

          if (response.success) {

            this.devices = [];
            this.devicesCurrentPage = 1;

            console.log(
              response.message
            );

          } else {

            this.devicesErrorMessage =
              'Unable to logout all devices.';

          }

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Logout all devices failed:',
            error
          );

          this.devicesErrorMessage =
            'Unable to logout all devices.';

          this.cdr.detectChanges();

        }

      });

  }


  // ============================================================
  // 15-MINUTE ADMIN SESSION TIMER
  // ============================================================


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
      'http://192.168.29.217:8200/'
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

    this.activeMenu =
      'health-analysis';

    this.clearMessages();
    this.startHealthRefresh();

  }

  private startHealthRefresh(): void {
    this.stopHealthRefresh();
    this.loadHealth();
    this.healthRefreshTimer = setInterval(() => {
      if (this.activeMenu === 'health-analysis') {
        this.loadHealth();
      }
    }, 5000);
  }

  private stopHealthRefresh(): void {
    if (this.healthRefreshTimer !== null) {
      clearInterval(this.healthRefreshTimer);
      this.healthRefreshTimer = null;
    }
  }

  loadHealth(): void {
    if (this.healthRequestInFlight) {
      return;
    }

    this.healthRequestInFlight = true;
    this.healthLoading = true;
    this.healthError = '';

    this.adminService.getHealth().subscribe({
      next: (health) => {
        this.healthRequestInFlight = false;
        this.healthData = health;
        this.healthLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.healthRequestInFlight = false;
        this.healthLoading = false;
        this.healthError =
          error?.error?.message ||
          'Unable to load health monitor output.';
        this.cdr.markForCheck();
      }
    });
  }


  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {

    this.stopHealthRefresh();
    this.removeSystemThemeListener();

  }

}