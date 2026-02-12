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
  User,
  DollarSign,
  ChevronRight,
  Clock,
  Loader2
} from 'lucide-react';
import { prService } from '@/services/api';
import { toast } from 'sonner';

export default function PRApproval() {
  const [pendingPRs, setPendingPRs] = useState<any[]>([]);
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadPRs();
  }, []);

  async function loadPRs() {
    setLoading(true);
    try {
      const data = await prService.getAll('status = "pending"');
      setPendingPRs(data);
      if (data.length > 0) {
        handleSelectPR(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPR(pr: any) {
    setSelectedPR(pr);
    try {
      const prItems = await prService.getItems(pr.id);
      setItems(prItems);
    } catch (err) {
      console.error(err);
    }
  }

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedPR) return;
    setSubmitting(true);
    try {
      await prService.updateStatus(selectedPR.id, status, comment);
      toast.success(status === 'approved' ? 'อนุมัติเรียบร้อยแล้ว' : 'ตีกลับเรียบร้อยแล้ว');
      setComment('');
      await loadPRs();
    } catch (err) {
      toast.error('ดำเนินการไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  }

  if (pendingPRs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="p-4 bg-gray-100 rounded-full mb-4"><Check className="h-12 w-12" /></div>
        <h2 className="text-xl font-bold">ไม่มีรายการรออนุมัติ</h2>
        <p>คุณจัดการทุกรายการเรียบร้อยแล้วค่ะ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการรออนุมัติ (Pending PR List)</h1>
          <p className="text-sm text-gray-500 mt-1">พบ {pendingPRs.length} รายการที่ต้องการการตัดสินใจ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - PR List */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {pendingPRs.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleSelectPR(pr)}
                  className={`p-5 cursor-pointer hover:bg-[#F9FAFB] transition-all ${
                    selectedPR?.id === pr.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-blue-600">{pr.pr_number}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {new Date(pr.created).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                  <p className="font-bold text-[#1F2937] text-sm mb-3 truncate">{pr.expand?.project?.name || 'รายการทั่วไป'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{pr.expand?.requester?.name}</span>
                    </div>
                    <p className="font-bold text-gray-900">฿{pr.total_amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPR && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">รายละเอียดใบขอซื้อ</p>
                  <CardTitle className="text-2xl font-bold text-[#1F2937]">{selectedPR.pr_number}</CardTitle>
                </div>
                <Badge className="bg-yellow-50 text-yellow-700 font-bold border-none px-4 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 mr-2" /> Waiting Approval
                </Badge>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Building2 className="w-3 h-3" /> โครงการ (Project)
                      </h4>
                      <p className="font-bold text-[#1F2937] text-lg">{selectedPR.expand?.project?.name || 'รายการจัดซื้อทั่วไป'}</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedPR.expand?.project?.location || 'สำนักงานใหญ่'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ยอดเงินรวมสุทธิ</h4>
                    <p className="text-3xl font-black text-blue-600">฿{selectedPR.total_amount.toLocaleString()}.00</p>
                  </div>
                </div>

                <div className="mb-10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> รายการสินค้าและบริการ
                  </h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F9FAFB] text-[#6B7280]">
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">ลำดับ</th>
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">รายการ</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">จำนวน</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">ราคา/หน่วย</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="py-4 px-4 text-gray-400">{idx + 1}</td>
                            <td className="py-4 px-4 font-medium text-gray-900">{item.name}</td>
                            <td className="py-4 px-4 text-right text-gray-600">{item.quantity} {item.unit}</td>
                            <td className="py-4 px-4 text-right text-gray-600">{item.unit_price.toLocaleString()}</td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900">{item.total_price.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <Label className="text-[#1F2937] font-bold">ความเห็น/เหตุผลประกอบการตัดสินใจ</Label>
                  <Textarea 
                    placeholder="ระบุเหตุผลในการอนุมัติหรือตีกลับ..." 
                    rows={3} 
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                    onClick={() => handleAction('rejected')}
                    disabled={submitting}
                  >
                    <X className="w-5 h-5 mr-2" /> ตีกลับไปแก้ไข (Reject)
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20"
                    onClick={() => handleAction('approved')}
                    disabled={submitting}
                  >
                    <Check className="w-5 h-5 mr-2" /> อนุมัติใบขอซื้อ (Approve)
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
