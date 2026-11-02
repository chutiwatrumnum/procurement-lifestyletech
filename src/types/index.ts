// Types for Procurement System

// User & Auth
export type UserRole = 'superadmin' | 'head_of_dept' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  departmentName?: string;
  manager?: string;
  managerName?: string;
  isActive: boolean;
  phone?: string;
  position?: string;
  avatar?: string;
  created: string;
  updated: string;
}
