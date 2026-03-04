export type ValidationRule<T> = {
    validate: (value: T, formValues?: Record<string, any>) => boolean;
    message: string;
};

export type ValidationSchema<T extends Record<string, any>> = {
    [K in keyof T]?: ValidationRule<T[K]>[];
};

export const rules = {
    required: (message = 'กรุณากรอกข้อมูล'): ValidationRule<any> => ({
        validate: (val) => {
            if (typeof val === 'string') return val.trim().length > 0;
            if (Array.isArray(val)) return val.length > 0;
            return val !== null && val !== undefined;
        },
        message,
    }),
    email: (message = 'รูปแบบอีเมลไม่ถูกต้อง'): ValidationRule<string> => ({
        validate: (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        message,
    }),
    phone: (message = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'): ValidationRule<string> => ({
        validate: (val) => !val || /^[\d\s\-+().]{6,20}$/.test(val),
        message,
    }),
    taxId: (message = 'เลขผู้เสียภาษีต้องมี 13 หลัก'): ValidationRule<string> => ({
        validate: (val) => {
            if (!val) return true;
            const digitsOnly = val.replace(/[-\s]/g, '');
            return /^\d{13}$/.test(digitsOnly);
        },
        message,
    }),
    url: (message = 'URL ต้องขึ้นต้นด้วย http:// หรือ https://'): ValidationRule<string> => ({
        validate: (val) => !val || /^https?:\/\/.+/.test(val),
        message,
    }),
    minLength: (length: number, message = `ต้องมีความยาวอย่างน้อย ${length} ตัวอักษร`): ValidationRule<string> => ({
        validate: (val) => !val || val.length >= length,
        message,
    }),
    maxLength: (length: number, message = `ต้องมีความยาวไม่เกิน ${length} ตัวอักษร`): ValidationRule<string> => ({
        validate: (val) => !val || val.length <= length,
        message,
    }),
    fileSize: (maxMB: number, message = `ขนาดไฟล์ต้องไม่เกิน ${maxMB}MB`): ValidationRule<File | null> => ({
        validate: (val) => !val || val.size <= maxMB * 1024 * 1024,
        message,
    }),
    fileType: (types: string[], message = `รองรับไฟล์ประเภท ${types.join(', ')}`): ValidationRule<File | null> => ({
        validate: (val) => {
            if (!val) return true;
            const extension = val.name.split('.').pop()?.toLowerCase() || '';
            return types.map(t => t.toLowerCase()).includes(extension);
        },
        message,
    }),
    match: (targetField: string, message = 'ข้อมูลไม่ตรงกัน'): ValidationRule<string> => ({
        validate: (val, formValues) => val === formValues?.[targetField],
        message,
    }),
};

export function validateForm<T extends Record<string, any>>(
    values: T,
    schema: ValidationSchema<T>
): { isValid: boolean; errors: Record<keyof T, string> } {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key in schema) {
        const fieldRules = schema[key];
        if (fieldRules && fieldRules.length > 0) {
            for (const rule of fieldRules) {
                if (!rule.validate(values[key], values)) {
                    errors[key] = rule.message;
                    isValid = false;
                    break; // Stop at first error for the field
                }
            }
        }
    }

    return { isValid, errors: errors as Record<keyof T, string> };
}
