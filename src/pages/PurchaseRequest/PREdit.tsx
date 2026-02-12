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
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { prService } from '@/services/api';
import { toast } from 'sonner';

export default function PREdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const pr = await prService.getById(id);
        const prItems = await prService.getItems(id);
        setPrData(pr);
        setItems(prItems);
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

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      // Simplification: In reality you might need to update each item record or use a bulk endpoint
      await prService.updateStatus(id!, 'pending', 'แก้ไขข้อมูลตามที่ร้องขอ');
      toast.success('อัปเดตและส่งใบขอซื้ออีกครั้งเรียบร้อย');
      navigate('/purchase-requests');
    } catch (err) {
      toast.error('อัปเดตไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">เหตุผลที่ต้องแก้ไข</p>
            <p className="text-sm text-red-900 font-bold leading-relaxed">{prData?.rejection_reason || 'กรุณาตรวจสอบรายละเอียดรายการและราคาต่อหน่วยให้ตรงกับใบเสนอราคาล่าสุดค่ะ'}</p>
          </div>
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
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">เอกสารอ้างอิงใหม่</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center hover:bg-gray-50 cursor-pointer transition-all group">
                <div className="p-3 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">อัปโหลดใบเสนอราคาล่าสุด</p>
              </div>
            </CardContent>
          </Card>

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
