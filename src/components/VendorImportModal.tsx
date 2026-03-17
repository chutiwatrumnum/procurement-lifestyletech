import { useState, useCallback, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Loader2, Check, X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  parseVendorFile, 
  processVendorData, 
  transformToPocketBase,
} from '@/lib/vendorImportUtils';
import type { ParsedVendorRow } from '@/lib/vendorImportUtils';

interface VendorImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (vendors: any[]) => Promise<void>;
  existingVendors?: { name: string; tax_id: string }[];
}

interface ImportResult {
  rowIndex: number;
  success: boolean;
  name: string;
  error?: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export default function VendorImportModal({ 
  isOpen, 
  onClose, 
  onImport,
  existingVendors = []
}: VendorImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedVendorRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [results, setResults] = useState<ImportResult[]>([]);
  const [duplicates, setDuplicates] = useState<Map<number, string>>(new Map());
  const [importProgress, setImportProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFile(null);
        setParsedData([]);
        setResults([]);
        setDuplicates(new Map());
        setCurrentStep('upload');
        setImportProgress(0);
      }, 300);
    }
  }, [isOpen]);

  // Check for duplicates
  const checkDuplicates = useCallback((data: ParsedVendorRow[]) => {
    const dupMap = new Map<number, string>();
    
    data.forEach((vendor, index) => {
      // Check by name
      const existingByName = existingVendors.find(
        v => v.name.toLowerCase() === vendor.name.toLowerCase()
      );
      if (existingByName) {
        dupMap.set(index, `ชื่อ "${vendor.name}" มีอยู่แล้วในระบบ`);
        return;
      }
      
      // Check by tax_id if provided
      if (vendor.tax_id) {
        const existingByTax = existingVendors.find(
          v => v.tax_id && v.tax_id === vendor.tax_id.replace(/[-\s]/g, '')
        );
        if (existingByTax) {
          dupMap.set(index, `เลขภาษี "${vendor.tax_id}" มีอยู่แล้วในระบบ`);
        }
      }
    });
    
    return dupMap;
  }, [existingVendors]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset and set file immediately
    setFile(selectedFile);
    setParsedData([]);
    setResults([]);
    setDuplicates(new Map());
    setIsParsing(true);

    try {
      // Use setTimeout to allow UI to update first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use FileReader directly in the component for better error handling
      const rawData = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const data = event.target?.result;
            if (!data) {
              reject(new Error('No data in file'));
              return;
            }
            // Use array buffer type which is more reliable
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (err: any) {
            reject(new Error('Cannot read Excel file: ' + (err.message || 'Unknown error')));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(selectedFile);
      });

      // Process data with setTimeout to prevent UI blocking
      const processedData = processVendorData(rawData);
      
      // Check for duplicates
      const dupMap = checkDuplicates(processedData);
      setDuplicates(dupMap);
      
      // Mark rows with duplicates as invalid
      const dataWithDuplicates = processedData.map((vendor, index) => {
        if (dupMap.has(index)) {
          return {
            ...vendor,
            _isValid: false,
            _errors: [...vendor._errors, dupMap.get(index) || '']
          };
        }
        return vendor;
      });
      
      setParsedData(dataWithDuplicates);
      
      if (dataWithDuplicates.length === 0) {
        toast.warning('ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบ format ของไฟล์');
      } else {
        const validCount = dataWithDuplicates.filter(v => v._isValid).length;
        const dupCount = dupMap.size;
        
        if (dupCount > 0) {
          toast.info(`พบข้อมูล ${dataWithDuplicates.length} รายการ (${validCount} รายการที่จะนำเข้าได้, ${dupCount} รายการซ้ำ)`);
        } else {
          toast.success(`พบข้อมูล ${validCount} รายการที่พร้อมนำเข้า`);
        }
        
        setCurrentStep('preview');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาลองใหม่');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  }, [checkDuplicates]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(async (file: File) => {
    setFile(file);
    setParsedData([]);
    setResults([]);
    setDuplicates(new Map());
    setIsParsing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const rawData = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const data = event.target?.result;
            if (!data) {
              reject(new Error('No data in file'));
              return;
            }
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (err: any) {
            reject(new Error('Cannot read Excel file: ' + (err.message || 'Unknown error')));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });

      const processedData = processVendorData(rawData);
      const dupMap = checkDuplicates(processedData);
      setDuplicates(dupMap);
      
      const dataWithDuplicates = processedData.map((vendor, index) => {
        if (dupMap.has(index)) {
          return {
            ...vendor,
            _isValid: false,
            _errors: [...vendor._errors, dupMap.get(index) || '']
          };
        }
        return vendor;
      });
      
      setParsedData(dataWithDuplicates);
      
      if (dataWithDuplicates.length === 0) {
        toast.warning('ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบ format ของไฟล์');
      } else {
        const validCount = dataWithDuplicates.filter(v => v._isValid).length;
        const dupCount = dupMap.size;
        
        if (dupCount > 0) {
          toast.info(`พบข้อมูล ${dataWithDuplicates.length} รายการ (${validCount} รายการที่จะนำเข้าได้, ${dupCount} รายการซ้ำ)`);
        } else {
          toast.success(`พบข้อมูล ${validCount} รายการที่พร้อมนำเข้า`);
        }
        
        setCurrentStep('preview');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาลองใหม่');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  }, [checkDuplicates]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    
    if (excelFile) {
      processFile(excelFile);
    } else {
      toast.error('กรุณาเลือกไฟล์ Excel หรือ CSV');
    }
  }, [processFile]);

  const handleImport = async () => {
    const validVendors = parsedData.filter(v => v._isValid);
    if (validVendors.length === 0) return;

    setIsImporting(true);
    setCurrentStep('importing');
    setResults([]);
    setImportProgress(0);

    const importResults: ImportResult[] = [];

    try {
      // Transform data and import one by one for progress tracking
      const vendorsToImport = validVendors.map(v => transformToPocketBase(v));
      
      // Import one by one to track progress properly
      for (let i = 0; i < vendorsToImport.length; i++) {
        const vendor = vendorsToImport[i];
        
        try {
          await onImport([vendor]);
          importResults.push({
            rowIndex: i,
            success: true,
            name: validVendors[i].name
          });
        } catch (error: any) {
          console.error(`Error importing vendor ${vendor.name}:`, error);
          importResults.push({
            rowIndex: i,
            success: false,
            name: validVendors[i].name,
            error: error.message || 'เกิดข้อผิดพลาด'
          });
        }
        
        // Update progress after each vendor
        const progress = ((i + 1) / vendorsToImport.length) * 100;
        setImportProgress(progress);
      }
      
      const successCount = importResults.filter(r => r.success).length;
      const failCount = importResults.filter(r => !r.success).length;
      
      setResults(importResults);
      setCurrentStep('complete');
      
      if (failCount === 0) {
        toast.success(`นำเข้าข้อมูลผู้ขาย ${successCount} รายการเรียบร้อย`);
      } else {
        toast.warning(`นำเข้าได้ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
      }
      
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      setCurrentStep('complete');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setResults([]);
    setDuplicates(new Map());
    setCurrentStep('upload');
    setImportProgress(0);
    onClose();
  };

  const handleBack = () => {
    setCurrentStep('upload');
    setParsedData([]);
    setResults([]);
  };

  const validCount = parsedData.filter(v => v._isValid).length;
  const invalidCount = parsedData.filter(v => !v._isValid).length;

  const sampleColumns = [
    'Supplier Code', 
    'Name', 
    'กลุ่มผู้ขาย (Name)', 
    'TaxNo', 
    'Address1', 
    'Address2', 
    'Tel', 
    'Fax'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Upload className="w-5 h-5 text-orange-500" />
            นำเข้าข้อมูลผู้ขายจาก Excel/CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              {/* Drag and drop zone */}
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50 scale-[1.01] shadow-lg shadow-orange-500/10'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="vendor-import-file"
                  disabled={isParsing || isImporting}
                />
                <label htmlFor="vendor-import-file" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    {isDragging ? (
                      <>
                        <FileSpreadsheet className="w-16 h-16 text-orange-500 animate-bounce" />
                        <p className="font-bold text-orange-600 text-lg">📥 ปล่อยไฟล์เพื่ออัพโหลด</p>
                        <p className="text-sm text-orange-500">กำลังเพิ่มไฟล์ Excel/CSV ของคุณ</p>
                      </>
                    ) : file ? (
                      <>
                        <FileSpreadsheet className="w-16 h-16 text-green-500" />
                        <p className="font-bold text-gray-700 text-lg">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                        <p className="text-sm text-blue-600 mt-2">
                          คลิกเพื่อเปลี่ยนไฟล์ หรือลากไฟล์มาวาง
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-16 h-16 text-gray-300" />
                        <p className="font-bold text-gray-600 text-lg">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
                        <p className="text-sm text-gray-400">รองรับไฟล์ .xlsx, .xls, .csv</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Expected Format */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-800 mb-2">รูปแบบที่คาดหวัง (Expected Columns):</p>
                <div className="flex flex-wrap gap-2">
                  {sampleColumns.map((col, i) => (
                    <span key={i} className="text-xs bg-white text-blue-700 px-2 py-1 rounded border border-blue-200">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Data Info */}
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-bold">ข้อมูลที่จะนำเข้า:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><strong>Supplier Code</strong> - รหัสผู้ขาย</li>
                      <li><strong>Name</strong> - ชื่อผู้ขาย (จำเป็น)</li>
                      <li><strong>กลุ่มผู้ขาย</strong> - ประเภทผู้ขาย (เจ้าหนี้ในประเทศ/เจ้าหนี้นอกประเทศ)</li>
                      <li><strong>TaxNo</strong> - เลขประจำตัวผู้เสียภาษี</li>
                      <li><strong>Address1</strong> - ที่อยู่</li>
                      <li><strong>Tel</strong> - โทรศัพท์ (รองรับหลายเบอร์ คั่นด้วย , หรือ /)</li>
                      <li><strong>Fax</strong> - แฟกซ์</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{validCount}</p>
                  <p className="text-sm text-green-700">พร้อมนำเข้า</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                  <p className="text-sm text-red-700">ไม่สามารถนำเข้าได้</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{parsedData.length}</p>
                  <p className="text-sm text-blue-700">รวมทั้งหมด</p>
                </div>
              </div>

              {/* Duplicate Warning */}
              {duplicates.size > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-bold">พบ {duplicates.size} รายการที่มีชื่อหรือเลขภาษีซ้ำกับข้อมูลที่มีอยู่ในระบบ</p>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2 font-bold text-gray-600 w-12">#</th>
                        <th className="text-left p-2 font-bold text-gray-600">ชื่อผู้ขาย</th>
                        <th className="text-left p-2 font-bold text-gray-600">กลุ่ม</th>
                        <th className="text-left p-2 font-bold text-gray-600">เลขภาษี</th>
                        <th className="text-left p-2 font-bold text-gray-600">โทรศัพท์</th>
                        <th className="text-left p-2 font-bold text-gray-600 w-24">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 20).map((vendor, index) => (
                        <tr 
                          key={index} 
                          className={`border-t ${vendor._isValid ? 'hover:bg-gray-50' : 'bg-red-50'}`}
                        >
                          <td className="p-2 text-gray-500">{index + 1}</td>
                          <td className="p-2 font-medium">{vendor.name}</td>
                          <td className="p-2 text-gray-500 text-xs truncate max-w-[150px]" title={vendor.category}>
                            {vendor.category}
                          </td>
                          <td className="p-2 text-gray-500">{vendor.tax_id || '-'}</td>
                          <td className="p-2 text-gray-500">{vendor.phone || '-'}</td>
                          <td className="p-2">
                            {vendor._isValid ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                พร้อม
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs" title={vendor._errors.join(', ')}>
                                <AlertTriangle className="w-3 h-3" />
                                ผิดพลาด
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 20 && (
                  <p className="text-center p-2 text-gray-500 text-sm border-t bg-gray-50">
                    ...แสดง 20 รายการแรก จากทั้งหมด {parsedData.length} รายการ
                  </p>
                )}
              </div>

              {/* Error Details */}
              {invalidCount > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="font-bold text-red-700 mb-2">รายละเอียดข้อผิดพลาด:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {parsedData.filter(v => !v._isValid).map((vendor, index) => (
                      <p key={index} className="text-sm text-red-600">
                        <strong>แถว {vendor._rowIndex}:</strong> {vendor._errors.join(', ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {currentStep === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto" />
              <p className="text-lg font-bold text-gray-700">กำลังนำเข้าข้อมูล...</p>
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-orange-500 h-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{Math.round(importProgress)}%</p>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.success).length}
                  </p>
                  <p className="text-sm text-green-700">นำเข้าสำเร็จ</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    {results.filter(r => !r.success).length}
                  </p>
                  <p className="text-sm text-red-700">นำเข้าล้มเหลว</p>
                </div>
              </div>

              {/* Failed List */}
              {results.filter(r => !r.success).length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="font-bold text-red-700 mb-2">รายการที่นำเข้าล้มเหลว:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.filter(r => !r.success).map((result, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-red-600">{result.name}</span>
                        <span className="text-red-400 text-xs">- {result.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t flex-shrink-0">
          <div>
            {currentStep === 'preview' && (
              <Button variant="outline" onClick={handleBack} disabled={isImporting}>
                เลือกไฟล์ใหม่
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              {currentStep === 'complete' ? 'ปิด' : 'ยกเลิก'}
            </Button>
            
            {currentStep === 'preview' && (
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    นำเข้าข้อมูล ({validCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
