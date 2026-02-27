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
  Building2,
  User,
  DollarSign,
  ChevronRight,
  Clock,
  Loader2,
  Download,
  Paperclip,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  UserCheck,
  Users,
  Signature,
  ChevronLeft
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

export default function PRApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingPRs, setPendingPRs] = useState<any[]>([]);
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; percentage: number } | null>(null);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
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
    loadPRs();
  }, []);

  // Fetch ลายเซ็นของผู้อนุมัติเมื่อ selectedPR เปลี่ยน
  useEffect(() => {
    if (selectedPR) {
      fetchApproverSignatures();
    }
  }, [selectedPR]);

  async function fetchApproverSignatures() {
    setApproverSignatures({ headOfDept: null, manager: null });
    
    try {
      // Fetch ลายเซ็นหัวหน้าแผนก
      if (selectedPR.head_of_dept_approved_by) {
        try {
          const headOfDeptUser = await pb.collection('users').getOne(selectedPR.head_of_dept_approved_by);
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
      if (selectedPR.manager_approved_by) {
        try {
          const managerUser = await pb.collection('users').getOne(selectedPR.manager_approved_by);
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

  async function loadPRs() {
    setLoading(true);
    try {
      // ดึงเฉพาะ PR Project (type = 'project' หรือไม่มี type) ที่ status = 'pending'
      // และขยาย expand สำหรับ head_of_dept_approved_by
      const data = await prService.getAll('status = "pending"', { 
        expand: 'requester,project'
      });
      // กรองเอาเฉพาะ PR Project (type = 'project' หรือ type เป็น null/undefined)
      const projectPRs = data.filter(pr => pr.type === 'project' || !pr.type);
      setPendingPRs(projectPRs);
      if (projectPRs.length > 0) {
        handleSelectPR(projectPRs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPR(pr: any) {
    setSelectedPR(pr);
    try {
      const prItems = await prService.getItems(pr.id);
      setItems(prItems);
      
      // Load budget info if project exists
      if (pr.expand?.project?.id) {
        const projectBudget = pr.expand.project.budget || 0;
        const totalSpent = await prService.getProjectTotalSpent(pr.expand.project.id);
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
        const history = await prService.getHistory(pr.id);
        console.log('History records:', history);
        
        // Collect all user IDs from history + PR requester to fetch names
        const historyUserIds = history.map((h: any) => h.by).filter(Boolean);
        if (pr.requester) historyUserIds.push(pr.requester);
        const userIds = [...new Set(historyUserIds)];
        console.log('User IDs from history:', userIds);
        const userMap: Record<string, string> = {};
        
        // Fetch user names
        if (userIds.length > 0) {
          try {
            const users = await pb.collection('users').getFullList({
              filter: userIds.map((id: string) => `id = "${id}"`).join(' || '),
              fields: 'id,name,email'
            });
            console.log('Fetched users:', users);
            users.forEach((u: any) => {
              userMap[u.id] = u.name || u.email || 'ไม่ระบุ';
            });
          } catch (e) {
            console.log('Could not fetch users:', e);
          }
        }
        console.log('User map:', userMap);
        
        // Resolve requester name from userMap first, fallback to PR fields
        const resolvedRequesterName = (pr.requester && userMap[pr.requester]) || pr.requester_name || pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
        
        // If no history records, create from PR data
        if (history.length === 0) {
          const createdDate = pr.created;
          setEditHistory([
            { 
              date: createdDate || new Date().toISOString(), 
              action: 'สร้าง PR ครั้งแรก', 
              by: resolvedRequesterName 
            },
            { 
              date: pr.updated || new Date().toISOString(), 
              action: 'ส่งอนุมัติ (รอการอนุมัติ)', 
              by: resolvedRequesterName 
            }
          ]);
        } else {
          const historyData = history.map((h: any) => {
            let resolvedName = userMap[h.by] || h.expand?.by?.name || h.expand?.by?.email;
            
            // Fallback to cached names in PR data if PB permissions block access
            if (!resolvedName || resolvedName === 'ไม่ระบุ') {
              if (h.by === pr.requester) resolvedName = pr.requester_name;
              else if (h.by === pr.head_of_dept_approved_by) resolvedName = pr.head_of_dept_approved_by_name;
              else if (h.by === pr.manager_approved_by) resolvedName = pr.manager_approved_by_name;
            }
            
            return {
              date: h.created,
              action: h.action,
              by: resolvedName || 'ไม่ระบุ',
              oldAttachments: h.old_attachments || []
            };
          });
          
          // Check if 'สร้าง PR' is in history, if not add it
          const hasCreateAction = historyData.some((h: any) => h.action === 'สร้าง PR');
          if (!hasCreateAction) {
            const createdDate = pr.created;
            historyData.push({
              date: createdDate || new Date().toISOString(),
              action: 'สร้าง PR',
              by: resolvedRequesterName,
              oldAttachments: []
            });
          }
          
          // Sort by date ascending (oldest first)
          historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          setEditHistory(historyData);
        }
      } catch (err) {
        // Fallback to mock data if history not available
        const createdDate = pr.created;
        const requesterName = pr.requester_name || pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
        setEditHistory([
          { 
            date: createdDate || new Date().toISOString(), 
            action: 'สร้าง PR ครั้งแรก', 
            by: requesterName,
            oldAttachments: []
          },
          { 
            date: pr.updated || new Date().toISOString(), 
            action: 'ส่งอนุมัติ (รอการอนุมัติ)', 
            by: requesterName,
            oldAttachments: []
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setBudgetInfo(null);
      setEditHistory([]);
    }
  }

  const handleActionClick = (action: 'approved' | 'rejected') => {
    if (!selectedPR) return;
    setConfirmDialog({ open: true, action });
  };

  const handleConfirmAction = async () => {
    if (!selectedPR || !confirmDialog.action) return;
    
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
      const currentLevel = selectedPR.approval_level || 0;
      
      if (confirmDialog.action === 'rejected') {
        // ตีกลับ - ยกเลิกการอนุมัติทั้งหมด
        await prService.updateStatus(selectedPR.id, 'rejected', comment, user?.id, selectedPR.attachments);
        
        // ส่ง notification ตาม role
        if (user?.role === 'head_of_dept') {
          await notificationService.notifyByHeadOfDept(selectedPR, user?.name || 'หัวหน้า', false, selectedPR.requester);
        } else if (user?.role === 'manager' || user?.role === 'superadmin') {
          await notificationService.notifyByManager(selectedPR, user?.name || 'ผู้จัดการ', false, selectedPR.requester);
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
              
              await pb.collection('purchase_requests').update(selectedPR.id, formData);
            } catch (err) {
              console.error('Failed to copy signature:', err);
              // ถ้า copy ไม่ได้ ให้อัพเดตแบบไม่มีลายเซ็น
              await pb.collection('purchase_requests').update(selectedPR.id, updateData);
            }
          } else {
            await pb.collection('purchase_requests').update(selectedPR.id, updateData);
          }
          
          // ส่ง notification ตาม role (หัวหน้าแผนกอนุมัติ)
          await notificationService.notifyByHeadOfDept(selectedPR, user?.name || 'หัวหน้าแผนก', true, selectedPR.requester);
          
          toast.success('อนุมัติระดับ 1 สำเร็จ (รอผู้จัดการอนุมัติต่อ)');
          
        } else if (currentLevel === 1 && (isManager() || isSuperAdmin())) {
          // ผู้จัดการอนุมัติ → อนุมัติสมบูรณ์
          const updateData: any = {
            status: 'approved',
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
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
              
              await pb.collection('purchase_requests').update(selectedPR.id, formData);
            } catch (err) {
              console.error('Failed to copy signature:', err);
              // ถ้า copy ไม่ได้ ให้อัพเดตแบบไม่มีลายเซ็น
              await pb.collection('purchase_requests').update(selectedPR.id, updateData);
            }
          } else {
            await pb.collection('purchase_requests').update(selectedPR.id, updateData);
          }
          
          // ส่ง notification ตาม role (ผู้จัดการอนุมัติ)
          await notificationService.notifyByManager(selectedPR, user?.name || 'ผู้จัดการ', true, selectedPR.requester);
          
          toast.success('อนุมัติสมบูรณ์แล้ว');
        } else {
          toast.error('คุณไม่มีสิทธิ์อนุมัติในระดับนี้');
        }
      }
      
      setComment('');
      setConfirmDialog({ open: false, action: null });
      await loadPRs();
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Refresh badge counts in sidebar
      window.dispatchEvent(new CustomEvent('refresh-badge-counts'));
    } catch (err) {
      console.error('Approval failed:', err);
      toast.error('ดำเนินการไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  // Get file URL for download
  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  }

  if (pendingPRs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="p-4 bg-gray-100 rounded-full mb-4"><Check className="h-12 w-12" /></div>
        <h2 className="text-xl font-bold">ไม่มีรายการรออนุมัติ</h2>
        <p>คุณจัดการทุกรายการเรียบร้อยแล้วค่ะ</p>
      </div>
    );
  }

  // Pagination Logic
  const totalPages = Math.ceil(pendingPRs.length / ITEMS_PER_PAGE);
  const paginatedPRs = pendingPRs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการรออนุมัติ (Pending PR List)</h1>
          <p className="text-sm text-gray-500 mt-1">พบ {pendingPRs.length} รายการที่ต้องการการตัดสินใจ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - PR List */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="divide-y divide-gray-50 flex-1 overflow-y-auto min-h-0">
              {paginatedPRs.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleSelectPR(pr)}
                  className={`p-5 cursor-pointer hover:bg-[#F9FAFB] transition-all ${
                    selectedPR?.id === pr.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-blue-600">{pr.pr_number}</p>
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
                  {pr.po_ref && (
                    <p className="text-xs text-gray-500 mb-2">อ้างอิง: {pr.po_ref}</p>
                  )}
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
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Paperclip className="w-3 h-3" />
                        <span>{pr.attachments.length} ไฟล์แนบ</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex-none items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs text-gray-500">
                    {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, pendingPRs.length)} จาก {pendingPRs.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0 rounded-md"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .reduce<(number | string)[]>((acc, page, idx, arr) => {
                          if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
                          acc.push(page);
                          return acc;
                        }, [])
                        .map((page, idx) => (
                          typeof page === 'string' ? (
                            <span key={`ellipsis-${idx}`} className="px-1 py-1 text-gray-400 text-xs">...</span>
                          ) : (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={`h-7 w-7 p-0 rounded-md text-xs font-medium ${
                                currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-600'
                              }`}
                            >
                              {page}
                            </Button>
                          )
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0 rounded-md"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPR && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">รายละเอียดใบขอซื้อ</p>
                  <CardTitle className="text-2xl font-bold text-[#1F2937]">{selectedPR.pr_number}</CardTitle>
                </div>
                {(() => {
                  const status = getApprovalStatusText(selectedPR);
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
                        {selectedPR.expand?.project?.code && (
                          <span className="text-blue-600 mr-2">[{selectedPR.expand.project.code}]</span>
                        )}
                        {selectedPR.expand?.project?.name || 'รายการจัดซื้อทั่วไป'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{selectedPR.expand?.project?.location || 'สำนักงานใหญ่'}</p>
                      {selectedPR.po_ref && (
                        <p className="text-sm text-blue-600 mt-2 font-medium">อ้างอิง PO: {selectedPR.po_ref}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ยอดเงินรวมสุทธิ</h4>
                    <p className="text-3xl font-black text-blue-600">฿{selectedPR.total_amount?.toLocaleString() || 0}.00</p>
                    <p className="text-xs text-gray-500 mt-2">
                      สร้างโดย: {selectedPR.requester_name || selectedPR.expand?.requester?.name || selectedPR.expand?.requester?.email || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-gray-400">
                      วันที่สร้าง: {selectedPR.created ? new Date(selectedPR.created).toLocaleDateString('th-TH') : '-'}
                    </p>
                  </div>
                </div>

                {/* Edit History Section */}
                {editHistory.length > 0 && (
                  <div className="mb-10 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" /> 
                        ประวัติการดำเนินการ 
                        <span className="bg-blue-400 text-white px-2 py-0.5 rounded-full text-[10px]">
                          {editHistory.length} รายการ
                        </span>
                      </h4>
                      {editHistory.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryExpanded(!historyExpanded)}
                          className="text-blue-400 hover:text-blue-600 hover:bg-blue-100"
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
                        <div key={index} className="bg-white p-4 rounded-xl border border-blue-100">
                          <div className="flex items-start gap-3 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                              index === 0 ? 'bg-green-500' : 'bg-blue-500'
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
                          {/* Show old attachments if this was a reject action */}
                          {history.oldAttachments && history.oldAttachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> เอกสารแนบก่อนหน้า ({history.oldAttachments.length} ไฟล์)
                              </p>
                              <div className="space-y-2">
                                {history.oldAttachments.map((file: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={getFileUrl(selectedPR?.id, file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs hover:bg-blue-50 transition-colors"
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

                {/* Current Attachments - Latest */}
                {selectedPR.attachments && selectedPR.attachments.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4 bg-green-50 p-4 rounded-xl border border-green-200">
                      <Paperclip className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-700">เอกสารแนบปัจจุบัน (ล่าสุด)</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {selectedPR.attachments.length} ไฟล์
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedPR.attachments.map((file: string, index: number) => (
                        <a
                          key={index}
                          href={getFileUrl(selectedPR.id, file)}
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

                {/* Old Attachments from History - Previous versions */}
                {(() => {
                  // Find all old attachments from reject history
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
                            href={getFileUrl(selectedPR?.id, file)}
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

                <div className="mb-10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> รายการสินค้าและบริการ
                  </h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F9FAFB] text-[#6B7280]">
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">ลำดับ</th>
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">รายการ</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">จำนวน</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">ราคา/หน่วย</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="py-4 px-4 text-gray-400">{idx + 1}</td>
                            <td className="py-4 px-4 font-medium text-gray-900">{item.name}</td>
                            <td className="py-4 px-4 text-right text-gray-600">{item.quantity} {item.unit}</td>
                            <td className="py-4 px-4 text-right text-gray-600">{item.unit_price?.toLocaleString()}</td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900">{item.total_price?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures Display */}
                {(selectedPR.head_of_dept_approved_by || selectedPR.manager_approved_by) && (
                  <div className="mb-10">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Signature className="w-3 h-3" /> ผู้อนุมัติ
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Head of Dept Card */}
                      {selectedPR.head_of_dept_approved_by && (
                        <div className="relative bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                              {(selectedPR.head_of_dept_approved_by_name || 'ห')[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-blue-600 font-medium">หัวหน้าแผนก</p>
                              <p className="text-sm font-bold text-gray-900">{selectedPR.head_of_dept_approved_by_name || 'ไม่ระบุชื่อ'}</p>
                            </div>
                          </div>
                          
                          {/* วันที่ */}
                          <p className="text-xs text-gray-400 mb-3">
                            {selectedPR.head_of_dept_approved_at && new Date(selectedPR.head_of_dept_approved_at).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          
                          {/* ลายเซ็น - อยู่ใต้วันที่ */}
                          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-gray-100">
                            {selectedPR.head_of_dept_signature ? (
                              <img
                                src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/purchase_requests/${selectedPR.id}/${selectedPR.head_of_dept_signature}`}
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
                      {selectedPR.manager_approved_by && (
                        <div className="relative bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                              {(selectedPR.manager_approved_by_name || 'ผ')[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-purple-600 font-medium">ผู้จัดการ</p>
                              <p className="text-sm font-bold text-gray-900">{selectedPR.manager_approved_by_name || 'ไม่ระบุชื่อ'}</p>
                            </div>
                          </div>
                          
                          {/* วันที่ */}
                          <p className="text-xs text-gray-400 mb-3">
                            {selectedPR.manager_approved_at && new Date(selectedPR.manager_approved_at).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          
                          {/* ลายเซ็น - อยู่ใต้วันที่ */}
                          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-gray-100">
                            {selectedPR.manager_signature ? (
                              <img
                                src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/purchase_requests/${selectedPR.id}/${selectedPR.manager_signature}`}
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

                {/* Approval Status */}
                {selectedPR && (
                  <div className="mb-6">
                    {(() => {
                      const status = getApprovalStatusText(selectedPR);
                      const StatusIcon = status.icon;
                      const canUserApprove = canApprove(selectedPR);
                      
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
                              {selectedPR.approval_level === 0 && selectedPR.head_of_dept_approved_by && (
                                <p className="text-sm text-gray-500 mt-1">
                                  อนุมัติโดย: <span className="font-medium text-gray-700">{selectedPR.head_of_dept_approved_by_name || 'ไม่ระบุ'}</span> | {
                                    new Date(selectedPR.head_of_dept_approved_at).toLocaleDateString('th-TH', {
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

                <div className="space-y-4 mb-8">
                  <Label className="text-[#1F2937] font-bold">ความเห็น/เหตุผลประกอบการตัดสินใจ</Label>
                  <Textarea 
                    placeholder="ระบุเหตุผลในการอนุมัติหรือตีกลับ..." 
                    rows={3} 
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={!canApprove(selectedPR)}
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                    onClick={() => handleActionClick('rejected')}
                    disabled={submitting || !canApprove(selectedPR)}
                  >
                    <X className="w-5 h-5 mr-2" /> ตีกลับไปแก้ไข (Reject)
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20"
                    onClick={() => handleActionClick('approved')}
                    disabled={submitting || !canApprove(selectedPR)}
                  >
                    <Check className="w-5 h-5 mr-2" /> 
                    {selectedPR?.approval_level === 0 ? 'อนุมัติ (หัวหน้าแผนก)' : 'อนุมัติ (ผู้จัดการ)'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPR && (
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    confirmDialog.action === 'approved' ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    {confirmDialog.action === 'approved' ? (
                      <Check className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    )}
                  </div>
                  <DialogTitle className="text-xl font-bold text-center">
                    {confirmDialog.action === 'approved' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการตีกลับ'}
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    คุณต้องการ{confirmDialog.action === 'approved' ? 'อนุมัติ' : 'ตีกลับ'}ใบขอซื้อนี้ใช่หรือไม่?
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 text-center border-t border-b border-gray-100 my-4">
                  <p className="text-xl font-black text-gray-900">{selectedPR.pr_number}</p>
                  <p className="text-sm text-gray-600 mt-1">โครงการ: {selectedPR.expand?.project?.name || 'ไม่ระบุ'}</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">จำนวนเงิน: ฿{selectedPR.total_amount?.toLocaleString() || 0}</p>
                </div>

                <DialogFooter className="gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setConfirmDialog({ open: false, action: null })}
                    className="flex-1 rounded-xl h-12 font-bold"
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    onClick={handleConfirmAction}
                    disabled={submitting}
                    className={`flex-1 rounded-xl h-12 font-bold ${
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
          )}
        </div>
      </div>
    </div>
  );
}
