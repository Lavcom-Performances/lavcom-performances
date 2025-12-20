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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ZoomIn, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Sun, Contrast, Palette, Droplets, Focus, Save, Trash2, Download, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const PRESETS_STORAGE_KEY = "avatar-filter-presets";

interface FilterPreset {
  id: string;
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpen: number;
  isDefault?: boolean;
}

// Default presets with translation keys
const DEFAULT_PRESETS: Omit<FilterPreset, "name">[] = [
  { id: "default_bw", brightness: 100, contrast: 110, saturation: 0, blur: 0, sharpen: 20, isDefault: true },
  { id: "default_vintage", brightness: 105, contrast: 90, saturation: 70, blur: 0.5, sharpen: 0, isDefault: true },
  { id: "default_hd", brightness: 100, contrast: 105, saturation: 105, blur: 0, sharpen: 50, isDefault: true },
  { id: "default_warm", brightness: 105, contrast: 100, saturation: 120, blur: 0, sharpen: 10, isDefault: true },
  { id: "default_soft", brightness: 105, contrast: 95, saturation: 90, blur: 1, sharpen: 0, isDefault: true },
  { id: "default_dramatic", brightness: 95, contrast: 130, saturation: 110, blur: 0, sharpen: 30, isDefault: true },
];

function loadPresets(): FilterPreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: FilterPreset[]) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// Apply sharpening using unsharp mask technique
function applySharpen(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount === 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const tempData = new Uint8ClampedArray(data);
  
  // Sharpen kernel: center = 1 + 4*amount, edges = -amount
  const factor = amount / 100;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const idxUp = ((y - 1) * width + x) * 4;
      const idxDown = ((y + 1) * width + x) * 4;
      const idxLeft = (y * width + (x - 1)) * 4;
      const idxRight = (y * width + (x + 1)) * 4;
      
      for (let c = 0; c < 3; c++) {
        const center = tempData[idx + c];
        const neighbors = tempData[idxUp + c] + tempData[idxDown + c] + tempData[idxLeft + c] + tempData[idxRight + c];
        const sharpened = center + factor * (4 * center - neighbors);
        data[idx + c] = Math.min(255, Math.max(0, sharpened));
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

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
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  
  // Presets state
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [newPresetName, setNewPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  
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
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

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

    // Reset transform before applying sharpen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applySharpen(ctx, previewSize, previewSize, sharpen);
  }, [completedCrop, rotate, flipH, flipV, brightness, contrast, saturation, blur, sharpen]);
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
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

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

      // Reset transform before applying sharpen
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      applySharpen(ctx, Math.round(outputSize * pixelRatio), Math.round(outputSize * pixelRatio), sharpen);

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
      setBlur(0);
      setSharpen(0);
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
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
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

            {/* Blur control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Droplets className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.blur")}</span>
              <Slider
                value={[blur]}
                onValueChange={(values) => setBlur(values[0])}
                min={0}
                max={10}
                step={0.5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{blur}px</span>
            </div>

            {/* Sharpen control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Focus className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.sharpen")}</span>
              <Slider
                value={[sharpen]}
                onValueChange={(values) => setSharpen(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{sharpen}%</span>
            </div>

            {/* Reset button */}
            {(scale !== 1 || rotate !== 0 || flipH || flipV || brightness !== 100 || contrast !== 100 || saturation !== 100 || blur !== 0 || sharpen !== 0) && (
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
                  setBlur(0);
                  setSharpen(0);
                  setSelectedPresetId("");
                }}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("app:profile.avatar.reset")}
              </Button>
            )}

            {/* Presets section */}
            <div className="border-t pt-3 mt-2 space-y-3">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t("app:profile.avatar.presets.title")}</span>
              
              {/* Default presets */}
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={selectedPresetId === preset.id ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setBrightness(preset.brightness);
                      setContrast(preset.contrast);
                      setSaturation(preset.saturation);
                      setBlur(preset.blur);
                      setSharpen(preset.sharpen);
                      setSelectedPresetId(preset.id);
                    }}
                  >
                    {t(`app:profile.avatar.presets.defaults.${preset.id}`)}
                  </Button>
                ))}
              </div>
              
              {/* Custom presets dropdown */}
              {presets.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedPresetId.startsWith("default_") ? "" : selectedPresetId}
                    onValueChange={(id) => {
                      const preset = presets.find(p => p.id === id);
                      if (preset) {
                        setBrightness(preset.brightness);
                        setContrast(preset.contrast);
                        setSaturation(preset.saturation);
                        setBlur(preset.blur);
                        setSharpen(preset.sharpen);
                        setSelectedPresetId(id);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("app:profile.avatar.presets.customPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPresetId && !selectedPresetId.startsWith("default_") && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        const updatedPresets = presets.filter(p => p.id !== selectedPresetId);
                        setPresets(updatedPresets);
                        savePresets(updatedPresets);
                        setSelectedPresetId("");
                        toast.success(t("app:profile.avatar.presets.deleteSuccess"));
                      }}
                      title={t("app:profile.avatar.presets.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Save new preset */}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder={t("app:profile.avatar.presets.namePlaceholder")}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={!newPresetName.trim()}
                  onClick={() => {
                    const newPreset: FilterPreset = {
                      id: Date.now().toString(),
                      name: newPresetName.trim(),
                      brightness,
                      contrast,
                      saturation,
                      blur,
                      sharpen,
                    };
                    const updatedPresets = [...presets, newPreset];
                    setPresets(updatedPresets);
                    savePresets(updatedPresets);
                    setNewPresetName("");
                    setSelectedPresetId(newPreset.id);
                    toast.success(t("app:profile.avatar.presets.saveSuccess"));
                  }}
                  title={t("app:profile.avatar.presets.save")}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>

              {/* Export/Import presets */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={presets.length === 0}
                  onClick={() => {
                    const dataStr = JSON.stringify(presets, null, 2);
                    const blob = new Blob([dataStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "avatar-presets.json";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(t("app:profile.avatar.presets.exportSuccess"));
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("app:profile.avatar.presets.export")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const imported = JSON.parse(event.target?.result as string) as FilterPreset[];
                          if (!Array.isArray(imported)) throw new Error("Invalid format");
                          // Validate and re-id imported presets
                          const validPresets = imported
                            .filter(p => p.name && typeof p.brightness === "number")
                            .map(p => ({
                              ...p,
                              id: `imported_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                              isDefault: false,
                            }));
                          const updatedPresets = [...presets, ...validPresets];
                          setPresets(updatedPresets);
                          savePresets(updatedPresets);
                          toast.success(t("app:profile.avatar.presets.importSuccess", { count: validPresets.length }));
                        } catch {
                          toast.error(t("app:profile.avatar.presets.importError"));
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("app:profile.avatar.presets.import")}
                </Button>
              </div>
            </div>
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