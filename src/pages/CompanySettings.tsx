import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Building2, 
  Upload, 
  Palette, 
  Save, 
  ArrowLeft,
  Home,
  X,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nafCodes, formatNafDisplay } from "@/data/nafCodes";
import { 
  isValidSiret, 
  formatSiretDisplay, 
  formatPhoneNumber, 
  formatPhoneDisplay 
} from "@/lib/textUtils";
import { SecurityChecklist } from "@/components/security/SecurityChecklist";

interface CompanyInfo {
  name: string;
  siret: string;
  nafCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string | null;
}

interface ThemeColors {
  primary: string;
  accent: string;
  sidebar: string;
}

const presetThemes = [
  { name: "Lavcom (Défaut)", primary: "#A3C615", accent: "#FCD259", sidebar: "#383838" },
  { name: "Bleu Océan", primary: "#0EA5E9", accent: "#38BDF8", sidebar: "#0C4A6E" },
  { name: "Violet Royal", primary: "#8B5CF6", accent: "#A78BFA", sidebar: "#4C1D95" },
  { name: "Rouge Passion", primary: "#EF4444", accent: "#FCA5A5", sidebar: "#7F1D1D" },
  { name: "Orange Énergie", primary: "#F97316", accent: "#FDBA74", sidebar: "#7C2D12" },
  { name: "Rose Moderne", primary: "#EC4899", accent: "#F9A8D4", sidebar: "#831843" },
];

export default function CompanySettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Ma Société de Laveries",
    siret: "",
    nafCode: "",
    address: "10 Rue de la Laverie, 75001 Paris",
    phone: "",
    email: "contact@masociete.fr",
    website: "www.masociete.fr",
    logoUrl: null,
  });

  const [siretError, setSiretError] = useState<string | null>(null);

  const [themeColors, setThemeColors] = useState<ThemeColors>({
    primary: "#A3C615",
    accent: "#FCD259",
    sidebar: "#383838",
  });

  const [selectedPreset, setSelectedPreset] = useState<string>("Lavcom (Défaut)");

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        toast({
          title: "Format non supporté",
          description: "Veuillez télécharger une image au format PNG ou JPG.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale autorisée est de 5 Mo.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyInfo(prev => ({ ...prev, logoUrl: reader.result as string }));
        toast({
          title: "Logo téléchargé",
          description: "Votre logo a été mis à jour avec succès.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyInfo(prev => ({ ...prev, logoUrl: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePresetSelect = (preset: typeof presetThemes[0]) => {
    setThemeColors({
      primary: preset.primary,
      accent: preset.accent,
      sidebar: preset.sidebar,
    });
    setSelectedPreset(preset.name);
  };

  // TAEX-064: SIRET validation on blur
  const handleSiretBlur = () => {
    const cleanedSiret = companyInfo.siret.replace(/\s/g, '');
    if (cleanedSiret && !isValidSiret(cleanedSiret)) {
      setSiretError("Le SIRET doit contenir exactement 14 chiffres");
    } else {
      setSiretError(null);
    }
  };

  // TAEX-067: Format phone on blur
  const handlePhoneBlur = () => {
    if (companyInfo.phone) {
      const formatted = formatPhoneNumber(companyInfo.phone);
      setCompanyInfo(prev => ({ ...prev, phone: formatted }));
    }
  };

  const handleSave = () => {
    // Validate SIRET before saving
    const cleanedSiret = companyInfo.siret.replace(/\s/g, '');
    if (cleanedSiret && !isValidSiret(cleanedSiret)) {
      toast({
        title: "Erreur de validation",
        description: "Le numéro SIRET n'est pas valide. Il doit contenir exactement 14 chiffres.",
        variant: "destructive",
      });
      return;
    }

    // TODO: Save to database/localStorage
    toast({
      title: "Paramètres sauvegardés",
      description: "Les paramètres de votre entreprise ont été mis à jour.",
    });
  };

  const applyTheme = () => {
    // Apply theme to CSS variables
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    root.style.setProperty("--primary", hexToHsl(themeColors.primary));
    root.style.setProperty("--sidebar-background", hexToHsl(themeColors.sidebar));
    root.style.setProperty("--accent", hexToHsl(themeColors.accent));

    toast({
      title: "Thème appliqué",
      description: "Les couleurs de votre entreprise ont été appliquées.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link 
              to="/" 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                Paramètres entreprise
              </h1>
              <p className="text-muted-foreground">
                Personnalisez votre espace Lavcom Performances
              </p>
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
        </div>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="identity" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Identité</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Thème</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-6">
            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Logo de l'entreprise
                </CardTitle>
                <CardDescription>
                  Téléchargez le logo de votre entreprise (PNG ou JPG, max 5 Mo)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* Logo Preview */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                      {companyInfo.logoUrl ? (
                        <img 
                          src={companyInfo.logoUrl} 
                          alt="Logo entreprise" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    {companyInfo.logoUrl && (
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".png,.jpg,.jpeg"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {companyInfo.logoUrl ? "Changer le logo" : "Télécharger un logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Formats acceptés : PNG, JPG
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informations de l'entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Raison sociale</Label>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={companyInfo.siret}
                    onChange={(e) => {
                      setSiretError(null);
                      setCompanyInfo(prev => ({ ...prev, siret: e.target.value }));
                    }}
                    onBlur={handleSiretBlur}
                    placeholder="123 456 789 00012"
                    maxLength={17}
                    className={`font-mono ${siretError ? 'border-destructive' : ''}`}
                  />
                  {siretError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {siretError}
                    </p>
                  )}
                </div>
                
                {/* TAEX-065: NAF dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="naf-code">Code NAF</Label>
                  <Select
                    value={companyInfo.nafCode}
                    onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, nafCode: value }))}
                  >
                    <SelectTrigger id="naf-code">
                      <SelectValue placeholder="Sélectionnez un code NAF" />
                    </SelectTrigger>
                    <SelectContent>
                      {nafCodes.map((naf) => (
                        <SelectItem key={naf.code} value={naf.code}>
                          {formatNafDisplay(naf.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formatPhoneDisplay(companyInfo.phone)}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                    onBlur={handlePhoneBlur}
                    placeholder="06 12 34 56 78"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format automatique : +33 X XX XX XX XX
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={companyInfo.website}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            {/* Preset Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Thèmes prédéfinis
                </CardTitle>
                <CardDescription>
                  Choisissez un thème parmi nos suggestions ou personnalisez les couleurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {presetThemes.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedPreset === preset.name 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex gap-2 mb-3">
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: preset.accent }}
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: preset.sidebar }}
                        />
                      </div>
                      <p className="text-sm font-medium">{preset.name}</p>
                      {selectedPreset === preset.name && (
                        <Check className="h-4 w-4 text-primary mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Couleurs personnalisées</CardTitle>
                <CardDescription>
                  Définissez les couleurs exactes de votre charte graphique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Couleur principale</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="primary-color"
                        value={themeColors.primary}
                        onChange={(e) => {
                          setThemeColors(prev => ({ ...prev, primary: e.target.value }));
                          setSelectedPreset("");
                        }}
                        className="w-12 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={themeColors.primary}
                        onChange={(e) => {
                          setThemeColors(prev => ({ ...prev, primary: e.target.value }));
                          setSelectedPreset("");
                        }}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Couleur d'accent</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="accent-color"
                        value={themeColors.accent}
                        onChange={(e) => {
                          setThemeColors(prev => ({ ...prev, accent: e.target.value }));
                          setSelectedPreset("");
                        }}
                        className="w-12 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={themeColors.accent}
                        onChange={(e) => {
                          setThemeColors(prev => ({ ...prev, accent: e.target.value }));
                          setSelectedPreset("");
                        }}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar-color">Couleur sidebar</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="sidebar-color"
                        value={themeColors.sidebar}
                        onChange={(e) => {
                          setThemeColors(prev => ({ ...prev, sidebar: e.target.value }));
                          setSelectedPreset("");
                        }}
                        className="w-12 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={themeColors.sidebar}
                        onChange={(e) => {
                          setThemeColors(prev => ({ ...prev, sidebar: e.target.value }));
                          setSelectedPreset("");
                        }}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground mb-3">Aperçu</p>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-24 rounded-lg"
                      style={{ backgroundColor: themeColors.sidebar }}
                    />
                    <div className="space-y-2">
                      <div 
                        className="h-8 w-32 rounded-md"
                        style={{ backgroundColor: themeColors.primary }}
                      />
                      <div 
                        className="h-4 w-24 rounded"
                        style={{ backgroundColor: themeColors.accent }}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={applyTheme} className="w-full sm:w-auto">
                  Appliquer le thème
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityChecklist variant="project" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
