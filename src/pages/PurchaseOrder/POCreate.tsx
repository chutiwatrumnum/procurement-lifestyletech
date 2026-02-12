import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  FileText, 
  Printer,
  Send,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { prService, poService } from '@/services/api';
import { toast } from 'sonner';

export default function POCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prId = searchParams.get('prId');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!prId) {
        setLoading(false);
        return;
      }
      try {
        const pr = await prService.getById(prId);
        const prItems = await prService.getItems(prId);
        setPrData(pr);
        setItems(prItems);
      } catch (err) {
        console.error('Fetch failed');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [prId]);

  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const discount = 0;
  const vat = subtotal * 0.07;
  const grandTotal = subtotal - discount + vat;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const poData = {
        po_number: `PO-${Date.now().toString().slice(-6)}`,
        pr: prId,
        vendor: prData?.vendor,
        status: 'sent',
        total_amount: subtotal,
        discount,
        vat,
        grand_total: grandTotal,
        terms_conditions: 'Net 30 Days'
      };
      await poService.createFromPR(prId!, poData);
      toast.success('สร้างใบสั่งซื้อและส่งให้ผู้ขายเรียบร้อยแล้ว');
      navigate('/purchase-orders');
    } catch (err) {
      toast.error('สร้างใบสั่งซื้อไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  if (!prId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <h2 className="text-xl font-bold mb-2">ไม่พบข้อมูลอ้างอิง</h2>
        <p>กรุณาเลือกใบขอซื้อจากรายการที่อนุมัติแล้วเพื่อสร้าง PO ค่ะ</p>
        <Button className="mt-4" onClick={() => navigate('/purchase-requests')}>ไปหน้ารายการใบขอซื้อ</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-white shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">สร้างใบสั่งซื้อ (Purchase Order)</h1>
            <p className="text-sm text-gray-500 mt-1 uppercase font-bold tracking-widest">อ้างอิง PR: {prData?.pr_number}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB] font-bold" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> พิมพ์ / PDF
          </Button>
          <Button className="bg-[#FB923C] hover:bg-[#F97316] text-white rounded-xl px-8 font-bold shadow-lg shadow-orange-500/20" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งใบสั่งซื้อให้ผู้ขาย
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border-none print:shadow-none print:max-w-none">
        <CardContent className="p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#FB923C] rounded-2xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tighter">ProcureReal</h2>
                <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] leading-none mt-1">REAL ESTATE ERP</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-black text-[#1F2937] tracking-tighter mb-4">PURCHASE ORDER</h1>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">เลขที่ใบสั่งซื้อ</p>
                <p className="text-xl font-bold text-[#FB923C]">PO-AUTO-GEN</p>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-50 mb-12" />

          {/* Supplier & Info */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Building2 className="w-3 h-3 text-[#FB923C]" /> ข้อมูลผู้ขาย (Supplier)
              </h3>
              <div className="bg-[#FFF7ED] rounded-2xl p-6 border border-[#FFEDD5]">
                <p className="font-bold text-[#9A3412] text-lg mb-2">{prData?.expand?.vendor?.name || 'N/A'}</p>
                <p className="text-sm text-[#C2410C] leading-relaxed mb-4">{prData?.expand?.vendor?.address || 'N/A'}</p>
                <div className="space-y-1 text-xs font-bold text-[#EA580C]">
                  <p>Tax ID: {prData?.expand?.vendor?.tax_id || 'N/A'}</p>
                  <p>Phone: {prData?.expand?.vendor?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-end text-right space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">วันที่ออกเอกสาร</p>
                <p className="font-bold text-[#1F2937]">{new Date().toLocaleDateString('th-TH')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">อ้างอิงใบขอซื้อ (PR)</p>
                <p className="font-bold text-[#1F2937]">{prData?.pr_number}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-12">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText className="w-3 h-3 text-[#FB923C]" /> รายการสินค้าและบริการ
            </h3>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#6B7280]">
                    <th className="py-4 px-6 text-left font-bold uppercase text-[9px] tracking-wider">ลำดับ</th>
                    <th className="py-4 px-6 text-left font-bold uppercase text-[9px] tracking-wider">รายการ / รายละเอียด</th>
                    <th className="py-4 px-6 text-center font-bold uppercase text-[9px] tracking-wider">จำนวน</th>
                    <th className="py-4 px-6 text-right font-bold uppercase text-[9px] tracking-wider">ราคา/หน่วย</th>
                    <th className="py-4 px-6 text-right font-bold uppercase text-[9px] tracking-wider">รวมเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-5 px-6 text-gray-400 font-medium">{idx + 1}</td>
                      <td className="py-5 px-6">
                        <p className="font-bold text-[#1F2937]">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Ref: {item.id}</p>
                      </td>
                      <td className="py-5 px-6 text-center font-bold text-[#4B5563]">{item.quantity} {item.unit}</td>
                      <td className="py-5 px-6 text-right font-bold text-[#4B5563]">{item.unit_price.toLocaleString()}.00</td>
                      <td className="py-5 px-6 text-right font-black text-[#111827]">{item.total_price.toLocaleString()}.00</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Summary */}
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">เงื่อนไขการสั่งซื้อ (Terms)</h3>
              <ul className="space-y-2 text-[11px] text-gray-500 font-bold leading-relaxed">
                <li className="flex gap-2"><span className="text-[#FB923C]">•</span> การชำระเงินภายใน 30 วันหลังจากได้รับสินค้าและเอกสารครบถ้วน</li>
                <li className="flex gap-2"><span className="text-[#FB923C]">•</span> กรุณาส่งสินค้าตามที่อยู่ที่ระบุในใบขอซื้ออ้างอิง</li>
                <li className="flex gap-2"><span className="text-[#FB923C]">•</span> สินค้าต้องมีสภาพสมบูรณ์และตรงตามข้อกำหนด</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400 uppercase tracking-widest">รวมเงินสุทธิ</span>
                <span className="text-[#1F2937]">฿{subtotal.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400 uppercase tracking-widest">ภาษีมูลค่าเพิ่ม (7%)</span>
                <span className="text-[#1F2937]">฿{vat.toLocaleString()}.00</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-[#1F2937] uppercase tracking-widest">ยอดรวมทั้งสิ้น</span>
                <span className="text-3xl font-black text-[#FB923C] tracking-tighter">฿{grandTotal.toLocaleString()}.00</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-20 grid grid-cols-2 gap-20">
            <div className="text-center border-t border-dashed border-gray-200 pt-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ผู้อนุมัติ (Authorized By)</p>
              <div className="h-12"></div>
              <p className="font-black text-[#111827]">..................................................</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">วันที่ / Date</p>
            </div>
            <div className="text-center border-t border-dashed border-gray-200 pt-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ผู้จัดทำ (Prepared By)</p>
              <div className="h-12"></div>
              <p className="font-black text-[#111827]">..................................................</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">แผนกจัดซื้อ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
