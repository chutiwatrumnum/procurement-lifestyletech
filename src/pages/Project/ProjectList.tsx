import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Building2,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectService } from '@/services/api';

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectService.getAll();
        setProjects(data);
      } catch (err: any) {
        console.error('Fetch projects failed:', err);
        setError(err.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">จัดการโครงการ (Projects)</h1>
          <p className="text-gray-500 text-sm mt-1">บริหารจัดการโครงการก่อสร้างและงบประมาณทั้งหมด</p>
        </div>
        <Link to="/projects/new">
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl font-bold px-6">
            <Plus className="w-4 h-4 mr-2" /> เพิ่มโครงการใหม่
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-bold">Error: {error} (กรุณาเช็ค API Rules ใน PocketBase)</p>
        </div>
      )}

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="ค้นหาชื่อโครงการ หรือ รหัสโครงการ..." 
              className="pl-10 h-11 bg-[#F9FAFB] border-none rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Building2 className="w-12 h-12 mb-2 opacity-20" />
            <p className="font-bold">ยังไม่มีข้อมูลโครงการ</p>
            <p className="text-sm">กรุณากดปุ่มเพิ่มโครงการ หรือรันสคริปต์ init_db.js ค่ะ</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all group overflow-hidden bg-white">
              <CardHeader className="pb-4 border-b border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg font-bold text-[#111827] leading-tight truncate">{project.name}</CardTitle>
                      <p className="text-xs font-bold text-blue-500 mt-1 uppercase tracking-widest">#{project.code}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-4 h-4 text-[#9CA3AF]" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 bg-[#F9FAFB] rounded-lg"><DollarSign className="w-3.5 h-3.5 text-[#6B7280]" /></div>
                    <span className="font-black text-[#1F2937]">฿{Number(project.budget || 0).toLocaleString()}.00</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 bg-[#F9FAFB] rounded-lg"><MapPin className="w-3.5 h-3.5 text-[#6B7280]" /></div>
                    <span className="truncate text-gray-500 font-medium">{project.location || 'สำนักงานใหญ่'}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <Badge className="rounded-full px-3 py-1 bg-green-50 text-green-700 font-bold border-none">Active</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></Button>
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
