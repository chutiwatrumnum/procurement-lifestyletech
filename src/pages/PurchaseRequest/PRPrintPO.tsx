import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { prService } from '@/services/api';
import pb from '@/lib/pocketbase';

export default function PRPrintPO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tax options
  const [includeVAT, setIncludeVAT] = useState(false);
  const [includeWHT, setIncludeWHT] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const prData = await prService.getById(id);
        const prItems = await prService.getItems(id);

        // Expand vendor
        if (prData.vendor) {
          try {
            const vendor = await pb.collection('vendors').getOne(prData.vendor);
            prData._vendor = vendor;
          } catch (e) { console.log('Vendor not found'); }
        }

        // Expand requester
        if (prData.requester) {
          try {
            const user = await pb.collection('users').getOne(prData.requester);
            prData._requester = user;
          } catch (e) { console.log('Requester not found'); }
        }

        // Get signature URLs
        if (prData.head_of_dept_signature) {
          prData._head_sig_url = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${prData.id}/${prData.head_of_dept_signature}`;
        }
        if (prData.manager_signature) {
          prData._mgr_sig_url = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${prData.id}/${prData.manager_signature}`;
        }

        setPr(prData);
        setItems(prItems);

        // Load company settings
        try {
          const companyRecords = await pb.collection('company_settings').getFullList();
          if (companyRecords.length > 0) setCompany(companyRecords[0]);
        } catch (e) { console.log('Company settings not found'); }

      } catch (err) {
        console.error('Failed to load PR:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <p className="text-xl font-bold">ไม่พบข้อมูลใบขอซื้อ</p>
      </div>
    );
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const vatAmount = includeVAT ? subtotal * 0.07 : 0;
  const whtAmount = includeWHT ? subtotal * 0.03 : 0;
  const grandTotal = subtotal + vatAmount - whtAmount;

  // PO Number: LS-PO-{PR Number}
  const poNumber = pr.pr_number ? `LS-PO-${pr.pr_number}` : '-';

  // PR Type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'project': 'ใบขอซื้อโครงการ (Project PR)',
      'sub': 'ใบขอซื้อย่อย (Subcontractor PR)',
      'other': 'ใบขอซื้ออื่นๆ (Other PR)',
    };
    return labels[type] || 'ใบขอซื้อทั่วไป';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      {/* Print Controls — Hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ใบสั่งซื้อ (Purchase Order)</h1>
              <p className="text-xs text-gray-500">{poNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Tax Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeVAT}
                  onChange={(e) => setIncludeVAT(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700">VAT 7%</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeWHT}
                  onChange={(e) => setIncludeWHT(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700">หัก ณ ที่จ่าย 3%</span>
              </label>
            </div>

            <Button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6"
            >
              <Printer className="w-4 h-4 mr-2" /> พิมพ์ / บันทึก PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="print:mt-0 mt-20 flex justify-center pb-12">
        <div className="po-page w-[210mm] min-h-[297mm] bg-white p-[15mm] print:p-[15mm] print:shadow-none shadow-lg mx-auto" style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}>
          
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex items-start gap-4">
              {company?.logo && (
                <img 
                  src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${company.collectionId}/${company.id}/${company.logo}`} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">{company?.name || 'LIFESTYLE TECHNOLOGY'}</h1>
                <p className="text-xs text-gray-500">{company?.name_th || 'บริษัท ไลฟ์สไตล์ เทคโนโลยี จำกัด'}</p>
                {company?.address_th && <p className="text-[10px] text-gray-400 mt-0.5">{company.address_th}</p>}
                {company?.address_en && <p className="text-[10px] text-gray-400">{company.address_en}</p>}
                <div className="flex gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
                  {company?.tax_id && <span>เลขผู้เสียภาษี: {company.tax_id}</span>}
                  {company?.phone && <span>โทร: {company.phone}</span>}
                  {company?.email && <span>อีเมล: {company.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <h2 className="text-xl font-black text-blue-700">ใบสั่งซื้อ</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">PURCHASE ORDER</p>
              {company?.branch_name && <p className="text-[10px] text-gray-400 mt-1">{company.branch_name}</p>}
            </div>
          </div>

          {/* Type Badge */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
              {getTypeLabel(pr.type)}
            </span>
          </div>

          {/* PO Info + Vendor Info */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Left: Document Info */}
            <div className="space-y-2">
              <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
                <span className="text-gray-500 font-bold">เลขที่ PO:</span>
                <span className="font-black text-gray-900">{poNumber}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
                <span className="text-gray-500 font-bold">อ้างอิง PR:</span>
                <span className="text-gray-600">{pr.pr_number || '-'}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
                <span className="text-gray-500 font-bold">วันที่สร้าง:</span>
                <span>{formatDate(pr.created)}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
                <span className="text-gray-500 font-bold">วันที่อนุมัติ:</span>
                <span>{formatDate(pr.manager_approved_at || pr.head_of_dept_approved_at)}</span>
              </div>
              {pr.category && (
                <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
                  <span className="text-gray-500 font-bold">หมวดหมู่:</span>
                  <span>{pr.category}</span>
                </div>
              )}
              <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
                <span className="text-gray-500 font-bold">ผู้ขอซื้อ:</span>
                <span>{pr.requester_name || pr._requester?.name || pr._requester?.email || '-'}</span>
              </div>
            </div>

            {/* Right: Vendor */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ข้อมูลผู้ขาย / VENDOR</p>
              {pr._vendor ? (
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-gray-900">{pr._vendor.name}</p>
                  {pr._vendor.tax_id && <p className="text-gray-600">เลขผู้เสียภาษี: {pr._vendor.tax_id}</p>}
                  {pr._vendor.contact_person && <p className="text-gray-600">ติดต่อ: {pr._vendor.contact_person}</p>}
                  {pr._vendor.phone && <p className="text-gray-600">โทร: {pr._vendor.phone}</p>}
                  {pr._vendor.email && <p className="text-gray-600">อีเมล: {pr._vendor.email}</p>}
                  {pr._vendor.address && <p className="text-gray-600">ที่อยู่: {pr._vendor.address}</p>}
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">เงื่อนไขการชำระเงิน</p>
                    <p className="text-gray-700 font-medium">
                      {pr._vendor.payment_term === '30days' && 'เงินสด 30 วัน'}
                      {pr._vendor.payment_term === '45days' && 'เงินสด 45 วัน'}
                      {pr._vendor.payment_term === '60days' && 'เงินสด 60 วัน'}
                      {pr._vendor.payment_term === 'custom' && (pr._vendor.payment_term_detail || 'ตามตกลง')}
                      {!pr._vendor.payment_term && '-'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">ไม่ระบุผู้ขาย</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-3 text-center w-12 font-bold">ลำดับ</th>
                <th className="py-2 px-3 text-left font-bold">รายการ</th>
                <th className="py-2 px-3 text-center w-20 font-bold">จำนวน</th>
                <th className="py-2 px-3 text-right w-28 font-bold">ราคา/หน่วย</th>
                <th className="py-2 px-3 text-right w-28 font-bold">รวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2.5 px-3 text-center border-b border-gray-100">{idx + 1}</td>
                  <td className="py-2.5 px-3 border-b border-gray-100 font-medium">{item.name}</td>
                  <td className="py-2.5 px-3 text-center border-b border-gray-100">{item.quantity} {item.unit || ''}</td>
                  <td className="py-2.5 px-3 text-right border-b border-gray-100">{formatCurrency(item.unit_price || 0)}</td>
                  <td className="py-2.5 px-3 text-right border-b border-gray-100 font-bold">{formatCurrency(item.total_price || 0)}</td>
                </tr>
              ))}
              {/* Empty rows */}
              {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="py-2.5 px-3 text-center border-b border-gray-100 text-gray-300">{items.length + i + 1}</td>
                  <td className="py-2.5 px-3 border-b border-gray-100">&nbsp;</td>
                  <td className="py-2.5 px-3 border-b border-gray-100">&nbsp;</td>
                  <td className="py-2.5 px-3 border-b border-gray-100">&nbsp;</td>
                  <td className="py-2.5 px-3 border-b border-gray-100">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-72 space-y-1">
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">ยอดรวมก่อนภาษี</span>
                <span className="font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {includeVAT && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                  <span className="font-bold text-blue-700">+{formatCurrency(vatAmount)}</span>
                </div>
              )}
              {includeWHT && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">หัก ณ ที่จ่าย (WHT 3%)</span>
                  <span className="font-bold text-red-600">-{formatCurrency(whtAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base py-2 border-t-2 border-gray-800 mt-1">
                <span className="font-black text-gray-900">ยอดรวมสุทธิ</span>
                <span className="font-black text-gray-900">฿{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Remarks & Payment Conditions */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Remarks */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">หมายเหตุ / REMARKS</p>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 print:border-gray-300 print:bg-white"
              />
            </div>
            {/* Payment Conditions */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">เงื่อนไขการชำระเงิน / PAYMENT CONDITIONS</p>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="ระบุเงื่อนไขการชำระเงิน เช่น มัดจำ 50%, โอนภายใน 30 วัน..."
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 print:border-gray-300 print:bg-white"
              />
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-4">
            {/* Requester */}
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-1"></div>
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="text-sm font-bold text-gray-800">{pr.requester_name || pr._requester?.name || '.........................'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">ผู้ขอซื้อ / REQUESTER</p>
              </div>
            </div>

            {/* Head of Dept */}
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-1">
                {pr._head_sig_url && (
                  <img src={pr._head_sig_url} alt="ลายเซ็นหัวหน้าแผนก" className="max-h-16 object-contain" />
                )}
              </div>
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="text-sm font-bold text-gray-800">{pr.head_of_dept_approved_by_name || '.........................'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">หัวหน้าแผนก / HEAD OF DEPT</p>
                {pr.head_of_dept_approved_at && (
                  <p className="text-[9px] text-gray-400 mt-0.5">{formatDate(pr.head_of_dept_approved_at)}</p>
                )}
              </div>
            </div>

            {/* Manager */}
            <div className="text-center">
              <div className="h-20 flex items-end justify-center mb-1">
                {pr._mgr_sig_url && (
                  <img src={pr._mgr_sig_url} alt="ลายเซ็นผู้จัดการ" className="max-h-16 object-contain" />
                )}
              </div>
              <div className="border-t border-gray-400 pt-2 mx-4">
                <p className="text-sm font-bold text-gray-800">{pr.manager_approved_by_name || '.........................'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">ผู้จัดการ / MANAGER</p>
                {pr.manager_approved_at && (
                  <p className="text-[9px] text-gray-400 mt-0.5">{formatDate(pr.manager_approved_at)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            {company?.bank_name && (
              <div className="text-[10px] text-gray-500 mb-2">
                <span className="font-bold">ข้อมูลการโอนเงิน:</span> {company.bank_name}
                {company.bank_account && <> เลขบัญชี: {company.bank_account}</>}
                {company.bank_branch && <> สาขา: {company.bank_branch}</>}
              </div>
            )}
            <p className="text-[9px] text-gray-400 text-center">เอกสารฉบับนี้ออกโดยระบบจัดซื้อจัดจ้าง {company?.name || 'LIFESTYLE TECHNOLOGY'} — พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          nav, aside, header, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .po-page {
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
