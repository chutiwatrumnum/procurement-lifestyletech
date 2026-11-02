/**
 * Utility functions for vendor import functionality
 * Handles Excel/CSV parsing and data transformation
 */


// Vendor type detection based on category
export const VENDOR_TYPE_KEYWORDS = {
  domestic: ['เจ้าหนี้ในประเทศ', 'ในประเทศ', 'domestic', 'local'],
  foreign: ['เจ้าหนี้นอกประเทศ', 'นอกประเทศ', 'foreign', 'international', 'ต่างประเทศ'],
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

// Excel เก็บเลขเป็นตัวเลข จึงตัด 0 นำหน้าทิ้ง
function restoreLeadingZero(value: string, length: number) {
  return /^\d+$/.test(value) && value.length === length - 1 ? `0${value}` : value;
}

/**
 * Transform parsed row to PocketBase vendor format
 */
export function transformToPocketBase(row: ParsedVendorRow): any {
  return {
    name: row.name?.trim() || '',
    vendor_code: row.code?.trim() || '', // Supplier Code from Excel
    tax_id: restoreLeadingZero(row.tax_id?.trim() || '', 13),
    category: row.category?.trim() || 'เจ้าหนี้ในประเทศ - นิติบุคคล',
    address: [row.address, row.address2].filter(Boolean).join(' ').trim() || '',
    contact_person: row.contact_person?.trim() || row.name?.trim() || '',
    email: row.email?.trim() || '',
    phone: restoreLeadingZero(row.phone?.trim() || '', 10),
    fax: row.fax?.trim() || '',
    status: row.status || 'active',
    vendor_type: row.vendor_type || 'domestic',
    payment_term: row.payment_term || '30days',
  };
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
