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
import { Loader2, ZoomIn, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Sun, Contrast, Palette, Droplets, Focus, Save, Trash2, Download, Upload, Sunset, CircleOff, CircleDot, Rainbow, Eye, Circle, Layers, Thermometer, Square, RectangleVertical, RectangleHorizontal, Maximize, SunDim, Moon, TrendingUp, ChevronDown, ChevronUp, Sparkles, ScanFace } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CurveEditor, CurvePoint, DEFAULT_CURVE_POINTS, computeCurveLUT } from "./CurveEditor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PRESETS_STORAGE_KEY = "avatar-filter-presets";

interface FilterPreset {
  id: string;
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpen: number;
  sepia: number;
  invert: number;
  grayscale: number;
  hueRotate: number;
  opacity: number;
  vignette: number;
  dropShadow: number;
  temperature: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  curvePoints?: CurvePoint[];
  isDefault?: boolean;
  outputFormat?: "square" | "portrait" | "landscape" | "free";
}

// Default presets with translation keys
const DEFAULT_PRESETS: Omit<FilterPreset, "name">[] = [
  { id: "default_bw", brightness: 100, contrast: 110, saturation: 0, blur: 0, sharpen: 20, sepia: 0, invert: 0, grayscale: 100, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 0, shadows: 0, vibrance: 0, isDefault: true },
  { id: "default_vintage", brightness: 105, contrast: 90, saturation: 70, blur: 0.5, sharpen: 0, sepia: 40, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 30, dropShadow: 0, temperature: 20, highlights: -10, shadows: 20, vibrance: 0, isDefault: true },
  { id: "default_hd", brightness: 100, contrast: 105, saturation: 105, blur: 0, sharpen: 50, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 20, shadows: -20, vibrance: 30, isDefault: true },
  { id: "default_warm", brightness: 105, contrast: 100, saturation: 120, blur: 0, sharpen: 10, sepia: 15, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 40, highlights: 0, shadows: 0, vibrance: 20, isDefault: true },
  { id: "default_soft", brightness: 105, contrast: 95, saturation: 90, blur: 1, sharpen: 0, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 15, shadows: 15, vibrance: 0, isDefault: true },
  { id: "default_dramatic", brightness: 95, contrast: 130, saturation: 110, blur: 0, sharpen: 30, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 50, dropShadow: 0, temperature: 0, highlights: -30, shadows: -30, vibrance: 40, isDefault: true },
  { id: "default_sepia", brightness: 100, contrast: 100, saturation: 100, blur: 0, sharpen: 0, sepia: 100, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 0, shadows: 0, vibrance: 0, isDefault: true },
  { id: "default_negative", brightness: 100, contrast: 100, saturation: 100, blur: 0, sharpen: 0, sepia: 0, invert: 100, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 0, shadows: 0, vibrance: 0, isDefault: true },
  { id: "default_psychedelic", brightness: 100, contrast: 110, saturation: 150, blur: 0, sharpen: 0, sepia: 0, invert: 0, grayscale: 0, hueRotate: 180, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 0, shadows: 0, vibrance: 50, isDefault: true },
  { id: "default_ghost", brightness: 110, contrast: 90, saturation: 80, blur: 0, sharpen: 0, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 50, vignette: 0, dropShadow: 0, temperature: 0, highlights: 30, shadows: 30, vibrance: 0, isDefault: true },
  { id: "default_cinematic", brightness: 95, contrast: 115, saturation: 90, blur: 0, sharpen: 10, sepia: 10, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 60, dropShadow: 0, temperature: 10, highlights: -20, shadows: 10, vibrance: 25, isDefault: true },
  { id: "default_floating", brightness: 100, contrast: 100, saturation: 100, blur: 0, sharpen: 0, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 80, temperature: 0, highlights: 0, shadows: 0, vibrance: 0, isDefault: true },
  { id: "default_cold", brightness: 100, contrast: 105, saturation: 90, blur: 0, sharpen: 0, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: -50, highlights: 10, shadows: -10, vibrance: 0, isDefault: true },
  { id: "default_sunset", brightness: 105, contrast: 100, saturation: 130, blur: 0, sharpen: 0, sepia: 10, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 20, dropShadow: 0, temperature: 60, highlights: 0, shadows: 0, vibrance: 30, isDefault: true },
  { id: "default_vibrant", brightness: 100, contrast: 105, saturation: 100, blur: 0, sharpen: 10, sepia: 0, invert: 0, grayscale: 0, hueRotate: 0, opacity: 100, vignette: 0, dropShadow: 0, temperature: 0, highlights: 0, shadows: 0, vibrance: 70, isDefault: true },
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

// Apply vignette effect (dark edges)
function applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount === 0) return;
  
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2;
  
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
  gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${amount * 0.002})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${amount * 0.01})`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// Apply drop shadow effect
function applyDropShadow(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount === 0) return;
  
  // Get the current image data
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Create a temporary canvas for the shadow
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  // Draw the shadow
  const shadowOffset = Math.max(2, amount / 10);
  const shadowBlur = amount / 5;
  
  tempCtx.shadowColor = `rgba(0, 0, 0, ${Math.min(0.8, amount / 100)})`;
  tempCtx.shadowBlur = shadowBlur;
  tempCtx.shadowOffsetX = shadowOffset;
  tempCtx.shadowOffsetY = shadowOffset;
  
  // Create a circular clip path for the shadow
  tempCtx.beginPath();
  tempCtx.arc(width / 2, height / 2, Math.min(width, height) / 2 - shadowOffset, 0, Math.PI * 2);
  tempCtx.closePath();
  tempCtx.fill();
  
  // Restore the original image
  ctx.putImageData(imageData, 0, 0);
  
  // Draw the shadow under the original image
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

// Apply color temperature adjustment (-100 = cold/blue, +100 = warm/orange)
function applyTemperature(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount === 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Normalize amount to a usable range
  const factor = amount / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    if (amount > 0) {
      // Warm: increase red, decrease blue
      data[i] = Math.min(255, data[i] + factor * 30); // Red
      data[i + 2] = Math.max(0, data[i + 2] - factor * 20); // Blue
    } else {
      // Cold: decrease red, increase blue
      data[i] = Math.max(0, data[i] + factor * 20); // Red (factor is negative)
      data[i + 2] = Math.min(255, data[i + 2] - factor * 30); // Blue
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Apply highlights and shadows adjustment
// Highlights: adjusts bright areas (-100 to +100)
// Shadows: adjusts dark areas (-100 to +100)
function applyClarity(ctx: CanvasRenderingContext2D, width: number, height: number, highlights: number, shadows: number) {
  if (highlights === 0 && shadows === 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const highlightsFactor = highlights / 100;
  const shadowsFactor = shadows / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    // Calculate luminance (brightness) of the pixel
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    
    // Apply highlights to bright areas (luminance > 0.5)
    // Apply shadows to dark areas (luminance < 0.5)
    let adjustment = 0;
    
    if (luminance > 0.5) {
      // Highlights: more effect on brighter pixels
      const highlightStrength = (luminance - 0.5) * 2; // 0 to 1
      adjustment = highlightsFactor * highlightStrength * 50;
    } else {
      // Shadows: more effect on darker pixels
      const shadowStrength = (0.5 - luminance) * 2; // 0 to 1
      adjustment = shadowsFactor * shadowStrength * 50;
    }
    
    data[i] = Math.min(255, Math.max(0, r + adjustment));
    data[i + 1] = Math.min(255, Math.max(0, g + adjustment));
    data[i + 2] = Math.min(255, Math.max(0, b + adjustment));
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Apply vibrance - intelligent saturation that preserves skin tones
// Vibrance boosts less saturated colors more than already saturated ones
// and specifically protects skin tone hues (orange/red range)
function applyVibrance(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount === 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const factor = amount / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate max and min for saturation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    // Current saturation (0-1)
    const saturation = max === 0 ? 0 : delta / max;
    
    // Calculate hue to detect skin tones (roughly 0-50 degrees in HSV)
    let hue = 0;
    if (delta !== 0) {
      if (max === r) {
        hue = ((g - b) / delta) % 6;
      } else if (max === g) {
        hue = (b - r) / delta + 2;
      } else {
        hue = (r - g) / delta + 4;
      }
      hue = hue * 60;
      if (hue < 0) hue += 360;
    }
    
    // Skin tone protection: reduce effect for hues in the orange/red range (roughly 0-50 degrees)
    // This preserves natural skin tones
    let skinProtection = 1;
    if ((hue >= 0 && hue <= 50) || hue >= 340) {
      // In skin tone range, reduce the effect
      skinProtection = 0.3;
    }
    
    // The less saturated a pixel is, the more we boost it
    // This prevents already vibrant colors from becoming oversaturated
    const saturationMultiplier = 1 - saturation;
    
    // Calculate the adjustment amount
    const adjustment = factor * saturationMultiplier * skinProtection;
    
    // Apply vibrance by moving each channel away from the average
    const avg = (r + g + b) / 3;
    
    data[i] = Math.min(255, Math.max(0, r + (r - avg) * adjustment));
    data[i + 1] = Math.min(255, Math.max(0, g + (g - avg) * adjustment));
    data[i + 2] = Math.min(255, Math.max(0, b + (b - avg) * adjustment));
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Apply curves adjustment using lookup table
function applyCurves(ctx: CanvasRenderingContext2D, width: number, height: number, curvePoints: CurvePoint[]) {
  // Check if curve is default (no adjustment needed)
  if (curvePoints.length === 2 && 
      curvePoints[0].x === 0 && curvePoints[0].y === 0 && 
      curvePoints[1].x === 255 && curvePoints[1].y === 255) {
    return;
  }
  
  const lut = computeCurveLUT(curvePoints);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];         // Red
    data[i + 1] = lut[data[i + 1]]; // Green
    data[i + 2] = lut[data[i + 2]]; // Blue
    // Alpha unchanged
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

type OutputFormat = "square" | "portrait" | "landscape" | "free";

const OUTPUT_FORMATS: { id: OutputFormat; aspect: number | undefined; width: number; height: number }[] = [
  { id: "square", aspect: 1, width: 256, height: 256 },
  { id: "portrait", aspect: 3 / 4, width: 192, height: 256 },
  { id: "landscape", aspect: 4 / 3, width: 256, height: 192 },
  { id: "free", aspect: undefined, width: 256, height: 256 },
];

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
  const [sepia, setSepia] = useState(0);
  const [invert, setInvert] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [hueRotate, setHueRotate] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [vignette, setVignette] = useState(0);
  const [dropShadow, setDropShadow] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [vibrance, setVibrance] = useState(0);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([...DEFAULT_CURVE_POINTS]);
  const [curvesOpen, setCurvesOpen] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("square");
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  
  // Presets state
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [newPresetName, setNewPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Face detection function using native FaceDetector API or fallback
  const detectAndCenterFace = useCallback(async () => {
    if (!imgRef.current) return;
    
    setIsDetectingFace(true);
    
    try {
      const image = imgRef.current;
      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;
      const displayWidth = image.width;
      const displayHeight = image.height;
      
      // Check if FaceDetector API is available (Chrome)
      if ('FaceDetector' in window) {
        try {
          // @ts-ignore - FaceDetector is not in TypeScript types
          const faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await faceDetector.detect(image);
          
          if (faces.length > 0) {
            const face = faces[0].boundingBox;
            
            // Calculate face center in natural image coordinates
            const faceCenterX = face.x + face.width / 2;
            const faceCenterY = face.y + face.height / 2;
            
            // Expand bounding box to include some margin around face (1.8x for avatar framing)
            const expandedSize = Math.max(face.width, face.height) * 1.8;
            
            // Get current aspect ratio
            const format = OUTPUT_FORMATS.find(f => f.id === outputFormat) || OUTPUT_FORMATS[0];
            const aspect = format.aspect || 1;
            
            // Calculate crop dimensions in natural coordinates
            let cropWidth: number;
            let cropHeight: number;
            
            if (aspect >= 1) {
              cropWidth = expandedSize;
              cropHeight = expandedSize / aspect;
            } else {
              cropHeight = expandedSize;
              cropWidth = expandedSize * aspect;
            }
            
            // Center the crop on the face
            let cropX = faceCenterX - cropWidth / 2;
            let cropY = faceCenterY - cropHeight / 2;
            
            // Clamp to image bounds
            cropX = Math.max(0, Math.min(imageWidth - cropWidth, cropX));
            cropY = Math.max(0, Math.min(imageHeight - cropHeight, cropY));
            
            // Adjust size if it exceeds bounds
            cropWidth = Math.min(cropWidth, imageWidth);
            cropHeight = Math.min(cropHeight, imageHeight);
            
            // Convert to percentage of display size
            const scaleX = displayWidth / imageWidth;
            const scaleY = displayHeight / imageHeight;
            
            const newCrop: Crop = {
              unit: '%',
              x: (cropX / imageWidth) * 100,
              y: (cropY / imageHeight) * 100,
              width: (cropWidth / imageWidth) * 100,
              height: (cropHeight / imageHeight) * 100,
            };
            
            setCrop(newCrop);
            toast.success(t("app:profile.avatar.faceDetected"));
            return;
          }
        } catch (apiError) {
          console.log("FaceDetector API failed, using fallback", apiError);
        }
      }
      
      // Fallback: center crop with slight upward bias (faces are usually in upper-center)
      const format = OUTPUT_FORMATS.find(f => f.id === outputFormat) || OUTPUT_FORMATS[0];
      const aspect = format.aspect || 1;
      
      // Calculate a centered crop with upward bias
      const cropSize = 70; // 70% of the image
      let cropWidth: number;
      let cropHeight: number;
      
      if (aspect >= 1) {
        cropWidth = cropSize;
        cropHeight = cropSize / aspect;
      } else {
        cropHeight = cropSize;
        cropWidth = cropSize * aspect;
      }
      
      // Center horizontally, bias upward vertically
      const cropX = (100 - cropWidth) / 2;
      const cropY = Math.max(5, (100 - cropHeight) / 2 - 10); // 10% upward bias
      
      const newCrop: Crop = {
        unit: '%',
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      };
      
      setCrop(newCrop);
      toast.info(t("app:profile.avatar.faceNotDetected"));
      
    } catch (error) {
      console.error("Face detection error:", error);
      toast.error(t("app:profile.avatar.faceDetectionError"));
    } finally {
      setIsDetectingFace(false);
    }
  }, [outputFormat, t]);

  // Generate preview whenever crop, scale, or rotate changes
  useEffect(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const format = OUTPUT_FORMATS.find(f => f.id === outputFormat) || OUTPUT_FORMATS[0];
    const previewWidth = 80;
    // For free format, calculate height based on actual crop ratio
    const cropAspect = completedCrop.width / completedCrop.height;
    const previewHeight = format.aspect 
      ? Math.round(previewWidth / format.aspect)
      : Math.round(previewWidth / cropAspect);
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    ctx.imageSmoothingQuality = "high";

    // Clear canvas
    ctx.clearRect(0, 0, previewWidth, previewHeight);

    // Apply rotation
    const rotateRads = (rotate * Math.PI) / 180;
    const centerX = previewWidth / 2;
    const centerY = previewHeight / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(rotateRads);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.translate(-centerX, -centerY);

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) invert(${invert}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) opacity(${opacity}%)`;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      previewWidth,
      previewHeight
    );

    // Reset transform before applying post-processing effects
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applySharpen(ctx, previewWidth, previewHeight, sharpen);
    applyTemperature(ctx, previewWidth, previewHeight, temperature);
    applyClarity(ctx, previewWidth, previewHeight, highlights, shadows);
    applyVibrance(ctx, previewWidth, previewHeight, vibrance);
    applyCurves(ctx, previewWidth, previewHeight, curvePoints);
    applyVignette(ctx, previewWidth, previewHeight, vignette);
    applyDropShadow(ctx, previewWidth, previewHeight, dropShadow);
  }, [completedCrop, rotate, flipH, flipV, brightness, contrast, saturation, blur, sharpen, sepia, invert, grayscale, hueRotate, opacity, vignette, dropShadow, temperature, highlights, shadows, vibrance, curvePoints, outputFormat]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const format = OUTPUT_FORMATS.find(f => f.id === outputFormat) || OUTPUT_FORMATS[0];
    if (format.aspect) {
      setCrop(centerAspectCrop(width, height, format.aspect));
    } else {
      // Free crop: start with a centered 90% crop
      setCrop({
        unit: "%",
        x: 5,
        y: 5,
        width: 90,
        height: 90,
      });
    }
  }, [outputFormat]);

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
      const format = OUTPUT_FORMATS.find(f => f.id === outputFormat) || OUTPUT_FORMATS[0];
      
      // For free format, use the actual crop dimensions (max 256px)
      let outputWidth: number;
      let outputHeight: number;
      
      if (format.aspect) {
        outputWidth = format.width;
        outputHeight = format.height;
      } else {
        const cropAspect = completedCrop.width / completedCrop.height;
        const maxSize = 256;
        if (cropAspect >= 1) {
          outputWidth = maxSize;
          outputHeight = Math.round(maxSize / cropAspect);
        } else {
          outputHeight = maxSize;
          outputWidth = Math.round(maxSize * cropAspect);
        }
      }

      canvas.width = outputWidth * pixelRatio;
      canvas.height = outputHeight * pixelRatio;

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = "high";

      // Apply rotation
      const rotateRads = (rotate * Math.PI) / 180;
      const centerX = outputWidth / 2;
      const centerY = outputHeight / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate(rotateRads);
      if (flipH) ctx.scale(-1, 1);
      if (flipV) ctx.scale(1, -1);
      ctx.translate(-centerX, -centerY);

      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) invert(${invert}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) opacity(${opacity}%)`;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
      );

      // Reset transform before applying post-processing effects
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      applySharpen(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), sharpen);
      applyTemperature(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), temperature);
      applyClarity(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), highlights, shadows);
      applyVibrance(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), vibrance);
      applyCurves(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), curvePoints);
      applyVignette(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), vignette);
      applyDropShadow(ctx, Math.round(outputWidth * pixelRatio), Math.round(outputHeight * pixelRatio), dropShadow);

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
      setSepia(0);
      setInvert(0);
      setGrayscale(0);
      setHueRotate(0);
      setOpacity(100);
      setVignette(0);
      setDropShadow(0);
      setTemperature(0);
      setHighlights(0);
      setShadows(0);
      setVibrance(0);
      setCurvePoints([...DEFAULT_CURVE_POINTS]);
      setOutputFormat("square");
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
                aspect={OUTPUT_FORMATS.find(f => f.id === outputFormat)?.aspect}
                circularCrop={outputFormat === "square"}
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
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) invert(${invert}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) opacity(${opacity}%)`,
                  }}
                />
              </ReactCrop>
            </div>
            
            {completedCrop && (
              <div className="flex flex-row sm:flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("app:profile.avatar.preview")}</span>
                <canvas
                  ref={previewCanvasRef}
                  className={`border-2 border-primary/20 ${outputFormat === "square" ? "rounded-full" : "rounded-lg"}`}
                  style={{ 
                    width: 60, 
                    height: outputFormat === "square" ? 60 : outputFormat === "portrait" ? 80 : outputFormat === "landscape" ? 45 : 60
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls section */}
          <div className="space-y-3 sm:space-y-4 px-1 sm:px-2">
            {/* Output format selector */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.outputFormat")}</span>
              <div className="flex gap-2 flex-1">
                <Button
                  type="button"
                  variant={outputFormat === "square" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOutputFormat("square");
                    if (imgRef.current) {
                      const { width, height } = imgRef.current;
                      setCrop(centerAspectCrop(width, height, 1));
                    }
                  }}
                  className="flex-1 px-2 sm:px-3"
                  title={t("app:profile.avatar.formats.square")}
                >
                  <Square className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("app:profile.avatar.formats.square")}</span>
                </Button>
                <Button
                  type="button"
                  variant={outputFormat === "portrait" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOutputFormat("portrait");
                    if (imgRef.current) {
                      const { width, height } = imgRef.current;
                      setCrop(centerAspectCrop(width, height, 3 / 4));
                    }
                  }}
                  className="flex-1 px-2 sm:px-3"
                  title={t("app:profile.avatar.formats.portrait")}
                >
                  <RectangleVertical className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("app:profile.avatar.formats.portrait")}</span>
                </Button>
                <Button
                  type="button"
                  variant={outputFormat === "landscape" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOutputFormat("landscape");
                    if (imgRef.current) {
                      const { width, height } = imgRef.current;
                      setCrop(centerAspectCrop(width, height, 4 / 3));
                    }
                  }}
                  className="flex-1 px-2 sm:px-3"
                  title={t("app:profile.avatar.formats.landscape")}
                >
                  <RectangleHorizontal className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("app:profile.avatar.formats.landscape")}</span>
                </Button>
                <Button
                  type="button"
                  variant={outputFormat === "free" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOutputFormat("free");
                    if (imgRef.current) {
                      const { width, height } = imgRef.current;
                      setCrop({
                        unit: "%",
                        x: 5,
                        y: 5,
                        width: 90,
                        height: 90,
                      });
                    }
                  }}
                  className="flex-1 px-2 sm:px-3"
                  title={t("app:profile.avatar.formats.free")}
                >
                  <Maximize className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("app:profile.avatar.formats.free")}</span>
                </Button>
              </div>
              {/* Face detection button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectAndCenterFace}
                disabled={isDetectingFace}
                className="px-2 sm:px-3"
                title={t("app:profile.avatar.detectFace")}
              >
                {isDetectingFace ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                ) : (
                  <ScanFace className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">{t("app:profile.avatar.detectFace")}</span>
              </Button>
            </div>

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

            {/* Rotation presets */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="w-4 shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.rotatePresets")}</span>
              <div className="flex flex-wrap gap-1 sm:gap-2 flex-1">
                {[-45, -30, -15, 0, 15, 30, 45].map((angle) => (
                  <Button
                    key={angle}
                    type="button"
                    variant={rotate === angle ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setRotate(angle)}
                  >
                    {angle > 0 ? '+' : ''}{angle}°
                  </Button>
                ))}
              </div>
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

            {/* Sepia control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Sunset className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.sepia")}</span>
              <Slider
                value={[sepia]}
                onValueChange={(values) => setSepia(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{sepia}%</span>
            </div>

            {/* Invert control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <CircleOff className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.invert")}</span>
              <Slider
                value={[invert]}
                onValueChange={(values) => setInvert(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{invert}%</span>
            </div>

            {/* Grayscale control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.grayscale")}</span>
              <Slider
                value={[grayscale]}
                onValueChange={(values) => setGrayscale(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{grayscale}%</span>
            </div>

            {/* Hue-rotate control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Rainbow className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.hueRotate")}</span>
              <Slider
                value={[hueRotate]}
                onValueChange={(values) => setHueRotate(values[0])}
                min={0}
                max={360}
                step={10}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{hueRotate}°</span>
            </div>

            {/* Opacity control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.opacity")}</span>
              <Slider
                value={[opacity]}
                onValueChange={(values) => setOpacity(values[0])}
                min={10}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{opacity}%</span>
            </div>

            {/* Vignette control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.vignette")}</span>
              <Slider
                value={[vignette]}
                onValueChange={(values) => setVignette(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{vignette}%</span>
            </div>

            {/* Drop shadow control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.dropShadow")}</span>
              <Slider
                value={[dropShadow]}
                onValueChange={(values) => setDropShadow(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{dropShadow}%</span>
            </div>

            {/* Temperature control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Thermometer className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.temperature")}</span>
              <Slider
                value={[temperature]}
                onValueChange={(values) => setTemperature(values[0])}
                min={-100}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{temperature > 0 ? '+' : ''}{temperature}</span>
            </div>

            {/* Highlights control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <SunDim className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.highlights")}</span>
              <Slider
                value={[highlights]}
                onValueChange={(values) => setHighlights(values[0])}
                min={-100}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{highlights > 0 ? '+' : ''}{highlights}</span>
            </div>

            {/* Shadows control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.shadows")}</span>
              <Slider
                value={[shadows]}
                onValueChange={(values) => setShadows(values[0])}
                min={-100}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{shadows > 0 ? '+' : ''}{shadows}</span>
            </div>

            {/* Vibrance control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 hidden sm:inline">{t("app:profile.avatar.vibrance")}</span>
              <Slider
                value={[vibrance]}
                onValueChange={(values) => setVibrance(values[0])}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">{vibrance}%</span>
            </div>

            {/* Curves editor */}
            <Collapsible open={curvesOpen} onOpenChange={setCurvesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>{t("app:profile.avatar.curves")}</span>
                    {(curvePoints.length !== 2 || curvePoints[0].y !== 0 || curvePoints[1].y !== 255) && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  {curvesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="flex justify-center">
                  <CurveEditor
                    points={curvePoints}
                    onChange={setCurvePoints}
                    width={200}
                    height={200}
                    label={t("app:profile.avatar.curvesLabel")}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Reset button */}
            {(scale !== 1 || rotate !== 0 || flipH || flipV || brightness !== 100 || contrast !== 100 || saturation !== 100 || blur !== 0 || sharpen !== 0 || sepia !== 0 || invert !== 0 || grayscale !== 0 || hueRotate !== 0 || opacity !== 100 || vignette !== 0 || dropShadow !== 0 || temperature !== 0 || highlights !== 0 || shadows !== 0 || vibrance !== 0 || curvePoints.length !== 2 || curvePoints[0].y !== 0 || curvePoints[1].y !== 255 || outputFormat !== "square") && (
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
                  setSepia(0);
                  setInvert(0);
                  setGrayscale(0);
                  setHueRotate(0);
                  setOpacity(100);
                  setVignette(0);
                  setDropShadow(0);
                  setTemperature(0);
                  setHighlights(0);
                  setShadows(0);
                  setVibrance(0);
                  setCurvePoints([...DEFAULT_CURVE_POINTS]);
                  setOutputFormat("square");
                  if (imgRef.current) {
                    const { width, height } = imgRef.current;
                    setCrop(centerAspectCrop(width, height, 1));
                  }
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
                      setSepia(preset.sepia);
                      setInvert(preset.invert);
                      setGrayscale(preset.grayscale);
                      setHueRotate(preset.hueRotate);
                      setOpacity(preset.opacity);
                      setVignette(preset.vignette);
                      setDropShadow(preset.dropShadow);
                      setTemperature(preset.temperature);
                      setHighlights(preset.highlights);
                      setShadows(preset.shadows);
                      setVibrance(preset.vibrance);
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
                        setSepia(preset.sepia ?? 0);
                        setInvert(preset.invert ?? 0);
                        setGrayscale(preset.grayscale ?? 0);
                        setHueRotate(preset.hueRotate ?? 0);
                        setOpacity(preset.opacity ?? 100);
                        setVignette(preset.vignette ?? 0);
                        setDropShadow(preset.dropShadow ?? 0);
                        setTemperature(preset.temperature ?? 0);
                        setHighlights(preset.highlights ?? 0);
                        setShadows(preset.shadows ?? 0);
                        setVibrance(preset.vibrance ?? 0);
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
                      sepia,
                      invert,
                      grayscale,
                      hueRotate,
                      opacity,
                      vignette,
                      dropShadow,
                      temperature,
                      highlights,
                      shadows,
                      vibrance,
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

              {/* Delete all custom presets */}
              {presets.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm(t("app:profile.avatar.presets.deleteAllConfirm"))) {
                      setPresets([]);
                      savePresets([]);
                      setSelectedPresetId("");
                      toast.success(t("app:profile.avatar.presets.deleteAllSuccess"));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("app:profile.avatar.presets.deleteAll")}
                </Button>
              )}
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