import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export type ActiveSection = 'login' | 'admin' | 'reviewer' | 'fieldstaff';

export interface DbColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
}

export interface DbTable {
  name: string;
  icon: string;
  columns: DbColumn[];
}

@Component({
  selector: 'app-flowchart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flowchart.html',
  styleUrls: ['./flowchart.css']
})
export class Flowchart {

  activeSection: ActiveSection = 'login';

  // Which node is highlighted — to light up DB tables
  activeNodeId: string | null = null;

  constructor(private router: Router) {}

  setSection(s: ActiveSection): void {
    this.activeSection = s;
    this.activeNodeId = null;
  }

  highlight(id: string | null): void {
    this.activeNodeId = id;
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }

  // ============================================================
  // DATABASE TABLES
  // ============================================================

  readonly tables: DbTable[] = [
    {
      name: 'users',
      icon: '👤',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'employee_code', type: 'VARCHAR(50)' },
        { name: 'name', type: 'VARCHAR(100)' },
        { name: 'email', type: 'VARCHAR(150)' },
        { name: 'role', type: 'VARCHAR(30)' },
        { name: 'approval_position', type: 'VARCHAR(30)' },
        { name: 'password_hash', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN' },
        { name: 'manager_id', type: 'INT', fk: true },
        { name: 'password_reset_token_hash', type: 'TEXT' },
        { name: 'password_reset_expires_at', type: 'TIMESTAMP' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'user_sessions',
      icon: '🔐',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'user_id', type: 'INT', fk: true },
        { name: 'session_id', type: 'UUID' },
        { name: 'is_active', type: 'BOOLEAN' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'last_activity', type: 'TIMESTAMP' },
        { name: 'expires_at', type: 'TIMESTAMP' },
        { name: 'invalidated_at', type: 'TIMESTAMP' },
        { name: 'invalidation_reason', type: 'VARCHAR(50)' }
      ]
    },
    {
      name: 'approval_workflow_hierarchy',
      icon: '⇅',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'approval_level', type: 'INT' },
        { name: 'role', type: 'VARCHAR(50)' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'approval_requests',
      icon: '📋',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'request_number', type: 'VARCHAR(50)' },
        { name: 'employee_id', type: 'INT', fk: true },
        { name: 'request_type', type: 'VARCHAR(50)' },
        { name: 'request_data', type: 'JSONB' },
        { name: 'status', type: 'VARCHAR(30)' },
        { name: 'current_approval_level', type: 'INT' },
        { name: 'submitted_at', type: 'TIMESTAMP' },
        { name: 'completed_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'request_attachments',
      icon: '📎',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'request_id', type: 'INT', fk: true },
        { name: 'file_name', type: 'VARCHAR(255)' },
        { name: 'file_path', type: 'TEXT' },
        { name: 'mime_type', type: 'VARCHAR(100)' },
        { name: 'file_size', type: 'BIGINT' }
      ]
    },
    {
      name: 'approval_history',
      icon: '📜',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'request_id', type: 'INT', fk: true },
        { name: 'approver_id', type: 'INT', fk: true },
        { name: 'approval_level', type: 'INT' },
        { name: 'action', type: 'VARCHAR(20)' },
        { name: 'comments', type: 'TEXT' },
        { name: 'action_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'plant_details',
      icon: '🌿',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true },
        { name: 'request_id', type: 'INT', fk: true },
        { name: 'plant_name', type: 'VARCHAR(150)' },
        { name: 'common_name', type: 'VARCHAR(150)' },
        { name: 'scientific_name', type: 'VARCHAR(200)' },
        { name: 'description', type: 'TEXT' }
      ]
    }
  ];

  // ============================================================
  // NODE → TABLES MAPPING
  // ============================================================

  readonly nodeTableMap: Record<string, string[]> = {
    // LOGIN FLOW
    'L1': [],
    'L2': [],
    'L3': [],
    'L4': ['users'],
    'L5': [],
    'L6': ['users'],
    'L7': ['users'],
    'L8': [],
    'L9': ['user_sessions'],
    'L10': ['users'],
    'L11': [],
    'L12': ['user_sessions'],
    'L13': ['users'],
    // ADMIN FLOW
    'A1': ['users', 'user_sessions'],
    'A2': ['users'],
    'A3': ['users'],
    'A4': ['approval_workflow_hierarchy'],
    'A5': ['approval_requests', 'request_attachments', 'approval_history'],
    'A6': ['user_sessions'],
    // REVIEWER FLOW
    'R1': ['users', 'user_sessions'],
    'R2': ['approval_requests', 'users'],
    'R3': ['request_attachments'],
    'R4': ['approval_requests', 'approval_history'],
    'R5': ['approval_requests', 'users'],
    'R6': ['approval_requests', 'approval_history', 'plant_details'],
    'R7': ['plant_details'],
    // FIELD STAFF FLOW
    'F1': ['users'],
    'F2': ['users', 'user_sessions'],
    'F3': ['approval_requests', 'request_attachments'],
    'F4': ['approval_requests'],
    'F5': ['approval_requests', 'approval_history'],
    'F6': ['plant_details', 'approval_history'],
  };

  isTableActive(tableName: string): boolean {
    if (!this.activeNodeId) return false;
    return (this.nodeTableMap[this.activeNodeId] ?? []).includes(tableName);
  }

  get activeNodeTables(): string[] {
    if (!this.activeNodeId) return [];
    return this.nodeTableMap[this.activeNodeId] ?? [];
  }
}
