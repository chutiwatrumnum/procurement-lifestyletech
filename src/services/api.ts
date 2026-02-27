import pb from '@/lib/pocketbase';

export const projectService = {
  async getAll() {
    // ลบ sort: '-created' ออกเพื่อป้องกัน Error ถ้าฟิลด์ไม่มีอยู่จริง
    return await pb.collection('projects').getFullList() as any[];
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
  },
  async update(id: string, data: any) {
    return await pb.collection('vendors').update(id, data);
  },
  async delete(id: string) {
    return await pb.collection('vendors').delete(id);
  }
};

export const prService = {
  async getAll(filter = '', options: { expand?: string } = {}) {
    // รวม expand ที่ส่งมากับ default
    const defaultExpand = ['project', 'vendor'];
    const customExpand = options.expand ? options.expand.split(',') : [];
    const allExpand = [...new Set([...defaultExpand, ...customExpand])].join(',');

    // ดึง PRs โดยระบุ fields ที่ต้องการเอง (รวม expand fields)
    const result = await pb.collection('purchase_requests').getList(1, 100, {
      filter,
      expand: allExpand,
      sort: '-created',
      fields: 'id,pr_number,type,po_ref,delivery_location,status,total_amount,attachments,project,vendor,requester,requester_name,rejection_reason,approved_by,approved_at,approval_level,head_of_dept_approved_by,head_of_dept_approved_at,head_of_dept_comment,manager_approved_by,manager_approved_at,head_of_dept_signature,manager_signature,head_of_dept_approved_by_name,manager_approved_by_name,manager_comment,created,updated,expand.project,expand.vendor'
    });

    const prs = result.items;

    // เก็บ requester IDs ที่ unique
    const requesterIds = [...new Set(prs.map(pr => pr.requester).filter(Boolean))];

    // ดึงข้อมูล users ที่เป็น requester
    const userMap: Record<string, any> = {};

    if (requesterIds.length > 0) {
      try {
        // วิธีที่ 1: ใช้ข้อมูลจาก authStore ถ้าตรงกับ requester
        const currentUser = pb.authStore.record || pb.authStore.model;
        if (currentUser && requesterIds.includes(currentUser.id)) {
          userMap[currentUser.id] = currentUser;
        }

        // วิธีที่ 2: ดึงข้อมูล users ทั้งหมดที่อนุญาตให้ list ได้
        const idsFilter = requesterIds
          .filter(id => !userMap[id])
          .map(id => `id = "${id}"`)
          .join(' || ');

        if (idsFilter) {
          try {
            const usersResult = await pb.collection('users').getFullList({
              filter: idsFilter,
              fields: 'id,name,email,username'
            });

            usersResult.forEach(user => {
              userMap[user.id] = user;
            });
          } catch (listErr) {
            console.log('List users not allowed, trying individual fetch...');

            for (const userId of requesterIds.filter(id => !userMap[id])) {
              try {
                const user = await pb.collection('users').getOne(userId);
                userMap[userId] = user;
              } catch (e) {
                userMap[userId] = null;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error fetching users:', e);
      }
    }

    // แนบข้อมูล requester เข้าไปในแต่ละ PR
    return prs.map(pr => ({
      ...pr,
      requester_name: pr.requester_name,
      expand: {
        ...pr.expand,
        requester: userMap[pr.requester] || null
      }
    })) as any[];
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
    // Generate PR number with format: PR{X}-YYYY-MM-{monthly_sequence}
    // PRP = Project, PRS = Subcontractor, PRO = Other
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Determine prefix based on type
    const typePrefix = data.type === 'project' ? 'PRP' : data.type === 'sub' ? 'PRS' : 'PRO';
    const datePrefix = `${typePrefix}-${year}-${month}`;

    let prNumber: string;

    try {
      // Count how many PRs of this type were created this month
      const monthPRs = await pb.collection('purchase_requests').getFullList({
        filter: `pr_number ~ "${datePrefix}-"`,
        fields: 'pr_number',
        sort: '-created'
      });

      // Find the highest sequence number for this month
      let maxSequence = 0;
      for (const pr of monthPRs) {
        const match = pr.pr_number?.match(new RegExp(`${datePrefix}-(\\d+)`));
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSequence && seq < 10000) {
            maxSequence = seq;
          }
        }
      }

      const monthlySequence = maxSequence + 1;
      // Pad with zeros to make it 4 digits (e.g., 0001, 0042, 0150)
      prNumber = `${datePrefix}-${String(monthlySequence).padStart(4, '0')}`;
    } catch (err) {
      // Fallback: use timestamp-based number
      console.error('Error counting PRs, using fallback:', err);
      const timestamp = Date.now().toString().slice(-4);
      prNumber = `${datePrefix}-${timestamp}`;
    }

    // Get requester name from authStore if not provided
    const currentUser = pb.authStore.record || pb.authStore.model;
    const requesterName = data.requester_name || currentUser?.name || currentUser?.email || '';

    // Create PR with generated number and requester_name
    const pr = await pb.collection('purchase_requests').create({
      ...data,
      pr_number: prNumber,
      requester_name: requesterName
    });

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
  },
  async approveSub(id: string, userId?: string, comment?: string) {
    try {
      // 1. ดึง PR ก่อน
      const pr = await pb.collection('purchase_requests').getOne(id);

      if (!pr.project) {
        throw new Error('PR นี้ไม่มีข้อมูลโครงการ');
      }

      // 2. อนุมัติ PR
      await pb.collection('purchase_requests').update(id, { status: 'approved' });

      // 3. ดึง items ของ PR พร้อม expand project_item
      let prItems: any[] = [];
      try {
        prItems = await pb.collection('pr_items').getFullList({
          filter: `pr = "${id}"`,
          expand: 'project_item'
        });
      } catch (e) {
        console.log('No PR items found');
      }

      console.log('PR Items found:', prItems.length);

      // 4. ตัด stock จาก project_items โดยใช้ ID (เฉพาะ item_type = 'regular')
      let updatedCount = 0;
      let notFoundItems: string[] = [];
      let reserveItems: string[] = [];

      for (const item of prItems) {
        // ข้ามรายการสำรอง (reserve) ไม่ต้องตัด stock
        if (item.item_type === 'reserve') {
          reserveItems.push(item.name || 'ไม่มีชื่อ');
          console.log(`Skipping reserve item: ${item.name}`);
          continue;
        }

        // ใช้ project_item ID จาก relation
        const projectItemId = item.project_item || (item.expand?.project_item?.id);

        if (projectItemId) {
          // มี ID → อัปเดตโดยตรง
          try {
            const projItem = await pb.collection('project_items').getOne(projectItemId);
            const currentQty = projItem.quantity || 0;
            const deductQty = item.quantity || 0;
            const newQuantity = Math.max(0, currentQty - deductQty);

            await pb.collection('project_items').update(projectItemId, {
              quantity: newQuantity
            });
            updatedCount++;
            console.log(`Updated ${projItem.name}: ${currentQty} -> ${newQuantity}`);
          } catch (e: any) {
            console.error('Error updating by ID:', projectItemId, e.message);
            notFoundItems.push(item.name || 'ไม่มีชื่อ');
          }
        } else {
          // ไม่มี ID → fallback หาด้วยชื่อ (backward compatibility)
          console.log('No project_item ID, falling back to name search:', item.name);

          try {
            const itemName = (item.name || '').replace(/"/g, '\\"').trim();
            if (!itemName) continue;

            const projectItems = await pb.collection('project_items').getFullList({
              filter: `project = "${pr.project}" && name = "${itemName}"`
            });

            if (projectItems.length === 0) {
              notFoundItems.push(item.name);
              continue;
            }

            for (const projItem of projectItems) {
              const currentQty = projItem.quantity || 0;
              const deductQty = item.quantity || 0;
              const newQuantity = Math.max(0, currentQty - deductQty);

              await pb.collection('project_items').update(projItem.id, {
                quantity: newQuantity
              });
              updatedCount++;
            }
          } catch (e: any) {
            console.error('Error updating by name:', item.name, e.message);
            notFoundItems.push(item.name);
          }
        }
      }

      // 5. เพิ่ม history
      let details = `อนุมัติใบขอซื้อย่อย ${pr.pr_number}`;
      if (updatedCount > 0) {
        details += ` (อัปเดต ${updatedCount} รายการ)`;
      }
      if (reserveItems.length > 0) {
        details += ` [สำรอง: ${reserveItems.length} รายการ]`;
      }
      if (notFoundItems.length > 0) {
        details += ` [ไม่พบ: ${notFoundItems.join(', ')}]`;
      }

      await pb.collection('pr_history').create({
        pr: id,
        action: 'อนุมัติใบขอซื้อย่อย',
        by: userId || '',
        details: comment || details
      });

      // 6. หักลบจากงบประมาณโครงการ (หลังอนุมัติสมบูรณ์)
      if (pr.project && pr.total_amount) {
        try {
          const project = await pb.collection('projects').getOne(pr.project);
          const currentBudget = project.budget || 0;
          const prAmount = pr.total_amount || 0;

          // หักลบจากงบประมาณ
          await pb.collection('projects').update(pr.project, {
            budget: Math.max(0, currentBudget - prAmount)
          });

          console.log(`Budget deducted: ${prAmount} from project ${project.code || project.name}`);
        } catch (budgetErr) {
          console.error('Budget deduction failed:', budgetErr);
          // ไม่สำเร็จก็ยังอนุมัติได้
        }
      }

      return {
        ...pr,
        status: 'approved',
        _meta: {
          updatedCount,
          notFoundItems
        }
      };
    } catch (error: any) {
      console.error('approveSub error:', error);
      throw new Error(error.message || 'อนุมัติไม่สำเร็จ');
    }
  },
  async delete(id: string) {
    return await pb.collection('purchase_requests').delete(id);
  },
  async update(id: string, data: any) {
    return await pb.collection('purchase_requests').update(id, data);
  },
  async deleteItems(prId: string) {
    // ลบ pr_items ทั้งหมดที่เกี่ยวข้องกับ PR นี้
    const items = await pb.collection('pr_items').getFullList({
      filter: `pr = "${prId}"`
    });
    for (const item of items) {
      await pb.collection('pr_items').delete(item.id);
    }
  },
  async createItem(data: any) {
    return await pb.collection('pr_items').create(data);
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
