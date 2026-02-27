import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wrench, 
  User, 
  MapPin, 
  Upload, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2,
  Paperclip,
  X,
  Package,
  ArrowLeft,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductSearchInput from '@/components/ProductSearchInput';
import { prService, projectService, vendorService } from '@/services/api';
import { notificationService } from '@/services/notification';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbase';

interface LineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  reference_price: number;
  total_price: number;
  project_item_id?: string;
  max_quantity?: number;
  isExisting?: boolean;
  item_type?: 'regular' | 'reserve';
}

interface Attachment {
  id: string;
  file?: File;
  name: string;
  size?: string;
  isExisting?: boolean;
  url?: string;
}

interface EditHistory {
  id: string;
  action: string;
  by: string;
  date: string;
  details?: string;
}

export default function PRSubcontractor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  
  // Data lists
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [projList, vendList] = await Promise.all([
          projectService.getAll(),
          vendorService.getAll()
        ]);
        setProjects(projList);
        setVendors(vendList);
        
        // ถ้าเป็น edit mode โหลดข้อมูล PR เดิม
        if (isEditMode && id) {
          await loadExistingPR(id);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error('Data load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isEditMode]);

  async function loadExistingPR(prId: string) {
    try {
      const [pr, prItems, history] = await Promise.all([
        prService.getById(prId),
        prService.getItems(prId),
        prService.getHistory(prId).catch(() => [])
      ]);
      
      // Check สิทธิ์แก้ไข (เฉพาะ draft)
      if (pr.status !== 'draft') {
        toast.error('สามารถแก้ไขได้เฉพาะรายการที่ยังเป็น Draft เท่านั้น');
        navigate('/purchase-requests');
        return;
      }
      
      if (pr.type !== 'sub') {
        toast.error('รายการนี้ไม่ใช่ประเภท Sub');
        navigate('/purchase-requests');
        return;
      }
      
      setPrData(pr);
      setProjectId(pr.project || '');
      
      if (pr.vendor) {
        const vendorArray = Array.isArray(pr.vendor) ? pr.vendor : [pr.vendor];
        setVendorIds(vendorArray.filter(Boolean));
      }
      
      // โหลดเอกสารแนบเดิม
      if (pr.attachments && pr.attachments.length > 0) {
        setAttachments(pr.attachments.map((url: string, idx: number) => ({
          id: `existing-${idx}`,
          name: url.split('/').pop() || `ไฟล์-${idx + 1}`,
          url,
          isExisting: true
        })));
      }
      
      // โหลดประวัติการแก้ไข
      if (history && history.length > 0) {
        setEditHistory(history.map((h: any) => ({
          id: h.id,
          action: h.action,
          by: h.expand?.by?.name || 'ไม่ระบุ',
          date: new Date(h.created).toLocaleString('th-TH'),
          details: h.details
        })));
      }
      
      // โหลด items
      if (prItems && prItems.length > 0) {
        setItems(prItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          unit: item.unit || 'งาน',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          reference_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          project_item_id: item.project_item,
          isExisting: true
        })));
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Load PR failed:', err);
      toast.error('ไม่สามารถโหลดข้อมูลใบขอซื้อได้');
      navigate('/purchase-requests');
    }
  }

  // Load project items when project changes (create mode only)
  useEffect(() => {
    if (isEditMode || !projectId) return;
    
    async function loadProjectItems() {
      try {
        console.log('Loading project items for project:', projectId);
        
        const projectItems = await pb.collection('project_items').getFullList({
          filter: `project = "${projectId}"`,
          sort: 'name'
        });
        
        console.log('Project items found:', projectItems.length, projectItems);
        
        const prSubsApproved = await pb.collection('purchase_requests').getFullList({
          filter: `project = "${projectId}" && type = "sub" && status = "approved"`
        }).catch(() => []);

        const withdrawnMap: Record<string, number> = {};
        for (const prSub of prSubsApproved) {
          const prItems = await pb.collection('pr_items').getFullList({
            filter: `pr = "${prSub.id}" && item_type != "reserve"`
          });
          for (const item of prItems) {
            if (item.project_item) {
              withdrawnMap[item.project_item] = (withdrawnMap[item.project_item] || 0) + (item.quantity || 0);
            }
          }
        }
        
        console.log('Withdrawn map:', withdrawnMap);
        
        if (projectItems.length > 0) {
          const availableItems = projectItems
            .map((item: any) => {
              // ใช้ initial_quantity เป็นค่าเริ่มต้น ถ้าไม่มีใช้ quantity แทน
              const initialQty = item.initial_quantity || item.quantity || 0;
              const currentQty = item.quantity || 0;
              const withdrawn = withdrawnMap[item.id] || 0;
              // คงเหลือ = ค่าเริ่มต้น - เบิกไปแล้ว
              const remaining = Math.max(0, initialQty - withdrawn);
              
              console.log(`Item ${item.name}: initial=${initialQty}, current=${currentQty}, withdrawn=${withdrawn}, remaining=${remaining}`);
              
              return {
                id: item.id || Date.now().toString() + Math.random(),
                project_item_id: item.id,
                name: item.name || '',
                unit: item.unit || 'งาน',
                quantity: remaining,
                reference_price: item.unit_price || 0,
                unit_price: item.unit_price || 0,
                total_price: remaining * (item.unit_price || 0),
                max_quantity: remaining,
                isExisting: true,
                item_type: 'regular' as const
              };
            })
            .filter((item: any) => item.quantity > 0);

          console.log('Available items after filter:', availableItems);
          setItems(availableItems.length > 0 ? availableItems : []);
        } else {
          console.log('No project items found');
          setItems([]);
        }
      } catch (err) {
        console.error('Load project items failed:', err);
        setItems([]);
      }
    }
    loadProjectItems();
  }, [projectId, isEditMode]);

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      name: '', 
      unit: 'งาน', 
      quantity: 1, 
      unit_price: 0, 
      reference_price: 0, 
      total_price: 0,
      isExisting: false,
      item_type: 'regular'
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'quantity') {
          const numValue = Math.max(0, Number(value));
          if (item.max_quantity !== undefined && numValue > item.max_quantity) {
            toast.warning(`จำนวนสูงสุดที่เบิกได้คือ ${item.max_quantity} ${item.unit}`);
            value = item.max_quantity;
          } else {
            value = numValue;
          }
        }
        
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      isExisting: false
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const uploadAttachments = async (prId: string) => {
    const newFiles = attachments.filter(a => !a.isExisting && a.file);
    if (newFiles.length === 0) return;

    const formData = new FormData();
    newFiles.forEach(att => {
      if (att.file) formData.append('attachments', att.file);
    });

    try {
      await pb.collection('purchase_requests').update(prId, formData);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('อัปโหลดไฟล์ไม่สำเร็จ');
    }
  };

  const totalAmount = items
    .filter(item => item.quantity > 0 && item.name?.trim())
    .reduce((sum, item) => sum + item.total_price, 0);

  const handleSubmit = async (status: string) => {
    if (!projectId || vendorIds.length === 0) {
      toast.error('กรุณาเลือกโครงการและผู้รับเหมา');
      return;
    }

    // เช็คว่ามี PR Project ที่อนุมัติแล้วหรือยัง
    if (status === 'pending') {
      try {
        const approvedPRProjects = await pb.collection('purchase_requests').getList(1, 1, {
          filter: `project = "${projectId}" && (type = "project" || type = "" || type = null) && status = "approved"`
        });
        
        if (approvedPRProjects.totalItems === 0) {
          toast.error('กรุณาสร้างและอนุมัติ PR Project ก่อนสร้าง PR Sub');
          return;
        }
      } catch (err) {
        console.error('Check approved PR error:', err);
        toast.error('ไม่สามารถตรวจสอบได้ กรุณาลองใหม่');
        return;
      }
    }

    const validItems = items.filter(item => 
      item.name?.trim() && 
      item.quantity > 0 && 
      item.unit_price >= 0
    );
    
    if (validItems.length === 0) {
      toast.error('ไม่มีรายการที่สามารถบันทึกได้');
      return;
    }

    if (!user?.id) {
      toast.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    setIsSubmitting(true);
    try {
      const prItems = validItems.map(({ name, unit, quantity, unit_price, total_price, project_item_id, item_type }) => ({
        name, unit, quantity, unit_price, total_price,
        project_item: project_item_id,
        item_type: item_type || 'regular'
      }));

      if (isEditMode && id) {
        // Update existing PR
        await prService.update(id, {
          project: projectId,
          vendor: vendorIds[0] || '',
          status: status,
          total_amount: totalAmount,
          requester_name: user?.name || user?.email || 'Unknown'
        });

        // Delete old items and create new
        await prService.deleteItems(id);
        for (const item of prItems) {
          await prService.createItem({ ...item, pr: id });
        }

        // Upload new attachments
        await uploadAttachments(id);

        toast.success(status === 'draft' ? 'บันทึกร่างเรียบร้อย' : 'ส่งใบขอซื้อย่อยเรียบร้อยแล้ว');
      } else {
        // Create new PR
        const prData: any = {
          type: 'sub',
          project: projectId,
          vendor: vendorIds[0] || '',
          status: status,
          total_amount: totalAmount,
          requester_name: user?.name || user?.email || 'ไม่ระบุ',
          requester: user?.id || ''
        };

        const pr = await prService.create(prData, prItems);
        
        // ส่ง notification เมื่อส่ง PR ใหม่
        if (status === 'pending') {
          try {
            await notificationService.notifyNewPR(pr, user?.id);
          } catch (err) {
            console.error('Failed to send notification:', err);
          }
        }
        
        if (attachments.length > 0) {
          await uploadAttachments(pr.id);
        }

        toast.success(status === 'draft' ? 'บันทึกร่างเรียบร้อย' : 'ส่งใบขอซื้อย่อยเรียบร้อยแล้ว');
      }
      
      if (status === 'pending') {
        // Refresh badge counts before navigating
        window.dispatchEvent(new CustomEvent('refresh-badge-counts'));
        queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        navigate('/purchase-orders/approval');
      } else {
        queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
        navigate('/purchase-requests');
      }
    } catch (error) {
      console.error(error);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVendors = vendors.filter(v => vendorIds.includes(v.id));
  const selectedProject = projects.find(p => p.id === projectId);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? 'แก้ไขใบขอซื้อ - งานย่อย' : 'สร้างใบขอซื้อ - งานย่อย (Sub-contractor)'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? prData?.pr_number : 'สำหรับการจ้างเหมาช่วง งานระบบ และงานบริการเฉพาะทาง'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl px-6 border-[#E5E7EB] font-bold" 
            onClick={() => handleSubmit('draft')} 
            disabled={isSubmitting || items.length === 0}
          >
            <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
          </Button>
          <Button 
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl px-8 font-bold shadow-lg shadow-purple-500/20" 
            onClick={() => handleSubmit('pending')} 
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งขออนุมัติ
          </Button>
        </div>
      </div>

      {/* Edit History */}
      {isEditMode && editHistory.length > 0 && (
        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-700">
              <History className="w-5 h-5 text-gray-500" /> 
              ประวัติการแก้ไข ({editHistory.length})
              {showHistory ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </CardTitle>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-3">
              {editHistory.map((h) => (
                <div key={h.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-700">{h.action}</span>
                    <span className="text-xs text-gray-400">{h.date}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{h.details}</p>
                  <p className="text-xs text-gray-400 mt-1">โดย: {h.by}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Wrench className="w-5 h-5 text-purple-600" /> ข้อมูลโครงการ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">เลือกโครงการ *</Label>
                <Select value={projectId} onValueChange={async (value) => {
                  // เช็คว่ามี PR Project ที่อนุมัติแล้วหรือยัง
                  try {
                    const approvedPRProjects = await pb.collection('purchase_requests').getList(1, 1, {
                      filter: `project = "${value}" && (type = "project" || type = "" || type = null) && status = "approved"`
                    });
                    
                    if (approvedPRProjects.totalItems === 0) {
                      toast.warning('โครงการนี้ยังไม่มี PR Project ที่อนุมัติ - กรุณาสร้างและอนุมัติ PR Project ก่อน');
                    }
                  } catch (err) {
                    console.error('Check approved PR error:', err);
                  }
                  setProjectId(value);
                }} disabled={isEditMode}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกโครงการที่ต้องการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {isEditMode && <p className="text-xs text-gray-400">* ไม่สามารถเปลี่ยนโครงการได้</p>}
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-purple-600" /> รายละเอียดงานจ้างเหมา
              </CardTitle>
              <Button 
                variant="ghost" 
                onClick={addItem} 
                className="text-purple-600 font-bold hover:bg-purple-50 h-9"
              >
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 && !isEditMode ? (
                <div className="p-12 text-center">
                  <div className="p-4 bg-orange-50 rounded-full w-fit mx-auto mb-4">
                    <Package className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-700 mb-2">ไม่มีอุปกรณ์คงเหลือ</p>
                  <p className="text-sm text-gray-500 mb-6">กรุณาสร้าง PR Project ใหม่เพื่อเพิ่มอุปกรณ์</p>
                  <Button 
                    onClick={() => navigate('/purchase-requests/new/project')}
                    className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    สร้าง PR Project ใหม่
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto px-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#9CA3AF] font-bold border-b border-gray-50 uppercase text-[10px] tracking-widest">
                          <th className="py-4 text-left">รายละเอียด</th>
                          <th className="py-4 text-center w-24">ประเภท</th>
                          <th className="py-4 text-right w-20">จำนวน</th>
                          {!isEditMode && <th className="py-4 text-right w-28 text-blue-400">ราคาอ้างอิง</th>}
                          <th className="py-4 text-right w-32">ราคาซื้อจริง</th>
                          <th className="py-4 text-right w-28">รวม</th>
                          <th className="py-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item) => (
                          <tr key={item.id} className="group">
                            <td className="py-4 pr-4">
                              {item.isExisting && !isEditMode ? (
                                <div>
                                  <p className="font-bold text-gray-900">{item.name}</p>
                                  <p className="text-xs text-purple-500">อุปกรณ์เดิมในโครงการ</p>
                                </div>
                              ) : (
                                <ProductSearchInput
                                  value={item.name}
                                  onChange={(val) => updateItem(item.id, 'name', val)}
                                  onSelectProduct={(product) => {
                                    updateItem(item.id, 'name', product.name);
                                    updateItem(item.id, 'unit', product.unit || 'งาน');
                                    updateItem(item.id, 'unit_price', product.unit_price);
                                  }}
                                  placeholder="ค้นหาหรือระบุชื่องาน..."
                                />
                              )}
                            </td>
                            <td className="py-4 px-2">
                              <select
                                value={item.item_type || 'regular'}
                                onChange={(e) => updateItem(item.id, 'item_type', e.target.value)}
                                className="w-full h-10 px-2 border-none bg-gray-50 rounded-xl text-xs font-bold text-center"
                              >
                                <option value="regular">ปกติ</option>
                                <option value="reserve">สำรอง</option>
                              </select>
                            </td>
                            <td className="py-4 px-1">
                              <Input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                                className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" 
                              />
                            </td>
                            {!isEditMode && item.isExisting && (
                              <td className="py-4 px-1 text-right">
                                <p className="text-sm text-gray-400">{item.reference_price > 0 ? item.reference_price.toLocaleString() : '-'}</p>
                              </td>
                            )}
                            {!isEditMode && !item.isExisting && <td className="py-4 px-1 text-right">-</td>}
                            <td className="py-4 px-1">
                              <Input 
                                type="number" 
                                value={item.unit_price} 
                                onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)} 
                                className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" 
                              />
                            </td>
                            <td className="py-4 pl-4 text-right font-black text-gray-900 leading-10">
                              {(item.total_price || 0).toLocaleString()}
                            </td>
                            <td className="py-4 pl-2 text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeItem(item.id)} 
                                className="h-8 w-8 text-red-200 hover:text-red-500 rounded-full"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 bg-gray-50 flex justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวม</p>
                      <p className="text-4xl font-black text-purple-600 tracking-tighter">฿{totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Vendor Card */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-white pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <User className="w-5 h-5 text-purple-600" /> ข้อมูลผู้รับเหมา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้รับเหมา *</Label>
                <Select 
                  onValueChange={(value) => {
                    if (!vendorIds.includes(value)) {
                      setVendorIds([...vendorIds, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกบริษัทผู้รับเหมา" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => !vendorIds.includes(v.id)).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {vendorIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVendors.map(vendor => (
                      <span 
                        key={vendor.id} 
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {vendor.name}
                        <button 
                          onClick={() => setVendorIds(vendorIds.filter(id => id !== vendor.id))}
                          className="hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedVendors.length > 0 && (
                <div className="space-y-3">
                  {selectedVendors.map(vendor => (
                    <div key={vendor.id} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                      <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">{vendor.name}</p>
                      <p className="font-bold text-purple-900">{vendor.contact_person}</p>
                      <p className="text-sm text-purple-700">{vendor.email}</p>
                      <p className="text-sm text-purple-700">{vendor.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">เอกสารแนบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-gray-700">อัปโหลดไฟล์</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">PDF, XLSX (MAX 10MB)</p>
              </div>
              
              {/* Existing attachments */}
              {attachments.filter(a => a.isExisting).map((att) => (
                <div key={att.id} className="p-3 bg-purple-50 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-xs"><Paperclip className="h-4 w-4 text-purple-500" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 truncate">{att.name}</p>
                      <p className="text-[10px] text-purple-500">ไฟล์เดิม</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-300 hover:text-red-500 rounded-full"
                    onClick={() => removeAttachment(att.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {/* New attachments */}
              {attachments.filter(a => !a.isExisting).map((att) => (
                <div key={att.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-xs"><Paperclip className="h-4 w-4 text-purple-500" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 truncate">{att.name}</p>
                      <p className="text-[10px] text-gray-400">{att.size}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-300 hover:text-red-500 rounded-full"
                    onClick={() => removeAttachment(att.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="bg-[#1F2937] text-white border-none rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <FileText className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">สถานะปัจจุบัน</p>
              <div className="flex items-center gap-2 text-purple-400 mb-4">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></div>
                <p className="font-black">{isEditMode ? 'แก้ไขแบบร่าง (Draft)' : 'ฉบับร่าง (Draft)'}</p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isEditMode 
                  ? 'คุณกำลังแก้ไขใบขอซื้องานย่อยที่ยังเป็นแบบร่าง สามารถบันทึกหรือส่งอนุมัติได้'
                  : 'เมื่อกรอกข้อมูลเสร็จสิ้น ระบบจะส่งเรื่องไปยังผู้จัดการโครงการเพื่อทำการตรวจสอบและอนุมัติต่อไปค่ะ'
                }
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
