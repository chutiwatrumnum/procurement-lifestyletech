import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Check,
  X,
  FileText,
  ChevronRight,
  Loader2,
  Clock,
  AlertTriangle,
  Building2,
  User,
  DollarSign,
  History,
  ChevronDown,
  ChevronUp,
  Download,
  Paperclip,
  Lock,
  Unlock,
  UserCheck,
  Users,
  PenTool
} from 'lucide-react';
import { prService } from '@/services/api';
import { notificationService } from '@/services/notification';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function POApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [subPRs, setSubPRs] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; percentage: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'approved' | 'rejected' | null }>({ open: false, action: null });

  // เก็บข้อมูลลายเซ็นของผู้อนุมัติ
  const [approverSignatures, setApproverSignatures] = useState<{
    headOfDept: string | null;
    manager: string | null;
  }>({ headOfDept: null, manager: null });

  // ตรวจสอบสิทธิ์การอนุมัติ
  const isHeadOfDept = () => user?.role === 'head_of_dept';
  const isManager = () => user?.role === 'manager';
  const isSuperAdmin = () => user?.role === 'superadmin';

  // ตรวจสอบว่า user สามารถอนุมัติ PR นี้ได้ไหม
  const canApprove = (pr: any) => {
    if (!pr) return false;

    const level = pr.approval_level || 0;

    // Level 0: รอหัวหน้าแผนกอนุมัติ
    if (level === 0) {
      return isHeadOfDept() || isSuperAdmin();
    }

    // Level 1: รอผู้จัดการอนุมัติ
    if (level === 1) {
      return isManager() || isSuperAdmin();
    }

    return false;
  };

  // ดึงข้อความสถานะการอนุมัติ
  const getApprovalStatusText = (pr: any) => {
    const level = pr?.approval_level || 0;

    if (level === 0) {
      return { text: 'รอหัวหน้าแผนกอนุมัติ', color: 'bg-yellow-100 text-yellow-700', icon: UserCheck };
    }
    if (level === 1) {
      return { text: 'รอผู้จัดการอนุมัติ', color: 'bg-blue-100 text-blue-700', icon: Users };
    }
    return { text: 'อนุมัติครบถ้วน', color: 'bg-green-100 text-green-700', icon: Check };
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch ลายเซ็นของผู้อนุมัติเมื่อ selectedItem เปลี่ยน
  useEffect(() => {
    if (selectedItem) {
      fetchApproverSignatures();
    }
  }, [selectedItem]);

  async function fetchApproverSignatures() {
    setApproverSignatures({ headOfDept: null, manager: null });
    
    try {
      // Fetch ลายเซ็นหัวหน้าแผนก
      if (selectedItem.head_of_dept_approved_by) {
        try {
          const headOfDeptUser = await pb.collection('users').getOne(selectedItem.head_of_dept_approved_by);
          if (headOfDeptUser.signature) {
            setApproverSignatures(prev => ({
              ...prev,
              headOfDept: `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${headOfDeptUser.id}/${headOfDeptUser.signature}`
            }));
          }
        } catch (err) {
          console.log('Failed to fetch head_of_dept signature');
        }
      }
      
      // Fetch ลายเซ็นผู้จัดการ
      if (selectedItem.manager_approved_by) {
        try {
          const managerUser = await pb.collection('users').getOne(selectedItem.manager_approved_by);
          if (managerUser.signature) {
            setApproverSignatures(prev => ({
              ...prev,
              manager: `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${managerUser.id}/${managerUser.signature}`
            }));
          }
        } catch (err) {
          console.log('Failed to fetch manager signature');
        }
      }
    } catch (err) {
      console.error('Fetch signatures error:', err);
    }
  }

  async function loadData() {
    try {
      // โหลดเฉพาะ PR Sub ที่รออนุมัติ
      const prData = await prService.getAll('type = "sub" && status = "pending"');
      setSubPRs(prData);

      if (prData.length > 0) {
        handleSelectItem(prData[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectItem(item: any) {
    setSelectedItem(item);
    try {
      const prItems = await prService.getItems(item.id);
      setItems(prItems);

      // Load budget info if project exists
      if (item.expand?.project?.id) {
        const projectBudget = item.expand.project.budget || 0;
        const totalSpent = await prService.getProjectTotalSpent(item.expand.project.id);
        const percentage = projectBudget > 0 ? Math.round((totalSpent / projectBudget) * 100) : 0;
        setBudgetInfo({
          budget: projectBudget,
          spent: totalSpent,
          percentage: Math.min(percentage, 100)
        });
      } else {
        setBudgetInfo(null);
      }

      // Load edit history from pr_history collection
      try {
        const history = await prService.getHistory(item.id);
        
        // Collect all user IDs from history to fetch names
        const userIds = [...new Set(history.map((h: any) => h.by).filter(Boolean))];
        const userMap: Record<string, string> = {};
        
        // Fetch user names
        if (userIds.length > 0) {
          try {
            const users = await pb.collection('users').getFullList({
              filter: userIds.map((id: string) => `id = "${id}"`).join(' || '),
              fields: 'id,name,email'
            });
            users.forEach((u: any) => {
              userMap[u.id] = u.name || u.email || 'ไม่ระบุ';
            });
          } catch (e) {
            console.log('Could not fetch users:', e);
          }
        }

        if (history.length === 0) {
          const createdDate = item.created;
          const requesterName = item.requester_name || item.expand?.requester?.name || item.expand?.requester?.email || 'ไม่ระบุ';
          setEditHistory([
            {
              date: createdDate || new Date().toISOString(),
              action: 'สร้าง PR Sub ครั้งแรก',
              by: requesterName
            },
            {
              date: item.updated || new Date().toISOString(),
              action: 'ส่งอนุมัติ (รอการอนุมัติ)',
              by: requesterName
            }
          ]);
        } else {
          const historyData = history.map((h: any) => ({
            date: h.created,
            action: h.action,
            by: userMap[h.by] || h.expand?.by?.name || h.expand?.by?.email || 'ไม่ระบุ',
            oldAttachments: h.old_attachments || []
          }));

          const hasCreateAction = historyData.some((h: any) => h.action === 'สร้าง PR Sub');
          if (!hasCreateAction) {
            const createdDate = item.created;
            const requesterName = item.requester_name || item.expand?.requester?.name || item.expand?.requester?.email || 'ไม่ระบุ';
            historyData.push({
              date: createdDate || new Date().toISOString(),
              action: 'สร้าง PR Sub',
              by: requesterName,
              oldAttachments: []
            });
          }

          historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEditHistory(historyData);
        }
      } catch (err) {
        const createdDate = item.created;
        const requesterName = item.requester_name || item.expand?.requester?.name || item.expand?.requester?.email || 'ไม่ระบุ';
        setEditHistory([
          {
            date: createdDate || new Date().toISOString(),
            action: 'สร้าง PR Sub ครั้งแรก',
            by: requesterName,
            oldAttachments: []
          },
          {
            date: item.updated || new Date().toISOString(),
            action: 'ส่งอนุมัติ (รอการอนุมัติ)',
            by: requesterName,
            oldAttachments: []
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setEditHistory([]);
      setBudgetInfo(null);
    }
  }

  const handleActionClick = (action: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    setConfirmDialog({ open: true, action });
  };

  const handleConfirmAction = async () => {
    if (!selectedItem || !confirmDialog.action) return;

    // เช็คลายเซ็นก่อนอนุมัติ
    if (confirmDialog.action === 'approved') {
      try {
        const currentUserData = await pb.collection('users').getOne(user?.id || '');
        if (!currentUserData.signature) {
          toast.error('กรุณาอัปโหลดลายเซ็นก่อนอนุมัติ ไปที่ ตั้งค่า > ลายเซ็นดิจิทัล');
          setConfirmDialog({ open: false, action: null });
          return;
        }
      } catch (err: any) {
        console.error('Check signature error:', err);
        if (err.status === 404) {
          toast.error('ไม่พบข้อมูลผู้ใช้ หรือไม่มีสิทธิ์เข้าถึง');
        } else {
          toast.error('ไม่สามารถตรวจสอบลายเซ็นได้');
        }
        return;
      }
    }

    setSubmitting(true);

    try {
      const currentLevel = selectedItem.approval_level || 0;

      if (confirmDialog.action === 'rejected') {
        // ตีกลับ - ยกเลิกการอนุมัติทั้งหมด
        await prService.updateStatus(selectedItem.id, 'rejected', comment, user?.id, selectedItem.attachments);
        
        // ส่ง notification ตาม role
        if (user?.role === 'head_of_dept') {
          await notificationService.notifyByHeadOfDept(selectedItem, user?.name || 'หัวหน้า', false, selectedItem.requester);
        } else if (user?.role === 'manager' || user?.role === 'superadmin') {
          await notificationService.notifyByManager(selectedItem, user?.name || 'ผู้จัดการ', false, selectedItem.requester);
        }
        
        toast.success('ตีกลับเรียบร้อยแล้ว');
      } else {
        // อนุมัติ - Copy ลายเซ็นไฟล์ไปเก็บใน PR (วิธีที่ 1: Duplicate File)
        const currentUserData = await pb.collection('users').getOne(user?.id || '');
        
        if (currentLevel === 0 && (isHeadOfDept() || isSuperAdmin())) {
          // หัวหน้าแผนกอนุมัติ → เปลี่ยนเป็น level 1
          const updateData: any = {
            approval_level: 1,
            head_of_dept_approved_by: user?.id,
            head_of_dept_approved_at: new Date().toISOString(),
            head_of_dept_approved_by_name: user?.name || user?.email,
            head_of_dept_comment: comment || undefined
          };
          
          // ถ้ามีลายเซ็น ให้ copy ไปเก็บใน PR
          if (currentUserData.signature) {
            try {
              // ดึงไฟล์ลายเซ็นมาเป็น blob
              const signatureUrl = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${currentUserData.id}/${currentUserData.signature}`;
              const response = await fetch(signatureUrl);
              const blob = await response.blob();
              
              // สร้าง File ใหม่
              const signatureFile = new File([blob], `signature_${currentUserData.id}_${Date.now()}.png`, { type: blob.type });
              
              // สร้าง FormData และอัพเดต
              const formData = new FormData();
              Object.keys(updateData).forEach(key => {
                formData.append(key, updateData[key]);
              });
              formData.append('head_of_dept_signature', signatureFile);
              
              await pb.collection('purchase_requests').update(selectedItem.id, formData);
            } catch (err) {
              console.error('Failed to copy signature:', err);
              // ถ้า copy ไม่ได้ ให้อัพเดตแบบไม่มีลายเซ็น
              await pb.collection('purchase_requests').update(selectedItem.id, updateData);
            }
          } else {
            await pb.collection('purchase_requests').update(selectedItem.id, updateData);
          }
          
          // ส่ง notification ตาม role (หัวหน้าแผนกอนุมัติ)
          await notificationService.notifyByHeadOfDept(selectedItem, user?.name || 'หัวหน้าแผนก', true, selectedItem.requester);
          
          toast.success('อนุมัติระดับ 1 สำเร็จ (รอผู้จัดการอนุมัติต่อ)');
          
        } else if (currentLevel === 1 && (isManager() || isSuperAdmin())) {
          // ผู้จัดการอนุมัติ → อนุมัติสมบูรณ์ + ตัด stock
          const oldAttachments = selectedItem.attachments;
          
          const updateData: any = {
            manager_approved_by: user?.id,
            manager_approved_at: new Date().toISOString(),
            manager_approved_by_name: user?.name || user?.email,
            manager_comment: comment || undefined
          };
          
          // ถ้ามีลายเซ็น ให้ copy ไปเก็บใน PR
          if (currentUserData.signature) {
            try {
              // ดึงไฟล์ลายเซ็นมาเป็น blob
              const signatureUrl = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${currentUserData.id}/${currentUserData.signature}`;
              const response = await fetch(signatureUrl);
              const blob = await response.blob();
              
              // สร้าง File ใหม่
              const signatureFile = new File([blob], `signature_${currentUserData.id}_${Date.now()}.png`, { type: blob.type });
              
              // สร้าง FormData และอัพเดต
              const formData = new FormData();
              Object.keys(updateData).forEach(key => {
                formData.append(key, updateData[key]);
              });
              formData.append('manager_signature', signatureFile);
              
              // อัพเดต PR ก่อน (รวมลายเซ็น)
              await pb.collection('purchase_requests').update(selectedItem.id, formData);
              
              // แล้วค่อยอนุมัติ + ตัด stock
              await prService.approveSub(selectedItem.id, user?.id, comment);
            } catch (err) {
              console.error('Failed to copy signature:', err);
              // ถ้า copy ไม่ได้ ให้อัพเดตแบบไม่มีลายเซ็น แล้วค่อยอนุมัติ
              await pb.collection('purchase_requests').update(selectedItem.id, updateData);
              await prService.approveSub(selectedItem.id, user?.id, comment);
            }
          } else {
            await pb.collection('purchase_requests').update(selectedItem.id, updateData);
            await prService.approveSub(selectedItem.id, user?.id, comment);
          }
          
          // ส่ง notification ตาม role (ผู้จัดการอนุมัติ)
          await notificationService.notifyByManager(selectedItem, user?.name || 'ผู้จัดการ', true, selectedItem.requester);
          
          toast.success('อนุมัติสมบูรณ์แล้ว (ตัด stock จากโครงการแล้ว)');
        } else {
          toast.error('คุณไม่มีสิทธิ์อนุมัติในระดับนี้');
        }
      }

      setComment('');
      setConfirmDialog({ open: false, action: null });
      await loadData();
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Refresh badge counts in sidebar
      window.dispatchEvent(new CustomEvent('refresh-badge-counts'));
    } catch (err) {
      toast.error('ดำเนินการไม่สำเร็จ');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Get file URL for download
  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>;

  if (subPRs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="p-4 bg-gray-100 rounded-full mb-4"><Check className="h-12 w-12" /></div>
        <h2 className="text-xl font-bold">ไม่มีรายการรออนุมัติ</h2>
        <p>คุณจัดการทุกรายการเรียบร้อยแล้วค่ะ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการรออนุมัติ (PR Sub)</h1>
          <p className="text-sm text-gray-500 mt-1">พบ {subPRs.length} รายการที่ต้องการการตัดสินใจ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - List */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {subPRs.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleSelectItem(pr)}
                  className={`p-5 cursor-pointer hover:bg-[#F9FAFB] transition-all ${
                    selectedItem?.id === pr.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-purple-600">{pr.pr_number}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {pr.created ? new Date(pr.created).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'ไม่ระบุวันที่'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                  <p className="font-bold text-[#1F2937] text-sm mb-3 truncate">{pr.expand?.project?.name || 'รายการทั่วไป'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{pr.requester_name || pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ'}</span>
                    </div>
                    <p className="font-bold text-gray-900">฿{pr.total_amount?.toLocaleString() || 0}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {(() => {
                      const status = getApprovalStatusText(pr);
                      const StatusIcon = status.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.text}
                        </span>
                      );
                    })()}
                    {pr.attachments && pr.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-purple-600">
                        <Paperclip className="w-3 h-3" />
                        <span>{pr.attachments.length} ไฟล์แนบ</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedItem && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">รายละเอียดใบขอซื้อย่อย</p>
                  <CardTitle className="text-2xl font-bold text-[#1F2937]">{selectedItem.pr_number}</CardTitle>
                </div>
                {(() => {
                  const status = getApprovalStatusText(selectedItem);
                  const StatusIcon = status.icon;
                  return (
                    <Badge className={`${status.color} font-bold border-none px-4 py-1.5 rounded-lg`}>
                      <StatusIcon className="w-3.5 h-3.5 mr-2" /> {status.text}
                    </Badge>
                  );
                })()}
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Building2 className="w-3 h-3" /> โครงการ (Project)
                      </h4>
                      <p className="font-bold text-[#1F2937] text-lg">
                        {selectedItem.expand?.project?.code && (
                          <span className="text-purple-600 mr-2">[{selectedItem.expand.project.code}]</span>
                        )}
                        {selectedItem.expand?.project?.name || 'รายการจัดซื้อทั่วไป'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{selectedItem.expand?.project?.location || 'สำนักงานใหญ่'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ยอดเงินรวมสุทธิ</h4>
                    <p className="text-3xl font-black text-purple-600">฿{selectedItem.total_amount?.toLocaleString() || 0}.00</p>
                    <p className="text-xs text-gray-500 mt-2">
                      สร้างโดย: {selectedItem.requester_name || selectedItem.expand?.requester?.name || selectedItem.expand?.requester?.email || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-gray-400">
                      วันที่สร้าง: {selectedItem.created ? new Date(selectedItem.created).toLocaleDateString('th-TH') : '-'}
                    </p>
                  </div>
                </div>

                {/* Budget Status */}
                {budgetInfo && budgetInfo.budget > 0 && (
                  <div className="mb-10 p-6 bg-gray-50 rounded-2xl">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> งบประมาณโครงการ (Budget Status)
                    </h4>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-black text-gray-900">{budgetInfo.percentage}% Used</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Left: {(budgetInfo.budget - budgetInfo.spent).toLocaleString()} THB</p>
                        <p className="text-xs text-gray-400">Budget: {budgetInfo.budget.toLocaleString()} THB</p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetInfo.percentage >= 90 ? 'bg-red-500' :
                          budgetInfo.percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${budgetInfo.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Edit History */}
                {editHistory.length > 0 && (
                  <div className="mb-10 p-6 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" />
                        ประวัติการดำเนินการ
                        <span className="bg-purple-400 text-white px-2 py-0.5 rounded-full text-[10px]">
                          {editHistory.length} รายการ
                        </span>
                      </h4>
                      {editHistory.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryExpanded(!historyExpanded)}
                          className="text-purple-400 hover:text-purple-600 hover:bg-purple-100"
                        >
                          {historyExpanded ? (
                            <><ChevronUp className="w-4 h-4 mr-1" /> ย่อ</>
                          ) : (
                            <><ChevronDown className="w-4 h-4 mr-1" /> ขยาย ({editHistory.length - 3} รายการ)</>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {(historyExpanded ? editHistory : editHistory.slice(0, 3)).map((history, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-purple-100">
                          <div className="flex items-start gap-3 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                              index === 0 ? 'bg-green-500' : 'bg-purple-500'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{history.action}</p>
                              <p className="text-xs text-gray-500">
                                {history.date && !isNaN(new Date(history.date).getTime())
                                  ? new Date(history.date).toLocaleString('th-TH', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'ไม่ระบุวันที่'} โดย {history.by}
                              </p>
                            </div>
                          </div>
                          {history.oldAttachments && history.oldAttachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> เอกสารแนบก่อนหน้า ({history.oldAttachments.length} ไฟล์)
                              </p>
                              <div className="space-y-2">
                                {history.oldAttachments.map((file: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={getFileUrl(selectedItem?.id, file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs hover:bg-purple-50 transition-colors"
                                  >
                                    <FileText className="w-3 h-3 text-red-500" />
                                    <span className="flex-1 truncate">{file}</span>
                                    <Download className="w-3 h-3 text-gray-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Attachments */}
                {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4 bg-green-50 p-4 rounded-xl border border-green-200">
                      <Paperclip className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-700">เอกสารแนบปัจจุบัน (ล่าสุด)</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {selectedItem.attachments.length} ไฟล์
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedItem.attachments.map((file: string, index: number) => (
                        <a
                          key={index}
                          href={getFileUrl(selectedItem.id, file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all group"
                        >
                          <div className="p-3 bg-green-100 rounded-xl">
                            <FileText className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate group-hover:text-green-600">{file}</p>
                            <p className="text-xs text-green-600 font-medium">เอกสารล่าสุด - คลิกเพื่อดาวน์โหลด</p>
                          </div>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-600">
                            <Download className="h-5 w-5" />
                          </Button>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Old Attachments from History */}
                {(() => {
                  const allOldAttachments: string[] = [];
                  editHistory.forEach((h: any) => {
                    if (h.oldAttachments && h.oldAttachments.length > 0) {
                      allOldAttachments.push(...h.oldAttachments);
                    }
                  });

                  if (allOldAttachments.length === 0) return null;

                  return (
                    <div className="mb-10">
                      <div className="flex items-center gap-2 mb-4 bg-orange-50 p-4 rounded-xl border border-orange-200">
                        <History className="w-5 h-5 text-orange-600" />
                        <span className="font-bold text-orange-700">เอกสารแนบก่อนหน้า (เก่า)</span>
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {allOldAttachments.length} ไฟล์
                        </span>
                      </div>
                      <div className="space-y-3">
                        {allOldAttachments.map((file: string, index: number) => (
                          <a
                            key={index}
                            href={getFileUrl(selectedItem?.id, file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all group opacity-80"
                          >
                            <div className="p-3 bg-orange-100 rounded-xl">
                              <FileText className="h-6 w-6 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-600 truncate group-hover:text-orange-600">{file}</p>
                              <p className="text-xs text-orange-500">เอกสารเก่า - คลิกเพื่อดาวน์โหลด</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-600">
                              <Download className="h-5 w-5" />
                            </Button>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Items Table */}
                <div className="mb-10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> รายการสินค้าและบริการ
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                          <th className="py-3 px-4 text-center w-16">ลำดับ</th>
                          <th className="py-3 px-4 text-left font-bold">รายการ</th>
                          <th className="py-3 px-4 text-center w-24">จำนวน</th>
                          <th className="py-3 px-4 text-right w-28">ราคา/หน่วย</th>
                          <th className="py-3 px-4 text-right w-28">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-center text-gray-500">{idx + 1}</td>
                            <td className="py-4 px-4">
                              <p className="font-bold text-gray-900">{item.name}</p>
                            </td>
                            <td className="py-4 px-4 text-center font-bold">{item.quantity}</td>
                            <td className="py-4 px-4 text-right">{item.unit_price?.toLocaleString()}</td>
                            <td className="py-4 px-4 text-right font-black text-gray-900">{item.total_price?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Approval Status */}
                {selectedItem && (
                  <div className="mb-6">
                    {(() => {
                      const status = getApprovalStatusText(selectedItem);
                      const StatusIcon = status.icon;
                      const canUserApprove = canApprove(selectedItem);

                      return (
                        <div className={`relative overflow-hidden rounded-2xl border-2 p-5 ${
                          canUserApprove
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl shadow-sm ${status.color}`}>
                              <StatusIcon className="w-6 h-6" />
                            </div>

                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-lg">{status.text}</p>
                              {selectedItem.approval_level === 0 && selectedItem.head_of_dept_approved_by && (
                                <p className="text-sm text-gray-500 mt-1">
                                  อนุมัติโดย: <span className="font-medium text-gray-700">{selectedItem.head_of_dept_approved_by_name || 'ไม่ระบุ'}</span> | {
                                    new Date(selectedItem.head_of_dept_approved_at).toLocaleDateString('th-TH', {
                                      year: 'numeric', month: 'short', day: 'numeric'
                                    })
                                  }
                                </p>
                              )}
                            </div>

                            {!canUserApprove && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                                <Lock className="w-4 h-4 text-amber-600" />
                                <span className="text-amber-700 text-sm font-medium">รอการอนุมัติ</span>
                              </div>
                            )}

                            {canUserApprove && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-xl border border-green-200">
                                <Unlock className="w-4 h-4 text-green-600" />
                                <span className="text-green-700 text-sm font-medium">พร้อมอนุมัติ</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Approvers Display */}
                {(selectedItem.head_of_dept_approved_by || selectedItem.manager_approved_by) && (
                  <div className="mb-10">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <PenTool className="w-3 h-3" /> ผู้อนุมัติ
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Head of Dept Card */}
                      {selectedItem.head_of_dept_approved_by && (
                        <div className="relative bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                              {(selectedItem.head_of_dept_approved_by_name || 'ห')[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-blue-600 font-medium">หัวหน้าแผนก</p>
                              <p className="text-sm font-bold text-gray-900">{selectedItem.head_of_dept_approved_by_name || 'ไม่ระบุชื่อ'}</p>
                            </div>
                          </div>
                          
                          {/* วันที่ */}
                          <p className="text-xs text-gray-400 mb-3">
                            {selectedItem.head_of_dept_approved_at && new Date(selectedItem.head_of_dept_approved_at).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          
                          {/* ลายเซ็น - อยู่ใต้วันที่ */}
                          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-gray-100">
                            {selectedItem.head_of_dept_signature ? (
                              <img
                                src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/purchase_requests/${selectedItem.id}/${selectedItem.head_of_dept_signature}`}
                                alt="ลายเซ็นหัวหน้าแผนก"
                                className="max-h-20 object-contain"
                                onError={(e) => {
                                  console.error('Failed to load head_of_dept signature');
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-gray-400 text-xs">ไม่สามารถโหลดลายเซ็น</span>';
                                }}
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">ไม่มีลายเซ็น</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Manager Card */}
                      {selectedItem.manager_approved_by && (
                        <div className="relative bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                              {(selectedItem.manager_approved_by_name || 'ผ')[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-purple-600 font-medium">ผู้จัดการ</p>
                              <p className="text-sm font-bold text-gray-900">{selectedItem.manager_approved_by_name || 'ไม่ระบุชื่อ'}</p>
                            </div>
                          </div>
                          
                          {/* วันที่ */}
                          <p className="text-xs text-gray-400 mb-3">
                            {selectedItem.manager_approved_at && new Date(selectedItem.manager_approved_at).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          
                          {/* ลายเซ็น - อยู่ใต้วันที่ */}
                          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-gray-100">
                            {selectedItem.manager_signature ? (
                              <img
                                src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/purchase_requests/${selectedItem.id}/${selectedItem.manager_signature}`}
                                alt="ลายเซ็นผู้จัดการ"
                                className="max-h-20 object-contain"
                                onError={(e) => {
                                  console.error('Failed to load manager signature');
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-gray-400 text-xs">ไม่สามารถโหลดลายเซ็น</span>';
                                }}
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">ไม่มีลายเซ็น</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>                  
                  </div>
                )}

                {/* Comment */}
                <div className="mb-10">
                  <Label className="text-sm font-bold text-gray-700 mb-3 block">
                    ความเห็น/เหตุผลประกอบการตัดสินใจ
                  </Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="ระบุเหตุผลในการอนุมัติหรือตีกลับ..."
                    className="rounded-xl bg-gray-50 border-none min-h-[100px]"
                    disabled={!canApprove(selectedItem)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleActionClick('rejected')}
                    disabled={submitting || !canApprove(selectedItem)}
                    className="flex-1 h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    ตีกลับไปแก้ไข (Reject)
                  </Button>
                  <Button
                    onClick={() => handleActionClick('approved')}
                    disabled={submitting || !canApprove(selectedItem)}
                    className="flex-1 h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-500/25"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    {selectedItem?.approval_level === 0 ? 'อนุมัติ (หัวหน้าแผนก)' : 'อนุมัติ (ผู้จัดการ)'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              {confirmDialog.action === 'approved' ? (
                <Check className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-center">
              {confirmDialog.action === 'approved' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการตีกลับ'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {confirmDialog.action === 'approved'
                ? 'คุณต้องการอนุมัติใบขอซื้อนี้ใช่หรือไม่?'
                : 'คุณต้องการตีกลับใบขอซื้อนี้ใช่หรือไม่?'}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="py-4 text-center border-t border-b border-gray-100 my-4">
              <p className="text-xl font-black text-gray-900">{selectedItem.pr_number}</p>
              <p className="text-sm text-gray-600 mt-1">โครงการ: {selectedItem.expand?.project?.name || 'ไม่ระบุ'}</p>
              <p className="text-lg font-bold text-blue-600 mt-2">จำนวนเงิน: ฿{selectedItem.total_amount?.toLocaleString() || 0}</p>
              {confirmDialog.action === 'approved' && (
                <p className="text-xs text-gray-500 mt-2">ระบบจะตัด stock จากโครงการโดยอัตโนมัติ</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: null })}
              className="flex-1 h-12 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={submitting}
              className={`flex-1 h-12 rounded-xl font-bold ${
                confirmDialog.action === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : confirmDialog.action === 'approved' ? (
                <><Check className="w-4 h-4 mr-2" /> ยืนยันอนุมัติ</>
              ) : (
                <><X className="w-4 h-4 mr-2" /> ยืนยันตีกลับ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
