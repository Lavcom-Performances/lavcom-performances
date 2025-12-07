import { useState, useRef } from "react";
import { Upload, X, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CompanyLogoUploadProps {
  logo?: string | null;
  onLogoChange: (logo: string | null) => void;
  size?: "sm" | "md";
  className?: string;
}

export function CompanyLogoUpload({ 
  logo, 
  onLogoChange, 
  size = "sm",
  className 
}: CompanyLogoUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12"
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      toast.error("Format non supporté", {
        description: "Veuillez utiliser un fichier PNG ou JPG."
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", {
        description: "La taille maximale est de 2 Mo."
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onLogoChange(result);
      // Save to localStorage
      localStorage.setItem("company_logo", result);
      toast.success("Logo mis à jour");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLogoChange(null);
    localStorage.removeItem("company_logo");
    toast.success("Logo supprimé");
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={cn(
        "relative cursor-pointer group",
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {logo ? (
        <>
          <img 
            src={logo} 
            alt="Logo entreprise" 
            className={cn(
              "rounded-lg object-cover border border-sidebar-border",
              sizeClasses[size]
            )}
          />
          {isHovering && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <button
                onClick={handleRemoveLogo}
                className="p-1 bg-destructive rounded-full hover:bg-destructive/80 transition-colors"
              >
                <X className="h-3 w-3 text-destructive-foreground" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div 
          className={cn(
            "rounded-lg bg-sidebar-accent border border-dashed border-sidebar-border flex items-center justify-center transition-all",
            sizeClasses[size],
            isHovering && "border-primary bg-primary/10"
          )}
        >
          {isHovering ? (
            <Upload className="h-4 w-4 text-primary" />
          ) : (
            <Building2 className="h-4 w-4 text-sidebar-foreground/50" />
          )}
        </div>
      )}
    </div>
  );
}
