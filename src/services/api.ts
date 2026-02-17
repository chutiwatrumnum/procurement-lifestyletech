import pb from '@/lib/pocketbase';

export const projectService = {
  async getAll() {
    // ลบ sort: '-created' ออกเพื่อป้องกัน Error ถ้าฟิลด์ไม่มีอยู่จริง
    return await pb.collection('projects').getFullList();
  },
  async getById(id: string) {
    return await pb.collection('projects').getOne(id);
  },
  async create(data: any) {
    return await pb.collection('projects').create(data);
  }
};

export const vendorService = {
  async getAll() {
    return await pb.collection('vendors').getFullList();
  },
  async getById(id: string) {
    return await pb.collection('vendors').getOne(id);
  },
  async create(data: any) {
    return await pb.collection('vendors').create(data);
  }
};

export const prService = {
  async getAll(filter = '') {
    return await pb.collection('purchase_requests').getFullList({
      filter,
      expand: 'project,vendor,requester',
      sort: '-created'
    });
  },
  async getById(id: string) {
    return await pb.collection('purchase_requests').getOne(id, {
      expand: 'project,vendor,requester'
    });
  },
  async getProjectTotalSpent(projectId: string) {
    // Get all approved/pending PRs for this project to calculate total spent
    const result = await pb.collection('purchase_requests').getList(1, 100, {
      filter: `project = "${projectId}" && (status = "approved" || status = "pending")`,
      fields: 'total_amount'
    });
    return result.items.reduce((sum, pr) => sum + (pr.total_amount || 0), 0);
  },
  async getItems(prId: string) {
    return await pb.collection('pr_items').getFullList({
      filter: `pr = "${prId}"`,
      expand: 'pr'
    });
  },
  async getHistory(prId: string) {
    return await pb.collection('pr_history').getFullList({
      filter: `pr = "${prId}"`,
      expand: 'by',
      sort: '-created'
    });
  },
  async create(data: any, items: any[]) {
    const pr = await pb.collection('purchase_requests').create(data);
    for (const item of items) {
      await pb.collection('pr_items').create({ ...item, pr: pr.id });
    }
    // Add history entry
    await pb.collection('pr_history').create({
      pr: pr.id,
      action: 'สร้าง PR',
      by: data.requester,
      details: `สร้างใบขอซื้อ ${pr.pr_number}`
    });
    return pr;
  },
  async updateStatus(id: string, status: string, reason = '', userId?: string, oldAttachments?: string[]) {
    const pr = await pb.collection('purchase_requests').update(id, { status, rejection_reason: reason });
    // Add history entry
    const action = status === 'approved' ? 'อนุมัติ' : status === 'rejected' ? 'ตีกลับ' : 'อัปเดตสถานะ';
    await pb.collection('pr_history').create({
      pr: id,
      action: action,
      by: userId || '',
      details: reason || `${action}ใบขอซื้อ ${pr.pr_number}`,
      old_attachments: oldAttachments || []
    });
    return pr;
  }
};

export const poService = {
  async getAll() {
    return await pb.collection('purchase_orders').getFullList({
      expand: 'pr'
    });
  },
  async createFromPR(prId: string, data: any) {
    return await pb.collection('purchase_orders').create({ ...data, pr: prId });
  }
};
