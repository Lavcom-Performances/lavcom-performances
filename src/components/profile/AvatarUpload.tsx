import { useState, useRef } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AvatarCropDialog } from "./AvatarCropDialog";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  onAvatarUpdate: (url: string | null) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  firstName,
  lastName,
  onAvatarUpdate,
}: AvatarUploadProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t('common:error'),
        description: t('app:profile.avatar.invalidType'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB for original before crop)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('common:error'),
        description: t('app:profile.avatar.tooLarge'),
        variant: "destructive",
      });
      return;
    }

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropDialogOpen(false);
    setSelectedImageSrc(null);
    setIsUploading(true);

    try {
      const fileName = `${userId}/avatar.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: "image/jpeg"
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarUpdate(avatarUrl);

      toast({
        title: t('app:profile.avatar.updateSuccess'),
        description: t('app:profile.avatar.updateSuccessDescription'),
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: t('common:error'),
        description: error.message || t('app:profile.avatar.uploadError'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(true);
    }
  };

  const handleCropDialogClose = (open: boolean) => {
    setCropDialogOpen(open);
    if (!open && selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
    setIsUploading(false);
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    setIsDeleting(true);

    try {
      // Delete from storage - try common extensions
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      for (const ext of extensions) {
        await supabase.storage
          .from("avatars")
          .remove([`${userId}/avatar.${ext}`]);
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarUpdate(null);

      toast({
        title: t('app:profile.avatar.deleteSuccess'),
        description: t('app:profile.avatar.deleteSuccessDescription'),
      });
    } catch (error: any) {
      console.error("Avatar delete error:", error);
      toast({
        title: t('common:error'),
        description: error.message || t('app:profile.avatar.deleteError'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-border">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-xl bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isDeleting}
          aria-label={t('app:profile.avatar.change')}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label={t('app:profile.avatar.upload')}
        />
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground text-center">
          {t('app:profile.avatar.hint')}
        </p>
        
        {currentAvatarUrl && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting || isUploading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                {t('app:profile.avatar.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('app:profile.avatar.deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('app:profile.avatar.deleteConfirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('app:profile.avatar.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {selectedImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={handleCropDialogClose}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
