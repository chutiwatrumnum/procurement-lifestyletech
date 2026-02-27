import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Save,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '@/hooks/useProjects';
import { toast } from 'sonner';

export default function ProjectNew() {
  const navigate = useNavigate();
  const createProjectMutation = useCreateProject();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      code: formData.get('code'),
      budget: Number(formData.get('budget')),
      location: formData.get('location'),
      status: 'active'
    };

    try {
      await createProjectMutation.mutateAsync(data);
      toast.success('เพิ่มโครงการใหม่เรียบร้อยแล้ว');
      navigate('/projects');
    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เพิ่มโครงการใหม่</h1>
          <p className="text-gray-500 text-sm mt-1">ตั้งค่าชื่อโครงการและงบประมาณเบื้องต้น</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-50 py-6 px-8">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-[#1F2937]">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
              ข้อมูลรายละเอียดโครงการ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-[#4B5563]">ชื่อโครงการ (Project Name) *</Label>
              <Input name="name" placeholder="ระบุชื่อโครงการ เช่น Hyde Heritage Phase II" required className="h-12 rounded-xl bg-gray-50 border-none px-4 font-bold" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-[#4B5563]">รหัสโครงการ (Project Code)</Label>
                <Input name="code" placeholder="เช่น SKY-001" className="h-12 rounded-xl bg-gray-50 border-none px-4 font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[#4B5563]">งบประมาณโครงการ (Budget)</Label>
                <Input name="budget" type="number" placeholder="5,000,000" className="h-12 rounded-xl bg-gray-50 border-none px-4 font-black" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-[#4B5563]">สถานที่ก่อสร้าง (Location)</Label>
              <Textarea name="location" placeholder="ระบุที่ตั้งโครงการ..." rows={3} className="rounded-xl bg-gray-50 border-none p-4 font-medium" />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" size="lg" className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black h-12 rounded-xl shadow-lg shadow-blue-500/20" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                บันทึกสร้างโครงการ
              </Button>
              <Button type="button" variant="outline" size="lg" className="px-8 h-12 rounded-xl border-gray-200 text-gray-500 font-bold" onClick={() => navigate(-1)}>
                ยกเลิก
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
