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
import { Loader2, ZoomIn, RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from "lucide-react";
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
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate preview whenever crop, scale, or rotate changes
  useEffect(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const previewSize = 80;
    canvas.width = previewSize;
    canvas.height = previewSize;

    ctx.imageSmoothingQuality = "high";

    // Clear canvas
    ctx.clearRect(0, 0, previewSize, previewSize);

    // Apply rotation
    const rotateRads = (rotate * Math.PI) / 180;
    const centerX = previewSize / 2;
    const centerY = previewSize / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(rotateRads);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      previewSize,
      previewSize
    );
  }, [completedCrop, rotate, flipH, flipV]);
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const pixelRatio = window.devicePixelRatio || 1;
      const outputSize = 256;

      canvas.width = outputSize * pixelRatio;
      canvas.height = outputSize * pixelRatio;

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = "high";

      // Apply rotation
      const rotateRads = (rotate * Math.PI) / 180;
      const centerX = outputSize / 2;
      const centerY = outputSize / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate(rotateRads);
      if (flipH) ctx.scale(-1, 1);
      if (flipV) ctx.scale(1, -1);
      ctx.translate(-centerX, -centerY);

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        outputSize,
        outputSize
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.9
      );
    } catch (error) {
      console.error("Crop error:", error);
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset values when closing
      setScale(1);
      setRotate(0);
      setFlipH(false);
      setFlipV(false);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("app:profile.avatar.cropTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1 flex justify-center py-2">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-h-[300px]"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[300px] max-w-full"
                style={{
                    transform: `scale(${scale}) rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transformOrigin: "center",
                  }}
                />
              </ReactCrop>
            </div>
            
            {completedCrop && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("app:profile.avatar.preview")}</span>
                <canvas
                  ref={previewCanvasRef}
                  className="rounded-full border-2 border-primary/20"
                  style={{ width: 80, height: 80 }}
                />
              </div>
            )}
          </div>
          <div className="space-y-4 px-2">
            <div className="flex items-center gap-3">
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-16">{t("app:profile.avatar.zoom")}</span>
              <Slider
                value={[scale]}
                onValueChange={(values) => setScale(values[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">{Math.round(scale * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-16">{t("app:profile.avatar.rotate")}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRotate((prev) => Math.max(-180, prev - 90))}
                  title={t("app:profile.avatar.rotateLeft")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Slider
                  value={[rotate]}
                  onValueChange={(values) => setRotate(values[0])}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1 min-w-[100px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRotate((prev) => Math.min(180, prev + 90))}
                  title={t("app:profile.avatar.rotateRight")}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">{rotate}°</span>
            </div>

            <div className="flex items-center gap-3">
              <FlipHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-16">{t("app:profile.avatar.flip")}</span>
              <div className="flex gap-2 flex-1">
                <Button
                  type="button"
                  variant={flipH ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlipH((prev) => !prev)}
                  className="flex-1"
                >
                  <FlipHorizontal className="h-4 w-4 mr-2" />
                  {t("app:profile.avatar.flipHorizontal")}
                </Button>
                <Button
                  type="button"
                  variant={flipV ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlipV((prev) => !prev)}
                  className="flex-1"
                >
                  <FlipVertical className="h-4 w-4 mr-2" />
                  {t("app:profile.avatar.flipVertical")}
                </Button>
              </div>
            </div>

            {(scale !== 1 || rotate !== 0 || flipH || flipV) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScale(1);
                  setRotate(0);
                  setFlipH(false);
                  setFlipV(false);
                }}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("app:profile.avatar.reset")}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleCropComplete}
            disabled={isProcessing || !completedCrop}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("app:profile.avatar.cropping")}
              </>
            ) : (
              t("app:profile.avatar.cropConfirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}