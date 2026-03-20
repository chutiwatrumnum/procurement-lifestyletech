import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Building2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseRequests, useDeletePR } from '@/hooks/usePurchaseRequests';
import pb from '@/lib/pocketbase';
import { useQueryClient } from '@tanstack/react-query';

interface PurchaseRequestListProps {
  type?: 'project' | 'sub' | 'other';
}

export default function PurchaseRequestList({ type }: PurchaseRequestListProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; pr: any | null }>({ open: false, pr: null });
  const [confirmStatusDialog, setConfirmStatusDialog] = useState<{ open: boolean; prId: string; currentStatus: string; prNumber: string }>({ open: false, prId: '', currentStatus: '', prNumber: '' });
  const ITEMS_PER_PAGE = 15;
  const navigate = useNavigate();
  
  const activeTab = type || 'all';

  const { data: rawPRs = [], isLoading } = usePurchaseRequests();
  const deletePRMutation = useDeletePR();
  const queryClient = useQueryClient();

  const prs = useMemo(() => rawPRs.map(pr => ({
    id: pr.id,
    pr_number: pr.pr_number,
    project: pr.expand?.project?.name || 'รายการทั่วไป',
    type: (pr.type || 'N/A').toUpperCase(),
    rawType: pr.type,
    rawStatus: pr.status,
    procurement_status: pr.procurement_status || 'not_purchased',
    requester: pr.requester_name || pr.expand?.requester?.name || 'N/A',
    date: new Date(pr.created).toLocaleDateString('th-TH'),
    amount: pr.total_amount || 0,
    status: pr.status === 'draft' ? 'ร่าง' : pr.status === 'pending' ? 'รออนุมัติ' : pr.status === 'approved' ? 'อนุมัติแล้ว' : pr.status === 'rejected' ? 'ปฏิเสธ' : pr.status,
    color: pr.status === 'draft' ? 'secondary' : pr.status === 'pending' ? 'warning' : pr.status === 'approved' ? 'success' : 'destructive'
  })), [rawPRs]);

  const handleDelete = (pr: any) => {
    setDeleteDialog({ open: true, pr });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.pr) return;
    try {
      await deletePRMutation.mutateAsync(deleteDialog.pr.id);
      toast.success('ลบคำขอจัดซื้อเรียบร้อยแล้ว');
      setDeleteDialog({ open: false, pr: null });
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('ไม่สามารถลบคำขอจัดซื้อได้');
    }
  };

  // Toggle procurement status (ซื้อแล้ว / ยังไม่ซื้อ)
  const handleToggleStatusClick = (e: React.MouseEvent, pr: any) => {
    e.stopPropagation();
    setConfirmStatusDialog({ open: true, prId: pr.id, currentStatus: pr.procurement_status, prNumber: pr.pr_number });
  };

  const confirmToggleStatus = async () => {
    if (!confirmStatusDialog.prId) return;

    const newStatus = confirmStatusDialog.currentStatus === 'purchased' ? 'not_purchased' : 'purchased';
    try {
      await pb.collection('purchase_requests').update(confirmStatusDialog.prId, { procurement_status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
      toast.success(newStatus === 'purchased' ? 'อัปเดตเป็น "ซื้อแล้ว"' : 'อัปเดตเป็น "ยังไม่ซื้อ"');
      setConfirmStatusDialog({ open: false, prId: '', currentStatus: '', prNumber: '' });
    } catch (err) {
      console.error('Update procurement status error:', err);
      toast.error('อัปเดตสถานะไม่สำเร็จ');
      setConfirmStatusDialog(prev => ({ ...prev, open: false }));
    }
  };

  const filteredPRs = prs.filter(pr => {
    const matchesSearch = pr.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = activeTab === 'all' || 
      (activeTab === 'project' && pr.rawType === 'project') ||
      (activeTab === 'sub' && pr.rawType === 'sub') ||
      (activeTab === 'other' && pr.rawType === 'other');
    const matchesStatus = statusFilter === 'all' || pr.rawStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPRs.length / ITEMS_PER_PAGE);
  const paginatedPRs = filteredPRs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  if (isLoading) return <div className="flex h-[80vh] items-center justify-center font-bold text-blue-600"><Loader2 className="h-10 w-10 animate-spin mr-3" /> กำลังดึงข้อมูล...</div>;

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
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-12 rounded-xl font-bold shadow-lg">
                <Plus className="mr-2 h-5 w-5" /> สร้างใบขอซื้อใหม่ <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl border-none shadow-xl bg-white">
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

      {/* Tabs for filtering by type */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => navigate('/purchase-requests')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'all' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => navigate('/purchase-requests/project')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'project' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          โครงการ
        </button>
        <button
          onClick={() => navigate('/purchase-requests/sub')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'sub' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          งานย่อย
        </button>
        <button
          onClick={() => navigate('/purchase-requests/other')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'other' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          อื่นๆ
        </button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="ค้นหาเลข PR หรือโครงการ..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('all')}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('pending')}
                className={statusFilter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
              >
                รออนุมัติ
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('approved')}
                className={statusFilter === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                อนุมัติแล้ว
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('rejected')}
                className={statusFilter === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                ปฏิเสธ
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('draft')}
                className={statusFilter === 'draft' ? 'bg-gray-600 hover:bg-gray-700' : ''}
              >
                ร่าง
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredPRs.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบรายการ</h3>
            <p className="text-gray-500">{searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีใบขอซื้อในระบบ'}</p>
          </CardContent>
        </Card>
      )}

      {filteredPRs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลข PR</TableHead>
                  <TableHead>โครงการ/ผู้ขาย</TableHead>
                  <TableHead>ผู้ขอซื้อ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การจัดซื้อ</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPRs.map((pr) => (
                  <TableRow key={pr.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/purchase-requests/${pr.id}`)}>
                    <TableCell className="font-medium">{pr.pr_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pr.rawType === 'project' ? (
                          <Building2 className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-500" />
                        )}
                        {pr.project}
                      </div>
                    </TableCell>
                    <TableCell>{pr.requester}</TableCell>
                    <TableCell>{pr.date}</TableCell>
                    <TableCell className="text-right font-medium">
                      ฿{pr.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        pr.color === 'secondary' ? 'bg-gray-100 text-gray-700' :
                        pr.color === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                        pr.color === 'success' ? 'bg-green-100 text-green-700' : 
                        'bg-red-100 text-red-700'
                      }>
                        {pr.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pr.rawStatus === 'approved' && (pr.rawType === 'sub' || pr.rawType === 'other') ? (
                        <button
                          onClick={(e) => handleToggleStatusClick(e, pr)}
                          className="group transition-all duration-200"
                        >
                          {pr.procurement_status === 'purchased' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 group-hover:shadow-sm transition-all">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              ซื้อแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-amber-100 group-hover:shadow-sm transition-all">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              รอจัดซื้อ
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/purchase-requests/${pr.id}`); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            ดูรายละเอียด
                          </DropdownMenuItem>
                          {(pr.rawStatus === 'draft' || pr.rawStatus === 'pending' || pr.rawStatus === 'rejected') && (
                            <DropdownMenuItem onClick={(e) => { 
                              e.stopPropagation(); 
                              if (pr.rawType === 'other') {
                                navigate(`/purchase-requests/edit/other/${pr.id}`);
                              } else if (pr.rawType === 'sub') {
                                navigate(`/purchase-requests/edit/sub/${pr.id}`);
                              } else if (pr.rawType === 'project') {
                                navigate(`/purchase-requests/edit/project/${pr.id}`);
                              } else {
                                navigate(`/purchase-requests/edit/${pr.id}`);
                              }
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              แก้ไข
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDelete(pr); }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPRs.length)} จาก {filteredPRs.length} รายการ
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-3 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> ก่อนหน้า
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .reduce<(number | string)[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page, idx) => (
                      typeof page === 'string' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`h-9 w-9 p-0 rounded-lg ${
                            currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 rounded-lg"
                >
                  ถัดไป <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, pr: open ? deleteDialog.pr : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              ยืนยันการลบ
            </DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบใบขอซื้อ <strong>{deleteDialog.pr?.pr_number}</strong>?
              <br />
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, pr: null })}>
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deletePRMutation.isPending}
            >
              {deletePRMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังลบ...</> : 'ลบใบขอซื้อ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmStatusDialog.open} onOpenChange={(open) => setConfirmStatusDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการเปลี่ยนแปลงสถานะจัดซื้อ</DialogTitle>
            <DialogDescription className="mt-2 text-base">
              คุณต้องการเปลี่ยนสถานะของใบขอซื้อ <strong>{confirmStatusDialog.prNumber}</strong> เป็น
              <br/>
              {confirmStatusDialog.currentStatus === 'purchased' ? (
                <span className="inline-block mt-2 font-bold text-amber-600">"รอจัดซื้อ"</span>
              ) : (
                <span className="inline-block mt-2 font-bold text-emerald-600">"ซื้อแล้ว"</span>
              )} ใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStatusDialog(prev => ({ ...prev, open: false }))}>
              ยกเลิก
            </Button>
            <Button 
              className={confirmStatusDialog.currentStatus === 'purchased' ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"} 
              onClick={confirmToggleStatus}
            >
              ยืนยันเปลี่ยนสถานะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
