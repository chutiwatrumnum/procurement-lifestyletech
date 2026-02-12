import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Check, 
  X, 
  FileText, 
  Building2,
  ChevronRight,
  Printer,
  History,
  Loader2,
  Clock
} from 'lucide-react';
import { poService, prService } from '@/services/api';
import { toast } from 'sonner';

export default function POApproval() {
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadPOs();
  }, []);

  async function loadPOs() {
    try {
      const data = await poService.getAll();
      const pending = data.filter(po => po.status === 'sent' || po.status === 'pending_vendor');
      setPos(pending);
      if (pending.length > 0) {
        handleSelectPO(pending[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPO(po: any) {
    setSelectedPO(po);
    try {
      // Fetch items from the linked PR
      const poItems = await prService.getItems(po.pr);
      setItems(poItems);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  if (pos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="p-4 bg-gray-100 rounded-full mb-4"><Check className="h-12 w-12" /></div>
        <h2 className="text-xl font-bold">ไม่มีรายการ PO รออนุมัติ</h2>
        <Button className="mt-4" onClick={() => window.location.reload()}>รีเฟรชข้อมูล</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">อนุมัติใบสั่งซื้อ (PO Approval)</h1>
          <p className="text-sm text-gray-500 mt-1">พบ {pos.length} รายการที่ส่งถึงผู้ขายแล้วและรอการยืนยัน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {pos.map((po) => (
                <div 
                  key={po.id} 
                  onClick={() => handleSelectPO(po)}
                  className={`p-5 cursor-pointer hover:bg-gray-50 transition-all ${selectedPO?.id === po.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-blue-600">{po.po_number}</p>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                  <p className="text-sm font-bold text-[#1F2937] truncate">{po.expand?.vendor?.name || 'N/A'}</p>
                  <div className="flex justify-between items-end mt-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(po.created).toLocaleDateString('th-TH')}</span>
                    <span className="text-sm font-black text-gray-900">฿{ po.grand_total.toLocaleString() }</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedPO && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 flex-row items-center justify-between py-6 px-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Purchase Order Details</p>
                  <CardTitle className="text-2xl font-black text-[#1F2937] tracking-tighter">{selectedPO.po_number}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="rounded-xl font-bold"><Printer className="w-4 h-4 mr-2" /> พิมพ์</Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ผู้ขาย (Supplier)</p>
                      <p className="font-bold text-lg text-[#1F2937]">{selectedPO.expand?.vendor?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">อ้างอิงใบขอซื้อ</p>
                      <p className="font-bold text-blue-600">#{selectedPO.expand?.pr?.pr_number || 'PR-REF'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ยอดเงินสุทธิรวม VAT</p>
                    <p className="text-3xl font-black text-blue-600 tracking-tighter">฿{selectedPO.grand_total.toLocaleString()}.00</p>
                    <Badge className="mt-3 bg-blue-50 text-blue-700 border-none font-bold px-3 py-1">
                      <Clock className="w-3 h-3 mr-2" /> {selectedPO.status}
                    </Badge>
                  </div>
                </div>

                <div className="mb-10">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">รายการสินค้าในใบสั่งซื้อ</p>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F9FAFB] text-[#6B7280]">
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">รายการ</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">จำนวน</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">รวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                          <tr key={item.id}>
                            <td className="py-4 px-4">
                              <p className="font-bold text-gray-900">{item.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Unit: {item.unit}</p>
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-gray-600">{item.quantity}</td>
                            <td className="py-4 px-4 text-right font-black text-gray-900">{item.total_price.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  <Label className="text-[#1F2937] font-black uppercase text-[10px] tracking-widest">ความคิดเห็นเพิ่มเติม</Label>
                  <Textarea placeholder="ระบุสิ่งที่ต้องการให้แก้ไข หรือหมายเหตุเพิ่มเติม..." rows={3} className="rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all" />
                </div>

                <div className="flex gap-4">
                  <Button className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all active:scale-[0.98]">
                    <X className="w-5 h-5 mr-2" /> ตีกลับ/แก้ไข (Reject)
                  </Button>
                  <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]">
                    <Check className="w-5 h-5 mr-2" /> อนุมัติสั่งซื้อ (Approve)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
