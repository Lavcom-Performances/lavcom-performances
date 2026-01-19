// Input validation utilities for edge functions

// Validate UUID format
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Sanitize string input
export function sanitizeString(str: string, maxLen: number): string {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, maxLen).replace(/[<>]/g, '').trim();
}

// Validate required fields
export function validateRequired(obj: Record<string, unknown>, fields: string[]): { valid: boolean; missing: string[] } {
  const missing = fields.filter(field => {
    const value = obj[field];
    return value === undefined || value === null || value === '';
  });
  return { valid: missing.length === 0, missing };
}

// Schema-based validation
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'uuid' | 'email' | 'array' | 'object';
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
}

export function validateInput(input: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        } else {
          let sanitizedValue = sanitizeString(value, rules.maxLength || 1000);
          if (rules.minLength && sanitizedValue.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }
          sanitized[field] = sanitizedValue;
        }
        break;

      case 'number':
        const num = typeof value === 'number' ? value : Number(value);
        if (isNaN(num)) {
          errors.push(`${field} must be a number`);
        } else {
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`${field} must be at most ${rules.max}`);
          }
          sanitized[field] = num;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        } else {
          sanitized[field] = value;
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !isValidUUID(value)) {
          errors.push(`${field} must be a valid UUID`);
        } else {
          sanitized[field] = value;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailRegex.test(value)) {
          errors.push(`${field} must be a valid email`);
        } else {
          sanitized[field] = value.toLowerCase().slice(0, 255);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`);
        } else {
          sanitized[field] = value;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${field} must be an object`);
        } else {
          sanitized[field] = value;
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors, sanitized };
}

// Redact sensitive data from prompts/inputs
const SENSITIVE_PATTERNS = [
  /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]+["']?/gi,
  /password\s*[:=]\s*["']?[^\s"']+["']?/gi,
  /secret\s*[:=]\s*["']?[a-zA-Z0-9_-]+["']?/gi,
  /token\s*[:=]\s*["']?[a-zA-Z0-9_.-]+["']?/gi,
  /bearer\s+[a-zA-Z0-9_.-]+/gi,
  /sk_live_[a-zA-Z0-9]+/g,
  /sk_test_[a-zA-Z0-9]+/g,
  /pk_live_[a-zA-Z0-9]+/g,
  /pk_test_[a-zA-Z0-9]+/g,
];

export function redactSensitiveData(text: string): string {
  let redacted = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}
