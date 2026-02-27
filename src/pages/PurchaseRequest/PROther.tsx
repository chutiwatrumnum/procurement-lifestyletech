import { useState, useEffect } from 'react';
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
  ShoppingCart, 
  User, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { prService, vendorService } from '@/services/api';
import { notificationService } from '@/services/notification';
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

export default function PROther() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  
  const [vendorId, setVendorId] = useState('');
  const [otherType, setOtherType] = useState('office');
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', name: '', unit: '', quantity: 1, unit_price: 0, total_price: 0 },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const vendList = await vendorService.getAll();
        setVendors(vendList);
      } catch (err) {
        console.error('Data load failed');
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
    if (!vendorId) {
      toast.error('กรุณาเลือกผู้ขาย');
      return;
    }

    setIsSubmitting(true);
    try {
      const prData = {
        type: 'other',
        vendor: vendorId,
        requester: user?.id,
        status: status,
        total_amount: totalAmount,
        requester_name: user?.name || user?.email || 'ไม่ระบุ'
      };

      const prItems = items.map(({ name, quantity, unit_price, total_price }) => ({
        name, quantity, unit_price, total_price
      }));

      const pr = await prService.create(prData, prItems);
      
      // ส่ง notification เมื่อส่ง PR ใหม่
      if (status === 'pending') {
        try {
          await notificationService.notifyNewPR(pr, user?.id || '');
        } catch (err) {
          console.error('Failed to send notification:', err);
        }
      }
      
      toast.success('บันทึกใบขอซื้อเรียบร้อยแล้ว');
      
      // Refresh badge counts if submitting for approval
      if (status === 'pending') {
        window.dispatchEvent(new CustomEvent('refresh-badge-counts'));
      }
      
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      navigate('/purchase-requests');
    } catch (error) {
      console.error(error);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างใบขอซื้อ - อื่นๆ (General)</h1>
          <p className="text-gray-500 text-sm mt-1">สำหรับอุปกรณ์สำนักงาน คอมพิวเตอร์ และรายการจัดซื้อทั่วไป</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB]" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
          </Button>
          <Button className="bg-[#4B5563] hover:bg-[#1F2937] text-white rounded-xl px-8 font-bold shadow-lg" onClick={() => handleSubmit('pending')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งคำขอจัดซื้อ
          </Button>
        </div>
      </div>

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
                <Select onValueChange={setOtherType} defaultValue="office">
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">อุปกรณ์สำนักงาน (Office Supplies)</SelectItem>
                    <SelectItem value="it">อุปกรณ์ไอที (IT Equipment)</SelectItem>
                    <SelectItem value="furniture">เฟอร์นิเจอร์ (Furniture)</SelectItem>
                    <SelectItem value="marketing">สื่อโฆษณา (Marketing Material)</SelectItem>
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
                      <th className="pb-4 text-center font-bold uppercase text-[10px] tracking-wider w-24">หน่วย</th>
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
                          <Input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="ระบุชื่อสินค้า..." className="h-10 border-none bg-gray-50 rounded-lg" />
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
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                  <p className="text-3xl font-bold text-gray-900">฿{totalAmount.toLocaleString()}.00</p>
                </div>
              </div>
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
                <Select onValueChange={setVendorId}>
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
        </div>
      </div>
    </div>
  );
}
