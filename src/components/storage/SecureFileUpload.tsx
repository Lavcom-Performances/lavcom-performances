import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSecureUpload } from '@/hooks/useSecureUpload';
import { 
  ALLOWED_FILE_TYPES, 
  MAX_FILE_SIZE, 
  getReadableFileTypes,
  validateFile 
} from '@/lib/storage/secureUpload';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  path?: string;
  signedUrl?: string;
  error?: string;
}

interface SecureFileUploadProps {
  subfolder?: string;
  multiple?: boolean;
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  className?: string;
}

export function SecureFileUpload({
  subfolder,
  multiple = true,
  maxFiles = 10,
  onUploadComplete,
  className
}: SecureFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { upload, isUploading, uploadProgress } = useSecureUpload({ subfolder });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, maxFiles);
    
    for (const file of fileArray) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Add file to list with uploading status
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'uploading'
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Validate first
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId 
            ? { ...f, status: 'error' as const, error: validation.error } 
            : f
          )
        );
        continue;
      }
      
      // Upload
      const result = await upload(file);
      
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId 
          ? { 
              ...f, 
              status: result.success ? 'success' as const : 'error' as const,
              path: result.path,
              signedUrl: result.signedUrl,
              error: result.error
            } 
          : f
        )
      );
    }
    
    // Notify parent of completed uploads
    setUploadedFiles(prev => {
      const successfulFiles = prev.filter(f => f.status === 'success');
      if (successfulFiles.length > 0) {
        onUploadComplete?.(successfulFiles);
      }
      return prev;
    });
  }, [upload, maxFiles, onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleClearAll = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          "hover:border-primary/50 hover:bg-muted/30",
          isDragOver && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "p-3 rounded-full bg-muted",
            isDragOver && "bg-primary/10"
          )}>
            <Upload className={cn(
              "h-6 w-6 text-muted-foreground",
              isDragOver && "text-primary"
            )} />
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragOver ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Allowed: {getReadableFileTypes()}</p>
            <p>Max size: {formatFileSize(MAX_FILE_SIZE)}</p>
          </div>
        </div>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Progress value={uploadProgress} className="w-32 h-2" />
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Uploaded files ({uploadedFiles.filter(f => f.status === 'success').length}/{uploadedFiles.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  file.status === 'error' && "border-destructive/50 bg-destructive/5",
                  file.status === 'success' && "border-green-500/30 bg-green-500/5"
                )}
              >
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                    {file.error && (
                      <span className="text-destructive ml-2">{file.error}</span>
                    )}
                  </p>
                </div>
                
                {getStatusIcon(file.status)}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(file.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
