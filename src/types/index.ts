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

// Vendor/Supplier
export interface Vendor {
  id: string;
  code: string;
  name: string;
  nameLocal?: string; // ชื่อภาษาไทย
  type: 'domestic' | 'international';
  country: string;
  currency: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  bankAccount?: string;
  bankName?: string;
  paymentTerms: number; // days
  rating: number;
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  created: string;
  updated: string;
}

// Product/Service Category
export interface Category {
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
  parent?: string;
  description?: string;
  created: string;
  updated: string;
}

// Product/Service Item
export interface Product {
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
  category: string;
  unit: string;
  description?: string;
  specifications?: string;
  preferredVendors?: string[];
  minStock?: number;
  currentStock?: number;
  lastPrice?: number;
  lastPriceCurrency?: string;
  status: 'active' | 'inactive';
  created: string;
  updated: string;
}

// Purchase Request (PR)
export interface PurchaseRequest {
  id: string;
  prNumber: string;
  requestDate: string;
  requester: string;
  department: string;
  type: 'domestic' | 'international';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'converted';
  items: PRItem[];
  totalAmount: number;
  currency: string;
  justification: string;
  attachments?: string[];
  approver?: string;
  approvalDate?: string;
  approvalNotes?: string;
  created: string;
  updated: string;
}

export interface PRItem {
  id: string;
  product: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  currency: string;
  preferredVendor?: string;
  requiredDate?: string;
  notes?: string;
}

// Purchase Order (PO)
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prReference?: string;
  orderDate: string;
  vendor: string;
  vendorName: string;
  type: 'domestic' | 'international';
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'confirmed' | 'partial' | 'completed' | 'cancelled';
  items: POItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  shipping: number;
  totalAmount: number;
  currency: string;
  exchangeRate?: number; // For international
  paymentTerms: number;
  deliveryTerms?: string;
  incoterms?: string; // For international (FOB, CIF, etc.)
  shippingAddress: string;
  billingAddress: string;
  notes?: string;
  attachments?: string[];
  approver?: string;
  approvalDate?: string;
  created: string;
  updated: string;
}

export interface POItem {
  id: string;
  product: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  discount?: number;
  tax?: number;
  totalPrice: number;
  receivedQuantity: number;
  deliveryDate?: string;
  notes?: string;
}

// Goods Receipt
export interface GoodsReceipt {
  id: string;
  grNumber: string;
  poReference: string;
  receiptDate: string;
  receiver: string;
  vendor: string;
  vendorName: string;
  status: 'pending' | 'partial' | 'completed' | 'rejected';
  items: GRItem[];
  notes?: string;
  attachments?: string[];
  created: string;
  updated: string;
}

export interface GRItem {
  id: string;
  poItem: string;
  product: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  quality: 'good' | 'damaged' | 'rejected';
  notes?: string;
}

// Invoice
export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorInvoiceNumber?: string;
  poReference: string;
  grReference?: string;
  vendor: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  status: 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: string;
  exchangeRate?: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  attachments?: string[];
  created: string;
  updated: string;
}

export interface InvoiceItem {
  id: string;
  product: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tax?: number;
  totalPrice: number;
}

// Budget
export interface Budget {
  id: string;
  code: string;
  name: string;
  department: string;
  fiscalYear: number;
  category?: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  notes?: string;
  created: string;
  updated: string;
}

// Approval Workflow
export interface ApprovalStep {
  id: string;
  order: number;
  approver: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  notes?: string;
}

export interface ApprovalWorkflow {
  id: string;
  documentType: 'pr' | 'po' | 'invoice' | 'payment';
  documentId: string;
  documentNumber: string;
  currentStep: number;
  steps: ApprovalStep[];
  status: 'pending' | 'approved' | 'rejected';
  created: string;
  updated: string;
}

// Currency & Exchange Rate
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  created: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalPR: number;
  pendingPR: number;
  totalPO: number;
  pendingPO: number;
  totalVendors: number;
  activeVendors: number;
  pendingApprovals: number;
  overdueInvoices: number;
  monthlySpend: number;
  budgetUsage: number;
}

// Table/List common types
export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}
