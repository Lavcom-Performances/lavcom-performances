import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: AvatarCropDialogProps) {
  const { t } = useTranslation(["app", "common"]);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, 1));
    },
    []
  );

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const outputSize = 256;
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.imageSmoothingQuality = "high";

      // Calculate the source crop area
      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      // Handle rotation
      const rotateRads = (rotate * Math.PI) / 180;
      
      if (rotate !== 0) {
        // For rotation, we need to draw the full image rotated, then crop
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) throw new Error("Could not get temp canvas context");

        // Calculate rotated dimensions
        const cos = Math.abs(Math.cos(rotateRads));
        const sin = Math.abs(Math.sin(rotateRads));
        const rotatedWidth = image.naturalWidth * cos + image.naturalHeight * sin;
        const rotatedHeight = image.naturalWidth * sin + image.naturalHeight * cos;

        tempCanvas.width = rotatedWidth;
        tempCanvas.height = rotatedHeight;

        tempCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
        tempCtx.rotate(rotateRads);
        tempCtx.scale(scale, scale);
        tempCtx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
        tempCtx.drawImage(image, 0, 0);

        // Calculate adjusted crop position for rotation
        const offsetX = (rotatedWidth - image.naturalWidth) / 2;
        const offsetY = (rotatedHeight - image.naturalHeight) / 2;

        ctx.drawImage(
          tempCanvas,
          cropX + offsetX,
          cropY + offsetY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputSize,
          outputSize
        );
      } else {
        // Simple case: no rotation
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) throw new Error("Could not get temp canvas context");

        tempCanvas.width = image.naturalWidth * scale;
        tempCanvas.height = image.naturalHeight * scale;
        tempCtx.scale(scale, scale);
        tempCtx.drawImage(image, 0, 0);

        ctx.drawImage(
          tempCanvas,
          cropX * scale,
          cropY * scale,
          cropWidth * scale,
          cropHeight * scale,
          0,
          0,
          outputSize,
          outputSize
        );
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onOpenChange(false);
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.9
      );
    } catch (error) {
      console.error("Error cropping image:", error);
      setIsProcessing(false);
    }
  }, [completedCrop, rotate, scale, onCropComplete, onOpenChange]);

  const resetTransforms = useCallback(() => {
    setScale(1);
    setRotate(0);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScale(1);
      setRotate(0);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.avatar.cropTitle", "Recadrer l'avatar")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image cropper */}
          <div className="flex justify-center bg-muted/50 rounded-lg p-2 overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              className="max-h-64"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-64 w-auto"
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                }}
              />
            </ReactCrop>
          </div>

          {/* Zoom control */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ZoomIn className="h-4 w-4" />
              <span>Zoom</span>
              <span className="ml-auto">{Math.round(scale * 100)}%</span>
            </div>
            <Slider
              value={[scale]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={([v]) => setScale(v)}
            />
          </div>

          {/* Rotation control */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCw className="h-4 w-4" />
              <span>Rotation</span>
              <span className="ml-auto">{rotate}°</span>
            </div>
            <Slider
              value={[rotate]}
              min={-180}
              max={180}
              step={1}
              onValueChange={([v]) => setRotate(v)}
            />
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetTransforms}
            className="w-full"
          >
            {t("common:reset", "Réinitialiser")}
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:cancel", "Annuler")}
          </Button>
          <Button onClick={handleCropComplete} disabled={isProcessing || !completedCrop}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common:processing", "Traitement...")}
              </>
            ) : (
              t("common:save", "Enregistrer")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
