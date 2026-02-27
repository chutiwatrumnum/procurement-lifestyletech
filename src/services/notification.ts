import pb from '@/lib/pocketbase';

// ส่ง notification ให้ user หลายคน
async function notifyUsers(userIds: string[], data: {
  title: string;
  message: string;
  type: 'approval' | 'rejection' | 'info';
  pr_id?: string;
  pr_number?: string;
}) {
  // Filter เอาแค่ ID ที่ valid
  const validIds = userIds.filter(id => id && id !== '0' && id.length > 5);
  
  for (const userId of validIds) {
    try {
      const notificationData = {
        user: userId,
        title: data.title,
        message: data.message,
        type: data.type,
        pr_id: data.pr_id || '',
        is_read: false
      };
      
      await pb.collection('notifications').create(notificationData);
    } catch (err: any) {
      // Silent fail
    }
  }
}

// ดึงรายชื่อหัวหน้าแผนก (head_of_dept)
async function getHeadOfDepts(): Promise<string[]> {
  try {
    const result = await pb.collection('users').getFullList({
      fields: 'id,role'
    });
    
    const heads = result
      .filter((u: any) => u.role === 'head_of_dept')
      .map((u: any) => u.id);
    
    return heads;
  } catch (e: any) {
    return [];
  }
}

// ดึงรายชื่อผู้จัดการ (manager + superadmin)
async function getManagers(): Promise<string[]> {
  try {
    const result = await pb.collection('users').getFullList({
      fields: 'id,role'
    });
    
    const managers = result
      .filter((u: any) => u.role === 'manager' || u.role === 'superadmin')
      .map((u: any) => u.id);
    
    return managers;
  } catch (e: any) {
    return [];
  }
}

// ดึง project manager ของโครงการ
async function getProjectManager(projectId: string): Promise<string | null> {
  if (!projectId) return null;
  try {
    const project = await pb.collection('projects').getOne(projectId, {
      fields: 'manager'
    });
    return project.manager || null;
  } catch (err) {
    return null;
  }
}

export const notificationService = {
  // ==================== พนักงานสร้าง PR ใหม่ ====================
  // แจ้ง → หัวหน้าแผนก + ผู้จัดการ
  async notifyNewPR(pr: any, requesterId: string) {
    const recipients: string[] = [];

    // 1. แจ้งหัวหน้าแผนก
    const heads = await getHeadOfDepts();
    recipients.push(...heads);

    // 2. แจ้งผู้จัดการ
    const managers = await getManagers();
    recipients.push(...managers);

    // ตัด duplicates และไม่แจ้งตัวเอง
    const uniqueRecipients = recipients.filter(id => id !== requesterId);
    
    console.log('[NOTIFY] Recipients to notify:', uniqueRecipients);
    
    if (uniqueRecipients.length > 0) {
      console.log('[NOTIFY] Sending notification to:', uniqueRecipients.length, 'users, IDs:', uniqueRecipients);
      await notifyUsers(uniqueRecipients, {
        title: 'มี PR ใหม่รออนุมัติ',
        message: `ใบขอซื้อ ${pr.pr_number} ถูกสร้างโดย ${pr.requester_name || 'ไม่ระบุ'} และรอการอนุมัติ`,
        type: 'info',
        pr_id: pr.id,
        pr_number: pr.pr_number
      });
    }
  },

  // ==================== หัวหน้าแผนกอนุมัติ/ตีกลับ PR ====================
  // แจ้ง → หัวหน้าแผนก + ผู้จัดการ + พนักงาน (คนสร้าง)
  async notifyByHeadOfDept(pr: any, approverName: string, isApproval: boolean, requesterId?: string) {
    const recipients: string[] = [];

    // 1. แจ้งหัวหน้าแผนกคนอื่นๆ (ไม่รวมตัวเอง)
    const heads = await getHeadOfDepts();
    recipients.push(...heads);

    // 2. แจ้งผู้จัดการ
    const managers = await getManagers();
    recipients.push(...managers);

    // 3. แจ้งคนสร้าง PR (requester)
    if (requesterId) {
      recipients.push(requesterId);
    }

    // ตัด duplicates
    const uniqueRecipients = [...new Set(recipients)];
    
    if (uniqueRecipients.length > 0) {
      const action = isApproval ? 'อนุมัติ' : 'ตีกลับ';
      await notifyUsers(uniqueRecipients, {
        title: isApproval ? 'PR ถูกอนุมัติแล้ว' : 'PR ถูกตีกลับ',
        message: `ใบขอซื้อ ${pr.pr_number} ถูก${action}โดยหัวหน้าแผนก ${approverName}`,
        type: isApproval ? 'approval' : 'rejection',
        pr_id: pr.id,
        pr_number: pr.pr_number
      });
    }
  },

  // ==================== ผู้จัดการอนุมัติ/ตีกลับ PR ====================
  // แจ้ง → หัวหน้าแผนก + พนักงาน (คนสร้าง)
  async notifyByManager(pr: any, approverName: string, isApproval: boolean, requesterId?: string) {
    const recipients: string[] = [];

    // 1. แจ้งหัวหน้าแผนก
    const heads = await getHeadOfDepts();
    recipients.push(...heads);

    // 2. แจ้งคนสร้าง PR (requester)
    if (requesterId) {
      recipients.push(requesterId);
    }

    // ตัด duplicates
    const uniqueRecipients = [...new Set(recipients)];
    
    if (uniqueRecipients.length > 0) {
      const action = isApproval ? 'อนุมัติ' : 'ตีกลับ';
      await notifyUsers(uniqueRecipients, {
        title: isApproval ? 'PR ถูกอนุมัติแล้ว' : 'PR ถูกตีกลับ',
        message: `ใบขอซื้อ ${pr.pr_number} ถูก${action}โดยผู้จัดการ ${approverName}`,
        type: isApproval ? 'approval' : 'rejection',
        pr_id: pr.id,
        pr_number: pr.pr_number
      });
    }
  },

  // ==================== ดึง notification ของ user ====================
  async getByUser(userId: string, limit: number = 10) {
    try {
      return await pb.collection('notifications').getList(1, limit, {
        filter: `user = "${userId}"`,
        sort: '-created'
      });
    } catch (err) {
      console.error('Get notifications error:', err);
      return { items: [], totalItems: 0 };
    }
  },

  // ==================== อ่าน notification ====================
  async markAsRead(id: string) {
    try {
      await pb.collection('notifications').update(id, { is_read: true });
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  },

  // ==================== อ่านทั้งหมด ====================
  async markAllAsRead(userId: string) {
    try {
      const notifications = await pb.collection('notifications').getFullList({
        filter: `user = "${userId}" && is_read = false`
      });
      for (const n of notifications) {
        await pb.collection('notifications').update(n.id, { is_read: true });
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  },

  // ==================== ลบ notification ====================
  async delete(id: string) {
    try {
      await pb.collection('notifications').delete(id);
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  }
};
