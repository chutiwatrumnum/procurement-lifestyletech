import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingCart, 
  User, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2,
  Upload,
  X,
  Download,
  History,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Paperclip
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductSearchInput from '@/components/ProductSearchInput';
import { prService, vendorService } from '@/services/api';
import { notificationService } from '@/services/notification';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbase';
import FileUploadManager from '@/components/ui/FileUploadManager';

interface LineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Attachment {
  id: string;
  file?: File;
  name: string;
  size: string;
  isExisting?: boolean;
  filename?: string;
}

export default function PROther() {
  const { id } = useParams();
  const isEditMode = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [prData, setPrData] = useState<any>(null);
  
  const [vendorId, setVendorId] = useState('');
  const [otherType, setOtherType] = useState('office');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', name: '', unit: '', quantity: 1, unit_price: 0, total_price: 0 },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [pbCategories, setPbCategories] = useState<any[]>([]);

  useEffect(() => {
    pb.collection('product_categories').getFullList({ sort: 'category' })
      .then(result => setPbCategories(result))
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const vendList = await vendorService.getAll();
        setVendors(vendList);

        if (isEditMode && id) {
          const [pr, prItems] = await Promise.all([
            prService.getById(id),
            prService.getItems(id),
          ]);
          
          setPrData(pr);
          setVendorId(pr.vendor || '');
          setOtherType(pr.category || '');
          
          if (prItems.length > 0) {
            setItems(prItems.map((item: any) => ({
              id: item.id,
              name: item.name || '',
              unit: item.unit || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              total_price: item.total_price || 0,
            })));
          }

          // Load existing attachments
          if (pr.attachments && pr.attachments.length > 0) {
            setAttachments(pr.attachments.map((filename: string) => ({
              id: filename,
              name: filename,
              size: '',
              isExisting: true,
              filename: filename,
            })));
          }

          // Load edit history
          try {
            const history = await prService.getHistory(pr.id);
            const historyUserIds = history.map((h: any) => h.by).filter(Boolean);
            if (pr.requester) historyUserIds.push(pr.requester);
            const userIds = [...new Set(historyUserIds)];
            const userMap: Record<string, string> = {};
            
            if (userIds.length > 0) {
              try {
                const users = await pb.collection('users').getFullList({
                  filter: userIds.map((uid: string) => `id = "${uid}"`).join(' || '),
                  fields: 'id,name,email'
                });
                users.forEach((u: any) => {
                  userMap[u.id] = u.name || u.email || 'ไม่ระบุ';
                });
              } catch (e) { console.log('Could not fetch users:', e); }
            }

            const resolvedRequesterName = (pr.requester && userMap[pr.requester]) || pr.requester_name || 'ไม่ระบุ';

            if (history.length === 0) {
              setEditHistory([
                { date: pr.created, action: 'สร้าง PR', by: resolvedRequesterName },
                { date: pr.updated, action: 'ตีกลับเพื่อแก้ไข', by: 'ผู้อนุมัติ' }
              ]);
            } else {
              const historyData = history.map((h: any) => {
                let resolvedName = userMap[h.by] || h.expand?.by?.name || h.expand?.by?.email;
                if (!resolvedName || resolvedName === 'ไม่ระบุ') {
                  if (h.by === pr.requester) resolvedName = pr.requester_name;
                  else if (h.by === pr.head_of_dept_approved_by) resolvedName = pr.head_of_dept_approved_by_name;
                  else if (h.by === pr.manager_approved_by) resolvedName = pr.manager_approved_by_name;
                }
                return { date: h.created, action: h.action, by: resolvedName || 'ไม่ระบุ' };
              });
              
              const hasCreate = historyData.some((h: any) => h.action === 'สร้าง PR');
              if (!hasCreate) {
                historyData.push({ date: pr.created, action: 'สร้าง PR', by: resolvedRequesterName });
              }
              historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
              setEditHistory(historyData);
            }
          } catch (err) {
            const requesterName = pr.requester_name || 'ไม่ระบุ';
            setEditHistory([
              { date: pr.created, action: 'สร้าง PR', by: requesterName },
              { date: pr.updated, action: 'ตีกลับเพื่อแก้ไข', by: 'ผู้อนุมัติ' }
            ]);
          }
        }
      } catch (err) {
        console.error('Data load failed:', err);
        if (isEditMode) toast.error('ไม่พบข้อมูลใบขอซื้อ');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isEditMode]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', unit: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);


  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  const handleSubmit = async (status: string) => {
    if (!vendorId) {
      toast.error('กรุณาเลือกผู้ขาย');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        // Edit mode — update existing PR
        for (const item of items) {
          if (item.id?.length === 15) {
            await pb.collection('pr_items').update(item.id, {
              name: item.name,
              unit: item.unit,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              total_price: Number(item.total_price)
            });
          } else {
            await pb.collection('pr_items').create({
              pr: id,
              name: item.name,
              unit: item.unit,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              total_price: Number(item.total_price)
            });
          }
        }

        // Upload new files
        const newFiles = attachments.filter(a => a.file);
        if (newFiles.length > 0) {
          const formData = new FormData();
          newFiles.forEach(a => {
            if (a.file) formData.append('attachments', a.file);
          });
          await pb.collection('purchase_requests').update(id, formData);
        }

        // Reset approval flow
        await pb.collection('purchase_requests').update(id, {
          vendor: vendorId,
          total_amount: totalAmount,
          category: otherType,
          approval_level: 0,
          head_of_dept_approved_by: '',
          head_of_dept_approved_at: '',
          head_of_dept_comment: '',
          head_of_dept_signature: '',
          head_of_dept_approved_by_name: '',
          manager_approved_by: '',
          manager_approved_at: '',
          manager_comment: '',
          manager_signature: '',
          manager_approved_by_name: '',
        });

        await prService.updateStatus(id, 'pending', 'แก้ไขข้อมูลตามที่ร้องขอ', user?.id);
        toast.success('อัปเดตและส่งใบขอซื้ออีกครั้งเรียบร้อย');
      } else {
        // Create new PR
        const prData = {
          type: 'other',
          category: otherType,
          vendor: vendorId,
          requester: user?.id,
          status: status,
          total_amount: totalAmount,
          requester_name: user?.name || user?.email || 'ไม่ระบุ'
        };

        const prItems = items.map(({ name, unit, quantity, unit_price, total_price }) => ({
          name, unit, quantity, unit_price, total_price
        }));

        const pr = await prService.create(prData, prItems);

        // Upload files
        const newFiles = attachments.filter(a => a.file);
        if (newFiles.length > 0) {
          const formData = new FormData();
          newFiles.forEach(a => {
            if (a.file) formData.append('attachments', a.file);
          });
          await pb.collection('purchase_requests').update(pr.id, formData);
        }

        if (status === 'pending') {
          try {
            await notificationService.notifyNewPR(pr, user?.id || '');
          } catch (err) {
            console.error('Failed to send notification:', err);
          }
        }
        
        toast.success('บันทึกใบขอซื้อเรียบร้อยแล้ว');
      }
      
      window.dispatchEvent(new CustomEvent('refresh-badge-counts'));
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      navigate('/purchase-requests');
    } catch (error) {
      console.error(error);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEditMode && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? 'แก้ไขใบขอซื้อ - อื่นๆ' : 'สร้างใบขอซื้อ - อื่นๆ (General)'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isEditMode 
                ? `${prData?.pr_number || ''} · ${prData?.requester_name || ''}` 
                : 'สำหรับอุปกรณ์สำนักงาน คอมพิวเตอร์ และรายการจัดซื้อทั่วไป'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {isEditMode ? (
            <>
              <Button variant="outline" className="rounded-xl px-6 border-gray-200 font-bold" onClick={() => navigate(-1)}>
                ยกเลิก
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-bold shadow-lg" onClick={() => handleSubmit('pending')} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                ส่งคำขอจัดซื้ออีกครั้ง
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB]" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
              </Button>
              <Button className="bg-[#4B5563] hover:bg-[#1F2937] text-white rounded-xl px-8 font-bold shadow-lg" onClick={() => handleSubmit('pending')} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                ส่งคำขอจัดซื้อ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Rejection Banner */}
      {isEditMode && prData?.status === 'rejected' && (
        <Card className="border-none shadow-sm rounded-2xl bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-700">ใบขอซื้อนี้ถูกตีกลับ</p>
                {(prData?.head_of_dept_comment || prData?.manager_comment) && (
                  <p className="text-sm text-red-600 mt-1">
                    เหตุผล: {prData?.manager_comment || prData?.head_of_dept_comment}
                  </p>
                )}
                <p className="text-xs text-red-400 mt-1">กรุณาแก้ไขข้อมูลแล้วส่งอีกครั้ง</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#1F2937]">
                <ShoppingCart className="w-5 h-5 text-gray-600" /> ข้อมูลการสั่งซื้อ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>หมวดหมู่สินค้า *</Label>
                <Select onValueChange={setOtherType} value={otherType}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {pbCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.category}>{cat.category}</SelectItem>
                    ))}
                    {pbCategories.length === 0 && (
                      <SelectItem value="other" disabled>กำลังโหลดหมวดหมู่...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-gray-600" /> รายการสินค้า / บริการ
              </CardTitle>
              <Button variant="ghost" onClick={addItem} className="text-[#4B5563] font-bold hover:bg-gray-50">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มแถว
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 font-bold border-b border-gray-100">
                      <th className="pb-4 text-left font-bold uppercase text-[10px] tracking-wider">รายการ</th>
                      <th className="pb-4 text-right font-bold uppercase text-[10px] tracking-wider w-20">จำนวน</th>
                      <th className="pb-4 text-right font-bold uppercase text-[10px] tracking-wider w-32">ราคา/หน่วย</th>
                      <th className="pb-4 text-right font-bold uppercase text-[10px] tracking-wider w-32">รวมเงิน</th>
                      <th className="pb-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4 pr-4">
                          <ProductSearchInput
                            value={item.name}
                            onChange={(val) => updateItem(item.id, 'name', val)}
                            onSelectProduct={(product) => {
                              updateItem(item.id, 'name', product.name);
                              updateItem(item.id, 'unit_price', product.unit_price);
                            }}
                            placeholder="ค้นหาหรือระบุชื่อสินค้า..."
                          />
                        </td>
                        <td className="py-4 px-2">
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="h-10 border-none bg-gray-50 rounded-lg text-right" />
                        </td>
                        <td className="py-4 px-2">
                          <Input type="number" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)} className="h-10 border-none bg-gray-50 rounded-lg text-right" />
                        </td>
                        <td className="py-4 pl-4 text-right font-bold text-gray-900 leading-10">
                          {item.total_price.toLocaleString()}.00
                        </td>
                        <td className="py-4 pl-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-9 w-9 text-red-300 hover:text-red-500 rounded-full">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                  <p className="text-3xl font-bold text-gray-900">฿{totalAmount.toLocaleString()}.00</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Paperclip className="w-5 h-5 text-gray-600" /> เอกสารแนบ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadManager
                existingFiles={attachments.filter(a => a.isExisting).map(a => ({
                  name: a.name,
                  url: prData?.id ? getFileUrl(prData.id, a.filename || a.name) : undefined
                }))}
                newFiles={attachments.filter(a => !a.isExisting && a.file).map(a => a.file!)}
                onAddFiles={(files) => {
                  const newAttachments = files.map(file => ({
                    id: Date.now().toString() + Math.random(),
                    file,
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                  }));
                  setAttachments(prev => [...prev, ...newAttachments]);
                }}
                onRemoveExisting={(index) => {
                  const existing = attachments.filter(a => a.isExisting);
                  if (existing[index]) removeAttachment(existing[index].id);
                }}
                onRemoveNew={(index) => {
                  const newOnes = attachments.filter(a => !a.isExisting);
                  if (newOnes[index]) removeAttachment(newOnes[index].id);
                }}
                id="pr-other-files"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-[#1F2937]">
                <User className="w-5 h-5 text-gray-600" /> ข้อมูลผู้ขาย
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>เลือกผู้ขาย *</Label>
                <Select onValueChange={setVendorId} value={vendorId}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกบริษัทผู้ขาย" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Edit History */}
          {isEditMode && editHistory.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle 
                  className="flex items-center justify-between gap-2 text-base font-bold text-[#1F2937] cursor-pointer"
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                >
                  <span className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600" /> ประวัติการดำเนินการ
                    <Badge variant="secondary" className="text-[10px]">{editHistory.length}</Badge>
                  </span>
                  {historyExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </CardTitle>
              </CardHeader>
              {historyExpanded && (
                <CardContent className="pt-2">
                  <div className="space-y-3">
                    {editHistory.map((h, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            h.action.includes('ตีกลับ') || h.action.includes('ปฏิเสธ') ? 'bg-red-400' :
                            h.action.includes('อนุมัติ') ? 'bg-green-400' :
                            h.action.includes('สร้าง') ? 'bg-blue-400' :
                            'bg-gray-300'
                          }`} />
                          {i < editHistory.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm font-bold text-gray-900">{h.action}</p>
                          <p className="text-xs text-gray-500">{h.by}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(h.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} 
                            {' '}
                            {new Date(h.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
