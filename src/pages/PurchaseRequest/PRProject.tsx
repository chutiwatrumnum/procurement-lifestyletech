import { useState, useEffect } from 'react';
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
  Building2, 
  User, 
  MapPin, 
  Upload, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2,
  Paperclip
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { prService, projectService, vendorService } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function PRProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data lists
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [poRef, setPoRef] = useState('PO-8829-X');
  const [location, setLocation] = useState('ระบุที่อยู่ในการจัดส่งสินค้า');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', name: 'Concrete Mix (240 ksc)', unit: 'คิว (m3)', quantity: 50, unit_price: 2200, total_price: 110000 },
    { id: '2', name: 'Steel Rebar DB12', unit: 'เส้น (PCS)', quantity: 200, unit_price: 245, total_price: 49000 },
  ]);

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

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', unit: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
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

  const handleSubmit = async (status: string) => {
    if (!projectId || !vendorId) {
      toast.error('กรุณาเลือกโครงการและผู้ขาย');
      return;
    }

    setIsSubmitting(true);
    try {
      const prData = {
        pr_number: `PR-${Date.now().toString().slice(-6)}`,
        type: 'project',
        project: projectId,
        vendor: vendorId,
        po_ref: poRef,
        delivery_location: location,
        requester: user?.id,
        status: status,
        total_amount: totalAmount,
      };

      const prItems = items.map(({ name, unit, quantity, unit_price, total_price }) => ({
        name, unit, quantity, unit_price, total_price
      }));

      await prService.create(prData, prItems);
      toast.success(status === 'draft' ? 'บันทึกร่างเรียบร้อย' : 'ส่งใบขอซื้อเรียบร้อยแล้ว');
      navigate('/purchase-requests');
    } catch (error) {
      console.error(error);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVendor = vendors.find(v => v.id === vendorId);

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างใบขอซื้อ - โครงการ</h1>
          <p className="text-sm text-gray-500 mt-1">เลขที่ใบขอซื้อ: PR-2023-0042 • วันที่: 24 ต.ค. 2566</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB] font-bold" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
          </Button>
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl px-8 font-bold shadow-lg shadow-blue-500/20" onClick={() => handleSubmit('pending')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งอนุมัติ
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
                <Building2 className="w-5 h-5 text-blue-600" /> ข้อมูลโครงการ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">ชื่อโครงการ *</Label>
                  <Select onValueChange={setProjectId}>
                    <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                      <SelectValue placeholder="เลือกโครงการที่ต้องการ" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold text-sm">อ้างอิง PO จากผู้พัฒนา (แนบไฟล์) *</Label>
                  <div className="relative">
                    <Input value={poRef} onChange={(e) => setPoRef(e.target.value)} className="h-11 rounded-xl bg-gray-50 border-none pl-10" />
                    <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">สถานที่ส่งของ</Label>
                <div className="relative">
                  <Textarea value={location} onChange={(e) => setLocation(e.target.value)} rows={3} className="rounded-xl bg-gray-50 border-none pl-10" />
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
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
                      <th className="py-4 text-center w-20">หน่วย</th>
                      <th className="py-4 text-center w-20">จำนวน</th>
                      <th className="py-4 text-right w-28">ราคาต่อหน่วย</th>
                      <th className="py-4 text-right w-28">รวมเงิน</th>
                      <th className="py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="py-4 pr-4">
                          <Input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="ระบุชื่อสินค้า..." className="h-10 border-none bg-gray-50 rounded-xl" />
                        </td>
                        <td className="py-4 px-1">
                          <Input value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="h-10 border-none bg-gray-50 rounded-xl text-center" />
                        </td>
                        <td className="py-4 px-1">
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="h-10 border-none bg-gray-50 rounded-xl text-center font-bold" />
                        </td>
                        <td className="py-4 px-1">
                          <Input type="number" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)} className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" />
                        </td>
                        <td className="py-4 pl-4 text-right font-black text-gray-900 leading-10">
                          {item.total_price.toLocaleString()}.00
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                  <p className="text-4xl font-black text-blue-600 tracking-tighter">฿{totalAmount.toLocaleString()}.00</p>
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
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ขายหลัก *</Label>
                <Select onValueChange={setVendorId}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกบริษัทผู้ขาย" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedVendor && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">ข้อมูลติดต่อผู้ขาย</p>
                  <p className="font-bold text-blue-900">{selectedVendor.contact_person}</p>
                  <p className="text-sm text-blue-700">{selectedVendor.email}</p>
                  <p className="text-sm text-blue-700">{selectedVendor.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">เอกสารแนบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors group">
                <div className="p-3 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-700">อัปโหลดไฟล์</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">PDF, XLSX (MAX 10MB)</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-xs"><FileText className="h-4 w-4 text-red-500" /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 truncate w-32">Initial PO Spec.pdf</p>
                    <p className="text-[10px] text-gray-400">1.2 MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="bg-[#1F2937] text-white border-none rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <FileText className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">สถานะปัจจุบัน</p>
              <div className="flex items-center gap-2 text-yellow-400 mb-4">
                <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <p className="font-black">โดยแบบร่าง (Draft)</p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                เมื่อกรอกข้อมูลเสร็จสิ้น ระบบจะส่งเรื่องไปยัง ผู้จัดการโครงการ (Project Manager) เพื่อทำการตรวจสอบและอนุมัติต่อไปค่ะ
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
