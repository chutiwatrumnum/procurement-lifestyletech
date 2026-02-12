import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  FileText, 
  Save,
  Send,
  AlertCircle,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function POEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([
    { id: '1', name: 'แล็ปท็อปประสิทธิภาพสูง', quantity: 5, unitPrice: 79900, totalPrice: 399500 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">แก้ไขใบสั่งซื้อ (Edit PO)</h1>
          <p className="text-sm text-gray-500 mt-1">เลขที่ PO: {id || 'PO-202310-001'}</p>
        </div>
      </div>

      <Card className="bg-red-50 border-red-100">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">เหตุผลที่ถูกตีกลับ:</p>
            <p className="text-sm text-red-700">ส่วนลดที่ระบุใน PR กับใบเสนอราคาไม่ตรงกัน กรุณาแก้ไขให้ตรงกันด้วย</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">รายการในใบสั่งซื้อ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500">
                      <th className="p-3 font-medium">รายการ</th>
                      <th className="p-3 text-right font-medium">จำนวน</th>
                      <th className="p-3 text-right font-medium">ราคาต่อหน่วย</th>
                      <th className="p-3 text-right font-medium">รวม</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <Input value={item.name} className="h-9" />
                        </td>
                        <td className="p-3 text-right">
                          <Input type="number" value={item.quantity} className="h-9 text-right w-20 ml-auto" />
                        </td>
                        <td className="p-3 text-right">
                          <Input type="number" value={item.unitPrice} className="h-9 text-right w-28 ml-auto" />
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {item.totalPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เงื่อนไขเพิ่มเติม</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={6} placeholder="ระบุเงื่อนไขการชำระเงินหรือการจัดส่ง..." />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button className="w-full h-11 bg-orange-500 hover:bg-orange-600">
              <Send className="w-4 h-4 mr-2" /> ส่งกลับเพื่อขออนุมัติอีกครั้ง
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => navigate(-1)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
