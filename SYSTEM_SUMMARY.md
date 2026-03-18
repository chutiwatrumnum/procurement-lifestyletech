# ระบบจัดซื้อจัดจ้าง (Procurement Management System) - Lifestyletech

## 📋 ภาพรวมระบบ (System Overview)

ระบบจัดซื้อจัดจ้างนี้เป็น Web Application สำหรับบริหารจัดการกระบวนการจัดซื้อจัดจ้างภายในองค์กร พัฒนาด้วย React 19 + TypeScript + Vite และใช้ PocketBase เป็น Backend รองรับการทำงานบน Firebase Hosting

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| หมวด | เทคโนโลยี |
|------|-----------|
| Frontend | React 19, TypeScript, Vite |
| UI Components | Radix UI, Tailwind CSS |
| State/Fetching | React Query (TanStack Query) |
| Routing | React Router DOM v7 |
| Backend | PocketBase (SQLite built-in) |
| Deployment | Firebase Hosting |

---

## 👥 ระบบผู้ใช้และสิทธิ์ (User & RBAC)

### บทบาทผู้ใช้ (User Roles)

- **superadmin** - ผู้ดูแลระบบสูงสุด
- **head_of_dept** - หัวหน้าแผนก
- **manager** - ผู้จัดการ
- **employee** - พนักงานทั่วไป

### ฟังก์ชัน RBAC

- `hasRole()` - ตรวจสอบบทบาท
- `canApprovePR()` - อนุมัติ PR ได้ (superadmin, head_of_dept, manager)
- `canManageUsers()` - จัดการผู้ใช้ได้ (superadmin, manager)
- `canViewAllPR()` - ดู PR ทั้งหมดได้ (superadmin, head_of_dept, manager)

---

## 📦 โมดูลหลักของระบบ

### 1. ระบบโครงการ (Project Management)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| ProjectList | `/projects` | รายการโครงการทั้งหมด |
| ProjectNew | `/projects/new` | สร้างโครงการใหม่ |
| ProjectDetail | `/projects/:id` | รายละเอียดโครงการ |
| ProjectEdit | `/projects/edit/:id` | แก้ไขโครงการ |
| ProjectStock | `/projects/stock` | คลังสินค้าตามโครงการ |

### 2. ระบบใบขอซื้อ (Purchase Request - PR)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| PRProject | `/purchase-requests/new/project` | ใบขอซื้อสำหรับโครงการ |
| PRSubcontractor | `/purchase-requests/new/sub` | ใบขอซื้อย่อย/ช่างย่อย |
| PROther | `/purchase-requests/new/other` | ใบขอซื้อประเภทอื่นๆ |
| PRApproval | `/purchase-requests/approval` | อนุมัติใบขอซื้อ |
| PROtherApproval | `/purchase-requests/approval-other` | อนุมัติ PR อื่นๆ |
| PREdit | `/purchase-requests/edit/:id` | แก้ไขใบขอซื้อที่ถูกตีกลับ |
| PRDetail | `/purchase-requests/:id` | รายละเอียดใบขอซื้อ |
| PRPrintPO | `/purchase-requests/:id/print-po` | พิมพ์ PO |

### 3. ระบบใบสั่งซื้อ (Purchase Order - PO)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| POCreate | `/purchase-orders/new` | สร้างใบสั่งซื้อจาก PR ที่อนุมัติแล้ว |
| POApproval | `/purchase-orders/approval` | อนุมัติใบสั่งซื้อ |
| POEdit | `/purchase-orders/edit/:id` | แก้ไขใบสั่งซื้อที่ถูกตีกลับ |

### 4. ระบบผู้ขาย (Vendor Management)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| VendorListNew | `/vendors` | รายชื่อผู้ขาย |
| VendorNew | `/vendors/new` | เพิ่มผู้ขายใหม่ |
| VendorEdit | `/vendors/edit/:id` | แก้ไขผู้ขาย |
| VendorDetail | `/vendors/:id` | รายละเอียดผู้ขาย |

### 5. ระบบแคตาล็อกสินค้า (Product Catalog)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| ProductCatalog | `/products` | รายการสินค้า/บริการ |
| ProductSearchInput | Component | ค้นหาสินค้า |
| ProductImportModal | Component | นำเข้าสินค้าจาก CSV |

### 6. ระบบรายงาน (Reports)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| BudgetReport | `/reports` | สรุปการใช้จ่ายรายโครงการ |

### 7. ระบบผู้ใช้และแผนก (Admin)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| Users | `/admin/users` | จัดการผู้ใช้ |
| Departments | `/admin/departments` | จัดการแผนก |

### 8. ระบบตั้งค่า (Settings)

| หน้า | Route | รายละเอียด |
|------|-------|------------|
| Profile | `/settings/profile` | โปรไฟล์ผู้ใช้ |
| CompanySettings | `/settings/company` | ตั้งค่าบริษัท |

---

## 🔄 กระบวนการทำงาน (Workflow)

### PR Flow (Purchase Request)

```
[สร้าง PR]
      │
      ▼
[รออนุมัติ] ────▶ [แก้ไข + Resubmit] ◀── ถูก Reject
      │
      ▼
[ผ่านอนุมัติ] ──▶ [สร้าง PO]
```

### PO Flow (Purchase Order)

```
[สร้าง PO จาก PR]
      │
      ▼
[รออนุมัติ] ────▶ [แก้ไข + Resubmit] ◀── ถูก Reject
      │
      ▼
[ผ่านอนุมัติ] ──▶ [ส่งให้ผู้ขาย]
```

### สถานะเอกสาร (Document Status)

| เอกสาร | สถานะ |
|--------|-------|
| PR | `draft` → `pending` → `approved` / `rejected` → `converted` |
| PO | `draft` → `pending` → `approved` → `sent` → `confirmed` → `completed` |

### ลำดับการอนุมัติ PR

1. **ระดับหัวหน้าแผนก (Head of Dept)** - อนุมัติเอกสาร PR
2. **ระดับผู้จัดการ (Manager)** - อนุมัติขั้นสุดท้าย

---

## 🗃️ โครงสร้างข้อมูล (Data Models)

### 1. Users (ผู้ใช้)

```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'head_of_dept' | 'manager' | 'employee';
  department?: string;
  departmentName?: string;
  manager?: string;
  managerName?: string;
  isActive: boolean;
  phone?: string;
  position?: string;
  avatar?: string;
}
```

### 2. Vendors (ผู้ขาย)

```typescript
{
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
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
}
```

### 3. Products (สินค้า/บริการ)

```typescript
{
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
  unit_price?: number;
  category: string;
  unit: string;
  description?: string;
  specifications?: string;
  preferredVendors?: string[];
  minStock?: number;
  currentStock?: number;
  lastPrice?: number;
  status: 'active' | 'inactive';
}
```

### 4. Purchase Requests (PR)

```typescript
{
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
}
```

### PRItem (รายการใน PR)

```typescript
{
  id: string;
  product: string;
  productName: string;
  productCode?: string;
  description?: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  currency: string;
  preferredVendor?: string;
  requiredDate?: string;
  notes?: string;
}
```

### 5. Purchase Orders (PO)

```typescript
{
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
  exchangeRate?: number;
  paymentTerms: number;
  deliveryTerms?: string;
  incoterms?: string;
  shippingAddress: string;
  billingAddress: string;
  notes?: string;
  attachments?: string[];
  approver?: string;
  approvalDate?: string;
}
```

### 6. Budget (งบประมาณ)

```typescript
{
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
}
```

### 7. Projects (โครงการ)

```typescript
{
  id: string;
  code: string;
  name: string;
  description?: string;
  client?: string;
  startDate: string;
  endDate?: string;
  budget: number;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  manager: string;
  members?: string[];
}
```

---

## 🔌 API Services

### projectService

| Method | Description |
|--------|-------------|
| `getAll()` | ดึงโครงการทั้งหมด |
| `getById(id)` | ดึงโครงการตาม ID |
| `create(data)` | สร้างโครงการใหม่ |

### vendorService

| Method | Description |
|--------|-------------|
| `getAll()` | ดึงผู้ขายทั้งหมด |
| `getById(id)` | ดึงผู้ขายตาม ID |
| `create(data)` | สร้างผู้ขายใหม่ |
| `createMany(dataArray)` | สร้างหลายรายการพร้อมกัน |
| `update(id, data)` | อัปเดตผู้ขาย |
| `delete(id)` | ลบผู้ขาย |

### prService

| Method | Description |
|--------|-------------|
| `getAll(filter, options)` | ดึง PR ทั้งหมด |
| `getById(id)` | ดึง PR ตาม ID |
| `getProjectTotalSpent(projectId)` | คำนวณงบประมาณที่ใช้ไป |
| `create(data, items)` | สร้าง PR พร้อมรายการ |
| `updateStatus(id, status, reason)` | อัปเดตสถานะ |
| `approveSub(id, userId, comment)` | อนุมัติ PR ย่อย |
| `delete(id)` | ลบ PR |

### poService

| Method | Description |
|--------|-------------|
| `generatePONumber()` | สร้างเลขที่ PO อัตโนมัติ |
| `getAll()` | ดึง PO ทั้งหมด |
| `getByPR(prId)` | ดึง PO ตาม PR |
| `createFromPR(prId, data)` | สร้าง PO จาก PR |

---

## 📁 โครงสร้างโปรเจกต์

```
procurement-lifestyletech/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                 # Main app with routing
│   ├── App.css                 # Global styles
│   ├── index.css               # Tailwind imports
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Layout.tsx      # Main layout (sidebar + content)
│   │   │
│   │   └── ui/                 # Shadcn/UI components
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── radio-group.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sonner.tsx      # Toast notifications
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       └── textarea.tsx
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication context
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useDashboard.ts
│   │   ├── useProjects.ts
│   │   ├── usePurchaseOrders.ts
│   │   ├── usePurchaseRequests.ts
│   │   ├── useUsers.ts
│   │   ├── useVendors.ts
│   │   └── useProductCatalog.ts
│   │
│   ├── lib/
│   │   ├── pocketbase.ts        # PocketBase client
│   │   ├── utils.ts             # Utility functions (cn, format)
│   │   ├── validation.ts        # Validation functions
│   │   └── vendorImportUtils.ts # Vendor import utilities
│   │
│   ├── pages/                   # Page components
│   │   ├── Dashboard.tsx        # 1. Dashboard - หน้าแรก
│   │   ├── Login.tsx            # Login page
│   │   ├── PurchaseRequestList.tsx  # List view (shared)
│   │   ├── PurchaseOrderList.tsx    # List view (shared)
│   │   │
│   │   ├── Admin/
│   │   │   ├── Users.tsx        # User management
│   │   │   └── Departments.tsx  # Department management
│   │   │
│   │   ├── Inventory/
│   │   │   └── (reserved for inventory)
│   │   │
│   │   ├── Project/
│   │   │   ├── ProjectList.tsx      # รายการโครงการ
│   │   │   ├── ProjectNew.tsx       # สร้างโครงการใหม่
│   │   │   ├── ProjectDetail.tsx    # รายละเอียดโครงการ
│   │   │   ├── ProjectEdit.tsx      # แก้ไขโครงการ
│   │   │   └── ProjectStock.tsx     # คลังสินค้าโครงการ
│   │   │
│   │   ├── PurchaseRequest/
│   │   │   ├── PRProject.tsx        # 2. PR - โครงการ
│   │   │   ├── PRSubcontractor.tsx  # 3. PR - ย่อย/ช่างย่อย
│   │   │   ├── PROther.tsx         # 4. PR - อื่นๆ
│   │   │   ├── PRApproval.tsx       # 5. อนุมัติ PR
│   │   │   ├── PROtherApproval.tsx # อนุมัติ PR อื่นๆ
│   │   │   ├── PREdit.tsx          # 6. แก้ไข PR ที่ถูกตีกลับ
│   │   │   ├── PRDetail.tsx        # รายละเอียด PR
│   │   │   └── PRPrintPO.tsx       # พิมพ์ PO
│   │   │
│   │   ├── PurchaseOrder/
│   │   │   ├── POCreate.tsx         # 9. สร้าง PO จาก PR
│   │   │   ├── POApproval.tsx       # 10. อนุมัติ PO
│   │   │   └── POEdit.tsx          # 11. แก้ไข PO ที่ถูกตีกลับ
│   │   │
│   │   ├── Reports/
│   │   │   └── BudgetReport.tsx     # 12. สรุปการใช้จ่ายรายโครงการ
│   │   │
│   │   ├── Settings/
│   │   │   ├── Profile.tsx          # โปรไฟล์ผู้ใช้
│   │   │   └── CompanySettings.tsx  # ตั้งค่าบริษัท
│   │   │
│   │   └── Vendor/
│   │       ├── VendorListNew.tsx    # 7. รายชื่อผู้ขาย
│   │       ├── VendorNew.tsx        # 8. เพิ่มผู้ขายใหม่
│   │       ├── VendorEdit.tsx       # แก้ไขผู้ขาย
│   │       └── VendorDetail.tsx     # รายละเอียดผู้ขาย
│   │
│   ├── services/
│   │   ├── api.ts                  # API service layer
│   │   └── notification.ts         # Notification service
│   │
│   └── types/
│       └── index.ts               # TypeScript interfaces
│
├── pocketbase/
│   ├── pocketbase                  # PocketBase binary
│   ├── pb_data/                    # Database files (SQLite)
│   │   ├── data.db                 # Main database
│   │   ├── auxiliary.db            # Auxiliary database
│   │   └── types.d.ts              # TypeScript types
│
├── .env                            # Environment variables
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies
└── README.md                       # Project readme
```

---

## 🚀 Route Map (เส้นทางทั้งหมด)

| # | Route | หน้า | รายละเอียด |
|---|-------|------|-------------|
| 1 | `/` | Dashboard | หน้าแรก - สถิติและภาพรวม |
| 2 | `/projects` | ProjectList | รายการโครงการ |
| 3 | `/projects/new` | ProjectNew | สร้างโครงการใหม่ |
| 4 | `/projects/:id` | ProjectDetail | รายละเอียดโครงการ |
| 5 | `/projects/stock` | ProjectStock | คลังสินค้าตามโครงการ |
| 6 | `/purchase-requests/new/project` | PRProject | สร้าง PR - โครงการ |
| 7 | `/purchase-requests/new/sub` | PRSubcontractor | สร้าง PR - ย่อย |
| 8 | `/purchase-requests/new/other` | PROther | สร้าง PR - อื่นๆ |
| 9 | `/purchase-requests/approval` | PRApproval | อนุมัติ PR |
| 10 | `/purchase-requests/edit/:id` | PREdit | แก้ไข PR ที่ถูกตีกลับ |
| 11 | `/purchase-orders/new` | POCreate | สร้าง PO จาก PR |
| 12 | `/purchase-orders/approval` | POApproval | อนุมัติ PO |
| 13 | `/vendors` | VendorListNew | รายชื่อผู้ขาย |
| 14 | `/vendors/new` | VendorNew | เพิ่มผู้ขายใหม่ |
| 15 | `/vendors/edit/:id` | VendorEdit | แก้ไขผู้ขาย |
| 16 | `/vendors/:id` | VendorDetail | รายละเอียดผู้ขาย |
| 17 | `/reports` | BudgetReport | รายงานสรุปการใช้จ่าย |
| 18 | `/admin/users` | Users | จัดการผู้ใช้ |
| 19 | `/admin/departments` | Departments | จัดการแผนก |
| 20 | `/settings/profile` | Profile | โปรไฟล์ผู้ใช้ |
| 21 | `/settings/company` | CompanySettings | ตั้งค่าบริษัท |
| 22 | `/products` | ProductCatalog | แคตาล็อกสินค้า |
| 23 | `/login` | Login | หน้าเข้าสู่ระบบ |

---

## 🎨 Design System

### สีธีม (Theme Colors)

| สี | Hex | การใช้งาน |
|---|-----|----------|
| Primary Blue | `#2563EB` | ปุ่มหลัก, Links |
| Dark Background | `#1F2937` | Sidebar, Cards |
| Orange | `#FB923C` | Reject, Warning |
| Green | `#10B981` | Approve, Success |
| Purple | `#8B5CF6` | Tags, Badges |
| Yellow/Gold | `#FBBF24` | Pending status |
| Red | `#EF4444` | Rejected status |

### ฟอนต์ (Typography)

| หมวด | ฟอนต์ | น้ำหนัก |
|------|-------|--------|
| Primary | Inter | 400, 500, 600 |
| Thai | Sarabun / Prompt | 400, 500, 600 |
| Headings | Semi-bold | 600 |
| Body | Regular | 400 |

---

## 📊 Dashboard Features

- สถิติภาพรวม (PR, PO, Vendor)
- รายการรออนุมัติ
- Recent activities

---

## 🚀 การเริ่มต้นใช้งาน (Getting Started)

### Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

### PocketBase Setup

```bash
cd pocketbase
./pocketbase serve
```

Access admin panel at: `http://127.0.0.1:8090/_/`

---

## ✅ สรุป

ระบบจัดซื้อจัดจ้างนี้ครอบคลุมกระบวนการจัดซื้อจัดจ้างทั้งหมดตั้งแต่:

1. **การสร้างโครงการและบริหารงบประมาณ**
   - สร้าง/แก้ไขโครงการ
   - ติดตามงบประมาณ
   - ดูคลังสินค้าตามโครงการ

2. **การสร้างใบขอซื้อ (PR) หลายประเภท**
   - PR โครงการ
   - PR ย่อย/ช่างย่อย
   - PR อื่นๆ

3. **การอนุมัติใบขอซื้อตามลำดับชั้น**
   - อนุมัติ/Reject พร้อมเหตุผล
   - บันทึกประวัติการอนุมัติ

4. **การสร้างใบสั่งซื้อ (PO) จาก PR ที่อนุมัติแล้ว**
   - สร้าง PO อัตโนมัติ
   - ติดตามสถานะ

5. **การบริหารจัดการผู้ขายและสินค้า**
   - รายชื่อผู้ขาย
   - เพิ่ม/แก้ไขผู้ขาย
   - แคตาล็อกสินค้า
   - นำเข้าข้อมูลจาก CSV

6. **การออกรายงานสรุปการใช้จ่าย**
   - สรุปการใช้จ่ายรายโครงการ
   - การใช้งบประมาณ

### คุณสมบัติพิเศษ

- ✅ Role-Based Access Control (RBAC)
- ✅ Multi-level Approval Workflow
- ✅ Real-time Budget Tracking
- ✅ Product Import from CSV
- ✅ Vendor Management
- ✅ Document History & Audit Trail
- ✅ Responsive Design
- ✅ Toast Notifications (Sonner)

---

**สร้างด้วย ❤️ โดย หมี 🐻**
**อัปเดตล่าสุด**: 2026-03-18
