import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, Save } from 'lucide-react';
import { prService, poService } from '@/services/api';
import pb from '@/lib/pocketbase';
import { toast } from 'sonner';

export default function PRPrintPO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // PO data
  const [existingPO, setExistingPO] = useState<any>(null);
  const [poNumber, setPONumber] = useState('-');
  const [saving, setSaving] = useState(false);

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

        // Load existing PO for this PR
        try {
          console.log('Looking for existing PO for PR:', id);
          const po = await poService.getByPR(id);
          console.log('Found PO:', po);
          if (po) {
            setExistingPO(po);
            setPONumber(po.po_number || '-');
            setIncludeVAT(po.include_vat || false);
            setIncludeWHT(po.include_wht || false);
            setRemarks(po.remarks || '');
            setPaymentNote(po.payment_note || '');
          } else {
            setPONumber('(รอบันทึก)');
          }
        } catch (e) { console.error('Error loading PO:', e); }

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

  // Save PO handler
  const handleSavePO = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const poData = {
        include_vat: includeVAT,
        include_wht: includeWHT,
        subtotal,
        vat_amount: vatAmount,
        wht_amount: whtAmount,
        grand_total: grandTotal,
        remarks,
        payment_note: paymentNote,
        vendor: pr.vendor || '',
        status: 'draft',
      };

      if (existingPO) {
        // Update existing PO
        const updated = await poService.update(existingPO.id, poData);
        setExistingPO(updated);
        toast.success('อัปเดตใบสั่งซื้อเรียบร้อยแล้ว');
      } else {
        // Create new PO — number generated at save time to prevent duplicates
        const newPO = await poService.createFromPR(id, poData);
        setExistingPO(newPO);
        setPONumber(newPO.po_number || '-');
        toast.success(`สร้างใบสั่งซื้อ ${newPO.po_number} เรียบร้อยแล้ว`);
      }
    } catch (err) {
      console.error('Failed to save PO:', err);
      toast.error('บันทึกใบสั่งซื้อไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

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
              onClick={handleSavePO}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-5"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {existingPO ? 'อัปเดต PO' : 'บันทึก PO'}
            </Button>
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
        <div className="po-page w-[210mm] min-h-[297mm] bg-white print:p-[15mm] print:shadow-none shadow-lg mx-auto" style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif", padding: '15mm' }}>
          
          {/* ═══ Header ═══ */}
          <div className="border-b-[3px] border-gray-900 pb-5 mb-5">
            {/* Row 1: Logo + Company Name  |  Document Title */}
            <div className="flex items-start justify-between">
              {/* Left: Logo + Company */}
              <div className="flex items-center gap-3">
                {company?.logo && (
                  <img
                    src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${company.collectionId}/${company.id}/${company.logo}`}
                    alt="Logo"
                    className="w-[52px] h-[52px] object-contain shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-[17px] font-extrabold text-gray-900 leading-snug">{company?.name || 'LIFESTYLE TECHNOLOGY'}</h1>
                  <p className="text-[13px] text-gray-600">{company?.name_th || 'บริษัท ไลฟ์สไตล์ เทคโนโลยี จำกัด'}</p>
                </div>
              </div>
              {/* Right: Document Title */}
              <div className="text-right shrink-0 pl-6">
                <h2 className="text-[22px] font-extrabold text-gray-900 leading-none">ใบสั่งซื้อ</h2>
                <p className="text-[11px] font-bold text-gray-500 tracking-[0.15em] mt-0.5">PURCHASE ORDER</p>
              </div>
            </div>

            {/* Row 2: Address & contact details */}
            <div className="mt-3 text-[10.5px] text-gray-500 leading-relaxed space-y-0.5">
              {company?.address_th && <p>{company.address_th}</p>}
              {company?.address_en && <p>{company.address_en}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0 mt-1 text-[10.5px]">
                {company?.tax_id && <span>เลขประจำตัวผู้เสียภาษี: <strong className="text-gray-700">{company.tax_id}</strong></span>}
                {company?.phone && <span>โทร: <strong className="text-gray-700">{company.phone}</strong></span>}
                {company?.email && <span>อีเมล: <strong className="text-gray-700">{company.email}</strong></span>}
                {company?.branch_name && <span>สาขา: <strong className="text-gray-700">{company.branch_name}</strong></span>}
              </div>
            </div>
          </div>

          {/* ═══ Document Info + Vendor ═══ */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            {/* Left: Document Info */}
            <div className="border border-gray-300 rounded p-3.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2.5 border-b border-gray-200 pb-1.5">ข้อมูลเอกสาร / DOCUMENT INFO</p>
              <table className="w-full text-[12px]">
                <tbody>
                  <tr>
                    <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top" style={{ width: '100px' }}>เลขที่ PO</td>
                    <td className="font-bold text-gray-900 py-[3px]">{poNumber}</td>
                  </tr>

                  <tr>
                    <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">วันที่สร้าง</td>
                    <td className="text-gray-700 py-[3px]">{formatDate(pr.created)}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">วันที่อนุมัติ</td>
                    <td className="text-gray-700 py-[3px]">{formatDate(pr.manager_approved_at || pr.head_of_dept_approved_at)}</td>
                  </tr>
                  {pr.category && (
                    <tr>
                      <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">หมวดหมู่</td>
                      <td className="text-gray-700 py-[3px]">{pr.category}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">ผู้ขอซื้อ</td>
                    <td className="text-gray-700 py-[3px]">{pr.requester_name || pr._requester?.name || pr._requester?.email || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Vendor */}
            <div className="border border-gray-300 rounded p-3.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2.5 border-b border-gray-200 pb-1.5">ข้อมูลผู้ขาย / VENDOR</p>
              {pr._vendor ? (
                <table className="w-full text-[12px]">
                  <tbody>
                    <tr>
                      <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top" style={{ width: '90px' }}>ชื่อบริษัท</td>
                      <td className="font-bold text-gray-900 py-[3px]">{pr._vendor.name}</td>
                    </tr>
                    {pr._vendor.tax_id && (
                      <tr>
                        <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">เลขผู้เสียภาษี</td>
                        <td className="text-gray-700 py-[3px]">{pr._vendor.tax_id}</td>
                      </tr>
                    )}
                    {pr._vendor.contact_person && (
                      <tr>
                        <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">ผู้ติดต่อ</td>
                        <td className="text-gray-700 py-[3px]">{pr._vendor.contact_person}</td>
                      </tr>
                    )}
                    {pr._vendor.phone && (
                      <tr>
                        <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">โทรศัพท์</td>
                        <td className="text-gray-700 py-[3px]">{pr._vendor.phone}</td>
                      </tr>
                    )}
                    {pr._vendor.email && (
                      <tr>
                        <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">อีเมล</td>
                        <td className="text-gray-700 py-[3px]">{pr._vendor.email}</td>
                      </tr>
                    )}
                    {pr._vendor.address && (
                      <tr>
                        <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">ที่อยู่</td>
                        <td className="text-gray-700 py-[3px]">{pr._vendor.address}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">เงื่อนไขชำระ</td>
                      <td className="text-gray-700 py-[3px] font-medium">
                        {pr._vendor.payment_term === '30days' && 'เงินสด 30 วัน'}
                        {pr._vendor.payment_term === '45days' && 'เงินสด 45 วัน'}
                        {pr._vendor.payment_term === '60days' && 'เงินสด 60 วัน'}
                        {pr._vendor.payment_term === 'custom' && (pr._vendor.payment_term_detail || 'ตามตกลง')}
                        {!pr._vendor.payment_term && '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-sm py-2">ไม่ระบุผู้ขาย</p>
              )}
            </div>
          </div>

          {/* ═══ Items Table ═══ */}
          <table className="w-full text-[12px] border-collapse mb-1">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="py-2 px-2 text-center font-bold border border-gray-900" style={{ width: '40px' }}>ลำดับ</th>
                <th className="py-2 px-3 text-left font-bold border border-gray-900">รายการสินค้า / บริการ</th>
                <th className="py-2 px-2 text-center font-bold border border-gray-900" style={{ width: '70px' }}>จำนวน</th>
                <th className="py-2 px-2 text-center font-bold border border-gray-900" style={{ width: '50px' }}>หน่วย</th>
                <th className="py-2 px-3 text-right font-bold border border-gray-900" style={{ width: '100px' }}>ราคา/หน่วย</th>
                <th className="py-2 px-3 text-right font-bold border border-gray-900" style={{ width: '110px' }}>จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-2 px-2 text-center border border-gray-200">{idx + 1}</td>
                  <td className="py-2 px-3 border border-gray-200 font-medium text-gray-800">{item.name}</td>
                  <td className="py-2 px-2 text-center border border-gray-200">{item.quantity}</td>
                  <td className="py-2 px-2 text-center border border-gray-200 text-gray-600">{item.unit || '-'}</td>
                  <td className="py-2 px-3 text-right border border-gray-200">{formatCurrency(item.unit_price || 0)}</td>
                  <td className="py-2 px-3 text-right border border-gray-200 font-bold">{formatCurrency(item.total_price || 0)}</td>
                </tr>
              ))}
              {/* Empty rows to fill at least 5 rows */}
              {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="py-2 px-2 text-center border border-gray-200 text-gray-300">{items.length + i + 1}</td>
                  <td className="py-2 px-3 border border-gray-200">&nbsp;</td>
                  <td className="py-2 px-2 border border-gray-200">&nbsp;</td>
                  <td className="py-2 px-2 border border-gray-200">&nbsp;</td>
                  <td className="py-2 px-3 border border-gray-200">&nbsp;</td>
                  <td className="py-2 px-3 border border-gray-200">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ═══ Totals ═══ */}
          <div className="flex justify-end mb-5">
            <div style={{ width: '280px' }}>
              <div className="flex justify-between text-[12px] py-1.5 border-b border-gray-100">
                <span className="text-gray-500">ยอดรวมก่อนภาษี</span>
                <span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              {includeVAT && (
                <div className="flex justify-between text-[12px] py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                  <span className="font-bold text-blue-700">+{formatCurrency(vatAmount)}</span>
                </div>
              )}
              {includeWHT && (
                <div className="flex justify-between text-[12px] py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">หัก ณ ที่จ่าย (WHT 3%)</span>
                  <span className="font-bold text-red-600">-{formatCurrency(whtAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[14px] py-2 border-t-2 border-gray-900 mt-0.5">
                <span className="font-extrabold text-gray-900">ยอดรวมสุทธิ</span>
                <span className="font-extrabold text-gray-900">฿{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* ═══ Remarks & Payment ═══ */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-1.5">หมายเหตุ / REMARKS</p>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                rows={3}
                className="w-full text-[12px] border border-gray-300 rounded p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 print:border-gray-300 print:bg-white"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-1.5">เงื่อนไขการชำระเงิน / PAYMENT</p>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="ระบุเงื่อนไขการชำระเงิน..."
                rows={3}
                className="w-full text-[12px] border border-gray-300 rounded p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 print:border-gray-300 print:bg-white"
              />
            </div>
          </div>

          {/* ═══ Signatures ═══ */}
          <div className="grid grid-cols-2 gap-8 mt-6">

            {/* Head of Dept */}
            <div className="text-center">
              <div className="h-[60px] flex items-end justify-center mb-1">
                {pr._head_sig_url && (
                  <img src={pr._head_sig_url} alt="ลายเซ็นหัวหน้าแผนก" className="max-h-[50px] object-contain" />
                )}
              </div>
              <div className="border-t border-gray-400 pt-2 mx-6">
                <p className="text-[12px] font-bold text-gray-800">{pr.head_of_dept_approved_by_name || '.........................'}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em] mt-1">หัวหน้าแผนก / HEAD OF DEPT</p>
                {pr.head_of_dept_approved_at && (
                  <p className="text-[8px] text-gray-400 mt-0.5">{formatDate(pr.head_of_dept_approved_at)}</p>
                )}
              </div>
            </div>

            {/* Manager */}
            <div className="text-center">
              <div className="h-[60px] flex items-end justify-center mb-1">
                {pr._mgr_sig_url && (
                  <img src={pr._mgr_sig_url} alt="ลายเซ็นผู้จัดการ" className="max-h-[50px] object-contain" />
                )}
              </div>
              <div className="border-t border-gray-400 pt-2 mx-6">
                <p className="text-[12px] font-bold text-gray-800">{pr.manager_approved_by_name || '.........................'}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em] mt-1">ผู้จัดการ / MANAGER</p>
                {pr.manager_approved_at && (
                  <p className="text-[8px] text-gray-400 mt-0.5">{formatDate(pr.manager_approved_at)}</p>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Footer ═══ */}
          <div className="mt-6 pt-3 border-t border-gray-300">
            {company?.bank_name && (
              <div className="text-[10px] text-gray-500 mb-2 bg-gray-50 rounded px-3 py-2 border border-gray-200">
                <span className="font-bold text-gray-600">ข้อมูลการโอนเงิน:</span>{' '}
                ธนาคาร {company.bank_name}
                {company.bank_account && <> &nbsp;|&nbsp; เลขบัญชี: <strong>{company.bank_account}</strong></>}
                {company.bank_branch && <> &nbsp;|&nbsp; สาขา: {company.bank_branch}</>}
              </div>
            )}
            <p className="text-[8px] text-gray-400 text-center mt-2">
              เอกสารฉบับนี้ออกโดยระบบจัดซื้อจัดจ้าง {company?.name || 'LIFESTYLE TECHNOLOGY'} — พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
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
