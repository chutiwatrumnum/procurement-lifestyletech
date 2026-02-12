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
  Wrench, 
  User, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2
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

export default function PRSubcontractor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', name: '', unit: 'งาน', quantity: 1, unit_price: 0, total_price: 0 },
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
      }
    }
    loadData();
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', unit: 'งาน', quantity: 1, unit_price: 0, total_price: 0 }]);
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
      toast.error('กรุณาเลือกโครงการและผู้รับเหมา');
      return;
    }

    setIsSubmitting(true);
    try {
      const prData = {
        pr_number: `SUB-${Date.now().toString().slice(-6)}`,
        type: 'sub',
        project: projectId,
        vendor: vendorId,
        requester: user?.id,
        status: status,
        total_amount: totalAmount,
      };

      const prItems = items.map(({ name, unit, quantity, unit_price, total_price }) => ({
        name, unit, quantity, unit_price, total_price
      }));

      await prService.create(prData, prItems);
      toast.success(status === 'draft' ? 'บันทึกร่างเรียบร้อย' : 'ส่งใบขอซื้อย่อยเรียบร้อยแล้ว');
      navigate('/purchase-requests');
    } catch (error) {
      console.error(error);
      toast.error('บันทึกไม่สำเร็จ กรุณาเช็ค API Rules');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างใบขอซื้อ - งานย่อย (Sub-contractor)</h1>
          <p className="text-gray-500 text-sm mt-1">สำหรับการจ้างเหมาช่วง งานระบบ และงานบริการเฉพาะทาง</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB]" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
          </Button>
          <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl px-8 font-bold shadow-lg shadow-purple-500/20" onClick={() => handleSubmit('pending')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งขออนุมัติงานย่อย
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Wrench className="w-5 h-5 text-purple-600" /> ข้อมูลโครงการและหน้างาน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>เลือกโครงการ *</Label>
                <Select onValueChange={setProjectId}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกโครงการที่ต้องการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-purple-600" /> รายละเอียดงานจ้างเหมา
              </CardTitle>
              <Button variant="ghost" onClick={addItem} className="text-purple-600 font-bold hover:bg-purple-50">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการจ้าง
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 font-bold border-b border-gray-100">
                      <th className="pb-4 text-left font-bold uppercase text-[10px] tracking-wider">รายละเอียดงาน / บริการ</th>
                      <th className="pb-4 text-center font-bold uppercase text-[10px] tracking-wider w-24">หน่วย</th>
                      <th className="pb-4 text-right font-bold uppercase text-[10px] tracking-wider w-20">จำนวน</th>
                      <th className="pb-4 text-right font-bold uppercase text-[10px] tracking-wider w-32">ราคาเหมา/หน่วย</th>
                      <th className="pb-4 text-right font-bold uppercase text-[10px] tracking-wider w-32">รวมเงิน</th>
                      <th className="pb-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4 pr-4">
                          <Input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="เช่น งานติดตั้งท่อประปา ชั้น 2..." className="h-10 border-none bg-gray-50 rounded-lg" />
                        </td>
                        <td className="py-4 px-2">
                          <Input value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="h-10 border-none bg-gray-50 rounded-lg text-center" />
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
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมค่าจ้างเหมาทั้งหมด</p>
                  <p className="text-3xl font-bold text-purple-600">฿{totalAmount.toLocaleString()}.00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <User className="w-5 h-5 text-purple-600" /> ข้อมูลผู้รับเหมา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>เลือกผู้รับเหมา (Sub-con) *</Label>
                <Select onValueChange={setVendorId}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกบริษัทผู้รับเหมา" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
