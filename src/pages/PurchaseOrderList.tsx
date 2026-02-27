import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pos = [], isLoading } = usePurchaseOrders();

  const filteredPOs = pos.filter(po => 
    po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (po.expand?.vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการใบสั่งซื้อ (Purchase Orders)</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการและติดตามสถานะใบสั่งซื้อที่ส่งออกไป</p>
        </div>
        <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl px-6 font-bold shadow-lg shadow-blue-500/20" onClick={() => navigate('/purchase-requests')}>
          <Plus className="mr-2 h-4 w-4" /> สร้าง PO จากใบขอซื้อ
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ส่งออกแล้ว</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{pos.filter(po => po.status === 'sent').length}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">รอการตอบรับ</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{pos.filter(po => po.status === 'pending_vendor').length}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="ค้นหารหัสใบสั่งซื้อ, ชื่อผู้ขาย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-[#F9FAFB] border-none rounded-xl"
              />
            </div>
            <Button variant="outline" className="h-11 rounded-xl border-[#E5E7EB] px-6">
              <Filter className="mr-2 h-4 w-4" /> กรองข้อมูล
            </Button>
          </div>

          <div className="rounded-xl border border-[#F3F4F6] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F9FAFB]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="py-4 px-6 font-bold text-gray-500 uppercase text-[10px] tracking-wider">รหัสใบสั่งซื้อ</TableHead>
                  <TableHead className="py-4 px-6 font-bold text-gray-500 uppercase text-[10px] tracking-wider">ผู้ขาย</TableHead>
                  <TableHead className="py-4 px-6 font-bold text-gray-500 uppercase text-[10px] tracking-wider">อ้างอิง PR</TableHead>
                  <TableHead className="py-4 px-6 font-bold text-gray-500 uppercase text-[10px] tracking-wider">วันที่</TableHead>
                  <TableHead className="py-4 px-6 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-right">ยอดเงินรวม</TableHead>
                  <TableHead className="py-4 px-6 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-center">สถานะ</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-400">ไม่พบรายการใบสั่งซื้อ</TableCell></TableRow>
                ) : (
                  filteredPOs.map((po) => (
                    <TableRow key={po.id} className="hover:bg-[#F9FAFB] transition-colors border-none group">
                      <TableCell className="py-5 px-6 font-black text-blue-600 group-hover:underline">{po.po_number}</TableCell>
                      <TableCell className="py-5 px-6 font-bold text-[#1F2937]">{po.expand?.vendor?.name || 'N/A'}</TableCell>
                      <TableCell className="py-5 px-6 font-medium text-gray-400">#{po.expand?.pr?.pr_number || 'REF'}</TableCell>
                      <TableCell className="py-5 px-6 text-gray-500">{new Date(po.created).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell className="py-5 px-6 text-right font-black text-[#111827]">฿{po.grand_total.toLocaleString()}.00</TableCell>
                      <TableCell className="py-5 px-6 text-center">
                        <Badge className={`rounded-full px-3 py-1 font-bold ${
                          po.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                          po.status === 'pending_vendor' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-xl w-48 p-2">
                            <DropdownMenuItem className="rounded-xl p-3 cursor-pointer"><Eye className="mr-2 h-4 w-4 text-blue-500" /> ดูรายละเอียด</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl p-3 cursor-pointer mt-1" onClick={() => navigate(`/purchase-orders/edit/${po.id}`)}><Edit className="mr-2 h-4 w-4 text-orange-500" /> แก้ไขเอกสาร</DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem className="rounded-xl p-3 cursor-pointer text-red-600"><Trash2 className="mr-2 h-4 w-4" /> ยกเลิก PO</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
