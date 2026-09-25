import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import {
  AdminService,
  AdminUser,
  BlockedUser,
} from '../../services/admin.service';

type ActiveTab = 'users' | 'blocked';

interface UserFormData {
  name:         string;
  email:        string;
  phone_number: string;
  role:         string;
}

@Component({
  selector:    'app-admin-users',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl:    './users.css',
})
export class UsersComponent implements OnInit {
  // ── Tab ──────────────────────────────────────────────────
  activeTab: ActiveTab = 'users';

  // ── Search ───────────────────────────────────────────────
  searchQuery   = '';
  blockedSearch = '';

  // ── Users list ───────────────────────────────────────────
  users        : AdminUser[]    = [];
  blockedUsers : BlockedUser[]  = [];
  loading       = false;
  blockedLoading= false;
  errorMsg      = '';
  successMsg    = '';

  // ── Add / Edit modal ─────────────────────────────────────
  showModal      = false;
  editMode       = false;
  editUserId     : number | null = null;
  modalSubmitting= false;
  modalError     = '';
  form: UserFormData = { name: '', email: '', phone_number: '', role: '' };

  // ── Delete confirm ───────────────────────────────────────
  showDeleteModal = false;
  deleteTarget    : AdminUser | null = null;
  deleteLoading   = false;

  // ── Deactivate / Reactivate confirm ──────────────────────
  showStatusModal  = false;
  statusTarget     : AdminUser | null = null;
  statusLoading    = false;

  // ── Unblock confirm ──────────────────────────────────────
  showUnblockModal = false;
  unblockTarget    : BlockedUser | null = null;
  unblockLoading   = false;

  // ── Temp-password toast ──────────────────────────────────
  tempPassword     = '';
  showTempPass     = false;

  readonly roles = ['ADMIN', 'EMPLOYEE', 'REVIEWER'];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // ── Tab switch ───────────────────────────────────────────
  switchTab(tab: ActiveTab): void {
    this.activeTab = tab;
    if (tab === 'blocked' && this.blockedUsers.length === 0) {
      this.loadBlockedUsers();
    }
  }

  // ── Load users ───────────────────────────────────────────
  loadUsers(): void {
    this.loading = true;
    this.errorMsg = '';
    this.adminService.getUsers().subscribe({
      next: res => {
        this.users   = res.users;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load users. Please try again.';
        this.loading  = false;
      },
    });
  }

  loadBlockedUsers(): void {
    this.blockedLoading = true;
    this.adminService.getBlockedUsers().subscribe({
      next: res => {
        this.blockedUsers   = res.blocked_users;
        this.blockedLoading = false;
      },
      error: () => {
        this.blockedLoading = false;
      },
    });
  }

  // ── Filtered lists ───────────────────────────────────────
  get activeUserCount(): number   { return this.users.filter(u => u.is_active).length; }
  get inactiveUserCount(): number { return this.users.filter(u => !u.is_active).length; }

  get filteredUsers(): AdminUser[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      u.name.toLowerCase().includes(q)       ||
      u.email.toLowerCase().includes(q)      ||
      u.role.toLowerCase().includes(q)       ||
      u.employee_code.toLowerCase().includes(q)
    );
  }

  get filteredBlocked(): BlockedUser[] {
    const q = this.blockedSearch.trim().toLowerCase();
    if (!q) return this.blockedUsers;
    return this.blockedUsers.filter(b =>
      b.user_name.toLowerCase().includes(q)  ||
      b.email_id.toLowerCase().includes(q)
    );
  }

  // ── Role helpers ─────────────────────────────────────────
  roleColor(role: string): string {
    const map: Record<string, string> = {
      ADMIN:    '#7c3aed',
      EMPLOYEE: '#1d4ed8',
      REVIEWER: '#0369a1',
    };
    return map[role?.toUpperCase()] ?? '#475569';
  }

  roleBg(role: string): string {
    const map: Record<string, string> = {
      ADMIN:    '#f5f3ff',
      EMPLOYEE: '#eff6ff',
      REVIEWER: '#e0f2fe',
    };
    return map[role?.toUpperCase()] ?? '#f8fafc';
  }

  // ── Add user ─────────────────────────────────────────────
  openAddModal(): void {
    this.editMode   = false;
    this.editUserId = null;
    this.form       = { name: '', email: '', phone_number: '', role: '' };
    this.modalError = '';
    this.showModal  = true;
  }

  // ── Edit user ────────────────────────────────────────────
  openEditModal(u: AdminUser): void {
    this.editMode   = true;
    this.editUserId = u.id;
    this.form = {
      name:         u.name,
      email:        u.email,
      phone_number: u.phone_number ?? '',
      role:         u.role,
    };
    this.modalError = '';
    this.showModal  = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  submitModal(): void {
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.role) {
      this.modalError = 'Name, email and role are required.';
      return;
    }
    this.modalError     = '';
    this.modalSubmitting= true;

    if (this.editMode && this.editUserId !== null) {
      this.adminService.updateUser(this.editUserId, this.form).subscribe({
        next: res => {
          const idx = this.users.findIndex(u => u.id === this.editUserId);
          if (idx !== -1) this.users[idx] = res.user;
          this.modalSubmitting = false;
          this.showModal       = false;
          this.showSuccess('User updated successfully.');
        },
        error: err => {
          this.modalError      = err?.error?.message ?? 'Failed to update user.';
          this.modalSubmitting = false;
        },
      });
    } else {
      this.adminService.createUser(this.form).subscribe({
        next: res => {
          this.users.push(res.user);
          this.modalSubmitting = false;
          this.showModal       = false;
          this.tempPassword    = res.temporaryPassword;
          this.showTempPass    = true;
          this.showSuccess('User created successfully.');
        },
        error: err => {
          this.modalError      = err?.error?.message ?? 'Failed to create user.';
          this.modalSubmitting = false;
        },
      });
    }
  }

  closeTempPass(): void {
    this.showTempPass = false;
    this.tempPassword = '';
  }

  // ── Delete ───────────────────────────────────────────────
  openDeleteModal(u: AdminUser): void {
    this.deleteTarget    = u;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget    = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;
    this.adminService.deleteUser(this.deleteTarget.id).subscribe({
      next: () => {
        this.users         = this.users.filter(u => u.id !== this.deleteTarget!.id);
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.deleteTarget  = null;
        this.showSuccess('User deleted successfully.');
      },
      error: err => {
        this.deleteLoading   = false;
        this.showDeleteModal = false;
        this.showError(err?.error?.message ?? 'Failed to delete user.');
      },
    });
  }

  // ── Deactivate / Reactivate ──────────────────────────────
  openStatusModal(u: AdminUser): void {
    this.statusTarget    = u;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.statusTarget    = null;
  }

  confirmStatusToggle(): void {
    if (!this.statusTarget) return;
    this.statusLoading = true;
    const call = this.statusTarget.is_active
      ? this.adminService.deactivateUser(this.statusTarget.id)
      : this.adminService.reactivateUser(this.statusTarget.id);

    call.subscribe({
      next: res => {
        const idx = this.users.findIndex(u => u.id === this.statusTarget!.id);
        if (idx !== -1) this.users[idx] = res.user;
        this.statusLoading   = false;
        this.showStatusModal = false;
        const msg = res.user.is_active ? 'User reactivated.' : 'User deactivated.';
        this.showSuccess(msg);
        this.statusTarget = null;
      },
      error: err => {
        this.statusLoading   = false;
        this.showStatusModal = false;
        this.showError(err?.error?.message ?? 'Failed to update user status.');
      },
    });
  }

  // ── Unblock ──────────────────────────────────────────────
  openUnblockModal(b: BlockedUser): void {
    this.unblockTarget    = b;
    this.showUnblockModal = true;
  }

  closeUnblockModal(): void {
    this.showUnblockModal = false;
    this.unblockTarget    = null;
  }

  confirmUnblock(): void {
    if (!this.unblockTarget) return;
    this.unblockLoading = true;
    this.adminService.unblockUser(this.unblockTarget.user_id).subscribe({
      next: () => {
        this.blockedUsers     = this.blockedUsers.filter(b => b.user_id !== this.unblockTarget!.user_id);
        this.unblockLoading   = false;
        this.showUnblockModal = false;
        this.unblockTarget    = null;
        this.showSuccess('User unblocked successfully.');
      },
      error: err => {
        this.unblockLoading   = false;
        this.showUnblockModal = false;
        this.showError(err?.error?.message ?? 'Failed to unblock user.');
      },
    });
  }

  // ── Toast helpers ─────────────────────────────────────────
  private msgTimer: ReturnType<typeof setTimeout> | null = null;

  showSuccess(msg: string): void {
    this.successMsg = msg;
    this.errorMsg   = '';
    this.clearMsgAfter();
  }

  showError(msg: string): void {
    this.errorMsg   = msg;
    this.successMsg = '';
    this.clearMsgAfter();
  }

  private clearMsgAfter(): void {
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => {
      this.successMsg = '';
      this.errorMsg   = '';
    }, 5000);
  }

  // ── Misc helpers ─────────────────────────────────────────
  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  avatarColor(name: string): string {
    const colors = [
      '#6366f1','#8b5cf6','#ec4899','#f59e0b',
      '#10b981','#0ea5e9','#ef4444','#14b8a6',
    ];
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(hash) % colors.length];
  }

  trackById(_: number, u: AdminUser): number  { return u.id; }
  trackByUid(_: number, b: BlockedUser): number { return b.user_id; }
}
