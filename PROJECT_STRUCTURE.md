# 🏗️ Procurement System - Project Structure

**สร้างโดย** หมี 🐻  
**อัปเดตล่าสุด** 2026-02-27

---

## 📁 Project Overview

ระบบจัดซื้อจัดจ้าง (Procurement Management System) สำหรับ Lifestyletech เป็น Web Application ที่ใช้ React + TypeScript + PocketBase

### Tech Stack

| หมวด | เทคโนโลยี |
|------|-----------|
| Frontend | React 19, TypeScript, Vite |
| UI Components | Radix UI, Tailwind CSS |
| State/Fetching | React Query (TanStack Query) |
| Routing | React Router DOM v7 |
| Backend | PocketBase |
| Database | SQLite (PocketBase built-in) |
| Deployment | Firebase Hosting |

### Dependencies

```json
{
  "@radix-ui/react-*": "Radix UI primitives",
  "@tanstack/react-query": "^5.90.20",
  "pocketbase": "^0.26.8",
  "react-router-dom": "^7.13.0",
  "sonner": "^2.0.7",
  "tailwindcss": "^4.1.18"
}
```

---

## 📂 Directory Structure

```
procurement-lifestyletech/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Main app with routing
│   ├── App.css                  # Global styles
│   ├── index.css                # Tailwind imports
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Layout.tsx       # Main layout (sidebar + content)
│   │   │
│   │   └── ui/                  # Shadcn/UI components
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
│   │       ├── sonner.tsx       # Toast notifications
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
│   │   └── useVendors.ts
│   │
│   ├── lib/
│   │   ├── pocketbase.ts        # PocketBase client
│   │   └── utils.ts             # Utility functions (cn, format)
│   │
│   ├── pages/                   # Page components
│   │   ├── Dashboard.tsx        # 1. Dashboard - หน้าแรก
│   │   ├── Login.tsx            # Login page
│   │   ├── PurchaseRequestList.tsx  # List view (shared)
│   │   ├── PurchaseOrderList.tsx    # List view (shared)
│   │   │
│   │   ├── Admin/
│   │   │   └── Users.tsx        # User management
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
│   │   │   ├── PREdit.tsx          # 6. แก้ไข PR ที่ถูกตีกลับ
│   │   │   └── PRDetail.tsx        # รายละเอียด PR
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
│   │   │   └── Profile.tsx          # โปรไฟล์ผู้ใช้
│   │   │
│   │   └── Vendor/
│   │       ├── VendorListNew.tsx    # 7. รายชื่อผู้ขาย
│   │       ├── VendorNew.tsx        # 8. เพิ่มผู้ขายใหม่
│   │       └── VendorEdit.tsx       # แก้ไขผู้ขาย
│   │
│   ├── services/
│   │   ├── api.ts                  # API service layer
│   │   └── notification.ts         # Notification service
│   │
│   └── types/
│       └── index.ts               # TypeScript interfaces
│
├── public/
│   └── vite.svg
│
├── pocketbase/
│   ├── pocketbase                  # PocketBase binary (embedded backend)
│   ├── pb_data/                    # Database files (SQLite)
│   │   ├── data.db                 # Main database
│   │   ├── auxiliary.db            # Auxiliary database
│   │   └── types.d.ts              # TypeScript types
│   ├── CHANGELOG.md                # PocketBase changelog
│   └── LICENSE.md                  # PocketBase license
│
├── .env                            # Environment variables
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
├── tailwind.config.js              # Tailwind config
├── package.json                    # Dependencies
└── README.md                       # Project readme
```

---

## 🛤️ Route Map (12 ขั้นตอน)

| # | Route | Page | Description |
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

### Additional Routes

| Route | Page | Description |
|-------|------|-------------|
| `/vendors` | VendorListNew | รายชื่อผู้ขาย |
| `/vendors/new` | VendorNew | เพิ่มผู้ขายใหม่ |
| `/vendors/edit/:id` | VendorEdit | แก้ไขผู้ขาย |
| `/reports` | BudgetReport | รายงานสรุปการใช้จ่าย |
| `/admin/users` | Users | จัดการผู้ใช้ |
| `/settings/profile` | Profile | โปรไฟล์ผู้ใช้ |
| `/login` | Login | หน้าเข้าสู่ระบบ |

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

### Components ที่ใช้

- ✅ Cards with rounded corners (8px)
- ✅ Subtle shadows
- ✅ Blue gradient buttons
- ✅ Status badges (colored)
- ✅ Tables with hover effects
- ✅ Modal dialogs
- ✅ Form inputs with icons
- ✅ File upload areas
- ✅ Progress bars

---

## 🔄 Workflow

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

### Status States

| Document | Status |
|----------|--------|
| PR | `draft` → `pending` → `approved` / `rejected` → `converted` |
| PO | `draft` → `pending` → `approved` → `sent` → `confirmed` → `completed` |

---

## 🗃️ Data Models (PocketBase)

### Collections Structure

#### 1. users
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

#### 2. vendors
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
  paymentTerms: number;
  rating: number;
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
}
```

#### 3. purchase_requests (PR)
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

#### 4. purchase_orders (PO)
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

---

## 📦 Key Features

### 1. Dashboard
- สถิติภาพรวม (PR, PO, Vendor)
- รายการรออนุมัติ
- Recent activities

### 2. Project Management
- สร้าง/แก้ไขโครงการ
- ติดตามงบประมาณ
- ดูคลังสินค้าตามโครงการ

### 3. Purchase Request (PR)
- PR โครงการ
- PR ย่อย/ช่างย่อย
- PR อื่นๆ
- อนุมัติ/Reject พร้อมเหตุผล

### 4. Purchase Order (PO)
- สร้าง PO จาก PR ที่อนุมัติแล้ว
- อนุมัติ/Reject พร้อมเหตุผล
- ติดตามสถานะ

### 5. Vendor Management
- รายชื่อผู้ขาย
- เพิ่ม/แก้ไขผู้ขาย
- ประเมินผู้ขาย

### 6. Reports
- สรุปการใช้จ่ายรายโครงการ
- การใช้งบประมาณ

---

## 🚀 Getting Started

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

## 📝 Notes

- ใช้ React Query สำหรับ data fetching และ caching
- ใช้ PocketBase built-in auth สำหรับ authentication
- UI Components ใช้ Radix UI + Tailwind CSS
- รองรับ Responsive Design
- รองรับ Dark Mode (via next-themes)

---

สร้างด้วย ❤️ โดย หมี 🐻
