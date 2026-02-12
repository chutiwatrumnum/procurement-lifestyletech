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
      filter
    });
  },
  async getById(id: string) {
    return await pb.collection('purchase_requests').getOne(id);
  },
  async getItems(prId: string) {
    return await pb.collection('pr_items').getFullList({
      filter: `pr_id = "${prId}"`
    });
  },
  async create(data: any, items: any[]) {
    const pr = await pb.collection('purchase_requests').create(data);
    for (const item of items) {
      await pb.collection('pr_items').create({ ...item, pr_id: pr.id });
    }
    return pr;
  },
  async updateStatus(id: string, status: string, reason = '') {
    return await pb.collection('purchase_requests').update(id, { status, rejection_reason: reason });
  }
};

export const poService = {
  async getAll() {
    return await pb.collection('purchase_orders').getFullList();
  },
  async createFromPR(prId: string, data: any) {
    return await pb.collection('purchase_orders').create({ ...data, pr_id: prId });
  }
};
