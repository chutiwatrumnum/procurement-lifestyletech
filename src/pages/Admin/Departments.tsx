import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  Users,
  Building2,
  Hash
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import pb from '@/lib/pocketbase';

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  description: string;
  head?: string;
  headName?: string;
  memberCount: number;
  created: string;
}

export default function DepartmentManagement() {
  const navigate = useNavigate();
  const { isSuperAdmin, canManageUsers } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<DepartmentData | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head: 'none',
  });

  const queryClient = useQueryClient();

  // Fetch departments with expand head + count members
  const { data: rawDepartments = [], isLoading } = useQuery({
    queryKey: ['departments-admin'],
    queryFn: async () => {
      const depts = await pb.collection('departments').getFullList({
        sort: 'name',
        expand: 'head',
      });
      // Count members per department
      const users = await pb.collection('users').getFullList({ fields: 'department' });
      const countMap: Record<string, number> = {};
      users.forEach((u: any) => {
        if (u.department) {
          countMap[u.department] = (countMap[u.department] || 0) + 1;
        }
      });
      return depts.map((d: any) => ({
        id: d.id,
        name: d.name || '',
        code: d.code || '',
        description: d.description || '',
        head: d.head || '',
        headName: d.expand?.head?.name || '',
        memberCount: countMap[d.id] || 0,
        created: d.created,
      }));
    },
  });

  // Fetch users for head selection
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-dept'],
    queryFn: async () => {
      const users = await pb.collection('users').getFullList({
        sort: 'name',
        fields: 'id,name,role',
      });
      return users;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => pb.collection('departments').create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments-admin'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pb.collection('departments').update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments-admin'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pb.collection('departments').delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments-admin'] }),
  });

  const departments: DepartmentData[] = rawDepartments;

  const filtered = useMemo(() =>
    departments.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase())
    ), [departments, searchTerm]);

  const totalMembers = departments.reduce((s, d) => s + d.memberCount, 0);

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '', head: 'none' });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('กรุณากรอกชื่อแผนก');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        head: formData.head === 'none' ? undefined : formData.head,
      });
      toast.success('สร้างแผนกสำเร็จ');
      setIsCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'สร้างแผนกไม่สำเร็จ');
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        data: {
          name: formData.name,
          code: formData.code || undefined,
          description: formData.description || undefined,
          head: formData.head === 'none' ? '' : formData.head,
        },
      });
      toast.success('อัปเดตแผนกสำเร็จ');
      setIsEditOpen(false);
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message || 'อัปเดตไม่สำเร็จ');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteMutation.mutateAsync(selected.id);
      toast.success('ลบแผนกสำเร็จ');
      setIsDeleteOpen(false);
      setSelected(null);
    } catch (err: any) {
      toast.error(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const openEdit = (dept: DepartmentData) => {
    setSelected(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      head: dept.head || 'none',
    });
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">จัดการแผนก</h1>
          <p className="text-sm text-gray-500 mt-1">เพิ่ม แก้ไข และจัดการแผนกในองค์กร</p>
        </div>

        <Button
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold shadow-lg"
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มแผนกใหม่
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">แผนกทั้งหมด</p>
            <p className="text-2xl font-black text-blue-600">{departments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">สมาชิกทั้งหมด</p>
            <p className="text-2xl font-black text-green-600">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-purple-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">มีหัวหน้าแผนก</p>
            <p className="text-2xl font-black text-purple-600">
              {departments.filter(d => d.head).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ค้นหาชื่อแผนก, รหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-gray-50 border-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Departments Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่พบแผนก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase text-[10px] tracking-wider">แผนก</th>
                    <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase text-[10px] tracking-wider">รหัส</th>
                    <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase text-[10px] tracking-wider">หัวหน้าแผนก</th>
                    <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase text-[10px] tracking-wider">สมาชิก</th>
                    <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase text-[10px] tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{dept.name}</p>
                            {dept.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{dept.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {dept.code ? (
                          <Badge className="bg-gray-100 text-gray-700 border-none font-mono">{dept.code}</Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {dept.headName ? (
                          <span className="text-sm font-medium text-gray-700">{dept.headName}</span>
                        ) : (
                          <span className="text-xs text-gray-400">ยังไม่ระบุ</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge className="bg-blue-50 text-blue-700 border-none">
                          <Users className="w-3 h-3 mr-1" />
                          {dept.memberCount}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => openEdit(dept)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                            onClick={() => { setSelected(dept); setIsDeleteOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              เพิ่มแผนกใหม่
            </DialogTitle>
            <DialogDescription>สร้างแผนกใหม่ในระบบ</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อแผนก *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น แผนกจัดซื้อ"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>รหัสแผนก</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="เช่น PROC, HR, FIN"
                className="rounded-xl font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>หัวหน้าแผนก</Label>
              <Select value={formData.head} onValueChange={(v) => setFormData({ ...formData, head: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกหัวหน้าแผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {allUsers.filter((u: any) => ['superadmin', 'head_of_dept', 'manager'].includes(u.role)).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'สร้างแผนก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setSelected(null); resetForm(); } }}>
        <DialogContent className="max-w-md rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              แก้ไขแผนก
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อแผนก *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>รหัสแผนก</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="rounded-xl font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>หัวหน้าแผนก</Label>
              <Select value={formData.head} onValueChange={(v) => setFormData({ ...formData, head: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกหัวหน้าแผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {allUsers.filter((u: any) => ['superadmin', 'head_of_dept', 'manager'].includes(u.role)).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              ยืนยันการลบ
            </DialogTitle>
            <DialogDescription>
              คุณต้องการลบแผนก <strong>{selected?.name}</strong> ใช่หรือไม่?
              {selected && selected.memberCount > 0 && (
                <span className="block mt-2 text-red-500 font-bold">
                  ⚠️ แผนกนี้มี {selected.memberCount} สมาชิก!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ลบแผนก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
