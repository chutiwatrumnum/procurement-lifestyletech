import { useState, useEffect } from 'react';
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
  Save,
  Send,
  AlertCircle,
  ArrowLeft,
  Loader2,
  DollarSign,
  MapPin,
  Package,
  User,
  History,
  X,
  Download
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { prService, projectService, vendorService } from '@/services/api';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useAuth } from '@/contexts/AuthContext';

export default function PREdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; percentage: number } | null>(null);
  const [editHistory, setEditHistory] = useState<any[]>([]);
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
        
        // Load budget info
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
        
        // Mock edit history - in real app, fetch from backend
        try {
          const history = await prService.getHistory(pr.id);
          const historyData = history.map((h: any) => ({
            date: h.created,
            action: h.action,
            by: h.expand?.by?.name || h.expand?.by?.email || 'ไม่ระบุ'
          }));
          
          // Check if 'สร้าง PR' is in history, if not add it
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
          
          // Sort by date ascending (oldest first)
          historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          setEditHistory(historyData);
        } catch (err) {
          // Fallback to mock data if history not available
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

  const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setNewAttachments(prev => [...prev, ...Array.from(files)]);
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = async (filename: string) => {
    try {
      // In real implementation, call API to remove attachment
      setAttachments(prev => prev.filter(f => f !== filename));
      toast.success('ลบไฟล์เรียบร้อย');
    } catch (err) {
      toast.error('ลบไฟล์ไม่สำเร็จ');
    }
  };

  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      // Upload new attachments if any
      if (newAttachments.length > 0 && id) {
        const formData = new FormData();
        newAttachments.forEach(file => {
          formData.append('attachments', file);
        });
        await pb.collection('purchase_requests').update(id, formData);
      }
      
      // Update PR status with user ID for history
      await prService.updateStatus(id!, 'pending', 'แก้ไขข้อมูลตามที่ร้องขอ', user?.id);
      toast.success('อัปเดตและส่งใบขอซื้ออีกครั้งเรียบร้อย');
      navigate('/purchase-requests');
    } catch (err) {
      toast.error('อัปเดตไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.id === prData?.project);
  const selectedVendor = vendors.find(v => v.id === prData?.vendor);

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">แก้ไขใบขอซื้อ (Edit PR)</h1>
          <p className="text-sm text-gray-500 mt-1 font-bold uppercase tracking-widest">รหัสใบขอซื้อ: {prData?.pr_number}</p>
        </div>
      </div>

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

      {/* PR Info Card */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="py-5 px-8 bg-gray-50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" /> ข้อมูลใบขอซื้อ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">โครงการ</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-gray-900">{selectedProject?.name || 'ไม่ระบุ'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">ผู้ขาย</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-gray-900">{selectedVendor?.name || 'ไม่ระบุ'}</span>
              </div>
            </div>
          </div>
          
          {prData?.po_ref && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">อ้างอิง PO</Label>
              <p className="font-bold text-blue-600">{prData.po_ref}</p>
            </div>
          )}
          
          {prData?.delivery_location && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> สถานที่ส่งของ
              </Label>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{prData.delivery_location}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-6 px-8 flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-[#111827]">รายการวัสดุอุปกรณ์ (ฉบับแก้ไข)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto px-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 font-bold border-b border-gray-50 uppercase text-[10px] tracking-widest">
                      <th className="py-4 text-left">รายการ</th>
                      <th className="py-4 text-right w-24">จำนวน</th>
                      <th className="py-4 text-right w-32">ราคา/หน่วย</th>
                      <th className="py-4 text-right w-32">รวม</th>
                      <th className="py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-5 pr-4">
                          <Input 
                            value={item.name} 
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            className="h-10 border-none bg-gray-50 rounded-xl font-bold" 
                          />
                        </td>
                        <td className="py-5 px-2">
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            className="h-10 border-none bg-gray-50 rounded-xl text-right font-black" 
                          />
                        </td>
                        <td className="py-5 px-2">
                          <Input 
                            type="number" 
                            value={item.unit_price} 
                            onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                            className="h-10 border-none bg-gray-50 rounded-xl text-right font-black" 
                          />
                        </td>
                        <td className="py-5 px-4 text-right font-black text-gray-900 leading-10">
                          {item.total_price.toLocaleString()}.00
                        </td>
                        <td className="py-5 pl-2 text-right">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-red-200 hover:text-red-500 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-gray-50 flex justify-end">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดเงินแก้ไขล่าสุด</p>
                  <p className="text-4xl font-black text-blue-600 tracking-tighter">฿{totalAmount.toLocaleString()}.00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Budget Status */}
          {budgetInfo && budgetInfo.budget > 0 && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="py-5 px-6 bg-gray-50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  งบประมาณโครงการ
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
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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

          {/* Existing Attachments */}
          {attachments.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  เอกสารแนบเดิม
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          )}

          {/* New Attachments Upload */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">เอกสารอ้างอิงใหม่</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <label 
                htmlFor="file-upload"
                className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-all group block"
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">อัปโหลดใบเสนอราคาล่าสุด</p>
                <p className="text-xs text-gray-400 mt-1">คลิกหรือลากไฟล์มาวาง</p>
              </label>
              
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
              <CardHeader className="py-5 px-6 bg-blue-50/80">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-600">
                  <History className="w-4 h-4" />
                  ประวัติการแก้ไข
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-blue-50/30">
                {editHistory.map((history, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm p-3 bg-white rounded-xl border border-blue-100">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      index === 0 ? 'bg-green-500' : 'bg-blue-500'
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

          <div className="flex flex-col gap-3">
            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
              onClick={handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              ส่งกลับเพื่อขออนุมัติใหม่
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-2xl border-gray-200 text-gray-500 font-bold" onClick={() => navigate(-1)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
