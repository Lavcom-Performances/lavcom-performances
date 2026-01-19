import { useState, useCallback } from 'react';
import { 
  secureUpload, 
  secureDelete, 
  getSignedUrl, 
  listUserFiles,
  validateFile,
  type SecureUploadResult 
} from '@/lib/storage/secureUpload';
import { useToast } from '@/hooks/use-toast';

interface UseSecureUploadOptions {
  subfolder?: string;
  onUploadComplete?: (result: SecureUploadResult) => void;
  onUploadError?: (error: string) => void;
}

export function useSecureUpload(options: UseSecureUploadOptions = {}) {
  const { subfolder, onUploadComplete, onUploadError } = options;
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadResult, setLastUploadResult] = useState<SecureUploadResult | null>(null);

  const upload = useCallback(async (file: File): Promise<SecureUploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Validate first
      const validation = validateFile(file);
      if (!validation.valid) {
        const result: SecureUploadResult = {
          success: false,
          error: validation.error
        };
        setLastUploadResult(result);
        onUploadError?.(validation.error || 'Validation failed');
        toast({
          title: "Upload failed",
          description: validation.error,
          variant: "destructive"
        });
        return result;
      }

      setUploadProgress(30);
      
      // Upload
      const result = await secureUpload(file, subfolder);
      
      setUploadProgress(100);
      setLastUploadResult(result);
      
      if (result.success) {
        onUploadComplete?.(result);
        toast({
          title: "Upload successful",
          description: "File uploaded securely"
        });
      } else {
        onUploadError?.(result.error || 'Upload failed');
        toast({
          title: "Upload failed",
          description: result.error,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: SecureUploadResult = {
        success: false,
        error: errorMessage
      };
      setLastUploadResult(result);
      onUploadError?.(errorMessage);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
      return result;
    } finally {
      setIsUploading(false);
    }
  }, [subfolder, onUploadComplete, onUploadError, toast]);

  const uploadMultiple = useCallback(async (files: File[]): Promise<SecureUploadResult[]> => {
    const results: SecureUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round((i / files.length) * 100));
      const result = await upload(file);
      results.push(result);
    }
    
    setUploadProgress(100);
    return results;
  }, [upload]);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    const result = await secureDelete(filePath);
    
    if (result.success) {
      toast({
        title: "File deleted",
        description: "File removed from secure storage"
      });
    } else {
      toast({
        title: "Delete failed",
        description: result.error,
        variant: "destructive"
      });
    }
    
    return result.success;
  }, [toast]);

  const refreshSignedUrl = useCallback(async (
    filePath: string, 
    expiresInSeconds: number = 3600
  ): Promise<string | null> => {
    const result = await getSignedUrl(filePath, expiresInSeconds);
    
    if (result.error) {
      toast({
        title: "Failed to get URL",
        description: result.error,
        variant: "destructive"
      });
      return null;
    }
    
    return result.url || null;
  }, [toast]);

  const listFiles = useCallback(async (folder?: string) => {
    return listUserFiles(folder || subfolder);
  }, [subfolder]);

  return {
    upload,
    uploadMultiple,
    deleteFile,
    refreshSignedUrl,
    listFiles,
    isUploading,
    uploadProgress,
    lastUploadResult,
    validateFile
  };
}
