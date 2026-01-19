import { supabase } from "@/integrations/supabase/client";
import { createFileMetadata, deleteFileMetadata } from "./fileMetadata";

// Allowed file types matching the bucket configuration
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type AllowedMimeType = typeof ALLOWED_FILE_TYPES[number];

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface SecureUploadResult {
  success: boolean;
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Validates a file before upload
 */
export function validateFile(file: File): UploadValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${getReadableFileTypes()}`
    };
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    };
  }

  return { valid: true };
}

/**
 * Get human-readable file type list
 */
export function getReadableFileTypes(): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'text/csv': 'CSV',
    'application/json': 'JSON',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX'
  };
  
  return ALLOWED_FILE_TYPES.map(type => typeMap[type] || type).join(', ');
}

/**
 * Generates a safe filename with timestamp
 */
function generateSafeFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  
  // Sanitize filename - remove special characters
  const sanitized = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  
  const lastDotIndex = sanitized.lastIndexOf('.');
  const name = lastDotIndex > 0 ? sanitized.substring(0, lastDotIndex) : sanitized;
  const ext = lastDotIndex > 0 ? sanitized.substring(lastDotIndex) : '';
  
  return `${timestamp}_${randomId}_${name}${ext}`;
}

/**
 * Uploads a file to secure storage with validation
 */
export async function secureUpload(
  file: File,
  subfolder?: string
): Promise<SecureUploadResult> {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  // Build path: userId/subfolder/filename
  const safeFilename = generateSafeFilename(file.name);
  const pathParts = [user.id];
  if (subfolder) {
    pathParts.push(subfolder);
  }
  pathParts.push(safeFilename);
  const filePath = pathParts.join('/');

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('secure-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message
    };
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('secure-files')
    .createSignedUrl(filePath, 3600);

  if (signedUrlError) {
    return {
      success: true,
      path: filePath,
      error: 'File uploaded but could not generate signed URL'
    };
  }

  // Create metadata entry
  await createFileMetadata({
    filePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type
  });

  return {
    success: true,
    path: filePath,
    signedUrl: signedUrlData.signedUrl
  };
}

/**
 * Gets a signed URL for an existing file
 */
export async function getSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from('secure-files')
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    return { error: error.message };
  }

  return { url: data.signedUrl };
}

/**
 * Deletes a file from secure storage
 */
export async function secureDelete(filePath: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.storage
    .from('secure-files')
    .remove([filePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  // Also delete metadata
  await deleteFileMetadata(filePath);

  return { success: true };
}

/**
 * Lists files for the current user
 */
export async function listUserFiles(
  subfolder?: string
): Promise<{ files?: { name: string; size: number; createdAt: string }[]; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const path = subfolder ? `${user.id}/${subfolder}` : user.id;
  
  const { data, error } = await supabase.storage
    .from('secure-files')
    .list(path, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    return { error: error.message };
  }

  return {
    files: data
      .filter(item => item.id) // Filter out folders
      .map(item => ({
        name: item.name,
        size: item.metadata?.size || 0,
        createdAt: item.created_at
      }))
  };
}
