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
  // USERS
  // ============================================================

  users: AdminUser[] = [];

  filteredUsers: AdminUser[] = [];


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
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}


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

    /*
     * ==========================================================
     * JWT FROM URL
     * ==========================================================
     *
     * Expected URL:
     *
     * /admin?token=YOUR_JWT_TOKEN
     *
     * If the token exists in the URL, save it to localStorage.
     *
     * If the URL does not contain a token, we fall back to the
     * existing token in localStorage.
     */

    this.route.queryParamMap.subscribe(params => {

      const urlToken =
        params.get('token');


      // --------------------------------------------------------
      // TOKEN FOUND IN URL
      // --------------------------------------------------------

      if (urlToken) {

        console.log(
          'JWT token received from URL'
        );


        this.authService.saveToken(
          urlToken
        );

      }


      // --------------------------------------------------------
      // CHECK WHETHER WE HAVE A TOKEN
      // --------------------------------------------------------

      const token =
        this.authService.getToken();


      if (!token || this.authService.isTokenExpired(token)) {

        console.error(
          'No valid authentication token found.'
        );

        this.authService.logout();

        this.router.navigate([
          '/login'
        ]);

        return;

      }


      console.log(
        'Admin authentication token is available'
      );


      // --------------------------------------------------------
      // START SESSION POLLING
      // Redirects to login portal if session is invalidated
      // --------------------------------------------------------

      this.authService.startSessionPolling();


      // --------------------------------------------------------
      // LOAD ADMIN DATA
      // --------------------------------------------------------

      this.loadUsers();

      this.loadHierarchy();

    });

  }


  // ============================================================
  // LOAD USERS
  // ============================================================

  loadUsers(): void {

    this.loading = true;

    this.errorMessage = '';


    this.adminService
      .getUsers()
      .subscribe({

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


  // ============================================================
  // SEARCH
  // ============================================================

  applySearch(): void {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();


    if (!term) {

      this.filteredUsers =
        [...this.users];

      return;

    }


    this.filteredUsers =
      this.users.filter((user) => {

        return (

          user.name
            ?.toLowerCase()
            .includes(term)

          ||

          user.email
            ?.toLowerCase()
            .includes(term)

          ||

          user.employee_code
            ?.toLowerCase()
            .includes(term)

          ||

          user.role
            ?.toLowerCase()
            .includes(term)

          ||

          user.approval_position
            ?.toLowerCase()
            .includes(term)

        );

      });

  }


  // ============================================================
  // SEARCH INPUT
  // ============================================================

  onSearch(): void {

    this.applySearch();

  }


  // ============================================================
  // OPEN CREATE USER MODAL
  // ============================================================

  openCreateUser(): void {

    this.editingUser = null;

    this.resetForm();

    this.clearMessages();

    this.showUserModal = true;

  }


  // ============================================================
  // OPEN EDIT USER MODAL
  // ============================================================

  openEditUser(
    user: AdminUser
  ): void {

    this.editingUser =
      user;


    this.clearMessages();


    this.userForm = {

      employee_code:
        user.employee_code || '',

      name:
        user.name || '',

      email:
        user.email || '',

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

    const role =
      this.userForm.role.trim();


    if (
      !role ||
      role.toUpperCase() === 'EMPLOYEE'
    ) {

      return null;

    }


    return role.toUpperCase();

  }


  // ============================================================
  // CREATE / UPDATE USER
  // ============================================================

  saveUser(): void {

    this.clearMessages();


    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (

      !this.userForm.employee_code.trim() ||

      !this.userForm.name.trim() ||

      !this.userForm.email.trim() ||

      !this.userForm.role.trim()

    ) {

      this.errorMessage =
        'Please fill in all required fields';

      return;

    }


    this.saving = true;


    const role =
      this.userForm.role
        .trim()
        .toUpperCase();


    const approvalPosition =
      role === 'EMPLOYEE'
        ? null
        : role;


    // ----------------------------------------------------------
    // CREATE USER
    // ----------------------------------------------------------

    if (!this.editingUser) {

      this.adminService
        .createUser({

          employee_code:
            this.userForm.employee_code.trim(),

          name:
            this.userForm.name.trim(),

          email:
            this.userForm.email.trim(),

          role:
            role,

          approval_position:
            approvalPosition

        })
        .subscribe({

          next: (response) => {

            this.saving = false;


            this.successMessage =
              'User created successfully';


            this.showUserModal = false;


            this.resetForm();


            this.loadUsers();


            // --------------------------------------------------
            // TEMPORARY PASSWORD
            // --------------------------------------------------

            if (
              response.temporaryPassword
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


    // ----------------------------------------------------------
    // UPDATE USER
    // ----------------------------------------------------------

    this.adminService
      .updateUser(

        this.editingUser.id,

        {

          employee_code:
            this.userForm.employee_code.trim(),

          name:
            this.userForm.name.trim(),

          email:
            this.userForm.email.trim(),

          role:
            role,

          approval_position:
            approvalPosition

        }

      )
      .subscribe({

        next: () => {

          this.saving = false;


          this.successMessage =
            'User updated successfully';


          this.showUserModal = false;


          this.editingUser = null;


          this.resetForm();


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
      user.role?.toUpperCase() === 'ADMIN'
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
  // PERMANENTLY DELETE USER
  // ============================================================

  deleteUser(
    user: AdminUser
  ): void {

    // ----------------------------------------------------------
    // NEVER DELETE ADMIN
    // ----------------------------------------------------------

    if (
      user.role?.toUpperCase() === 'ADMIN'
    ) {

      this.errorMessage =
        'The ADMIN account cannot be permanently deleted';

      return;

    }


    // ----------------------------------------------------------
    // CONFIRMATION
    // ----------------------------------------------------------

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


    // ----------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------

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


    this.authService.logout('http://192.168.29.51:64959/');

  }


  // ============================================================
  // GO TO HIERARCHY PAGE
  // ============================================================

  goToHierarchy(): void {

    const token =
      this.authService.getToken();


    if (!token) {

      console.error(
        'Cannot open hierarchy: JWT token is missing'
      );


      this.router.navigate([
        '/login'
      ]);

      return;

    }


    this.router.navigate(
      ['/admin/hierarchy'],
      {
        queryParams: {
          token: token
        }
      }
    );

  }


  // ============================================================
  // SCROLL TO HIERARCHY
  // ============================================================

  scrollToHierarchy(): void {

    const element =
      document.getElementById(
        'hierarchy-section'
      );


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


    this.adminService
      .getHierarchy()
      .subscribe({

        next: (response) => {

          this.hierarchy =
            (response.hierarchy || [])
              .sort(
                (
                  a,
                  b
                ) =>
                  a.approval_level -
                  b.approval_level
              );


          this.hierarchyLoading = false;


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Failed to load approval hierarchy:',
            error
          );


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

      approval_level:
        this.hierarchy.length + 1,

      role: ''

    };

  }


  // ============================================================
  // SAVE HIERARCHY LEVEL
  // ============================================================

  saveHierarchy(): void {

    this.clearHierarchyMessages();


    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

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


    // ----------------------------------------------------------
    // ADD HIERARCHY LEVEL
    // ----------------------------------------------------------

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

          }

        });


      return;

    }


    // ----------------------------------------------------------
    // UPDATE HIERARCHY LEVEL
    // ----------------------------------------------------------

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

        }

      });

  }


  // ============================================================
  // DELETE HIERARCHY LEVEL
  // ============================================================

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

        },


        error: (error) => {

          console.error(
            'Delete hierarchy level error:',
            error
          );


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

    return this.users.filter(
      user => user.is_active
    ).length;

  }


  get inactiveUsers(): number {

    return this.users.filter(
      user => !user.is_active
    ).length;

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

  trackByUserId(
    index: number,
    user: AdminUser
  ): number {

    return user.id;

  }


  // ============================================================
  // TRACK BY HIERARCHY ID
  // ============================================================

  trackByHierarchyId(
    index: number,
    hierarchy: HierarchyLevel
  ): number {

    return hierarchy.id;

  }

}