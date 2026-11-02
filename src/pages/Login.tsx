import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { prService } from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import pb from '@/lib/pocketbase';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';

const FIELD_CLASS = 'h-12 bg-white border-gray-300 md:text-base placeholder:text-gray-400';
const LABEL_CLASS = 'text-sm font-medium text-gray-700';

const APPROVAL_STEPS = [
  { code: 'PR', label: 'ขอซื้อ' },
  { code: 'ระดับ 1', label: 'ผู้จัดการแผนก' },
  { code: 'ระดับ 2', label: 'ผู้บริหาร' },
  { code: 'PO', label: 'สั่งซื้อ' },
];

const ROOM_LABELS = [
  { x: 180, y: 124, text: 'ห้องนอน 1' },
  { x: 180, y: 310, text: 'ห้องนั่งเล่น' },
  { x: 385, y: 124, text: 'ครัว' },
  { x: 555, y: 124, text: 'ห้องนอน 2' },
  { x: 470, y: 368, text: 'โถงกลาง' },
];

function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-12 [&::-ms-reveal]:hidden`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        aria-pressed={visible}
        className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-md text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

function FloorPlan() {
  return (
    <svg
      viewBox="0 0 680 450"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMinYMid meet"
      className="h-full w-full text-chalk"
    >
      {/* ผนัง */}
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="square">
        <path className="plan-line" pathLength={1} d="M300 60 H60 V420 H380" />
        <path className="plan-line" pathLength={1} style={{ animationDelay: '150ms' }} d="M420 420 H640 V240" />
        <path className="plan-line" pathLength={1} style={{ animationDelay: '300ms' }} d="M640 200 V60 H340" />
        <path className="plan-line" pathLength={1} style={{ animationDelay: '450ms' }} d="M60 180 H140 M180 180 H300 V60 M300 220 V420" />
        <path className="plan-line" pathLength={1} style={{ animationDelay: '600ms' }} d="M300 300 H470 M510 300 H640 M470 60 V150 M470 190 V300" />
      </g>

      {/* ประตู หน้าต่าง ระยะ และชื่อห้อง */}
      <g className="plan-note" stroke="currentColor" strokeWidth="1">
        <path d="M140 180 V220 A40 40 0 0 0 180 180" />
        <path d="M300 180 H340 A40 40 0 0 1 300 220" />
        <path d="M470 300 V260 A40 40 0 0 1 510 300" />
        <path d="M470 150 H510 A40 40 0 0 1 470 190" />
        <path d="M420 420 V380 A40 40 0 0 0 380 420" />
        <path d="M300 56 H340 M300 64 H340 M636 200 V240 M644 200 V240" />
        <path d="M60 28 H640 M60 22 V34 M300 22 V34 M640 22 V34 M28 60 V420 M22 60 H34 M22 420 H34" opacity="0.7" />
        <g fill="currentColor" stroke="none" fontSize="12" className="font-drawing">
          <text x="180" y="20" textAnchor="middle">4.80</text>
          <text x="470" y="20" textAnchor="middle">6.80</text>
          <text x="18" y="240" textAnchor="middle" transform="rotate(-90 18 240)">7.20</text>
        </g>
        <g fill="currentColor" stroke="none" fontSize="14" textAnchor="middle" className="font-display">
          {ROOM_LABELS.map((room) => (
            <text key={room.text} x={room.x} y={room.y}>{room.text}</text>
          ))}
        </g>
      </g>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { logoUrl, loading: logoLoading } = useCompanyLogo();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [pendingApproval, setPendingApproval] = useState(false);

  // ดึงรายชื่อแผนกสำหรับสมัครสมาชิก
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await pb.collection('departments').getFullList({ sort: 'name' });
        setDepartments(depts);
      } catch {
        // โหลดแผนกไม่ได้ก็ยังสมัครสมาชิกได้
      }
    };
    fetchDepartments();
  }, []);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setPassword('');
    setPendingApproval(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('เข้าสู่ระบบสำเร็จ');

      // เช็ครายการรออนุมัติและโดนตีกลับ
      try {
        const allPRs = await prService.getAll();
        const pendingCount = allPRs.filter(p => p.status === 'pending').length;
        const rejectedCount = allPRs.filter(p => p.status === 'rejected').length;

        if (pendingCount > 0 || rejectedCount > 0) {
          let message = '';
          if (pendingCount > 0) message += `📋 รออนุมัติ: ${pendingCount} รายการ`;
          if (rejectedCount > 0) message += `\n🔴 ถูกตีกลับ: ${rejectedCount} รายการ`;
          toast.info(message);
        }
      } catch {
        // นับรายการไม่ได้ก็เข้าระบบต่อได้
      }

      navigate('/');
    } catch (err: any) {
      // 403 = authRule ของ users ปฏิเสธ เพราะ is_active ยังเป็น false
      if (err.message === 'ACCOUNT_PENDING_APPROVAL' || err.status === 403) {
        setError('บัญชีของคุณยังรอการอนุมัติจาก Admin/Manager กรุณารอสักครู่');
        toast.error('บัญชียังไม่ได้รับอนุมัติ');
      } else {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        toast.error('เข้าสู่ระบบไม่สำเร็จ');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // สมัครเองเป็นพนักงานเสมอ — Admin เป็นคนกำหนดตำแหน่งตอนอนุมัติ
      await register(email, password, name, 'employee', department || undefined);
      setPendingApproval(true);
      toast.success('สมัครสำเร็จ! กรุณารอการอนุมัติจาก Admin');
    } catch (err: any) {
      // Parse PocketBase field-level validation errors
      const fieldErrors: Record<string, string> = {
        password: 'รหัสผ่าน',
        email: 'อีเมล',
        name: 'ชื่อ',
      };

      if (err?.data?.data) {
        const messages: string[] = [];
        for (const [field, detail] of Object.entries(err.data.data as Record<string, any>)) {
          const fieldName = fieldErrors[field] || field;
          if (detail?.message) {
            // Map common PocketBase error codes to Thai
            let msg = detail.message;
            if (detail.code === 'validation_min_text_constraint') {
              msg = 'ต้องมีอย่างน้อย 8 ตัวอักษร';
            } else if (detail.code === 'validation_invalid_email') {
              msg = 'รูปแบบอีเมลไม่ถูกต้อง';
            } else if (detail.code === 'validation_not_unique') {
              msg = 'มีในระบบแล้ว กรุณาใช้ค่าอื่น';
            } else if (detail.code === 'validation_required') {
              msg = 'จำเป็นต้องกรอก';
            }
            messages.push(`${fieldName}: ${msg}`);
          }
        }
        if (messages.length > 0) {
          setError(messages.join('\n'));
          toast.error(messages[0]);
        } else {
          setError(err.data?.message || 'ไม่สามารถสมัครสมาชิกได้');
          toast.error('การสมัครสมาชิกขัดข้อง');
        }
      } else {
        setError(err.data?.message || 'ไม่สามารถสมัครสมาชิกได้');
        toast.error('การสมัครสมาชิกขัดข้อง');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const errorBox = error && (
    <div role="alert" className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
      {error}
    </div>
  );

  return (
    <div className="login-sheet min-h-screen bg-cyanotype text-white lg:p-6">
      <div className="grid min-h-screen lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1fr)_460px] lg:border lg:border-chalk/40">
        {/* แบบแปลน */}
        <aside className="flex min-w-0 flex-col gap-6 p-6 lg:gap-8 lg:p-10">
          <div>
            <p className="font-display text-xl font-semibold leading-none">ระบบจัดซื้อจัดจ้าง</p>
            <p className="mt-2 font-drawing text-[11px] tracking-wider text-chalk">LIFESTYLE TECHNOLOGIES CO., LTD.</p>
          </div>

          <p className="font-display text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.25]">
            จากใบขอซื้อ<br />ถึงใบสั่งซื้อ
          </p>

          <div className="relative hidden min-h-[280px] flex-1 lg:block">
            <div className="absolute inset-0">
              <FloorPlan />
            </div>
          </div>

          <ol className="hidden grid-cols-4 border border-chalk/40 lg:grid">
            {APPROVAL_STEPS.map((step) => (
              <li key={step.code} className="border-l border-chalk/40 px-3 py-2.5 first:border-l-0">
                <p className="font-drawing text-[11px] text-chalk">{step.code}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{step.label}</p>
              </li>
            ))}
          </ol>
        </aside>

        {/* ฟอร์ม อยู่ตำแหน่งเดียวกับ title block ของแบบ */}
        <main className="flex flex-col bg-white px-6 py-8 text-gray-900 lg:px-10 lg:py-10">
          <div className="mb-8 h-14">
            {!logoLoading && (
              <img src={logoUrl || '/logo.png'} alt="โลโก้บริษัท" className="h-full max-w-full object-contain object-left" />
            )}
          </div>

          <div className="my-auto w-full">
            {pendingApproval ? (
              <div>
                <CheckCircle2 className="h-10 w-10 text-success" />
                <h1 className="mt-4 font-display text-3xl font-semibold">สมัครสำเร็จ</h1>
                <p className="mt-2 text-gray-600">
                  Admin หรือ Manager ต้องอนุมัติบัญชีของคุณก่อน จึงจะเข้าสู่ระบบได้
                </p>
                <Button
                  onClick={() => switchMode('login')}
                  variant="outline"
                  className="mt-6 h-12 w-full font-medium"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Button>
              </div>
            ) : mode === 'login' ? (
              <>
                <h1 className="font-display text-3xl font-semibold">เข้าสู่ระบบ</h1>
                <p className="mt-2 text-gray-600">ใช้อีเมลบริษัทและรหัสผ่านของคุณ</p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={LABEL_CLASS}>อีเมลบริษัท</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      className={FIELD_CLASS}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className={LABEL_CLASS}>รหัสผ่าน</Label>
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      className={FIELD_CLASS}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div className="text-right">
                      <Button type="button" variant="link" onClick={() => toast.info('กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งรหัสผ่านใหม่')} className="h-auto px-0 py-0 text-sm font-medium text-primary">ลืมรหัสผ่าน?</Button>
                    </div>
                  </div>

                  {errorBox}

                  <Button
                    type="submit"
                    className="h-12 w-full bg-primary text-base font-semibold text-white hover:bg-[#1D4ED8]"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'เข้าสู่ระบบ'}
                  </Button>
                </form>

                <p className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-600">
                  ยังไม่มีบัญชี?{' '}
                  <button type="button" onClick={() => switchMode('register')} className="font-medium text-primary hover:underline">
                    สมัครใช้งาน
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-3xl font-semibold">สมัครใช้งาน</h1>
                <p className="mt-2 text-gray-600">Admin หรือ Manager ต้องอนุมัติบัญชีก่อนจึงจะใช้งานได้</p>

                <form onSubmit={handleRegister} className="mt-8 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className={LABEL_CLASS}>ชื่อ-นามสกุล</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      autoComplete="name"
                      placeholder="สมชาย ใจดี"
                      className={FIELD_CLASS}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className={LABEL_CLASS}>อีเมลบริษัท</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      className={FIELD_CLASS}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className={LABEL_CLASS}>ตั้งรหัสผ่าน</Label>
                    <PasswordInput
                      id="reg-password"
                      autoComplete="new-password"
                      aria-describedby="reg-password-hint"
                      className={FIELD_CLASS}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p id="reg-password-hint" className="text-sm text-gray-500">อย่างน้อย 8 ตัวอักษร</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-department" className={LABEL_CLASS}>แผนก</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger id="reg-department" className="!h-12 w-full border-gray-300 bg-white text-base">
                        <SelectValue placeholder="เลือกแผนก" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {errorBox}

                  <Button
                    type="submit"
                    className="h-12 w-full bg-primary text-base font-semibold text-white hover:bg-[#1D4ED8]"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'สมัครใช้งาน'}
                  </Button>
                </form>

                <p className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-600">
                  มีบัญชีแล้ว?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="font-medium text-primary hover:underline">
                    เข้าสู่ระบบ
                  </button>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
