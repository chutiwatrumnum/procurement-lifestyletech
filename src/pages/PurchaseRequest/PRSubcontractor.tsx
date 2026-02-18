import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { prService, projectService, vendorService } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbase';

interface LineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;        // ราคาซื้อจริง (แก้ไขได้)
  reference_price: number;   // ราคาอ้างอิงจาก project_items
  total_price: number;
  project_item_id?: string;
  max_quantity?: number; // จำนวนสูงสุดที่เบิกได้
}

interface Attachment {
  id: string;
  file: File;
  name: string;
  size: string;
}

export default function PRSubcontractor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data lists
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [projList, vendList] = await Promise.all([
          projectService.getAll(),
          vendorService.getAll()
        ]);
        setProjects(projList);
        setVendors(vendList);
      } catch (err) {
        console.error('Data load failed');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load project items when project changes
  useEffect(() => {
    async function loadProjectItems() {
      if (!projectId) {
        setItems([]);
        return;
      }
      try {
        // Get project items
        const projectItems = await pb.collection('project_items').getFullList({
          filter: `project = "${projectId}"`,
          sort: 'name'
        }).catch(() => []);
        
        // Get approved PR Subs to calculate remaining quantity
        const prSubsApproved = await pb.collection('purchase_requests').getFullList({
          filter: `project = "${projectId}" && type = "sub" && status = "approved"`
        }).catch(() => []);

        // Calculate withdrawn quantities
        const withdrawnMap: Record<string, number> = {};
        for (const prSub of prSubsApproved) {
          const prItems = await pb.collection('pr_items').getFullList({
            filter: `pr = "${prSub.id}"`
          });
          for (const item of prItems) {
            if (item.project_item) {
              withdrawnMap[item.project_item] = (withdrawnMap[item.project_item] || 0) + (item.quantity || 0);
            }
          }
        }
        
        if (projectItems.length > 0) {
          // Filter only items with remaining quantity > 0
          const availableItems = projectItems
            .map((item: any) => {
              const initialQty = item.initial_quantity || item.quantity || 0;
              const withdrawn = withdrawnMap[item.id] || 0;
              const remaining = Math.max(0, initialQty - withdrawn);
              
              return {
                id: item.id || Date.now().toString() + Math.random(),
                project_item_id: item.id,
                name: item.name || '',
                unit: item.unit || 'งาน',
                quantity: remaining, // ใช้จำนวนคงเหลือแทน
                reference_price: item.unit_price || 0,
                unit_price: item.unit_price || 0,
                total_price: remaining * (item.unit_price || 0),
                max_quantity: remaining // เก็บจำนวนสูงสุดไว้ตรวจสอบ
              };
            })
            .filter((item: any) => item.quantity > 0); // กรองเฉพาะที่มีคงเหลือ

          if (availableItems.length > 0) {
            setItems(availableItems);
          } else {
            // ไม่มีอุปกรณ์คงเหลือ - set เป็น array ว่างเพื่อแสดง empty state
            setItems([]);
          }
        } else {
          // ไม่มี project_items เลย
          setItems([]);
        }
      } catch (err) {
        console.error('Load project items failed:', err);
        setItems([]);
      }
    }
    loadProjectItems();
  }, [projectId]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', unit: 'งาน', quantity: 1, unit_price: 0, reference_price: 0, total_price: 0, max_quantity: undefined }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        // ตรวจสอบไม่ให้ติดลบ
        if (field === 'quantity') {
          const numValue = Math.max(0, Number(value)); // ขั้นต่ำ 0
          
          // ตรวจสอบจำนวนสูงสุด
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
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const uploadAttachments = async (prId: string) => {
    if (attachments.length === 0) return;

    const formData = new FormData();
    attachments.forEach(att => {
      formData.append('attachments', att.file);
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

    // ตรวจสอบว่ามีรายการอุปกรณ์ที่สามารถเบิกได้หรือไม่
    const validItems = items.filter(item => 
      item.name?.trim() && 
      item.quantity > 0 && 
      item.unit_price >= 0
    );
    
    if (validItems.length === 0) {
      toast.error('ไม่มีรายการอุปกรณ์ที่สามารถเบิกได้ (stock หมด หรือไม่มีรายการ)');
      return;
    }

    if (!user?.id) {
      toast.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    setIsSubmitting(true);
    try {
      const prData: any = {
        type: 'sub',
        project: projectId,
        vendor: vendorIds[0] || '',
        delivery_location: location,
        status: status,
        total_amount: totalAmount,
      };

      // Only add requester if user is logged in and exists in users collection
      try {
        if (user?.id) {
          await pb.collection('users').getOne(user.id);
          prData.requester = user.id;
        }
      } catch (e) {
        console.log('User not found in users collection, skipping requester field');
      }

      const prItems = validItems.map(({ name, unit, quantity, unit_price, total_price, project_item_id }) => ({
        name, unit, quantity, unit_price, total_price,
        project_item: project_item_id
      }));

      const pr = await prService.create(prData, prItems);
      
      // Upload attachments if any
      if (attachments.length > 0) {
        await uploadAttachments(pr.id);
      }

      toast.success(status === 'draft' ? 'บันทึกร่างเรียบร้อย' : 'ส่งใบขอซื้อย่อยเรียบร้อยแล้ว');
      
      // Navigate to PO approval page after submit
      if (status === 'pending') {
        navigate('/purchase-orders/approval');
      } else {
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
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างใบขอซื้อ - งานย่อย (Sub-contractor)</h1>
          <p className="text-sm text-gray-500 mt-1">สำหรับการจ้างเหมาช่วง งานระบบ และงานบริการเฉพาะทาง</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB] font-bold" onClick={() => handleSubmit('draft')} disabled={isSubmitting || items.length === 0}>
            <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
          </Button>
          <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl px-8 font-bold shadow-lg shadow-purple-500/20" onClick={() => handleSubmit('pending')} disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งขออนุมัติงานย่อย
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Wrench className="w-5 h-5 text-purple-600" /> ข้อมูลโครงการและหน้างาน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">เลือกโครงการ *</Label>
                <Select onValueChange={setProjectId}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกโครงการที่ต้องการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject?.location && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">สถานที่โครงการ</p>
                  <p className="text-gray-700">{selectedProject.location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-purple-600" /> รายละเอียดงานจ้างเหมา
              </CardTitle>
              {/* ไม่มีปุ่มเพิ่มรายการ - ใช้รายการจาก project_items เท่านั้น */}
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="p-4 bg-orange-50 rounded-full w-fit mx-auto mb-4">
                    <Package className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-700 mb-2">ไม่มีอุปกรณ์คงเหลือในโครงการ</p>
                  <p className="text-sm text-gray-500 mb-6">กรุณาสร้าง PR Project ใหม่เพื่อเพิ่มอุปกรณ์เข้าโครงการ</p>
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
                      <th className="py-4 text-left">รายละเอียดงาน / บริการ</th>
                      <th className="py-4 text-right w-20">จำนวน</th>
                      <th className="py-4 text-right w-28 text-blue-400">ราคาอ้างอิง</th>
                      <th className="py-4 text-right w-32">ราคาซื้อจริง</th>
                      <th className="py-4 text-right w-28">รวมเงิน</th>
                      <th className="py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="py-4 pr-4">
                          <Input 
                            value={item.name} 
                            disabled 
                            className="h-10 border-none bg-gray-100 rounded-xl text-gray-700 cursor-not-allowed" 
                          />
                        </td>
                        <td className="py-4 px-1">
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" />
                        </td>
                        <td className="py-4 px-1 text-right">
                          <p className="text-sm text-gray-400">{item.reference_price > 0 ? item.reference_price.toLocaleString() : '-'}</p>
                        </td>
                        <td className="py-4 px-1">
                          <Input type="number" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)} className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" />
                        </td>
                        <td className="py-4 pl-4 text-right font-black text-gray-900 leading-10">
                          {item.total_price.toLocaleString()}
                        </td>
                        <td className="py-4 pl-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-red-200 hover:text-red-500 rounded-full">
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมค่าจ้างเหมาทั้งหมด</p>
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
                
                {/* Selected vendors tags */}
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
              
              {attachments.map((att) => (
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
                <p className="font-black">ฉบับร่าง (Draft)</p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                เมื่อกรอกข้อมูลเสร็จสิ้น ระบบจะส่งเรื่องไปยังผู้จัดการโครงการเพื่อทำการตรวจสอบและอนุมัติต่อไปค่ะ
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
