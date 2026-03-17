/**
 * Utility functions for vendor import functionality
 * Handles Excel/CSV parsing and data transformation
 */

import * as XLSX from 'xlsx';

// Field mapping between Excel columns and PocketBase schema
export const VENDOR_FIELD_MAPPING = {
  // Excel Column -> PocketBase Field
  'Supplier Code': 'vendor_code',
  'supplier_code': 'vendor_code',
  'รหัสผู้ขาย': 'vendor_code',
  'Code': 'vendor_code',
  
  'Name': 'name',
  'name': 'name',
  'ชื่อ': 'name',
  'ชื่อผู้ขาย': 'name',
  
  'กลุ่มผู้ขาย (Name)': 'category',
  'category': 'category',
  'กลุ่มผู้ขาย': 'category',
  'Category': 'category',
  'Group': 'category',
  
  'TaxNo': 'tax_id',
  'tax_id': 'tax_id',
  'เลขประจำตัวผู้เสียภาษี': 'tax_id',
  'Tax ID': 'tax_id',
  
  'Address1': 'address',
  'address': 'address',
  'ที่อยู่': 'address',
  'Address': 'address',
  'Address2': 'address2',
  
  'Tel': 'phone',
  'phone': 'phone',
  'โทรศัพท์': 'phone',
  'Telephone': 'phone',
  
  'Fax': 'fax',
  'fax': 'fax',
  'แฟกซ์': 'fax',
};

// Default values for vendor fields
export const VENDOR_DEFAULTS = {
  status: 'active',
  vendor_type: 'domestic',
  contact_person: '', // Will be set to name if not provided
  email: '',
  payment_term: '30days',
};

// Vendor type detection based on category
export const VENDOR_TYPE_KEYWORDS = {
  domestic: ['เจ้าหนี้ในประเทศ', 'ในประเทศ', 'domestic', 'local'],
  foreign: ['เจ้าหนี้นอกประเทศ', 'นอกประเทศ', 'foreign', 'international', 'ต่างประเทศ'],
};

// Payment term mapping
export const PAYMENT_TERM_MAPPING: Record<string, string> = {
  '30': '30days',
  '30 days': '30days',
  '30days': '30days',
  '45': '45days',
  '45 days': '45days',
  '45days': '45days',
  '60': '60days',
  '60 days': '60days',
  '60days': '60days',
  'cash': 'cash',
  'เงินสด': 'cash',
  'credit': 'credit',
  'เครดิต': 'credit',
};

export interface ParsedVendorRow {
  code: string;
  name: string;
  category: string;
  tax_id: string;
  address: string;
  address2?: string;
  phone: string;
  fax: string;
  email?: string;
  contact_person?: string;
  vendor_type: 'domestic' | 'foreign';
  payment_term: string;
  status: string;
  _rowIndex: number;
  _isValid: boolean;
  _errors: string[];
}

export interface ImportResult {
  success: boolean;
  data?: any;
  error?: string;
  rowIndex?: number;
}

export interface ImportSummary {
  total: number;
  success: number;
  failed: number;
  results: ImportResult[];
}

/**
 * Detect vendor type based on category string
 */
export function detectVendorType(category: string): 'domestic' | 'foreign' {
  if (!category) return 'domestic';
  
  const lowerCategory = category.toLowerCase();
  
  for (const [type, keywords] of Object.entries(VENDOR_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => lowerCategory.includes(keyword.toLowerCase()))) {
      return type as 'domestic' | 'foreign';
    }
  }
  
  return 'domestic';
}

/**
 * Validate a single vendor row
 */
export function validateVendorRow(row: ParsedVendorRow): ParsedVendorRow {
  const errors: string[] = [];
  
  // Required: name
  if (!row.name || row.name.trim() === '') {
    errors.push('ชื่อผู้ขาย (Name) จำเป็น');
  }
  
  // Validate name length
  if (row.name && row.name.length > 255) {
    errors.push('ชื่อผู้ขายยาวเกินไป (สูงสุด 255 ตัวอักษร)');
  }
  
  // Validate tax_id format (optional but if provided should be valid)
  if (row.tax_id) {
    const taxId = row.tax_id.toString().replace(/[-\s]/g, '');
    if (taxId.length !== 13 && taxId.length !== 0) {
      // Warning only, not error - some vendors might not have tax ID
    }
  }
  
  // Validate phone format (optional) - supports multiple numbers separated by , or /
  if (row.phone) {
    const phones = row.phone.split(/[,\/]/).map(p => p.trim()).filter(Boolean);
    const invalidPhones = phones.filter(p => !/^[\d\s\-\+\(\)\.]+$/.test(p));
    if (invalidPhones.length > 0) {
      errors.push('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
    }
  }
  
  // Validate email format if provided
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('รูปแบบอีเมลไม่ถูกต้อง');
  }
  
  return {
    ...row,
    _isValid: errors.length === 0,
    _errors: errors,
  };
}

/**
 * Transform parsed row to PocketBase vendor format
 */
export function transformToPocketBase(row: ParsedVendorRow): any {
  return {
    name: row.name?.trim() || '',
    vendor_code: row.code?.trim() || '', // Supplier Code from Excel
    tax_id: row.tax_id?.trim() || '',
    category: row.category?.trim() || 'เจ้าหนี้ในประเทศ - นิติบุคคล',
    address: [row.address, row.address2].filter(Boolean).join(' ').trim() || '',
    contact_person: row.contact_person?.trim() || row.name?.trim() || '',
    email: row.email?.trim() || '',
    phone: row.phone?.trim() || '',
    fax: row.fax?.trim() || '',
    status: row.status || 'active',
    vendor_type: row.vendor_type || 'domestic',
    payment_term: row.payment_term || '30days',
  };
}

/**
 * Parse Excel/CSV file and return raw data
 * Uses ArrayBuffer for better compatibility with large files
 */
export async function parseVendorFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No data in file'));
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error: any) {
        reject(new Error('Cannot read Excel file: ' + (error.message || 'Unknown error')));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Map raw Excel data to parsed vendor rows
 */
export function mapToParsedVendors(rawData: any[]): ParsedVendorRow[] {
  return rawData.map((row: any, index: number) => {
    // Helper to get value from multiple possible column names
    const getValue = (...keys: string[]): string => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) {
          return String(row[key]).trim();
        }
      }
      return '';
    };
    
    const code = getValue('Supplier Code', 'supplier_code', 'รหัสผู้ขาย', 'Code', 'code');
    const name = getValue('Name', 'name', 'ชื่อ', 'ชื่อผู้ขาย');
    const category = getValue('กลุ่มผู้ขาย (Name)', 'category', 'กลุ่มผู้ขาย', 'Category', 'Group');
    const tax_id = getValue('TaxNo', 'tax_id', 'เลขประจำตัวผู้เสียภาษี', 'Tax ID');
    const address = getValue('Address1', 'address', 'ที่อยู่', 'Address');
    const address2 = getValue('Address2');
    
    // Collect phone numbers from multiple possible columns and merge
    const phone1 = getValue('Tel', 'phone', 'โทรศัพท์', 'Telephone');
    const phone2 = getValue('Tel2', 'Phone2', 'โทรศัพท์2', 'Telephone2', 'Tel 2', 'Mobile', 'มือถือ');
    const phoneNumbers = [phone1, phone2].filter(Boolean);
    const phone = phoneNumbers.join(', ');
    
    const fax = getValue('Fax', 'fax', 'แฟกซ์');
    
    const vendor_type = detectVendorType(category);
    
    return {
      code,
      name,
      category,
      tax_id,
      address,
      address2,
      phone,
      fax,
      vendor_type,
      payment_term: '30days',
      status: 'active',
      _rowIndex: index + 1,
      _isValid: true,
      _errors: [],
    };
  });
}

/**
 * Process vendor import data with validation
 */
export function processVendorData(rawData: any[]): ParsedVendorRow[] {
  // Map raw data to parsed format
  let parsedData = mapToParsedVendors(rawData);
  
  // Filter out empty rows (no name)
  parsedData = parsedData.filter(row => row.name && row.name.trim() !== '');
  
  // Validate each row
  parsedData = parsedData.map(row => validateVendorRow(row));
  
  return parsedData;
}

/**
 * Get column headers from sample file
 */
export function getExpectedColumns(): string[] {
  return [
    'Supplier Code (รหัสผู้ขาย)',
    'Name (ชื่อผู้ขาย)',
    'กลุ่มผู้ขาย (Category)',
    'TaxNo (เลขภาษี)',
    'Address1 (ที่อยู่)',
    'Address2 (ที่อยู่เพิ่มเติม)',
    'Tel (โทรศัพท์)',
    'Fax (แฟกซ์)',
  ];
}
