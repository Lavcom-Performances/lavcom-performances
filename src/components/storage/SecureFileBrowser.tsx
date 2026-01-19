import React, { useState, useEffect, useCallback } from 'react';
import { 
  File, 
  Folder, 
  Download, 
  Trash2, 
  RefreshCw, 
  Search,
  MoreVertical,
  Eye,
  FileText,
  Image,
  FileSpreadsheet,
  Loader2,
  FolderOpen,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileMetadataEditor } from './FileMetadataEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSecureUpload } from '@/hooks/useSecureUpload';
import { useSecureDownload } from '@/components/storage/SecureFileDownload';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileItem {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  path: string;
  type: 'file' | 'folder';
  mimeType?: string;
}

interface SecureFileBrowserProps {
  subfolder?: string;
  onFileSelect?: (file: FileItem) => void;
  className?: string;
}

export function SecureFileBrowser({
  subfolder,
  onFileSelect,
  className
}: SecureFileBrowserProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metadataTarget, setMetadataTarget] = useState<FileItem | null>(null);
  
  const { deleteFile } = useSecureUpload({ subfolder });
  const { download, getUrl } = useSecureDownload();
  const { toast } = useToast();

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFiles([]);
        return;
      }

      const pathParts = [user.id];
      if (subfolder) pathParts.push(subfolder);
      if (currentPath.length > 0) pathParts.push(...currentPath);
      
      const fullPath = pathParts.join('/');

      const { data, error } = await supabase.storage
        .from('secure-files')
        .list(fullPath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        toast({
          title: "Failed to load files",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      const items: FileItem[] = (data || []).map(item => ({
        id: item.id || item.name,
        name: item.name,
        size: item.metadata?.size || 0,
        createdAt: item.created_at,
        path: `${fullPath}/${item.name}`,
        type: item.id ? 'file' : 'folder',
        mimeType: item.metadata?.mimetype
      }));

      setFiles(items);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [subfolder, currentPath, toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteFile(deleteTarget.path);
      if (success) {
        setFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDownload = async (file: FileItem) => {
    await download(file.path, file.name);
  };

  const handlePreview = async (file: FileItem) => {
    const url = await getUrl(file.path);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFolderClick = (folder: FileItem) => {
    setCurrentPath(prev => [...prev, folder.name]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return <Folder className="h-5 w-5 text-amber-500" />;
    }
    
    const mime = file.mimeType || '';
    if (mime.startsWith('image/')) {
      return <Image className="h-5 w-5 text-green-500" />;
    }
    if (mime.includes('spreadsheet') || mime.includes('csv')) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    }
    if (mime.includes('pdf') || mime.includes('document')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = filteredFiles.filter(f => f.type === 'folder');
  const regularFiles = filteredFiles.filter(f => f.type === 'file');
  const sortedFiles = [...folders, ...regularFiles];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={loadFiles}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Breadcrumb */}
      {currentPath.length > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setCurrentPath([])}
            className="text-primary hover:underline"
          >
            Root
          </button>
          {currentPath.map((folder, index) => (
            <React.Fragment key={index}>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index + 1)}
                className={cn(
                  index === currentPath.length - 1
                    ? "text-foreground font-medium"
                    : "text-primary hover:underline"
                )}
              >
                {folder}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* File List */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_150px_40px] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>Name</span>
          <span className="text-right">Size</span>
          <span>Modified</span>
          <span></span>
        </div>

        {/* Content */}
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No files found</p>
              <p className="text-xs">Upload files to get started</p>
            </div>
          ) : (
            sortedFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "grid grid-cols-[1fr_100px_150px_40px] gap-2 px-4 py-3 items-center",
                  "hover:bg-muted/30 transition-colors",
                  file.type === 'folder' && "cursor-pointer"
                )}
                onClick={() => {
                  if (file.type === 'folder') {
                    handleFolderClick(file);
                  } else {
                    onFileSelect?.(file);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file)}
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <span className="text-sm text-muted-foreground text-right">
                  {formatFileSize(file.size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(file.createdAt)}
                </span>
                
                {file.type === 'file' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(file)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMetadataTarget(file)}>
                        <Tag className="h-4 w-4 mr-2" />
                        Properties
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteTarget(file)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{regularFiles.length} file(s), {folders.length} folder(s)</span>
        <span>
          Total: {formatFileSize(regularFiles.reduce((acc, f) => acc + f.size, 0))}
        </span>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Metadata Editor */}
      {metadataTarget && (
        <FileMetadataEditor
          filePath={metadataTarget.path}
          fileName={metadataTarget.name}
          fileSize={metadataTarget.size}
          mimeType={metadataTarget.mimeType}
          open={!!metadataTarget}
          onOpenChange={(open) => !open && setMetadataTarget(null)}
          onSave={() => loadFiles()}
        />
      )}
    </div>
  );
}
