import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Building2,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { vendorService } from '@/services/api';

export default function VendorListNew() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function loadVendors() {
      try {
        const data = await vendorService.getAll();
        setVendors(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  const filteredVendors = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
                       (v.contact_person || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <div className="flex h-[80vh] items-center justify-center font-bold text-blue-600"><Loader2 className="h-10 w-10 animate-spin mr-3" /> กำลังดึงข้อมูลผู้ขายจากระบบ...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">รายชื่อผู้ขายและพันธมิตร (Vendors)</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">บริหารจัดการข้อมูลผู้ขาย และ Supplier ทั้งหมดในฐานข้อมูล</p>
        </div>
        <Link to="/vendors/new">
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-8 h-12 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
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
                placeholder="ค้นหาชื่อบริษัท หรือ ชื่อผู้ติดต่อ..." 
                className="pl-12 h-12 bg-[#F9FAFB] border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 p-1.5 bg-[#F3F4F6] rounded-2xl">
              <Button 
                variant={filter === 'all' ? 'default' : 'ghost'} 
                size="sm"
                className={`rounded-xl px-8 h-9 font-bold text-[11px] uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setFilter('all')}
              >
                ทั้งหมด
              </Button>
              <Button 
                variant={filter === 'active' ? 'default' : 'ghost'} 
                size="sm"
                className={`rounded-xl px-8 h-9 font-bold text-[11px] uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setFilter('active')}
              >
                ใช้งานอยู่
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-50 flex flex-col items-center justify-center">
            <Building2 className="h-12 w-12 text-gray-200 mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">ไม่พบข้อมูลผู้ขายในฐานข้อมูล</p>
          </div>
        ) : (
          filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="border-none shadow-sm rounded-[2rem] hover:shadow-xl transition-all group overflow-hidden bg-white">
              <CardHeader className="pb-6 pt-8 px-8 border-b border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-5">
                    <div className="p-4 bg-blue-50 rounded-3xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-xl font-black text-[#1F2937] leading-tight truncate tracking-tight">{vendor.name}</CardTitle>
                      <Badge variant="outline" className="mt-2.5 bg-[#F9FAFB] border-gray-100 text-[#6B7280] font-black uppercase text-[9px] tracking-widest px-2.5 py-1">
                        {vendor.category || 'General Partner'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-gray-50"><MoreVertical className="w-5 h-5 text-[#9CA3AF]" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-8 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="p-2 bg-[#F9FAFB] rounded-xl group-hover:bg-blue-50 transition-colors">
                      <Phone className="w-4 h-4 text-[#6B7280] group-hover:text-blue-500" />
                    </div>
                    <span className="text-[#4B5563] font-bold tracking-tight">{vendor.phone || 'ไม่ระบุเบอร์โทรศัพท์'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="p-2 bg-[#F9FAFB] rounded-xl group-hover:bg-blue-50 transition-colors">
                      <Mail className="w-4 h-4 text-[#6B7280] group-hover:text-blue-500" />
                    </div>
                    <span className="text-[#4B5563] truncate font-bold tracking-tight">{vendor.email || 'ไม่ระบุอีเมล'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="p-2 bg-[#F9FAFB] rounded-xl group-hover:bg-blue-50 transition-colors">
                      <MapPin className="w-4 h-4 text-[#6B7280] group-hover:text-blue-500" />
                    </div>
                    <span className="text-[#4B5563] truncate font-bold tracking-tight leading-relaxed">{vendor.address || 'ไม่ระบุที่อยู่สำนักงาน'}</span>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                  <Badge className={`rounded-full px-4 py-1 font-black uppercase text-[9px] tracking-widest border-none ${
                    vendor.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {vendor.status === 'active' ? '● Active' : '○ Inactive'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
