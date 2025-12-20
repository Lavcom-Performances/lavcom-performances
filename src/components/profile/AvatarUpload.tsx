import { useState, useRef } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  onAvatarUpdate: (url: string) => void;
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

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('common:error'),
        description: t('app:profile.avatar.tooLarge'),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

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
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          disabled={isUploading}
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
      
      <p className="text-xs text-muted-foreground text-center">
        {t('app:profile.avatar.hint')}
      </p>
    </div>
  );
}
