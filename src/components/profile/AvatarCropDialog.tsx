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
import { Loader2, ZoomIn, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Sun, Contrast, Palette } from "lucide-react";
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
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
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

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

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
  }, [completedCrop, rotate, flipH, flipV, brightness, contrast, saturation]);
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

      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

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
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{t("app:profile.avatar.cropTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Image and preview - stack on mobile, side by side on desktop */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
            <div className="flex-1 flex justify-center py-2 w-full">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-h-[200px] sm:max-h-[300px]"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[200px] sm:max-h-[300px] max-w-full"
                  style={{
                    transform: `scale(${scale}) rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transformOrigin: "center",
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                  }}
                />
              </ReactCrop>
            </div>
            
            {completedCrop && (
              <div className="flex flex-row sm:flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("app:profile.avatar.preview")}</span>
                <canvas
                  ref={previewCanvasRef}
                  className="rounded-full border-2 border-primary/20"
                  style={{ width: 60, height: 60 }}
                />
              </div>
            )}
          </div>

          {/* Controls section */}
          <div className="space-y-3 sm:space-y-4 px-1 sm:px-2">
            {/* Zoom control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.zoom")}</span>
              <Slider
                value={[scale]}
                onValueChange={(values) => setScale(values[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{Math.round(scale * 100)}%</span>
            </div>

            {/* Rotation control - simplified on mobile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.rotate")}</span>
              <div className="flex items-center gap-1 sm:gap-2 flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
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
                  className="flex-1 min-w-[60px] sm:min-w-[100px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setRotate((prev) => Math.min(180, prev + 90))}
                  title={t("app:profile.avatar.rotateRight")}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{rotate}°</span>
            </div>

            {/* Flip controls - icon-only on mobile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <FlipHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.flip")}</span>
              <div className="flex gap-2 flex-1">
                <Button
                  type="button"
                  variant={flipH ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlipH((prev) => !prev)}
                  className="flex-1 px-2 sm:px-3"
                >
                  <FlipHorizontal className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("app:profile.avatar.flipHorizontal")}</span>
                </Button>
                <Button
                  type="button"
                  variant={flipV ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlipV((prev) => !prev)}
                  className="flex-1 px-2 sm:px-3"
                >
                  <FlipVertical className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("app:profile.avatar.flipVertical")}</span>
                </Button>
              </div>
            </div>

            {/* Brightness control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Sun className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.brightness")}</span>
              <Slider
                value={[brightness]}
                onValueChange={(values) => setBrightness(values[0])}
                min={50}
                max={150}
                step={1}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{brightness}%</span>
            </div>

            {/* Contrast control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Contrast className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.contrast")}</span>
              <Slider
                value={[contrast]}
                onValueChange={(values) => setContrast(values[0])}
                min={50}
                max={150}
                step={1}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{contrast}%</span>
            </div>

            {/* Saturation control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.saturation")}</span>
              <Slider
                value={[saturation]}
                onValueChange={(values) => setSaturation(values[0])}
                min={0}
                max={200}
                step={1}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{saturation}%</span>
            </div>

            {/* Reset button */}
            {(scale !== 1 || rotate !== 0 || flipH || flipV || brightness !== 100 || contrast !== 100 || saturation !== 100) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScale(1);
                  setRotate(0);
                  setFlipH(false);
                  setFlipV(false);
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                }}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("app:profile.avatar.reset")}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleCropComplete}
            disabled={isProcessing || !completedCrop}
            className="w-full sm:w-auto"
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