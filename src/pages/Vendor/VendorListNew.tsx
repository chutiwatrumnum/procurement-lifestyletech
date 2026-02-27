import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search, 
  Plus, 
  Building2,
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useVendors, useDeleteVendor } from '@/hooks/useVendors';

const ITEMS_PER_PAGE = 10;

export default function VendorListNew() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: vendors = [], isLoading } = useVendors();
  const deleteVendorMutation = useDeleteVendor();

  const filteredVendors = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
                       (v.contact_person || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentVendors = filteredVendors.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ขายรายนี้?')) return;
    
    try {
      await deleteVendorMutation.mutateAsync(id);
      toast.success('ลบผู้ขายเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('ไม่สามารถลบผู้ขายได้');
    }
  };

  if (isLoading) return <div className="flex h-[80vh] items-center justify-center font-bold text-blue-600"><Loader2 className="h-10 w-10 animate-spin mr-3" /> กำลังดึงข้อมูลผู้ขายจากระบบ...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">รายชื่อผู้ขาย (Vendors)</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">จัดการข้อมูลผู้ขายและแกะสร้างความร่วมมือทางธุรกิจทั้งหมด</p>
        </div>
        <Link to="/vendors/new">
          <Button className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white px-8 h-12 rounded-2xl font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มผู้ขายใหม่
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="ค้นหาชื่อบริษัท, รหัส หรือผู้ติดต่อ..." 
                className="pl-12 h-12 bg-[#F9FAFB] border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-6 h-12 bg-[#F9FAFB] border-none rounded-2xl text-sm font-bold text-gray-600 cursor-pointer focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="all">ทุกประเภทผู้ขาย</option>
                <option value="active">ใช้งานอยู่</option>
                <option value="inactive">ไม่ใช้งาน</option>
              </select>
              <select
                className="px-6 h-12 bg-[#F9FAFB] border-none rounded-2xl text-sm font-bold text-gray-600 cursor-pointer focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option>สถานะทั้งหมด</option>
                <option>รอดำเนินการ</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="py-32 text-center flex flex-col items-center justify-center">
              <Building2 className="h-12 w-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">ไม่พบข้อมูลผู้ขายในฐานข้อมูล</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 border-b border-gray-100">
                    <TableHead className="font-black text-gray-700 text-xs uppercase tracking-wider py-5 pl-8">ข้อมูล / รหัส</TableHead>
                    <TableHead className="font-black text-gray-700 text-xs uppercase tracking-wider">ประเภท</TableHead>
                    <TableHead className="font-black text-gray-700 text-xs uppercase tracking-wider">ผู้ติดต่อ</TableHead>
                    <TableHead className="font-black text-gray-700 text-xs uppercase tracking-wider">เบอร์โทร</TableHead>
                    <TableHead className="font-black text-gray-700 text-xs uppercase tracking-wider">สถานะ</TableHead>
                    <TableHead className="font-black text-gray-700 text-xs uppercase tracking-wider text-right pr-8">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentVendors.map((vendor, index) => (
                    <TableRow key={vendor.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-sm ${
                            index % 4 === 0 ? 'bg-blue-500' :
                            index % 4 === 1 ? 'bg-orange-500' :
                            index % 4 === 2 ? 'bg-purple-500' : 'bg-pink-500'
                          }`}>
                            {vendor.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm leading-tight">{vendor.name}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">VD-{String(vendor.id).padStart(5, '0')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 font-bold text-[10px] uppercase tracking-wider px-3 py-1">
                          {vendor.category || 'วัสดุ'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{vendor.contact_person || '-'}</p>
                          <p className="text-xs text-gray-500">{vendor.email || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-gray-700 text-sm">{vendor.phone || 'ไม่ระบุ'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-full px-3 py-1 font-black uppercase text-[9px] tracking-widest border-none ${
                          vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {vendor.status === 'active' ? '● ใช้งานอยู่' : '○ ไม่ใช้งาน'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                            title="ดูข้อมูล"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all"
                            title="แก้ไข"
                            asChild
                          >
                            <Link to={`/vendors/edit/${vendor.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                            title="ลบ"
                            onClick={() => handleDelete(vendor.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-8 py-6 border-t border-gray-100 bg-gray-50/30">
                  <p className="text-sm text-gray-600 font-medium">
                    แสดง {startIndex + 1} ถึง {Math.min(endIndex, filteredVendors.length)} จากทั้งหมด {filteredVendors.length} รายการ
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-gray-200 hover:bg-gray-100 font-bold"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      ก่อนหน้า
                    </Button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={`h-9 w-9 rounded-xl font-bold ${
                            currentPage === page 
                              ? 'bg-orange-500 text-white hover:bg-orange-600 border-none' 
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-gray-200 hover:bg-gray-100 font-bold"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      ถัดไป
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-orange-50 border-orange-100 rounded-3xl border-2">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 rounded-2xl">
              <Building2 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-orange-900 mb-2">ต้องการเพิ่มผู้ขายเข้าสู่ระบบหรือไม่?</h4>
              <p className="text-sm text-orange-800 font-medium leading-relaxed">
                คุณสามารถเพิ่มผู้ขายรายใหม่และบริหารจัดการสัญญาผู้ขายเพื่อใช้ในแดชบอร์ดจัดซื้อได้ทันที
              </p>
            </div>
            <Link to="/vendors/new">
              <Button className="bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-100 font-bold rounded-xl px-6 transition-all">
                สร้างใบเพิ่มผู้ขายทันที
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
