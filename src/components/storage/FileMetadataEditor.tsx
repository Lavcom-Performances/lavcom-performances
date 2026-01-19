import React, { useState, useEffect } from 'react';
import { X, Tag, Globe, Lock, Users, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getFileMetadata, 
  updateFileMetadata, 
  createFileMetadata,
  type FileMetadata,
  type UpdateMetadataParams 
} from '@/lib/storage/fileMetadata';

interface FileMetadataEditorProps {
  filePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (metadata: FileMetadata) => void;
}

export function FileMetadataEditor({
  filePath,
  fileName,
  fileSize,
  mimeType,
  open,
  onOpenChange,
  onSave
}: FileMetadataEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && filePath) {
      loadMetadata();
    }
  }, [open, filePath]);

  const loadMetadata = async () => {
    setIsLoading(true);
    try {
      const result = await getFileMetadata(filePath);
      if (result.data) {
        setMetadata(result.data);
        setDescription(result.data.description || '');
        setTags(result.data.tags || []);
        setIsPublic(result.data.is_public);
      } else {
        // No metadata exists yet, use defaults
        setMetadata(null);
        setDescription('');
        setTags([]);
        setIsPublic(false);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: UpdateMetadataParams = {
        description: description || undefined,
        tags,
        isPublic
      };

      let result;
      if (metadata) {
        // Update existing metadata
        result = await updateFileMetadata(filePath, updates);
      } else {
        // Create new metadata
        result = await createFileMetadata({
          filePath,
          fileName,
          fileSize,
          mimeType,
          description: description || undefined,
          tags,
          isPublic
        });
      }

      if (result.error) {
        toast({
          title: "Failed to save",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      if (result.data) {
        toast({
          title: "Metadata saved",
          description: "File metadata has been updated"
        });
        onSave?.(result.data);
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save metadata",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            File Properties
          </DialogTitle>
          <DialogDescription>
            Add tags, description, and sharing settings for "{fileName}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add a description for this file..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Sharing */}
            <div className="space-y-4">
              <Label>Sharing</Label>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isPublic ? 'Public access' : 'Private'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPublic 
                        ? 'Anyone with the link can view' 
                        : 'Only you can access this file'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
              
              {isPublic && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Public files can be accessed by anyone with the signed URL.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
