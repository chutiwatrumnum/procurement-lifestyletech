import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Camera,
  Save,
  Loader2,
  Shield,
  Key,
  Eye,
  EyeOff,
  Signature,
  Upload,
  X,
  Check
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfileSettings() {
  const { user: currentUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    departmentName: '',
    role: '',
    avatar: '',
    signature: ''
  });
  
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const refreshUserData = async () => {
    if (!currentUser?.id) return;
    try {
      const userData = await pb.collection('users').getOne(currentUser.id);
      setProfile(prev => ({
        ...prev,
        signature: userData.signature || '',
        avatar: userData.avatar || ''
      }));
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        position: currentUser.position || '',
        departmentName: currentUser.departmentName || '',
        role: currentUser.role || '',
        avatar: currentUser.avatar || '',
        signature: (currentUser as any).signature || ''
      });
      setLoading(false);
      
      // ดึงข้อมูลล่าสุดจาก API เพื่อให้แน่ใจว่าได้ signature ล่าสุด
      refreshUserData();
    }
  }, [currentUser]);

  const handleUpdateProfile = async () => {
    if (!currentUser?.id) return;
    
    setSaving(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        name: profile.name,
        phone: profile.phone || undefined,
        position: profile.position || undefined
      });
      
      toast.success('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err: any) {
      console.error('Update profile failed:', err);
      toast.error(err.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?.id) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    
    setChangingPassword(true);
    try {
      // Verify current password
      await pb.collection('users').authWithPassword(currentUser.email, passwordForm.currentPassword);
      
      // Update password
      await pb.collection('users').update(currentUser.id, {
        password: passwordForm.newPassword,
        passwordConfirm: passwordForm.newPassword
      });
      
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Logout after 2 seconds
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      console.error('Change password failed:', err);
      toast.error(err.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ (PNG, JPG)');
      return;
    }
    
    setUploadingSignature(true);
    const formData = new FormData();
    formData.append('signature', file);
    
    try {
      const updated = await pb.collection('users').update(currentUser.id, formData);
      setProfile({ ...profile, signature: updated.signature });
      await refreshUserData();
      toast.success('อัปโหลดลายเซ็นสำเร็จ');
    } catch (err: any) {
      console.error('Upload signature failed:', err);
      toast.error('อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!currentUser?.id) return;
    
    try {
      await pb.collection('users').update(currentUser.id, {
        signature: null
      });
      setProfile({ ...profile, signature: '' });
      await refreshUserData();
      toast.success('ลบลายเซ็นสำเร็จ');
    } catch (err: any) {
      console.error('Delete signature failed:', err);
      toast.error('ลบลายเซ็นไม่สำเร็จ');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      await pb.collection('users').update(currentUser.id, formData);
      toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
    } catch (err: any) {
      console.error('Upload avatar failed:', err);
      toast.error('อัปโหลดรูปไม่สำเร็จ');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: 'ผู้ดูแลระบบ',
      head_of_dept: 'หัวหน้าแผนก',
      manager: 'ผู้จัดการ',
      employee: 'พนักงาน'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: 'bg-purple-100 text-purple-700',
      head_of_dept: 'bg-blue-100 text-blue-700',
      manager: 'bg-green-100 text-green-700',
      employee: 'bg-gray-100 text-gray-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">ตั้งค่าบัญชี</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการโปรไฟล์และความปลอดภัยของคุณ</p>
      </div>

      {/* Profile Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-blue-600" />
            ข้อมูลส่วนตัว
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-blue-50">
                <AvatarImage 
                  src={profile.avatar ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${currentUser?.id}/${profile.avatar}` : ''} 
                />
                <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getRoleColor(profile.role)} border-none`}>
                  {getRoleLabel(profile.role)}
                </Badge>
                {profile.departmentName && (
                  <Badge variant="outline" className="text-gray-600">
                    <Building2 className="w-3 h-3 mr-1" />
                    {profile.departmentName}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                ชื่อ-นามสกุล *
              </Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="ระบุชื่อ-นามสกุล"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                อีเมล (ไม่สามารถแก้ไข)
              </Label>
              <Input
                value={profile.email}
                disabled
                className="h-11 rounded-xl bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                เบอร์โทรศัพท์
              </Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="0xx-xxx-xxxx"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                ตำแหน่ง
              </Label>
              <Input
                value={profile.position}
                onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="เช่น วิศวกร, นักบัญชี"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateProfile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-orange-600" />
            เปลี่ยนรหัสผ่าน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                รหัสผ่านปัจจุบัน
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="h-11 rounded-xl pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                รหัสผ่านใหม่
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="h-11 rounded-xl pr-10"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                ยืนยันรหัสผ่านใหม่
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="h-11 rounded-xl pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="bg-orange-600 hover:bg-orange-700 rounded-xl px-6"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังเปลี่ยนรหัสผ่าน...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  เปลี่ยนรหัสผ่าน
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signature Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Signature className="w-5 h-5 text-purple-600" />
            ลายเซ็นดิจิทัล
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-sm text-purple-700">
              ลายเซ็นจะถูกใช้ในการอนุมัติเอกสาร PR/PO ควรใช้รูปลายเซ็นที่ชัดเจน พื้นหลังโปร่งใส (PNG) ขนาดประมาณ 300x100 พิกเซล
            </p>
          </div>

          {/* Debug Info - แสดงค่า signature ปัจจุบัน */}
          <div className="p-2 bg-gray-100 rounded text-xs font-mono text-gray-500">
            Status: {profile.signature ? 'มีลายเซ็น ✓' : 'ไม่มีลายเซ็น ✗'} | 
            File: {profile.signature || 'none'}
          </div>

          {profile.signature ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <Check className="w-5 h-5" />
                <span>มีลายเซ็นแล้ว</span>
              </div>
              <Label>ตัวอย่างลายเซ็น</Label>
              <div className="p-6 bg-white rounded-xl border-2 border-green-200 flex items-center justify-center min-h-[120px]">
                <img
                  src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${currentUser?.id}/${profile.signature}?t=${Date.now()}`}
                  alt="ลายเซ็น"
                  className="max-h-24 object-contain"
                  onError={(e) => {
                    console.error('Failed to load signature image:', profile.signature);
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-red-500 text-sm">โหลดรูปไม่สำเร็จ</span>';
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={uploadingSignature}
                  className="rounded-xl flex-1"
                >
                  {uploadingSignature ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  เปลี่ยนลายเซ็น
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteSignature}
                  disabled={uploadingSignature}
                  className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  ลบ
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <Signature className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">ยังไม่มีลายเซ็น</p>
                <p className="text-gray-400 text-xs mt-1">กรุณาอัปโหลดลายเซ็นเพื่อใช้ในการอนุมัติเอกสาร</p>
              </div>
              <Button
                onClick={() => signatureInputRef.current?.click()}
                disabled={uploadingSignature}
                className="bg-purple-600 hover:bg-purple-700 rounded-xl w-full"
              >
                {uploadingSignature ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                อัปโหลดลายเซ็น
              </Button>
            </div>
          )}
          <input
            type="file"
            ref={signatureInputRef}
            onChange={handleSignatureUpload}
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  );
}
