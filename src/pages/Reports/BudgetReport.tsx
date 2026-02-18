import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Building2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { projectService, prService } from '@/services/api';

export default function BudgetReport() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [projList, prList] = await Promise.all([
          projectService.getAll(),
          prService.getAll()
        ]);

        const enrichedProjects = projList.map((p: any) => {
          const prsForProject = prList.filter((pr: any) => pr.project === p.id);
          const used = prsForProject.reduce((sum: number, pr: any) => sum + (pr.total_amount || 0), 0);
          const percentage = p.budget > 0 ? Math.min(100, Math.round((used / p.budget) * 100)) : 0;
          
          return {
            ...p,
            used,
            remaining: p.budget - used,
            percentage,
            prCount: prsForProject.length,
            status: percentage >= 90 ? 'critical' : percentage >= 75 ? 'warning' : 'good'
          };
        });

        setProjects(enrichedProjects);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalUsed = projects.reduce((sum, p) => sum + (p.used || 0), 0);
  const totalRemaining = totalBudget - totalUsed;
  const averageUsage = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">สรุปการใช้จ่ายรายโครงการ</h1>
          <p className="text-gray-500 text-sm mt-1">ภาพรวมงบประมาณและการใช้จ่ายจริงจากฐานข้อมูล</p>
        </div>
        <Button variant="outline" className="rounded-xl border-[#E5E7EB]">
          <Download className="w-4 h-4 mr-2" /> ส่งออกรายงาน
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4"><DollarSign className="w-5 h-5" /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">งบประมาณรวม</p>
            <p className="text-2xl font-bold text-gray-900">฿{(totalBudget / 1000000).toFixed(1)}M</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl w-fit mb-4"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ใช้ไปแล้ว</p>
            <p className="text-2xl font-bold text-orange-600">฿{(totalUsed / 1000000).toFixed(2)}M</p>
            <p className="text-[10px] text-gray-400 mt-1 font-bold">{averageUsage.toFixed(1)}% ของงบรวม</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl w-fit mb-4"><TrendingDown className="w-5 h-5" /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">คงเหลือสุทธิ</p>
            <p className="text-2xl font-bold text-green-600">฿{(totalRemaining / 1000000).toFixed(2)}M</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl w-fit mb-4"><Building2 className="w-5 h-5" /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">โครงการที่รันอยู่</p>
            <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-gray-50 py-5">
          <CardTitle className="text-lg font-bold">รายละเอียดงบประมาณแต่ละโครงการ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <th className="py-4 px-6 text-left font-bold uppercase text-[10px] tracking-wider">รหัส</th>
                  <th className="py-4 px-6 text-left font-bold uppercase text-[10px] tracking-wider">ชื่อโครงการ</th>
                  <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider">งบประมาณ</th>
                  <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider">เบิกจ่ายไป</th>
                  <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">% การใช้</th>
                  <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">สถานะงบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-blue-600">{p.code}</td>
                    <td className="py-5 px-6 font-bold text-[#1F2937]">{p.name}</td>
                    <td className="py-5 px-6 text-right text-gray-500 font-medium">฿{p.budget?.toLocaleString()}</td>
                    <td className="py-5 px-6 text-right text-orange-600 font-bold">฿{p.used?.toLocaleString()}</td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col items-center gap-1.5 w-32 mx-auto">
                        <span className="text-[10px] font-black text-[#1F2937]">{p.percentage}%</span>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              p.status === 'critical' ? 'bg-red-500' : p.status === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <Badge className={`rounded-full px-3 py-1 font-bold ${
                        p.status === 'critical' ? 'bg-red-50 text-red-700' : p.status === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {p.status === 'critical' ? 'งบเกือบหมด' : p.status === 'warning' ? 'ใช้ไปมาก' : 'ปกติ'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
