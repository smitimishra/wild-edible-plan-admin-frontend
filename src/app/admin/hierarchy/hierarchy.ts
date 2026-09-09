import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';


export interface HierarchyLevel {

  id: number;

  approval_level: number;

  role: string;

  created_at?: string;

  updated_at?: string;

}


@Component({
  selector: 'app-hierarchy',

  imports: [FormsModule],

  templateUrl: './hierarchy.html'
})
export class Hierarchy implements OnInit {


  // ============================================================
  // HIERARCHY DATA
  // ============================================================

  hierarchy: HierarchyLevel[] = [];


  // ============================================================
  // LOADING / ERROR
  // ============================================================

  loading = false;

  errorMessage = '';


  // ============================================================
  // ADD / EDIT MODAL
  // ============================================================

  showHierarchyModal = false;

  editingHierarchy: HierarchyLevel | null = null;

  hierarchySaving = false;

  hierarchyErrorMessage = '';

  hierarchySuccessMessage = '';


  // ============================================================
  // MODAL FORM
  // ============================================================

  hierarchyForm = {
    approval_level: 1,
    role: ''
  };



  constructor(
    private adminService: AdminService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}



  // ============================================================
  // INITIALIZE
  // ============================================================

  ngOnInit(): void {

    // Keep Hierarchy Management visually in sync with the Admin Panel
    // theme. The Admin Panel stores the selected theme in localStorage.
    this.applyStoredTheme();

    this.loadHierarchy();

  }

  /**
   * Apply the same theme selected in the Admin Panel.
   * No separate theme selector is added to Hierarchy Management.
   */
  private applyStoredTheme(): void {
    const theme = localStorage.getItem('admin-theme') || 'default';

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      return;
    }

    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      return;
    }

    // System Default
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent): void {
    if (event.key === 'admin-theme') {
      this.applyStoredTheme();
      this.cdr.detectChanges();
    }
  }



  // ============================================================
  // LOAD HIERARCHY
  // ============================================================

  loadHierarchy(): void {

    this.loading = true;

    this.errorMessage = '';


    this.adminService.getHierarchy().subscribe({

      next: (response: any) => {

        console.log(
          'Approval hierarchy:',
          response
        );


        this.hierarchy =
          response.hierarchy || [];


        this.hierarchy.sort(
          (a, b) =>
            a.approval_level -
            b.approval_level
        );


        this.loading = false;


        this.cdr.detectChanges();

      },


      error: (error: any) => {

        console.error(
          'Failed to load approval hierarchy:',
          error
        );


        this.loading = false;


        this.errorMessage =
          error.error?.message ||
          'Failed to load approval hierarchy.';


        this.cdr.detectChanges();

      }

    });

  }



  // ============================================================
  // BACK TO ADMIN
  // ============================================================

  goBack(): void {

    this.router.navigate([
      '/admin'
    ]);

  }



  // ============================================================
  // OPEN ADD MODAL
  // ============================================================

  openAddHierarchy(): void {

    this.editingHierarchy = null;

    this.resetHierarchyForm();

    this.clearHierarchyMessages();

    this.showHierarchyModal = true;

  }



  // ============================================================
  // OPEN EDIT MODAL
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
  // CLOSE MODAL
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
  // RESET FORM
  // ============================================================

  resetHierarchyForm(): void {

    this.hierarchyForm = {

      approval_level:
        this.hierarchy.length + 1,

      role: ''

    };

  }



  // ============================================================
  // SAVE (ADD OR UPDATE) LEVEL
  // ============================================================

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



  // DELETE LEVEL

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



  // ============================================================
  // CLEAR MODAL MESSAGES
  // ============================================================

  clearHierarchyMessages(): void {

    this.hierarchyErrorMessage = '';

    this.hierarchySuccessMessage = '';

  }

}