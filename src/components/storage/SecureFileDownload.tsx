import React, { useState, useCallback } from 'react';
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getSignedUrl } from '@/lib/storage/secureUpload';
import { cn } from '@/lib/utils';

interface SecureFileDownloadProps {
  filePath: string;
  fileName?: string;
  expiresInSeconds?: number;
  variant?: 'button' | 'link' | 'icon';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

// Cache for signed URLs with expiration tracking
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function SecureFileDownload({
  filePath,
  fileName,
  expiresInSeconds = 3600,
  variant = 'button',
  size = 'default',
  className,
  children
}: SecureFileDownloadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getCachedOrFreshUrl = useCallback(async (): Promise<string | null> => {
    const cached = urlCache.get(filePath);
    const now = Date.now();
    
    // Use cached URL if still valid (with 5-minute buffer)
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      return cached.url;
    }
    
    // Fetch fresh signed URL
    const result = await getSignedUrl(filePath, expiresInSeconds);
    
    if (result.error || !result.url) {
      toast({
        title: "Download failed",
        description: result.error || "Could not generate download URL",
        variant: "destructive"
      });
      return null;
    }
    
    // Cache the new URL
    urlCache.set(filePath, {
      url: result.url,
      expiresAt: now + expiresInSeconds * 1000
    });
    
    return result.url;
  }, [filePath, expiresInSeconds, toast]);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const url = await getCachedOrFreshUrl();
      
      if (!url) return;
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || filePath.split('/').pop() || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your file is being downloaded"
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCachedOrFreshUrl, fileName, filePath, toast]);

  const handleOpenInNewTab = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const url = await getCachedOrFreshUrl();
      
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getCachedOrFreshUrl]);

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDownload}
        disabled={isLoading}
        className={cn("h-8 w-8", className)}
        title="Download file"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline",
          isLoading && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Download className="h-3 w-3" />
        )}
        {children || fileName || 'Download'}
      </button>
    );
  }

  return (
    <div className={cn("inline-flex gap-1", className)}>
      <Button
        variant="outline"
        size={size}
        onClick={handleDownload}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {children || 'Download'}
      </Button>
      
      <Button
        variant="ghost"
        size={size}
        onClick={handleOpenInNewTab}
        disabled={isLoading}
        title="Open in new tab"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Hook for programmatic access to secure downloads
export function useSecureDownload() {
  const { toast } = useToast();

  const download = useCallback(async (
    filePath: string,
    fileName?: string,
    expiresInSeconds: number = 3600
  ): Promise<boolean> => {
    const cached = urlCache.get(filePath);
    const now = Date.now();
    
    let url: string | null = null;
    
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      url = cached.url;
    } else {
      const result = await getSignedUrl(filePath, expiresInSeconds);
      
      if (result.error || !result.url) {
        toast({
          title: "Download failed",
          description: result.error || "Could not generate download URL",
          variant: "destructive"
        });
        return false;
      }
      
      url = result.url;
      urlCache.set(filePath, {
        url,
        expiresAt: now + expiresInSeconds * 1000
      });
    }
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || filePath.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  }, [toast]);

  const getUrl = useCallback(async (
    filePath: string,
    expiresInSeconds: number = 3600
  ): Promise<string | null> => {
    const cached = urlCache.get(filePath);
    const now = Date.now();
    
    if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
      return cached.url;
    }
    
    const result = await getSignedUrl(filePath, expiresInSeconds);
    
    if (result.url) {
      urlCache.set(filePath, {
        url: result.url,
        expiresAt: now + expiresInSeconds * 1000
      });
      return result.url;
    }
    
    return null;
  }, []);

  const clearCache = useCallback((filePath?: string) => {
    if (filePath) {
      urlCache.delete(filePath);
    } else {
      urlCache.clear();
    }
  }, []);

  return { download, getUrl, clearCache };
}
