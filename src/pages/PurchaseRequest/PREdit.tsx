import { useState, useEffect, useRef } from 'react';
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
  ChevronUp
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
        
        try {
          const history = await prService.getHistory(pr.id);
          const historyData = history.map((h: any) => ({
            date: h.created,
            action: h.action,
            by: h.expand?.by?.name || h.expand?.by?.email || 'ไม่ระบุ'
          }));
          
          const hasCreateAction = historyData.some((h: any) => h.action === 'สร้าง PR');
          if (!hasCreateAction) {
            const createdDate = pr.created;
            const requesterName = pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
            historyData.push({
              date: createdDate || new Date().toISOString(),
              action: 'สร้าง PR',
              by: requesterName
            });
          }
          
          historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEditHistory(historyData);
        } catch (err) {
          const createdDate = pr.created || pr.expand?.requester?.created;
          const requesterName = pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
          
          setEditHistory([
            { 
              date: createdDate || new Date().toISOString(), 
              action: 'สร้าง PR ครั้งแรก', 
              by: requesterName 
            },
            { 
              date: pr.updated || new Date().toISOString(), 
              action: 'ตีกลับเพื่อแก้ไข', 
              by: 'ผู้อนุมัติ' 
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
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">แก้ไขใบขอซื้อ (Edit PR)</h1>
            <p className="text-sm text-gray-500 mt-1 font-bold uppercase tracking-widest">รหัสใบขอซื้อ: {prData?.pr_number}</p>
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

      {/* Rejection Reason Banner */}
      <Card className="bg-red-50 border-none rounded-2xl shadow-sm">
        <CardContent className="p-6 flex gap-4">
          <div className="p-3 bg-red-100 rounded-2xl h-fit">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">เหตุผลที่ต้องแก้ไข</p>
            <p className="text-sm text-red-900 font-bold leading-relaxed">{prData?.rejection_reason || 'กรุณาตรวจสอบรายละเอียดรายการและราคาต่อหน่วยให้ตรงกับใบเสนอราคาล่าสุดค่ะ'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="w-5 h-5 text-blue-600" /> ข้อมูลโครงการ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">โครงการ</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900">
                    {selectedProject?.code && (
                      <span className="text-blue-600 mr-2">[{selectedProject.code}]</span>
                    )}
                    {selectedProject?.name || 'ไม่ระบุ'}
                  </span>
                </div>
              </div>

              {prData?.delivery_location && (
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">สถานที่ส่งของ</Label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{prData.delivery_location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-blue-600" /> รายการวัสดุอุปกรณ์
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
                          {item.total_price?.toLocaleString()}
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
          {/* Budget Status */}
          {budgetInfo && budgetInfo.budget > 0 && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <DollarSign className="w-5 h-5 text-blue-600" /> งบประมาณโครงการ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{budgetInfo.percentage}% Used</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">เหลือ: {(budgetInfo.budget - budgetInfo.spent).toLocaleString()} THB</p>
                    <p className="text-xs text-gray-400">งบทั้งหมด: {budgetInfo.budget.toLocaleString()} THB</p>
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
              </CardContent>
            </Card>
          )}

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
                          onClick={() => setVendorIds(vendorIds.filter(id => id !== vendor.id))}
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

          {/* Existing Attachments */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" /> เอกสารแนบเดิม
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachments.length > 0 ? (
                attachments.map((file, index) => (
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
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">ไม่มีเอกสารแนบ</p>
              )}
            </CardContent>
          </Card>

          {/* New Attachments Upload */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">เอกสารอ้างอิงใหม่</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors group"
                onClick={triggerFileInput}
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-700">อัปโหลดไฟล์</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">PDF, XLSX (MAX 10MB)</p>
              </div>
              
              {newAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ไฟล์ที่เลือก:</p>
                  {newAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
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
            </CardContent>
          </Card>

          {/* Edit History */}
          {editHistory.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="py-5 px-6 bg-blue-50/80 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-600">
                  <History className="w-4 h-4" /> ประวัติการแก้ไข
                  <span className="bg-blue-400 text-white px-2 py-0.5 rounded-full text-[10px]">
                    {editHistory.length}
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
                      <><ChevronDown className="w-4 h-4 mr-1" /> ขยาย</>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-blue-50/30">
                {(historyExpanded ? editHistory : editHistory.slice(-3)).map((history, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm p-3 bg-white rounded-xl border border-blue-100">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      index === editHistory.length - 1 ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{history.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
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
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons removed - moved to header */}
        </div>
      </div>
    </div>
  );
}
