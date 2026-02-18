import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Building2, 
  Search, 
  AlertTriangle,
  Loader2,
  TrendingDown,
  Boxes,
  ArrowLeft
} from 'lucide-react';
import { projectService } from '@/services/api';
import pb from '@/lib/pocketbase';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface ProjectItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  project: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function ProjectStock() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('project');
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectItems(selectedProject);
    }
  }, [selectedProject]);

  async function loadProjects() {
    try {
      const data = await projectService.getAll();
      setProjects(data);
      
      // ถ้ามี projectId จาก URL ให้ใช้ตัวนั้น
      if (projectIdFromUrl && data.find((p: Project) => p.id === projectIdFromUrl)) {
        setSelectedProject(projectIdFromUrl);
      } else if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectItems(projectId: string) {
    try {
      const items = await pb.collection('project_items').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'name'
      });
      setProjectItems(items as any);
    } catch (err) {
      console.error('Error loading project items:', err);
      setProjectItems([]);
    }
  }

  const filteredItems = projectItems.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  
  // คำนวณสถิติ
  const totalItems = projectItems.length;
  const lowStockItems = projectItems.filter(item => item.quantity <= 5);
  const totalValue = projectItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {projectIdFromUrl && (
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Package className="w-7 h-7 text-blue-600" />
              สต็อกโครงการ
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ดูยอดคงเหลือและมูลค่าอุปกรณ์ในแต่ละโครงการ
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Boxes className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">จำนวนรายการทั้งหมด</p>
                <p className="text-2xl font-black text-blue-600">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ใกล้หมด (≤5)</p>
                <p className="text-2xl font-black text-orange-600">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">มูลค่ารวม</p>
                <p className="text-2xl font-black text-green-600">฿{totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Selector */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            เลือกโครงการ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Button
                key={project.id}
                variant={selectedProject === project.id ? 'default' : 'outline'}
                onClick={() => setSelectedProject(project.id)}
                className={`rounded-xl font-bold ${
                  selectedProject === project.id ? 'bg-blue-600' : ''
                }`}
              >
                {project.code} - {project.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg font-bold">
              รายการอุปกรณ์: {selectedProjectData?.name || 'เลือกโครงการ'}
            </CardTitle>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาอุปกรณ์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-80 rounded-xl"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>ไม่พบรายการอุปกรณ์</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="py-4 px-6 text-left font-bold uppercase text-[10px] tracking-wider">รายการ</th>
                    <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider w-32">จำนวนคงเหลือ</th>
                    <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider w-32">ราคาต่อหน่วย</th>
                    <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider w-32">มูลค่ารวม</th>
                    <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider w-24">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-900">{item.name}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p className={`text-lg font-black ${
                          item.quantity <= 5 ? 'text-red-600' : 
                          item.quantity <= 10 ? 'text-orange-600' : 
                          'text-green-600'
                        }`}>
                          {item.quantity}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-medium text-gray-600">฿{item.unit_price?.toLocaleString() || 0}</p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-black text-gray-900">฿{item.total_price?.toLocaleString() || 0}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {item.quantity <= 5 ? (
                          <Badge className="bg-red-50 text-red-700 border-none">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            ใกล้หมด
                          </Badge>
                        ) : item.quantity <= 10 ? (
                          <Badge className="bg-orange-50 text-orange-700 border-none">
                            เหลือน้อย
                          </Badge>
                        ) : (
                          <Badge className="bg-green-50 text-green-700 border-none">
                            ปกติ
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="border-none shadow-sm rounded-2xl bg-gray-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm">สรุปสต็อกโครงการ</p>
              <p className="text-xl font-bold">{selectedProjectData?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">มูลค่าอุปกรณ์คงเหลือรวม</p>
              <p className="text-3xl font-black text-green-400">฿{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
