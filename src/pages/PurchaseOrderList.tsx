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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePurchaseOrders, poKeys } from '@/hooks/usePurchaseOrders';
import { useAuth } from '@/contexts/AuthContext';
import { poService } from '@/services/api';

const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'ร่าง',
  sent: 'ส่งออกแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { data: pos = [], isLoading } = usePurchaseOrders();

  const filteredPOs = pos.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.expand?.vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await poService.update(cancelTarget.id, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: poKeys.all });
      toast.success(`ยกเลิกใบสั่งซื้อ ${cancelTarget.po_number} แล้ว`);
      setCancelTarget(null);
    } catch (err) {
      console.error('Cancel PO error:', err);
      toast.error('ยกเลิกใบสั่งซื้อไม่สำเร็จ');
    } finally {
      setCancelling(false);
    }
  };

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
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ร่าง</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{pos.filter(po => po.status === 'draft').length}</h3>
          </CardContent>
        </Card>
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
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ยกเลิกแล้ว</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{pos.filter(po => po.status === 'cancelled').length}</h3>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-48 rounded-xl border-[#E5E7EB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="draft">ร่าง</SelectItem>
                <SelectItem value="sent">ส่งออกแล้ว</SelectItem>
                <SelectItem value="cancelled">ยกเลิกแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-[#F3F4F6] overflow-x-auto">
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
                      <TableCell className="py-5 px-6 text-right font-black text-[#111827]">฿{(po.grand_total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="py-5 px-6 text-center">
                        <Badge className={`rounded-full px-3 py-1 font-bold ${
                          po.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                          po.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {PO_STATUS_LABELS[po.status] || po.status}
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
                            <DropdownMenuItem className="rounded-xl p-3 cursor-pointer" onClick={() => navigate(`/purchase-requests/${po.pr}/print-po`)}><Eye className="mr-2 h-4 w-4 text-blue-500" /> เปิดเอกสาร</DropdownMenuItem>
                            {po.status !== 'cancelled' && hasRole(['superadmin', 'head_of_dept', 'manager']) && (
                              <>
                                <DropdownMenuSeparator className="my-2" />
                                <DropdownMenuItem className="rounded-xl p-3 cursor-pointer text-red-600" onClick={() => setCancelTarget(po)}><Trash2 className="mr-2 h-4 w-4" /> ยกเลิก PO</DropdownMenuItem>
                              </>
                            )}
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

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>ยกเลิกใบสั่งซื้อ?</DialogTitle>
            <DialogDescription>
              ใบสั่งซื้อ {cancelTarget?.po_number} จะถูกเปลี่ยนเป็น "ยกเลิกแล้ว" และแก้ไขหรือพิมพ์ต่อไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCancelTarget(null)}>ไม่ยกเลิก</Button>
            <Button className="bg-red-600 hover:bg-red-700 rounded-xl" disabled={cancelling} onClick={confirmCancel}>ยืนยันการยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
