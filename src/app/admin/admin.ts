import {
  ChangeDetectorRef,
  Component,
  HostListener,
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
  HierarchyLevel
} from '../services/admin.service';

import { AuthService } from '../services/auth';
import { SessionPopupComponent } from '../components/session-popup/session-popup';

/**
 * Extra fields expected from the backend for login/inactivity visibility.
 * They are optional so the UI remains compatible until the backend is updated.
 */
type AdminUserWithActivity = AdminUser & {
  last_login_at?: string | null;
  deactivated_at?: string | null;
  deactivation_reason?: string | null;
};

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
export class Admin implements OnInit {

  // ============================================================
  // ADMIN PANEL NAVIGATION
  // ============================================================

  activeMenu = 'dashboard';

  // ============================================================
  // USERS
  // ============================================================

  users: AdminUserWithActivity[] = [];
  filteredUsers: AdminUserWithActivity[] = [];

  // ============================================================
  // PAGINATION
  // ============================================================

  readonly pageSize = 5;
  currentPage = 1;

  // ============================================================
  // APPROVAL WORKFLOW HIERARCHY
  // ============================================================

  hierarchy: HierarchyLevel[] = [];
  hierarchyLoading = false;
  hierarchySaving = false;
  hierarchyErrorMessage = '';
  hierarchySuccessMessage = '';

  // ============================================================
  // HIERARCHY MODAL
  // ============================================================

  showHierarchyModal = false;
  editingHierarchy: HierarchyLevel | null = null;

  // ============================================================
  // HIERARCHY FORM
  // ============================================================

  hierarchyForm = {
    approval_level: 1,
    role: ''
  };

  // ============================================================
  // UI STATE
  // ============================================================

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // ============================================================
  // SEARCH
  // ============================================================

  searchTerm = '';

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
    role: ''
  };

  // ============================================================
  // ROLE MANAGEMENT
  // ============================================================

  roleSearchTerm = '';
  showRoleModal = false;
  selectedRole = '';
  selectedRoleUser: AdminUserWithActivity | null = null;

  readonly rolePageSize = 5;
  roleCurrentPage = 1;
   
  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  // ============================================================
  // ROLE MANAGEMENT
  // ============================================================

  get filteredRoleUsers(): AdminUserWithActivity[] {
    const term = this.roleSearchTerm.trim().toLowerCase();

    if (!term) {
      return [...this.users];
    }

    return this.users.filter((user) =>
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.employee_code?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term)
    );
  }

  get paginatedRoleUsers(): AdminUserWithActivity[] {
    const start = (this.roleCurrentPage - 1) * this.rolePageSize;
    return this.filteredRoleUsers.slice(start, start + this.rolePageSize);
  }

  get roleTotalPages(): number {
    return Math.ceil(this.filteredRoleUsers.length / this.rolePageSize);
  }

  get rolePageNumbers(): number[] {
    return Array.from(
      { length: this.roleTotalPages },
      (_, index) => index + 1
    );
  }

  get roleFirstDisplayedUser(): number {
    if (this.filteredRoleUsers.length === 0) {
      return 0;
    }

    return (this.roleCurrentPage - 1) * this.rolePageSize + 1;
  }

  get roleLastDisplayedUser(): number {
    return Math.min(
      this.roleCurrentPage * this.rolePageSize,
      this.filteredRoleUsers.length
    );
  }

  onRoleSearch(): void {
    this.roleCurrentPage = 1;
  }

  goToRolePage(page: number): void {
    if (page < 1 || page > this.roleTotalPages) {
      return;
    }

    this.roleCurrentPage = page;
  }

  previousRolePage(): void {
    this.goToRolePage(this.roleCurrentPage - 1);
  }

  nextRolePage(): void {
    this.goToRolePage(this.roleCurrentPage + 1);
  }

  editUserRole(user: AdminUserWithActivity): void {
    this.selectedRoleUser = user;
    this.selectedRole = user.role || '';
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

    const role = this.selectedRole.trim().toUpperCase();

    if (!role) {
      this.errorMessage = 'Please select a role';
      return;
    }

    if (this.selectedRoleUser.role?.toUpperCase() === role) {
      this.errorMessage = 'Please select a different role';
      return;
    }

    if (this.selectedRoleUser.role?.toUpperCase() === 'ADMIN') {
      this.errorMessage = 'The ADMIN account role cannot be changed';
      return;
    }

    this.saving = true;

    this.adminService.updateUserRole(
      this.selectedRoleUser.id,
      role
    ).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'User role updated successfully';
        this.closeRoleModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Update user role error:', error);
        this.saving = false;
        this.errorMessage =
          error?.error?.message ||
          'Unable to update user role';
      }
    });
  }

  // ============================================================
  // MOUSE ACTIVITY → SESSION CHECK
  // ============================================================

  @HostListener('document:mousemove')
  @HostListener('document:click')
  onUserActivity(): void {
    this.authService.checkSessionOnActivity();
  }

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
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
      this.loadHierarchy();
    });
  }

  // ============================================================
  // ADMIN SIDEBAR
  // ============================================================

  selectMenu(menu: string): void {
    this.activeMenu = menu;
    this.clearMessages();
    this.clearHierarchyMessages();

    if (menu === 'users' || menu === 'active-users' || menu === 'inactive-users') {
      this.currentPage = 1;
    }

    if (menu === 'roles') {
      this.roleCurrentPage = 1;
    }

    if (menu === 'hierarchy') {
      this.loadHierarchy();
    }
  }

  isUserMenuActive(): boolean {
    return [
      'users',
      'active-users',
      'inactive-users'
    ].includes(this.activeMenu);
  }

  // ============================================================
  // LOAD USERS
  // ============================================================

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getUsers().subscribe({
      next: (response) => {
        this.users = (response.users || []) as AdminUserWithActivity[];
        this.applySearch();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load users:', error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to load users';

        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================================
  // SEARCH
  // ============================================================

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter((user) => {
        return (
          user.name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.employee_code?.toLowerCase().includes(term) ||
          user.role?.toLowerCase().includes(term) ||
          user.approval_position?.toLowerCase().includes(term)
        );
      });
    }

    const totalPages = this.totalPages;

    if (totalPages === 0) {
      this.currentPage = 1;
    } else if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applySearch();
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize);
  }

  get paginatedUsers(): AdminUserWithActivity[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.currentListTotalPages) {
      return;
    }

    this.currentPage = page;
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  get firstDisplayedUser(): number {
    if (this.filteredUsers.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastDisplayedUser(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredUsers.length
    );
  }

  // ============================================================
  // ACTIVE / INACTIVE USER VIEWS
  // ============================================================

  get activeUserList(): AdminUserWithActivity[] {
    return this.users.filter(user => user.is_active);
  }

  get inactiveUserList(): AdminUserWithActivity[] {
    return this.users.filter(user => !user.is_active);
  }

  get activeUserPageCount(): number {
    return Math.ceil(this.activeUserList.length / this.pageSize);
  }

  get inactiveUserPageCount(): number {
    return Math.ceil(this.inactiveUserList.length / this.pageSize);
  }

  get paginatedActiveUsers(): AdminUserWithActivity[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.activeUserList.slice(start, start + this.pageSize);
  }

  get paginatedInactiveUsers(): AdminUserWithActivity[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.inactiveUserList.slice(start, start + this.pageSize);
  }

  get currentListTotal(): number {
    if (this.activeMenu === 'active-users') {
      return this.activeUserList.length;
    }

    if (this.activeMenu === 'inactive-users') {
      return this.inactiveUserList.length;
    }

    return this.filteredUsers.length;
  }

  get currentListTotalPages(): number {
    return Math.ceil(this.currentListTotal / this.pageSize);
  }

  get currentListPageNumbers(): number[] {
    return Array.from(
      { length: this.currentListTotalPages },
      (_, index) => index + 1
    );
  }

  get currentListFirstItem(): number {
    if (this.currentListTotal === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get currentListLastItem(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.currentListTotal
    );
  }

  getLastLogin(user: AdminUserWithActivity): string | null {
    return user.last_login_at || null;
  }

  getInactiveSince(user: AdminUserWithActivity): string | null {
    return user.deactivated_at || null;
  }

  getInactiveDays(user: AdminUserWithActivity): number | null {
    const inactiveSince = this.getInactiveSince(user);

    if (!inactiveSince) {
      return null;
    }

    const since = new Date(inactiveSince);

    if (Number.isNaN(since.getTime())) {
      return null;
    }

    const difference = Date.now() - since.getTime();

    if (difference <= 0) {
      return 0;
    }

    return Math.floor(difference / (1000 * 60 * 60 * 24));
  }

  getDeactivationReason(user: AdminUserWithActivity): string {
    if (user.deactivation_reason) {
      return user.deactivation_reason;
    }

    if (user.deactivated_at && user.last_login_at) {
      return 'Inactive account';
    }

    return 'Deactivation reason not available';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // ============================================================
  // OPEN CREATE USER MODAL
  // ============================================================

  openCreateUser(): void {
    this.activeMenu = 'users';
    this.editingUser = null;
    this.resetForm();
    this.clearMessages();
    this.showUserModal = true;
  }

  // ============================================================
  // OPEN EDIT USER MODAL
  // ============================================================

  openEditUser(user: AdminUser): void {
    this.editingUser = user;
    this.clearMessages();

    this.userForm = {
      employee_code: user.employee_code || '',
      name: user.name || '',
      email: user.email || '',
      role: user.role || ''
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
  // RESET USER FORM
  // ============================================================

  resetForm(): void {
    this.userForm = {
      employee_code: '',
      name: '',
      email: '',
      role: ''
    };
  }

  // ============================================================
  // GET APPROVAL POSITION
  // ============================================================

  getApprovalPosition(): string | null {
    const role = this.userForm.role.trim();

    if (!role || role.toUpperCase() === 'EMPLOYEE') {
      return null;
    }

    return role.toUpperCase();
  }

  // ============================================================
  // CREATE / UPDATE USER
  // ============================================================

  saveUser(): void {
    this.clearMessages();

    if (
      !this.userForm.employee_code.trim() ||
      !this.userForm.name.trim() ||
      !this.userForm.email.trim() ||
      !this.userForm.role.trim()
    ) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.saving = true;

    const role = this.userForm.role.trim().toUpperCase();
    const approvalPosition = role === 'EMPLOYEE' ? null : role;

    if (!this.editingUser) {
      this.adminService.createUser({
        employee_code: this.userForm.employee_code.trim(),
        name: this.userForm.name.trim(),
        email: this.userForm.email.trim(),
        role,
        approval_position: approvalPosition
      }).subscribe({
        next: (response) => {
          this.saving = false;
          this.successMessage = 'User created successfully';
          this.showUserModal = false;
          this.resetForm();
          this.loadUsers();

          if (response.temporaryPassword) {
            alert(
              `User created successfully.\n\n` +
              `Temporary password:\n` +
              `${response.temporaryPassword}`
            );
          }
        },
        error: (error) => {
          console.error('Create user error:', error);
          this.saving = false;
          this.errorMessage =
            error?.error?.message ||
            'Unable to create user';
        }
      });

      return;
    }

    this.adminService.updateUser(
      this.editingUser.id,
      {
        employee_code: this.userForm.employee_code.trim(),
        name: this.userForm.name.trim(),
        email: this.userForm.email.trim(),
        role,
        approval_position: approvalPosition
      }
    ).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'User updated successfully';
        this.showUserModal = false;
        this.editingUser = null;
        this.resetForm();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Update user error:', error);
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

  deactivateUser(user: AdminUser): void {
    if (user.role?.toUpperCase() === 'ADMIN') {
      this.errorMessage = 'The ADMIN account cannot be deactivated';
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to deactivate ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.adminService.deactivateUser(user.id).subscribe({
      next: () => {
        this.successMessage = 'User deactivated successfully';
        this.loadUsers();
      },
      error: (error) => {
        console.error('Deactivate user error:', error);
        this.errorMessage =
          error?.error?.message ||
          'Unable to deactivate user';
      }
    });
  }

  // ============================================================
  // REACTIVATE USER
  // ============================================================

  reactivateUser(user: AdminUser): void {
    this.clearMessages();

    this.adminService.reactivateUser(user.id).subscribe({
      next: () => {
        this.successMessage = 'User reactivated successfully';
        this.loadUsers();
      },
      error: (error) => {
        console.error('Reactivate user error:', error);
        this.errorMessage =
          error?.error?.message ||
          'Unable to reactivate user';
      }
    });
  }

  // ============================================================
  // PERMANENTLY DELETE USER
  // ============================================================

  deleteUser(user: AdminUser): void {
    if (user.role?.toUpperCase() === 'ADMIN') {
      this.errorMessage =
        'The ADMIN account cannot be permanently deleted';
      return;
    }

    const confirmed = confirm(
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

    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.successMessage = 'User permanently deleted';
        this.loadUsers();
      },
      error: (error) => {
        console.error('Delete user error:', error);
        this.errorMessage =
          error?.error?.message ||
          'Unable to permanently delete user';
      }
    });
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');

    if (!confirmed) {
      return;
    }


    this.authService.logout('http://192.168.29.216:8200/');

  }

  // ============================================================
  // GO TO HIERARCHY PAGE
  // ============================================================

  goToHierarchy(): void {
    this.selectMenu('hierarchy');
  }

  // ============================================================
  // SCROLL TO HIERARCHY
  // ============================================================

  scrollToHierarchy(): void {
    const element = document.getElementById('hierarchy-section');

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // ============================================================
  // LOAD HIERARCHY
  // ============================================================

  loadHierarchy(): void {
    this.hierarchyLoading = true;
    this.hierarchyErrorMessage = '';

    this.adminService.getHierarchy().subscribe({
      next: (response) => {
        this.hierarchy = (response.hierarchy || []).sort(
          (a, b) => a.approval_level - b.approval_level
        );

        this.hierarchyLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load approval hierarchy:', error);

        this.hierarchyErrorMessage =
          error?.error?.message ||
          'Unable to load approval hierarchy';

        this.hierarchyLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================================
  // OPEN ADD HIERARCHY MODAL
  // ============================================================

  openAddHierarchy(): void {
    this.editingHierarchy = null;
    this.resetHierarchyForm();
    this.clearHierarchyMessages();
    this.showHierarchyModal = true;
  }

  // ============================================================
  // OPEN EDIT HIERARCHY MODAL
  // ============================================================

  openEditHierarchy(hierarchy: HierarchyLevel): void {
    this.editingHierarchy = hierarchy;
    this.clearHierarchyMessages();

    this.hierarchyForm = {
      approval_level: hierarchy.approval_level,
      role: hierarchy.role || ''
    };

    this.showHierarchyModal = true;
  }

  // ============================================================
  // CLOSE HIERARCHY MODAL
  // ============================================================

  closeHierarchyModal(): void {
    if (this.hierarchySaving) {
      return;
    }

    this.showHierarchyModal = false;
    this.editingHierarchy = null;
    this.resetHierarchyForm();
  }

  // ============================================================
  // RESET HIERARCHY FORM
  // ============================================================

  resetHierarchyForm(): void {
    this.hierarchyForm = {
      approval_level: this.hierarchy.length + 1,
      role: ''
    };
  }

  // ============================================================
  // SAVE HIERARCHY LEVEL
  // ============================================================

  saveHierarchy(): void {
    this.clearHierarchyMessages();

    const level = Number(this.hierarchyForm.approval_level);
    const role = this.hierarchyForm.role.trim().toUpperCase();

    if (!Number.isInteger(level) || level <= 0) {
      this.hierarchyErrorMessage =
        'Approval level must be a positive number';
      return;
    }

    if (!role) {
      this.hierarchyErrorMessage = 'Role is required';
      return;
    }

    if (role === 'EMPLOYEE') {
      this.hierarchyErrorMessage =
        'EMPLOYEE cannot be an approval position';
      return;
    }

    this.hierarchySaving = true;

    if (!this.editingHierarchy) {
      this.adminService.addHierarchyLevel({
        approval_level: level,
        role
      }).subscribe({
        next: () => {
          this.hierarchySaving = false;
          this.hierarchySuccessMessage =
            'Approval hierarchy level added successfully';
          this.showHierarchyModal = false;
          this.resetHierarchyForm();
          this.loadHierarchy();
        },
        error: (error) => {
          console.error('Add hierarchy level error:', error);
          this.hierarchySaving = false;
          this.hierarchyErrorMessage =
            error?.error?.message ||
            'Unable to add approval hierarchy level';
        }
      });

      return;
    }

    this.adminService.updateHierarchyLevel(
      this.editingHierarchy.id,
      {
        approval_level: level,
        role
      }
    ).subscribe({
      next: () => {
        this.hierarchySaving = false;
        this.hierarchySuccessMessage =
          'Approval hierarchy level updated successfully';
        this.showHierarchyModal = false;
        this.editingHierarchy = null;
        this.resetHierarchyForm();
        this.loadHierarchy();
      },
      error: (error) => {
        console.error('Update hierarchy level error:', error);
        this.hierarchySaving = false;
        this.hierarchyErrorMessage =
          error?.error?.message ||
          'Unable to update approval hierarchy level';
      }
    });
  }

  // ============================================================
  // DELETE HIERARCHY LEVEL
  // ============================================================

  deleteHierarchy(hierarchy: HierarchyLevel): void {
    const confirmed = confirm(
      `Are you sure you want to delete this approval level?\n\n` +
      `Level: ${hierarchy.approval_level}\n` +
      `Role: ${hierarchy.role}\n\n` +
      `This will remove this position from the approval workflow.`
    );

    if (!confirmed) {
      return;
    }

    this.clearHierarchyMessages();

    this.adminService.deleteHierarchyLevel(hierarchy.id).subscribe({
      next: () => {
        this.hierarchySuccessMessage =
          'Approval hierarchy level deleted successfully';
        this.loadHierarchy();
      },
      error: (error) => {
        console.error('Delete hierarchy level error:', error);
        this.hierarchyErrorMessage =
          error?.error?.message ||
          'Unable to delete approval hierarchy level';
      }
    });
  }

  // ============================================================
  // CLEAR HIERARCHY MESSAGES
  // ============================================================

  clearHierarchyMessages(): void {
    this.hierarchyErrorMessage = '';
    this.hierarchySuccessMessage = '';
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter(user => user.is_active).length;
  }

  get inactiveUsers(): number {
    return this.users.filter(user => !user.is_active).length;
  }

  get totalHierarchyLevels(): number {
    return this.hierarchy.length;
  }

  // ============================================================
  // CLEAR USER MESSAGES
  // ============================================================

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ============================================================
  // TRACK BY USER ID
  // ============================================================

  trackByUserId(index: number, user: AdminUser): number {
    return user.id;
  }

  // ============================================================
  // TRACK BY HIERARCHY ID
  // ============================================================

  trackByHierarchyId(index: number, hierarchy: HierarchyLevel): number {
    return hierarchy.id;
  }
}
