import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Upload, 
  Plus, 
  Trash2,
  FileText,
  Send,
  AlertCircle,
  ArrowLeft,
  Loader2,
  DollarSign,
  User,
  History,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Paperclip
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { prService, projectService, vendorService } from '@/services/api';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PREdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; percentage: number } | null>(null);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [pr, prItems, projList, vendList] = await Promise.all([
          prService.getById(id),
          prService.getItems(id),
          projectService.getAll(),
          vendorService.getAll()
        ]);
        
        setPrData(pr);
        setItems(prItems);
        setProjects(projList);
        setVendors(vendList);
        setAttachments(pr.attachments || []);
        
        if (pr.vendor) {
          if (Array.isArray(pr.vendor)) {
            setVendorIds(pr.vendor);
          } else {
            setVendorIds([pr.vendor]);
          }
        } else {
          setVendorIds([]);
        }
        
        if (pr.expand?.project?.id) {
          const projectBudget = pr.expand.project.budget || 0;
          const totalSpent = await prService.getProjectTotalSpent(pr.expand.project.id);
          const percentage = projectBudget > 0 ? Math.round((totalSpent / projectBudget) * 100) : 0;
          setBudgetInfo({
            budget: projectBudget,
            spent: totalSpent,
            percentage: Math.min(percentage, 100)
          });
        }
        
        // Load edit history from pr_history collection
        try {
          const history = await prService.getHistory(pr.id);
          
          // Collect all user IDs from history to fetch names
          const userIds = [...new Set(history.map((h: any) => h.by).filter(Boolean))];
          const userMap: Record<string, string> = {};
          
          // Fetch user names
          if (userIds.length > 0) {
            try {
              const users = await pb.collection('users').getFullList({
                filter: userIds.map((uid: string) => `id = "${uid}"`).join(' || '),
                fields: 'id,name,email'
              });
              users.forEach((u: any) => {
                userMap[u.id] = u.name || u.email || 'ไม่ระบุ';
              });
            } catch (e) {
              console.log('Could not fetch users:', e);
            }
          }
          
          // If no history records, create from PR data
          if (history.length === 0) {
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
                action: 'ตีกลับเพื่อแก้ไข', 
                by: 'ผู้อนุมัติ',
                oldAttachments: []
              }
            ]);
          } else {
            const historyData = history.map((h: any) => ({
              date: h.created,
              action: h.action,
              by: userMap[h.by] || h.expand?.by?.name || h.expand?.by?.email || 'ไม่ระบุ',
              oldAttachments: h.old_attachments || []
            }));
            
            // Check if 'สร้าง PR' is in history, if not add it
            const hasCreateAction = historyData.some((h: any) => h.action === 'สร้าง PR');
            if (!hasCreateAction) {
              const createdDate = pr.created;
              const requesterName = pr.requester_name || pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
              historyData.push({
                date: createdDate || new Date().toISOString(),
                action: 'สร้าง PR',
                by: requesterName,
                oldAttachments: []
              });
            }
            
            // Sort by date ascending (oldest first)
            historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            setEditHistory(historyData);
          }
        } catch (err) {
          const createdDate = pr.created || pr.expand?.requester?.created;
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
              action: 'ตีกลับเพื่อแก้ไข', 
              by: 'ผู้อนุมัติ',
              oldAttachments: []
            }
          ]);
        }
      } catch (err) {
        toast.error('ไม่พบข้อมูลใบขอซื้อ');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      pr: id
    };
    setItems([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setNewAttachments([...newAttachments, ...Array.from(files)]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments(newAttachments.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (file: string) => {
    setAttachments(attachments.filter(a => a !== file));
  };

  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  const handleUpdate = async () => {
    if (!id) return;
    setIsSubmitting(true);
    
    try {
      // Update items
      for (const item of items) {
        if (item.id?.length === 15) {
          await pb.collection('pr_items').update(item.id, {
            name: item.name,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price)
          });
        } else {
          await pb.collection('pr_items').create({
            pr: id,
            name: item.name,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price)
          });
        }
      }
      
      if (newAttachments.length > 0) {
        const formData = new FormData();
        newAttachments.forEach(file => {
          formData.append('attachments', file);
        });
        await pb.collection('purchase_requests').update(id, formData);
      }
      
      await pb.collection('purchase_requests').update(id!, {
        vendor: vendorIds[0],
        vendors: vendorIds,
      });
      
      await prService.updateStatus(id!, 'pending', 'แก้ไขข้อมูลตามที่ร้องขอ', user?.id);
      toast.success('อัปเดตและส่งใบขอซื้ออีกครั้งเรียบร้อย');
      // Refresh badge counts
      window.dispatchEvent(new CustomEvent('refresh-badge-counts'));
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/purchase-requests');
    } catch (err: any) {
      console.error('Update error:', err);
      toast.error('อัปเดตไม่สำเร็จ: ' + (err?.message || err?.data?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.id === prData?.project);
  const selectedVendors = vendors.filter(v => vendorIds.includes(v.id));

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">แก้ไขใบขอซื้อ</h1>
            <p className="text-sm text-gray-500 mt-1 font-bold uppercase tracking-widest">
              {prData?.pr_number} · {prData?.requester_name || prData?.expand?.requester?.name || 'ไม่ระบุผู้ร้องขอ'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl px-6 border-gray-200 font-bold"
            onClick={() => navigate(-1)}
          >
            ยกเลิก
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8 font-bold shadow-lg shadow-blue-500/20"
            onClick={handleUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งกลับเพื่อขออนุมัติใหม่
          </Button>
        </div>
      </div>

      {/* Rejection Reason Banner — only show when real reason exists */}
      {prData?.rejection_reason && (
        <Card className="bg-red-50 border-none rounded-2xl shadow-sm">
          <CardContent className="p-6 flex gap-4">
            <div className="p-3 bg-red-100 rounded-2xl h-fit">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">เหตุผลที่ต้องแก้ไข</p>
              <p className="text-sm text-red-900 font-bold leading-relaxed">{prData.rejection_reason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Summary Card: Project + Budget + Delivery combined */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="w-5 h-5 text-blue-600" /> ข้อมูลสรุป
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project + Requester row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">โครงการ</p>
                  <p className="font-bold text-gray-900">
                    {selectedProject?.code && (
                      <span className="text-blue-600 mr-1">[{selectedProject.code}]</span>
                    )}
                    {selectedProject?.name || 'ไม่ระบุ'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ผู้ร้องขอ</p>
                  <p className="font-bold text-gray-900">{prData?.requester_name || prData?.expand?.requester?.name || 'ไม่ระบุ'}</p>
                </div>
              </div>

              {/* Delivery location */}
              {prData?.delivery_location && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">สถานที่ส่งของ</p>
                  <p className="text-sm font-medium text-gray-900">{prData.delivery_location}</p>
                </div>
              )}

              {/* Budget bar — if available */}
              {budgetInfo && budgetInfo.budget > 0 && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">งบประมาณโครงการ</p>
                    <p className="text-sm font-black text-gray-900">{budgetInfo.percentage}%</p>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        budgetInfo.percentage >= 90 ? 'bg-red-500' : 
                        budgetInfo.percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${budgetInfo.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>ใช้แล้ว: ฿{budgetInfo.spent.toLocaleString()}</span>
                    <span>เหลือ: ฿{(budgetInfo.budget - budgetInfo.spent).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-blue-600" /> รายการวัสดุอุปกรณ์
                <Badge variant="secondary" className="ml-1 text-xs">{items.length} รายการ</Badge>
              </CardTitle>
              <Button variant="ghost" onClick={addItem} className="text-blue-600 font-bold hover:bg-blue-50 h-9">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#9CA3AF] font-bold border-b border-gray-50 uppercase text-[10px] tracking-widest">
                      <th className="py-4 text-left">รายละเอียดสินค้า</th>
                      <th className="py-4 text-center w-24">จำนวน</th>
                      <th className="py-4 text-right w-28">ราคา/หน่วย</th>
                      <th className="py-4 text-right w-28">รวม</th>
                      <th className="py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="py-4 pr-4">
                          <Input 
                            value={item.name} 
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="ระบุชื่อสินค้า..."
                            className="h-10 border-none bg-gray-50 rounded-xl font-bold" 
                          />
                        </td>
                        <td className="py-4 px-1">
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            className="h-10 border-none bg-gray-50 rounded-xl text-center font-bold" 
                          />
                        </td>
                        <td className="py-4 px-1">
                          <Input 
                            type="number" 
                            value={item.unit_price} 
                            onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                            className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" 
                          />
                        </td>
                        <td className="py-4 pl-4 text-right font-black text-gray-900 leading-10">
                          ฿{item.total_price?.toLocaleString()}
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                  <p className="text-4xl font-black text-blue-600 tracking-tighter">฿{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Vendor Card */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-white pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <User className="w-5 h-5 text-blue-600" /> ข้อมูลผู้ขาย
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ขาย *</Label>
                <Select 
                  onValueChange={(value) => {
                    if (!vendorIds.includes(value)) {
                      setVendorIds([...vendorIds, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกบริษัทผู้ขาย" />
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
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {vendor.name}
                        <button 
                          type="button"
                          onClick={() => setVendorIds(vendorIds.filter(vid => vid !== vendor.id))}
                          className="hover:text-blue-900 ml-1"
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
                    <div key={vendor.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{vendor.name}</p>
                      <p className="font-bold text-blue-900">{vendor.contact_person}</p>
                      <p className="text-sm text-blue-700">{vendor.email}</p>
                      <p className="text-sm text-blue-700">{vendor.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Combined Attachments Card */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" /> เอกสารแนบ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing files */}
              {attachments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">เอกสารเดิม</p>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <FileText className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{file}</p>
                        </div>
                        <div className="flex gap-1">
                          <a 
                            href={getFileUrl(id!, file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => removeExistingAttachment(file)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload new files */}
              <div>
                {attachments.length > 0 && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">เพิ่มเอกสารใหม่</p>
                )}
                <div 
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={triggerFileInput}
                >
                  <div className="p-2.5 bg-white rounded-xl shadow-sm w-fit mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-700">อัปโหลดไฟล์</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">PDF, XLSX, JPG (MAX 10MB)</p>
                </div>
              </div>

              {/* Newly selected files */}
              {newAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">ไฟล์ใหม่ที่เลือก</p>
                  {newAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2.5 bg-green-50 rounded-xl border border-green-100">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700 flex-1 truncate font-medium">{file.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                        onClick={() => removeNewAttachment(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length === 0 && newAttachments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">ยังไม่มีเอกสารแนบ</p>
              )}
            </CardContent>
          </Card>

          {/* Edit History */}
          {editHistory.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="py-5 px-6 bg-blue-50/80 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-600">
                  <History className="w-4 h-4" /> ประวัติการดำเนินการ
                  <span className="bg-blue-400 text-white px-2 py-0.5 rounded-full text-[10px]">
                    {editHistory.length} รายการ
                  </span>
                </CardTitle>
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
              </CardHeader>
              <CardContent className="p-6 bg-blue-50/30">
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
                      {history.oldAttachments && history.oldAttachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> เอกสารแนบก่อนหน้า ({history.oldAttachments.length} ไฟล์)
                          </p>
                          <div className="space-y-2">
                            {history.oldAttachments.map((file: string, idx: number) => (
                              <a
                                key={idx}
                                href={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${id}/${file}`}
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
