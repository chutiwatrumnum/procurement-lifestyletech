import { useState, useEffect, useMemo } from 'react';
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
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserCog,
  Mail,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUsers, useDepartments, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'head_of_dept' | 'manager' | 'employee';
  department?: string;
  departmentName?: string;
  manager?: string;
  managerName?: string;
  is_active: boolean;
  phone?: string;
  position?: string;
  created: string;
}

interface Department {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  superadmin: 'ผู้ดูแลระบบ',
  head_of_dept: 'หัวหน้าแผนก',
  manager: 'ผู้จัดการ',
  employee: 'พนักงาน'
};

const roleColors: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  head_of_dept: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-700'
};

export default function UserManagement() {
  const navigate = useNavigate();
  const { user: currentUser, isSuperAdmin, isHeadOfDept, canManageUsers } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee' as UserData['role'],
    department: 'none',
    manager: 'none',
    phone: '',
    position: '',
    is_active: true
  });

  // TanStack Query hooks
  const { data: rawUsers = [], isLoading: loading } = useUsers();
  const { data: departments = [] } = useDepartments();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const users: UserData[] = useMemo(() => rawUsers.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department,
    departmentName: u.expand?.department?.name,
    manager: u.manager,
    managerName: u.expand?.manager?.name,
    is_active: u.is_active ?? true,
    phone: u.phone,
    position: u.position,
    created: u.created
  })), [rawUsers]);

  useEffect(() => {
    if (!canManageUsers()) {
      toast.error('คุณไม่มีสิทธิ์จัดการผู้ใช้');
      navigate('/');
    }
  }, []);

  const handleCreate = async () => {
    if (!formData.name || !formData.email) {
      toast.error('กรุณากรอกชื่อและอีเมล');
      return;
    }
    if (!isSuperAdmin() && formData.role === 'superadmin') {
      toast.error('คุณไม่มีสิทธิ์สร้างผู้ดูแลระบบ');
      return;
    }

    try {
      const tempPassword = Math.random().toString(36).slice(-8);
      await createUserMutation.mutateAsync({
        email: formData.email,
        password: tempPassword,
        passwordConfirm: tempPassword,
        name: formData.name,
        role: formData.role,
        department: formData.department === 'none' ? undefined : formData.department,
        manager: formData.manager === 'none' ? undefined : formData.manager,
        phone: formData.phone || undefined,
        position: formData.position || undefined,
        is_active: true
      });
      toast.success(`สร้างผู้ใช้สำเร็จ (รหัสผ่านชั่วคราว: ${tempPassword})`);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Create user failed:', err);
      toast.error(err.message || 'สร้างผู้ใช้ไม่สำเร็จ');
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    if (!isSuperAdmin()) {
      if (isHeadOfDept() && selectedUser.department !== currentUser?.department) {
        toast.error('คุณไม่มีสิทธิ์แก้ไขผู้ใช้นอกแผนก');
        return;
      }
      if (formData.role === 'superadmin') {
        toast.error('คุณไม่มีสิทธิ์ตั้งเป็นผู้ดูแลระบบ');
        return;
      }
    }

    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: {
          name: formData.name,
          role: formData.role,
          department: formData.department === 'none' ? undefined : formData.department,
          manager: formData.manager === 'none' ? undefined : formData.manager,
          phone: formData.phone || undefined,
          position: formData.position || undefined,
          is_active: formData.is_active
        }
      });
      toast.success('อัปเดตผู้ใช้สำเร็จ');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Update user failed:', err);
      toast.error(err.message || 'อัปเดตไม่สำเร็จ');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser?.id) {
      toast.error('ไม่สามารถลบตัวเองได้');
      return;
    }
    if (!isSuperAdmin()) {
      if (isHeadOfDept() && selectedUser.department !== currentUser?.department) {
        toast.error('คุณไม่มีสิทธิ์ลบผู้ใช้นอกแผนก');
        return;
      }
      if (selectedUser.role === 'superadmin') {
        toast.error('คุณไม่มีสิทธิ์ลบผู้ดูแลระบบ');
        return;
      }
    }

    try {
      await deleteUserMutation.mutateAsync(selectedUser.id);
      toast.success('ลบผู้ใช้สำเร็จ');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Delete user failed:', err);
      toast.error(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const openEditDialog = (user: UserData) => {
    try {
      console.log('Opening edit dialog for user:', user);
      
      // Check permissions
      if (!isSuperAdmin()) {
        if (isHeadOfDept() && user.department !== currentUser?.department) {
          toast.error('คุณไม่มีสิทธิ์แก้ไขผู้ใช้นอกแผนก');
          return;
        }
      }

      setSelectedUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'employee',
        department: user.department || 'none',
        manager: user.manager || 'none',
        phone: user.phone || '',
        position: user.position || '',
        is_active: user.is_active ?? true
      });
      setIsEditDialogOpen(true);
    } catch (err) {
      console.error('Error opening edit dialog:', err);
      toast.error('เกิดข้อผิดพลาดในการเปิดหน้าแก้ไข');
    }
  };

  const openDeleteDialog = (user: UserData) => {
    if (user.id === currentUser?.id) {
      toast.error('ไม่สามารถลบตัวเองได้');
      return;
    }
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'employee',
      department: 'none',
      manager: 'none',
      phone: '',
      position: '',
      is_active: true
    });
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.position && user.position.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการสิทธิ์และข้อมูลผู้ใช้ในระบบ</p>
        </div>
        
        {isSuperAdmin() && (
          <Button 
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold shadow-lg"
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มผู้ใช้ใหม่
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">ผู้ใช้ทั้งหมด</p>
            <p className="text-2xl font-black text-blue-600">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">ใช้งานอยู่</p>
            <p className="text-2xl font-black text-green-600">
              {users.filter(u => u.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-purple-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">ผู้ดูแลระบบ</p>
            <p className="text-2xl font-black text-purple-600">
              {users.filter(u => u.role === 'superadmin').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-orange-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">หัวหน้าแผนก</p>
            <p className="text-2xl font-black text-orange-600">
              {users.filter(u => u.role === 'head_of_dept').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาชื่อ, อีเมล, ตำแหน่ง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-gray-50 border-none"
              />
            </div>
            
            <div className="flex gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 h-11 rounded-xl bg-gray-50 border-none">
                  <SelectValue placeholder="ทุกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกบทบาท</SelectItem>
                  <SelectItem value="superadmin">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="head_of_dept">หัวหน้าแผนก</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="employee">พนักงาน</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-11 rounded-xl bg-gray-50 border-none">
                  <SelectValue placeholder="ทุกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="active">ใช้งานอยู่</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่พบผู้ใช้งาน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase text-[10px] tracking-wider">ผู้ใช้</th>
                    <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase text-[10px] tracking-wider">บทบาท</th>
                    <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase text-[10px] tracking-wider">แผนก</th>
                    <th className="py-4 px-6 text-left font-bold text-gray-600 uppercase text-[10px] tracking-wider">ตำแหน่ง</th>
                    <th className="py-4 px-6 text-center font-bold text-gray-600 uppercase text-[10px] tracking-wider">สถานะ</th>
                    <th className="py-4 px-6 text-right font-bold text-gray-600 uppercase text-[10px] tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`${roleColors[user.role]} border-none`}>
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-600">{user.departmentName || '-'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-600">{user.position || '-'}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" /> ใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold">
                            <XCircle className="w-3 h-3" /> ไม่ใช้งาน
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {isSuperAdmin() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              เพิ่มผู้ใช้ใหม่
            </DialogTitle>
            <DialogDescription>
              สร้างบัญชีผู้ใช้ใหม่ในระบบ รหัสผ่านจะสร้างอัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อ-นามสกุล *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ระบุชื่อ-นามสกุล"
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>อีเมล *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@company.com"
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>บทบาท *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(v: any) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">พนักงาน</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="head_of_dept">หัวหน้าแผนก</SelectItem>
                  {isSuperAdmin() && (
                    <SelectItem value="superadmin">ผู้ดูแลระบบ</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>แผนก</Label>
              <Select 
                value={formData.department} 
                onValueChange={(v) => setFormData({ ...formData, department: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ตำแหน่ง</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="เช่น วิศวกร, นักบัญชี"
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>เบอร์โทร</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0xx-xxx-xxxx"
                className="rounded-xl"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'สร้างผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setSelectedUser(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              แก้ไขผู้ใช้
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อ-นามสกุล</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>อีเมล (ไม่สามารถแก้ไข)</Label>
              <Input value={formData.email} disabled className="rounded-xl bg-gray-50" />
            </div>
            
            <div className="space-y-2">
              <Label>บทบาท</Label>
              <Select 
                value={formData.role} 
                onValueChange={(v: any) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">พนักงาน</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="head_of_dept">หัวหน้าแผนก</SelectItem>
                  {isSuperAdmin() && (
                    <SelectItem value="superadmin">ผู้ดูแลระบบ</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>แผนก</Label>
              <Select 
                value={formData.department} 
                onValueChange={(v) => setFormData({ ...formData, department: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ตำแหน่ง</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>เบอร์โทร</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">เปิดใช้งานบัญชีนี้</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              ยืนยันการลบ
            </DialogTitle>
            <DialogDescription>
              คุณต้องการลบผู้ใช้ <strong>{selectedUser?.name}</strong> ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ลบผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
