import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  FileText,
  Building2,
  Filter,
  ChevronDown,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { prService } from '@/services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function PurchaseRequestList() {
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; prId: string | null; prNumber: string }>({ 
    open: false, 
    prId: null,
    prNumber: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadPRs() {
      try {
        const data = await prService.getAll();
        setPrs(data.map(pr => ({
          id: pr.id,
          pr_number: pr.pr_number,
          project: pr.expand?.project?.name || 'รายการทั่วไป',
          type: (pr.type || 'N/A').toUpperCase(),
          requester: pr.expand?.requester?.name || pr.expand?.requester?.full_name || pr.expand?.requester?.username || pr.expand?.requester?.email || 'ไม่ระบุ',
          date: new Date(pr.created).toLocaleDateString('th-TH'),
          amount: pr.total_amount || 0,
          status: pr.status === 'pending' ? 'รออนุมัติ' : pr.status === 'approved' ? 'อนุมัติแล้ว' : pr.status === 'rejected' ? 'ปฏิเสธ' : pr.status,
          statusValue: pr.status,
          color: pr.status === 'pending' ? 'warning' : pr.status === 'approved' ? 'success' : 'destructive'
        })));
      } catch (err) {
        console.error('Fetch error:', err);
        setPrs([]);
      } finally {
        setLoading(false);
      }
    }
    loadPRs();
  }, []);

  const filteredPRs = prs.filter(pr => {
    const matchesSearch = pr.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pr.statusValue === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!deleteDialog.prId) return;
    setIsDeleting(true);
    try {
      await prService.delete(deleteDialog.prId);
      setPrs(prs.filter(pr => pr.id !== deleteDialog.prId));
      toast.success('ลบใบขอซื้อเรียบร้อยแล้ว');
    } catch (err) {
      toast.error('ลบไม่สำเร็จ');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, prId: null, prNumber: '' });
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center font-bold text-blue-600"><Loader2 className="h-10 w-10 animate-spin mr-3" /> กำลังดึงข้อมูล...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">รายการใบขอซื้อ (Purchase Requests)</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">ติดตามและบริหารจัดการคำขอจัดซื้อตามสถานะจริง</p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 h-12 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                <Plus className="mr-2 h-5 w-5" /> สร้างใบขอซื้อใหม่ <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-none shadow-xl bg-white">
              <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer">
                <Link to="/purchase-requests/new/project">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3"><Building2 className="h-4 w-4" /></div>
                  <span className="font-bold text-gray-700">สำหรับโครงการ (Project)</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer mt-1">
                <Link to="/purchase-requests/new/sub">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mr-3"><FileText className="h-4 w-4" /></div>
                  <span className="font-bold text-gray-700">สำหรับงานย่อย (Sub-con)</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer mt-1">
                <Link to="/purchase-requests/new/other">
                  <div className="p-2 bg-gray-50 text-gray-600 rounded-lg mr-3"><Plus className="h-4 w-4" /></div>
                  <span className="font-bold text-gray-700">รายการทั่วไป (Others)</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="ค้นหารหัสใบขอซื้อ หรือ ชื่อโครงการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-[#F9FAFB] border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 rounded-2xl border-[#E5E7EB] px-8 font-bold text-gray-600">
                  <Filter className="mr-2 h-4 w-4" /> 
                  {statusFilter === 'all' ? 'กรองข้อมูล' : 
                   statusFilter === 'pending' ? 'รออนุมัติ' :
                   statusFilter === 'approved' ? 'อนุมัติแล้ว' :
                   statusFilter === 'rejected' ? 'ปฏิเสธ' : 'กรองข้อมูล'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-none shadow-xl bg-white">
                <DropdownMenuItem 
                  className={`rounded-xl p-3 cursor-pointer ${statusFilter === 'all' ? 'bg-blue-50 text-blue-600' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  <span className="font-bold">ทั้งหมด</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={`rounded-xl p-3 cursor-pointer mt-1 ${statusFilter === 'pending' ? 'bg-yellow-50 text-yellow-600' : ''}`}
                  onClick={() => setStatusFilter('pending')}
                >
                  <span className="font-bold">รออนุมัติ</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={`rounded-xl p-3 cursor-pointer mt-1 ${statusFilter === 'approved' ? 'bg-green-50 text-green-600' : ''}`}
                  onClick={() => setStatusFilter('approved')}
                >
                  <span className="font-bold">อนุมัติแล้ว</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={`rounded-xl p-3 cursor-pointer mt-1 ${statusFilter === 'rejected' ? 'bg-red-50 text-red-600' : ''}`}
                  onClick={() => setStatusFilter('rejected')}
                >
                  <span className="font-bold">ปฏิเสธ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rounded-2xl border border-gray-50 overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F9FAFB]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="py-5 px-8 font-black text-[#6B7280] uppercase text-[10px] tracking-widest">รหัสใบขอซื้อ</TableHead>
                  <TableHead className="py-5 px-8 font-black text-[#6B7280] uppercase text-[10px] tracking-widest">โครงการ / ประเภท</TableHead>
                  <TableHead className="py-5 px-8 font-black text-[#6B7280] uppercase text-[10px] tracking-widest">ผู้ขอซื้อ</TableHead>
                  <TableHead className="py-5 px-8 font-black text-[#6B7280] uppercase text-[10px] tracking-widest">วันที่</TableHead>
                  <TableHead className="py-5 px-8 font-black text-[#6B7280] uppercase text-[10px] tracking-widest text-right">จำนวนเงิน</TableHead>
                  <TableHead className="py-5 px-8 font-black text-[#6B7280] uppercase text-[10px] tracking-widest text-center">สถานะ</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPRs.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] bg-white">ไม่มีรายการใบขอซื้อในฐานข้อมูล</td></tr>
                ) : (
                  filteredPRs.map((pr) => (
                    <TableRow key={pr.id} className="hover:bg-[#F9FAFB] transition-colors border-none group">
                      <TableCell className="py-6 px-8 font-black text-blue-600 group-hover:underline">{pr.pr_number}</TableCell>
                      <TableCell className="py-6 px-8">
                        <p className="font-bold text-[#1F2937]">{pr.project}</p>
                        <p className="text-[10px] font-black text-[#9CA3AF] uppercase mt-1 tracking-widest">{pr.type}</p>
                      </TableCell>
                      <TableCell className="py-6 px-8 text-[#4B5563] font-bold">{pr.requester}</TableCell>
                      <TableCell className="py-6 px-8 text-[#6B7280] font-medium">{pr.date}</TableCell>
                      <TableCell className="py-6 px-8 text-right font-black text-[#111827]">฿{pr.amount.toLocaleString()}.00</TableCell>
                      <TableCell className="py-6 px-8 text-center">
                        <Badge className={`rounded-full px-4 py-1 font-black uppercase text-[9px] tracking-widest border-none ${
                          pr.color === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                          pr.color === 'success' ? 'bg-green-50 text-green-700' :
                          pr.color === 'info' ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 px-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-white shadow-sm transition-all"><MoreHorizontal className="h-4 w-4 text-gray-400" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white">
                            <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer">
                              <Link to={`/purchase-requests/${pr.id}`}><Eye className="mr-3 h-4 w-4 text-blue-500" /> <span className="font-bold text-gray-700">ดูรายละเอียด</span></Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer mt-1">
                              <Link to={`/purchase-requests/edit/${pr.id}`}><Edit className="mr-3 h-4 w-4 text-orange-500" /> <span className="font-bold text-gray-700">แก้ไขข้อมูล</span></Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2 bg-gray-50" />
                            <DropdownMenuItem 
                              className="rounded-xl p-3 cursor-pointer text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteDialog({ open: true, prId: pr.id, prNumber: pr.pr_number })}
                            >
                              <Trash2 className="mr-3 h-4 w-4" /> 
                              <span className="font-bold">ลบคำขอจัดซื้อ</span>
                            </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              ยืนยันการลบใบขอซื้อ
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              คุณแน่ใจหรือไม่ที่จะลบใบขอซื้อนี้? การลบจะไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 px-5 bg-gray-50 rounded-xl space-y-2 my-4">
            <p className="font-bold text-gray-900 text-lg">{deleteDialog.prNumber}</p>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, prId: null, prNumber: '' })}
              className="flex-1 rounded-xl h-12 font-bold border-gray-200 hover:bg-gray-50"
              disabled={isDeleting}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 rounded-xl h-12 font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
            >
              {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'ยืนยันการลบ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
