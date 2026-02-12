# 🏗️ Procurement System - Project Structure

สร้างโดย หมี 🐻 | 2026-02-11

---

## 📁 Pages Structure (ตาม Flow 12 หน้า)

```
src/pages/
├── Dashboard.tsx                    # 1. หน้าแรก - แสดงภาพรวม
│
├── PurchaseRequest/
│   ├── PRList.tsx                   # รายการ PR ทั้งหมด
│   ├── PRProject.tsx                # 2. สร้าง PR - โครงการ
│   ├── PRSubcontractor.tsx          # 3. สร้าง PR - ย่อย
│   ├── PROther.tsx                  # 4. สร้าง PR - อื่นๆ
│   ├── PRApproval.tsx               # 5. อนุมัติ PR
│   ├── PREdit.tsx                   # 6. แก้ไข PR ที่ถูกตีกลับ
│   └── PRDetail.tsx                 # รายละเอียด PR
│
├── Vendor/
│   ├── VendorList.tsx               # 7. รายชื่อผู้ขาย
│   ├── VendorNew.tsx                # 8. เพิ่มผู้ขายใหม่
│   └── VendorEdit.tsx               # แก้ไขผู้ขาย
│
├── PurchaseOrder/
│   ├── POList.tsx                   # รายการ PO
│   ├── POCreate.tsx                 # 9. สร้าง PO จาก PR
│   ├── POApproval.tsx               # 10. อนุมัติ PO
│   ├── POEdit.tsx                   # 11. แก้ไข PO ที่ถูกตีกลับ
│   └── PODetail.tsx                 # รายละเอียด PO
│
├── Reports/
│   ├── BudgetReport.tsx             # 12. สรุปการใช้จ่ายรายโครงการ
│   └── ExpenseReport.tsx            # รายงานอื่นๆ
│
└── Auth/
    └── Login.tsx                    # หน้า Login
```

---

## 🎨 Design System (จาก Screenshots)

### สีธีม:
- **Primary Blue**: `#2563EB` (ปุ่มหลัก)
- **Dark Background**: `#1F2937` (sidebar, cards)
- **Orange**: `#FB923C` (ปุ่ม Reject, Warning)
- **Green**: `#10B981` (ปุ่ม Approve, Success)
- **Purple**: `#8B5CF6` (tags, badges)
- **Yellow/Gold**: `#FBBF24` (status pending)
- **Red**: `#EF4444` (rejected status)

### ฟอนต์:
- **Primary**: "Inter" (sans-serif)
- **Thai**: "Sarabun" / "Prompt" (fallback)
- **Headings**: Semi-bold (600)
- **Body**: Regular (400)

### Components:
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

### PR Flow:
1. **Create PR** (Project/Sub/Other)
2. **Submit** → Status: "รออนุมัติ"
3. **Approval** → Approve/Reject
   - If Approve → Can create PO
   - If Reject → Edit + Resubmit
4. **Create PO** from approved PR

### PO Flow:
1. **Create PO** (from approved PR)
2. **Submit** → Status: "รออนุมัติ"
3. **Approval** → Approve/Reject
   - If Approve → Send to vendor
   - If Reject → Edit + Resubmit

---

## 🗃️ Data Models (PocketBase)

### Collections:

#### 1. users
- id
- email
- name
- role (enum: admin, manager, user)
- avatar

#### 2. projects
- id
- name
- code
- budget
- used_budget
- status
- location

#### 3. purchase_requests (PR)
- id
- pr_number
- type (enum: project, sub, other)
- project_id (relation)
- vendor_id (relation)
- requester_id (relation)
- status (enum: draft, pending, approved, rejected)
- items (json array)
- total_amount
- attachments (file)
- created_at
- approved_by
- approved_at
- rejection_reason

#### 4. purchase_orders (PO)
- id
- po_number
- pr_id (relation)
- vendor_id (relation)
- items (json array)
- total_amount
- discount
- vat
- grand_total
- terms_conditions
- status
- created_at
- approved_by
- approved_at

#### 5. vendors
- id
- name
- code
- contact_person
- email
- phone
- address
- tax_id

#### 6. items
- id
- pr_id / po_id
- name
- description
- unit
- quantity
- unit_price
- total_price

---

## 🚀 Implementation Plan

### Phase 1: Setup (1 วัน)
- [x] Project structure
- [ ] Design tokens (colors, fonts)
- [ ] Base components

### Phase 2: Pages (3-4 วัน)
- [ ] Dashboard
- [ ] PR Pages (2-6)
- [ ] Vendor Pages (7-8)
- [ ] PO Pages (9-11)
- [ ] Reports (12)

### Phase 3: Integration (2 วัน)
- [ ] PocketBase setup
- [ ] API hooks
- [ ] Form validation
- [ ] File upload

### Phase 4: Polish (1 วัน)
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Testing

**Total: ~7-8 วัน**

---

ให้หมีเริ่มทำเลยไหมคะพี่เจมส์? 🐻
