import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save, Building2 } from 'lucide-react';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { toast } from 'sonner';

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState({
    name: '',
    code: '',
    budget: 0,
    location: '',
    status: 'active'
  });

  const { data: projectData, isLoading: loading } = useProject(id);
  const updateProjectMutation = useUpdateProject();

  useEffect(() => {
    if (projectData) {
      setProject({
        name: projectData.name || '',
        code: projectData.code || '',
        budget: projectData.budget || 0,
        location: projectData.location || '',
        status: projectData.status || 'active'
      });
    }
  }, [projectData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    try {
      await updateProjectMutation.mutateAsync({ id, data: project });
      toast.success('บันทึกการแก้ไขเรียบร้อยแล้ว');
      navigate('/projects');
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + (err.message || 'เกิดข้อผิดพลาด'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">แก้ไขโครงการ</h1>
          <p className="text-gray-500 text-sm">แก้ไขข้อมูลโครงการ</p>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            ข้อมูลโครงการ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>ชื่อโครงการ</Label>
              <Input
                value={project.name}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                placeholder="ระบุชื่อโครงการ"
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>รหัสโครงการ</Label>
              <Input
                value={project.code}
                onChange={(e) => setProject({ ...project, code: e.target.value })}
                placeholder="ระบุรหัสโครงการ"
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>งบประมาณ</Label>
              <Input
                type="number"
                value={project.budget}
                onChange={(e) => setProject({ ...project, budget: Number(e.target.value) })}
                placeholder="ระบุงบประมาณ"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>สถานที่</Label>
              <Input
                value={project.location}
                onChange={(e) => setProject({ ...project, location: e.target.value })}
                placeholder="ระบุสถานที่โครงการ"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl h-11 font-bold"
                onClick={() => navigate('/projects')}
                disabled={updateProjectMutation.isPending}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl h-11 font-bold bg-blue-600 hover:bg-blue-700"
                disabled={updateProjectMutation.isPending}
              >
                {updateProjectMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                บันทึกการแก้ไข
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
