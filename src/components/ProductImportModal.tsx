import { useState, useCallback, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Loader2, Check, X, AlertCircle, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import pb from '@/lib/pocketbase';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingProducts?: { product_code?: string; code?: string; name: string }[];
}

interface ParsedProductRow {
  product_code: string;
  factory_code: string;
  factory_name: string;
  name: string;
  unit_price: number;
  category: string;
  brand: string;
  cost_dollars: number;
  normal_price_excl_vat: number;
  normal_price_incl_vat: number;
  _rowIndex: number;
  _isValid: boolean;
  _errors: string[];
}

interface ImportResult {
  rowIndex: number;
  success: boolean;
  name: string;
  error?: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export default function ProductImportModal({ 
  isOpen, 
  onClose, 
  onImportComplete,
  existingProducts = []
}: ProductImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProductRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [results, setResults] = useState<ImportResult[]>([]);
  const [duplicates, setDuplicates] = useState<Map<number, string>>(new Map());
  const [importProgress, setImportProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dragCounter = useRef(0);

  // Get existing categories from PocketBase
  const [pbCategories, setPbCategories] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const result = await pb.collection('product_categories').getFullList({ sort: 'category' });
        setPbCategories(result);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

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
        setSearchTerm('');
      }, 300);
    }
  }, [isOpen]);

  // Helper function to find value by possible keys
  const findValueByKeys = (row: any, keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined) {
        return String(row[key]);
      }
    }
    return '';
  };

  // Parse CSV/Excel data
  const processProductData = useCallback((rawData: any[]): ParsedProductRow[] => {
    return rawData.map((row, index) => {
      const errors: string[] = [];
      
      // Helper to clean keys, sometimes CSV has extra spaces or unpredictable parsing
      const findValueFuzzy = (row: any, keys: string[]): string => {
        const rowKeys = Object.keys(row);
        for (const key of keys) {
            // Exact match
            if (row[key] !== undefined && row[key] !== null) return String(row[key]);
            
            // Fuzzy match (ignore case and spaces)
            const cleanTarget = key.toLowerCase().replace(/[\s\(\).]/g, '');
            
            for (const rk of rowKeys) {
                const cleanRk = rk.toLowerCase().replace(/[\s\(\).]/g, '');
                if (cleanRk === cleanTarget) {
                    if (row[rk] !== undefined && row[rk] !== null) {
                        return String(row[rk]);
                    }
                }
            }
        }
        return '';
      };

      const factoryCode = findValueFuzzy(row, ['รหัสสินค้า (โรงงาน)', 'รหัสสินค้า(โรงงาน)', 'factory_code', 'Factory Code']);
      const productCode = findValueFuzzy(row, ['รหัสสินค้า', 'code', 'product_code', 'Product Code']);
      const factoryName = findValueFuzzy(row, ['ชื่อสินค้า (โรงงาน)', 'ชื่อสินค้า(โรงงาน)', 'factory_name', 'Factory Name']);
      const productName = findValueFuzzy(row, ['ชื่อสินค้า', 'name', 'Product Name']);
      const category = findValueFuzzy(row, ['หมวดหมู่หลัก', 'หมวดหมู่', 'category', 'Category']);
      
      // Parse cost_dollars (ต้นทุน (Dollars))
      let costDollars = 0;
      const costDollarsRaw = findValueFuzzy(row, ['ต้นทุน (Dollars)', 'ต้นทุน(Dollars)', 'Cost Dollars', 'cost_dollars']);
      if (costDollarsRaw) {
        const parsed = String(costDollarsRaw).replace(/,/g, '').replace(/[^\d.-]/g, '');
        costDollars = parseFloat(parsed) || 0;
      }
      
      // Parse cost (ต้นทุน) - in Thai Baht
      let cost = 0;
      const costRaw = findValueFuzzy(row, ['ต้นทุน', 'cost', 'Cost']);
      if (costRaw && !costRaw.includes('Dollar')) {
        const parsed = String(costRaw).replace(/,/g, '').replace(/[^\d.-]/g, '');
        cost = parseFloat(parsed) || 0;
      }
      
      // Parse Normal Price (Exc. VAT)
      let normalPriceExclVat = 0;
      const priceExcVAT = findValueFuzzy(row, ['Normal Price (Exc. VAT)', 'Normal Price (Exc.VAT)', 'normal_price_excl_vat']);
      if (priceExcVAT) {
        const parsed = String(priceExcVAT).replace(/,/g, '').replace(/[^\d.-]/g, '');
        normalPriceExclVat = parseFloat(parsed) || 0;
      }
      
      // Parse Normal Price (Inc. VAT)
      let normalPriceInclVat = 0;
      const priceIncVAT = findValueFuzzy(row, ['Normal Price (Inc. VAT)', 'Normal Price (Inc.VAT)', 'normal_price_incl_vat']);
      if (priceIncVAT) {
        const parsed = String(priceIncVAT).replace(/,/g, '').replace(/[^\d.-]/g, '');
        normalPriceInclVat = parseFloat(parsed) || 0;
      }
      
      // Price (Cost in THB) - map to unit_price
      let unitPrice = cost;

      const brand = row['Brand'] || '';

      // Validate
      if (!productName) {
        errors.push('ไม่มีชื่อสินค้า');
      }

      return {
        product_code: String(productCode || '').trim(),
        factory_code: String(factoryCode || '').trim(),
        factory_name: String(factoryName || '').trim(),
        name: String(productName || '').trim(),
        unit_price: unitPrice,
        category: String(category || '').trim(),
        brand: String(brand || '').trim(),
        cost_dollars: costDollars,
        normal_price_excl_vat: normalPriceExclVat,
        normal_price_incl_vat: normalPriceInclVat,
        _rowIndex: index + 1,
        _isValid: errors.length === 0,
        _errors: errors
      };
    }).filter(row => row.name); // Remove empty rows
  }, []);

  // Check for duplicates
  const checkDuplicates = useCallback((data: ParsedProductRow[]) => {
    const dupMap = new Map<number, string>();
    
    data.forEach((product, index) => {
      // Check by product_code - handle both field names (code from PB, product_code from CSV)
      if (product.product_code) {
        const existingByCode = existingProducts.find(
          p => {
            const existingCode = p.product_code || p.code;
            return existingCode && existingCode.toLowerCase() === product.product_code?.toLowerCase();
          }
        );
        if (existingByCode) {
          dupMap.set(index, `รหัสสินค้า "${product.product_code}" มีอยู่แล้วในระบบ`);
          return;
        }
      }
      
      // Check by name
      const existingByName = existingProducts.find(
        p => p.name.toLowerCase() === product.name.toLowerCase()
      );
      if (existingByName) {
        dupMap.set(index, `ชื่อ "${product.name}" มีอยู่แล้วในระบบ`);
      }
    });
    
    return dupMap;
  }, [existingProducts]);

  // Create category if not exists
  const ensureCategory = async (categoryName: string): Promise<string | null> => {
    if (!categoryName) return null;
    
    try {
      // Check if category exists
      const existing = pbCategories.find(c => c.category === categoryName);
      if (existing) {
        return existing.id;
      }
      
      // Create new category
      const newCategory = await pb.collection('product_categories').create({ 
        category: categoryName 
      });
      
      // Update local categories
      setPbCategories(prev => [...prev, newCategory]);
      
      return newCategory.id;
    } catch (err) {
      console.error('Failed to create category:', err);
      return null;
    }
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
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
            
      // Handle CSV or Excel
      const workbook = XLSX.read(data, { type: 'array', codepage: 65001 }); // UTF-8
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
            resolve(jsonData);
          } catch (err: any) {
            reject(new Error('Cannot read file: ' + (err.message || 'Unknown error')));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(selectedFile);
      });

      const processedData = processProductData(rawData);
      
      // Check for duplicates
      const dupMap = checkDuplicates(processedData);
      setDuplicates(dupMap);
      
      // Mark rows with duplicates as invalid
      const dataWithDuplicates = processedData.map((product, index) => {
        if (dupMap.has(index)) {
          return {
            ...product,
            _isValid: false,
            _errors: [...product._errors, dupMap.get(index) || '']
          };
        }
        return product;
      });
      
      setParsedData(dataWithDuplicates);
      
      if (dataWithDuplicates.length === 0) {
        toast.warning('ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบ format ของไฟล์');
      } else {
        const validCount = dataWithDuplicates.filter(p => p._isValid).length;
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
  }, [processProductData, checkDuplicates]);

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
            const workbook = XLSX.read(data, { type: 'array', codepage: 65001 }); // UTF-8
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
            resolve(jsonData);
          } catch (err: any) {
            reject(new Error('Cannot read file: ' + (err.message || 'Unknown error')));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });

      const processedData = processProductData(rawData);
      const dupMap = checkDuplicates(processedData);
      setDuplicates(dupMap);
      
      const dataWithDuplicates = processedData.map((product, index) => {
        if (dupMap.has(index)) {
          return {
            ...product,
            _isValid: false,
            _errors: [...product._errors, dupMap.get(index) || '']
          };
        }
        return product;
      });
      
      setParsedData(dataWithDuplicates);
      
      if (dataWithDuplicates.length === 0) {
        toast.warning('ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบ format ของไฟล์');
      } else {
        const validCount = dataWithDuplicates.filter(p => p._isValid).length;
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
  }, [processProductData, checkDuplicates]);

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
    const validProducts = parsedData.filter(p => p._isValid);
    if (validProducts.length === 0) return;

    setIsImporting(true);
    setCurrentStep('importing');
    setResults([]);
    setImportProgress(0);

    const importResults: ImportResult[] = [];

    try {
      // First, ensure all categories exist
      const categoryIds: Record<string, string> = {};
      const uniqueCategories = [...new Set(validProducts.map(p => p.category).filter(Boolean))];
      
      for (const catName of uniqueCategories) {
        const catId = await ensureCategory(catName);
        if (catId) {
          categoryIds[catName] = catId;
        }
      }

      // Import products one by one
      for (let i = 0; i < validProducts.length; i++) {
        const product = validProducts[i];
        
        try {
          // Map to PocketBase field names
          // PocketBase fields: code (required), name (required), unit_price, category, unit
          // Generate code if empty - use factory_code or generate unique id
          let finalCode = product.product_code;
          if (!finalCode && product.factory_code) {
            finalCode = product.factory_code;
          }
          if (!finalCode) {
            finalCode = `PRD-${Date.now()}-${i + 1}`;
          }
          
          const productData: any = {
            product_code: finalCode,
            name: product.name,
            unit_price: product.unit_price,
            category: product.category || '',
            factory_code: product.factory_code || '',
            factory_name: product.factory_name || '',
            cost_dollars: product.cost_dollars || 0,
            normal_price_excl_vat: product.normal_price_excl_vat || 0,
            normal_price_incl_vat: product.normal_price_incl_vat || 0,
            brand: product.brand || ''
          };

          await pb.collection('product_catalog').create(productData);
          
          importResults.push({
            rowIndex: i,
            success: true,
            name: product.name
          });
        } catch (error: any) {
          console.error(`Error importing product ${product.name}:`, error);
          importResults.push({
            rowIndex: i,
            success: false,
            name: product.name,
            error: error.message || 'เกิดข้อผิดพลาด'
          });
        }
        
        // Update progress
        const progress = ((i + 1) / validProducts.length) * 100;
        setImportProgress(progress);
      }
      
      const successCount = importResults.filter(r => r.success).length;
      const failCount = importResults.filter(r => !r.success).length;
      
      setResults(importResults);
      setCurrentStep('complete');
      
      if (failCount === 0) {
        toast.success(`นำเข้าข้อมูลสินค้า ${successCount} รายการเรียบร้อย`);
        onImportComplete();
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

  const validCount = parsedData.filter(p => p._isValid).length;
  const invalidCount = parsedData.filter(p => !p._isValid).length;

  const sampleColumns = [
    'รหัสสินค้า (โรงงาน)',
    'รหัสสินค้า',
    'ชื่อสินค้า(โรงงาน)',
    'ชื่อสินค้า',
    'หมวดหมู่หลัก',
    'ต้นทุน (Dollars)',
    'ต้นทุน',
    'Normal Price (Exc. VAT)',
    'Normal Price (Inc. VAT)',
    'Brand'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Upload className="w-5 h-5 text-blue-500" />
            นำเข้าข้อมูลสินค้าจาก Excel/CSV
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
                    ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-500/10'
                    : 'border-gray-200 hover:border-blue-300'
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
                  id="product-import-file"
                  disabled={isParsing || isImporting}
                />
                <label htmlFor="product-import-file" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    {isDragging ? (
                      <>
                        <FileSpreadsheet className="w-16 h-16 text-blue-500 animate-bounce" />
                        <p className="font-bold text-blue-600 text-lg">📥 ปล่อยไฟล์เพื่ออัพโหลด</p>
                        <p className="text-sm text-blue-500">กำลังเพิ่มไฟล์ Excel/CSV ของคุณ</p>
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
                      <li><strong>รหัสสินค้า</strong> - รหัสสินค้า (ถ้ามี)</li>
                      <li><strong>ชื่อสินค้า</strong> - ชื่อสินค้า (จำเป็น)</li>
                      <li><strong>หมวดหมู่หลัก</strong> - หมวดหมู่สินค้า (จะถูกสร้างอัตโนมัติถ้ายังไม่มี)</li>
                      <li><strong>Normal Price (Exc. VAT)</strong> - ราคาปกติ (ไม่รวม VAT)</li>
                      <li><strong>Brand</strong> - แบรนด์ (ถ้ามี)</li>
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
                    <p className="font-bold">พบ {duplicates.size} รายการที่มีรหัสหรือชื่อซ้ำกับข้อมูลที่มีอยู่ในระบบ</p>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหารหัส หรือชื่อสินค้าในรายการนำเข้า..."
                  className="pl-10 h-11 rounded-xl bg-white border-gray-200"
                />
              </div>

              {/* Data Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2 font-bold text-gray-600 w-12">#</th>
                        <th className="text-left p-2 font-bold text-gray-600">รหัส</th>
                        <th className="text-left p-2 font-bold text-gray-600">รหัสโรงงาน</th>
                        <th className="text-left p-2 font-bold text-gray-600">ชื่อสินค้า</th>
                        <th className="text-left p-2 font-bold text-gray-600">แบรนด์</th>
                        <th className="text-left p-2 font-bold text-gray-600">หมวดหมู่</th>
                        <th className="text-right p-2 font-bold text-gray-600">ทุน (฿)</th>
                        <th className="text-right p-2 font-bold text-gray-600">ทุน ($)</th>
                        <th className="text-right p-2 font-bold text-gray-600">Ex.VAT</th>
                        <th className="text-right p-2 font-bold text-gray-600">Inc.VAT</th>
                        <th className="text-left p-2 font-bold text-gray-600 w-24">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData
                        .filter(p => !searchTerm || 
                          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.factory_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .slice(0, 100).map((product, index) => (
                        <tr 
                          key={index} 
                          className={`border-t ${product._isValid ? 'hover:bg-gray-50' : 'bg-red-50'}`}
                        >
                          <td className="p-2 text-gray-500">{index + 1}</td>
                          <td className="p-2 font-medium">{product.product_code || '-'}</td>
                          <td className="p-2 text-gray-500">{product.factory_code || '-'}</td>
                          <td className="p-2 font-medium">
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              <span className="text-xs text-gray-400">{product.factory_name}</span>
                            </div>
                          </td>
                          <td className="p-2 text-gray-500">{product.brand || '-'}</td>
                          <td className="p-2 text-gray-500 text-xs">{product.category || '-'}</td>
                          <td className="p-2 text-right font-medium text-orange-600">{product.unit_price > 0 ? `฿${product.unit_price.toLocaleString()}` : '-'}</td>
                          <td className="p-2 text-right font-medium text-orange-600">{product.cost_dollars > 0 ? `$${product.cost_dollars.toLocaleString()}` : '-'}</td>
                          <td className="p-2 text-right font-medium text-blue-600">{product.normal_price_excl_vat > 0 ? `฿${product.normal_price_excl_vat.toLocaleString()}` : '-'}</td>
                          <td className="p-2 text-right font-medium text-green-600">{product.normal_price_incl_vat > 0 ? `฿${product.normal_price_incl_vat.toLocaleString()}` : '-'}</td>
                          <td className="p-2">
                            {product._isValid ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                พร้อม
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs" title={product._errors.join(', ')}>
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
                    {parsedData.filter(p => !p._isValid).slice(0, 10).map((product, index) => (
                      <p key={index} className="text-sm text-red-600">
                        <strong>แถว {product._rowIndex}:</strong> {product._errors.join(', ')}
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
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
              <p className="text-lg font-bold text-gray-700">กำลังนำเข้าข้อมูล...</p>
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300"
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
                className="bg-blue-600 hover:bg-blue-700"
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
