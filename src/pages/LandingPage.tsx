import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import pdfMockupPreview from "@/assets/pdf-mockup-preview.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart3, 
  TrendingUp, 
  Bell, 
  LineChart, 
  Shield, 
  Zap, 
  Clock, 
  PieChart,
  ArrowRight,
  CheckCircle2,
  Play,
  Quote,
  Star,
  Send,
  Mail,
  User,
  MessageSquare,
  Loader2,
  Calculator,
  Rocket,
  Building2,
  ChevronDown,
  FileText,
  Target,
  Users,
  MapPin
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import lavcomLogo from "@/assets/lavcom-logo-header.png";
import { t } from "@/lib/i18n";
import { HeroValueSlider } from "@/components/landing/HeroValueSlider";

const contactSchema = z.object({
  name: z.string().trim().min(1, t("validation").nameRequired).max(100, t("validation").nameTooLong),
  email: z.string().trim().email(t("validation").invalidEmail).max(255, t("validation").emailTooLong),
  message: z.string().trim().min(10, t("validation").messageMinLength).max(1000, t("validation").messageMaxLength)
});

const features = [
  {
    icon: BarChart3,
    title: t("landing").features.items.dashboards.title,
    description: t("landing").features.items.dashboards.description
  },
  {
    icon: TrendingUp,
    title: t("landing").features.items.predictive.title,
    description: t("landing").features.items.predictive.description
  },
  {
    icon: Bell,
    title: t("landing").features.items.alerts.title,
    description: t("landing").features.items.alerts.description
  },
  {
    icon: LineChart,
    title: t("landing").features.items.revenue.title,
    description: t("landing").features.items.revenue.description
  },
  {
    icon: Shield,
    title: t("landing").features.items.maintenance.title,
    description: t("landing").features.items.maintenance.description
  },
  {
    icon: Zap,
    title: t("landing").features.items.optimization.title,
    description: t("landing").features.items.optimization.description
  }
];

const benefits = t("landing").benefits.items;

const testimonials = [
  {
    name: "Marie Dupont",
    role: "Gérante, Laverie Express Lyon",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    quote: "Grâce à Lavcom Performances, j'ai pu identifier mes heures creuses et ajuster mes tarifs. Mon CA a augmenté de 30% en 6 mois !",
    rating: 5
  },
  {
    name: "Pierre Martin",
    role: "Propriétaire, Clean & Fresh Paris",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    quote: "Les alertes de maintenance m'ont permis d'éviter 3 pannes majeures ce trimestre. L'investissement est rentabilisé en quelques semaines.",
    rating: 5
  },
  {
    name: "Sophie Bernard",
    role: "Directrice, Réseau LavPlus",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    quote: "Avec 12 laveries, je ne pouvais plus tout gérer manuellement. Lavcom me donne une vue d'ensemble instantanée de tout mon réseau.",
    rating: 5
  }
];

const LandingPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactErrors, setContactErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactErrors({});

    const result = contactSchema.safeParse(contactForm);
    if (!result.success) {
      const errors: { name?: string; email?: string; message?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        errors[field] = err.message;
      });
      setContactErrors(errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("https://formspree.io/f/YOUR_FORM_ID", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
        }),
      });

      if (response.ok) {
        toast({
          title: t("landing").contact.successTitle,
          description: t("landing").contact.successDescription,
        });
        setContactForm({ name: "", email: "", message: "" });
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Formspree error:", error);
      toast({
        title: t("landing").contact.errorTitle,
        description: t("landing").contact.errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={lavcomLogo} alt="Lavcom Performances" className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("nav").exploitants}
            </Link>
            <Link to="/simulateur" className="text-lavcom-orange hover:text-lavcom-orange-dark font-medium transition-colors">
              {t("nav").simulationOpening}
            </Link>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("nav").features}
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("nav").testimonials}
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("nav").faq}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="btn-bounce">
                  {t("common").login}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/login?mode=exploitant" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Exploitant</p>
                      <p className="text-xs text-muted-foreground">Accès à mes laveries</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/login?mode=simulateur" className="flex items-center gap-2 cursor-pointer">
                    <Calculator className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Futur exploitant</p>
                      <p className="text-xs text-muted-foreground">Accès au simulateur</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/pricing">
              <Button className="btn-bounce bg-primary hover:bg-primary/90 relative">
                {t("nav").exploitantPricing}
                <span className="absolute -top-2 -right-2 bg-lavcom-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  14j gratuits
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* BLOC A – HERO */}
      {/* ========================================== */}
      <section className="pt-24 pb-6 md:pb-8">
        {/* Badge centré au-dessus du slider */}
        <div className="text-center mb-4 md:mb-6 px-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium animate-fade-in">
            <Zap className="h-3 w-3 md:h-4 md:w-4" />
            {t("landing").hero.badge}
          </div>
        </div>
        
        {/* Slider pleine largeur */}
        <HeroValueSlider />
        
        {/* Boutons et phrase sous le slider */}
        <div className="container mx-auto text-center max-w-4xl px-4 mt-6 md:mt-10">
          {/* Deux boutons principaux côte à côte */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 animate-fade-in">
            <a href="#exploitants" className="w-full sm:w-auto">
              <Button size="default" className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white text-sm md:text-lg px-4 md:px-8 w-full sm:w-auto">
                <Building2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Je veux optimiser mes laveries
              </Button>
            </a>
            <a href="#futurs-exploitants" className="w-full sm:w-auto">
              <Button size="default" className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white text-sm md:text-lg px-4 md:px-8 w-full sm:w-auto">
                <Rocket className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Je veux ouvrir une laverie
              </Button>
            </a>
          </div>
          
          {/* Ligne de réassurance essai gratuit */}
          <div className="mt-4 md:mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground animate-fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-lavcom-green" />
              Essai gratuit 14 jours
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-lavcom-green" />
              Sans engagement
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-lavcom-green" />
              Sans carte bancaire
            </span>
          </div>
          
          {/* Phrase de positionnement */}
          <p className="mt-4 md:mt-6 text-xs md:text-sm text-muted-foreground animate-fade-in italic px-2">
            "La couche d'intelligence au-dessus de vos centrales de paiement"
          </p>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC B – PARCOURS EXPLOITANTS */}
      {/* ========================================== */}
      <section id="exploitants" className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-lavcom-green/5 via-lavcom-green/10 to-lavcom-green/5 border-y border-lavcom-green/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Contenu texte */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 bg-lavcom-green/20 text-lavcom-green-dark dark:text-lavcom-green px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                Pour les exploitants de laveries
              </div>
              
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[500px]">
                Vous gérez déjà une laverie ?
              </h2>
              
              <p className="text-muted-foreground text-sm md:text-lg mb-4 md:mb-6">
                Reliez vos centrales de paiement, visualisez vos chiffres et recevez chaque mois un rapport d'analyse des performances.
              </p>
              
              {/* Puces avantages exploitants */}
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8 text-left">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base"><strong>Tableau de bord financier :</strong> CA, panier moyen, évolution.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base"><strong>Analyse machine par machine :</strong> cycles, taux d'occupation.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base"><strong>Recommandations concrètes :</strong> prix, horaires, maintenance.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base"><strong>Rapport PDF</strong> prêt à partager.</span>
                </li>
              </ul>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-start">
                <Link to="/signup">
                  <Button size="default" className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white text-sm md:text-base w-full sm:w-auto">
                    Essayer 14 jours gratuits
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </Link>
                <Link to="/login?mode=exploitant">
                  <Button size="default" variant="outline" className="btn-bounce border-lavcom-green/50 text-lavcom-green-dark dark:text-lavcom-green hover:bg-lavcom-green/10 text-sm md:text-base w-full sm:w-auto">
                    Se connecter
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Visuel / Stats */}
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              {[
                { value: "24/7", label: "Suivi temps réel", icon: Clock },
                { value: "+25%", label: "CA moyen constaté", icon: TrendingUp },
                { value: "10h", label: "Gagnées / semaine", icon: Zap },
                { value: "40%", label: "Réduction pannes", icon: Shield }
              ].map((stat, index) => (
                <Card 
                  key={stat.label}
                  className="p-3 md:p-6 text-center card-lavcom-hover animate-fade-in bg-card/80 backdrop-blur border-lavcom-green/20"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <stat.icon className="h-4 w-4 md:h-6 md:w-6 text-lavcom-green mx-auto mb-1 md:mb-2" />
                  <div className="text-xl md:text-3xl font-bold text-lavcom-green mb-0.5 md:mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC C – PARCOURS FUTURS EXPLOITANTS */}
      {/* ========================================== */}
      <section id="futurs-exploitants" className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-lavcom-orange/5 via-lavcom-orange/10 to-lavcom-orange/5 border-y border-lavcom-orange/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Visuel / Card simulateur */}
            <div className="order-2 lg:order-1">
              <Card className="p-4 md:p-8 bg-card/80 backdrop-blur border-lavcom-orange/30 shadow-xl">
                <div className="text-center space-y-4 md:space-y-6">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-lavcom-orange/20 flex items-center justify-center mx-auto">
                    <Calculator className="h-7 w-7 md:h-10 md:w-10 text-lavcom-orange" />
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-foreground">Simulateur</p>
                    <p className="text-sm md:text-base text-muted-foreground">de rentabilité</p>
                  </div>
                  
                  {/* Mini-aperçu des fonctionnalités */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 pt-3 md:pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <Target className="h-3 w-3 md:h-4 md:w-4 text-lavcom-orange shrink-0" />
                      <span>Seuil rentabilité</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <PieChart className="h-3 w-3 md:h-4 md:w-4 text-lavcom-orange shrink-0" />
                      <span>Analyse charges</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <FileText className="h-3 w-3 md:h-4 md:w-4 text-lavcom-orange shrink-0" />
                      <span>Rapport PDF</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-lavcom-orange shrink-0" />
                      <span>Scénarios</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 md:pt-4 border-t border-border space-y-1.5 md:space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Pack Simulateur</span>
                      <span className="font-semibold">79 €/mois</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Pack Premium</span>
                      <span className="font-semibold text-lavcom-orange">279 €</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Contenu texte */}
            <div className="order-1 lg:order-2 text-left">
              <div className="inline-flex items-center gap-2 bg-lavcom-orange/20 text-lavcom-orange-dark dark:text-lavcom-orange px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Rocket className="h-3 w-3 md:h-4 md:w-4" />
                Pour les futurs exploitants
              </div>
              
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[500px]">
                Vous souhaitez ouvrir une laverie ?
              </h2>
              
              <p className="text-muted-foreground text-sm md:text-lg mb-3 md:mb-6">
                Simulez votre projet avant d'investir : CA potentiel, charges, seuil de rentabilité et scénarios.
              </p>
              
              <p className="hidden md:block text-muted-foreground text-sm md:text-base mb-6">
                Le simulateur Lavcom Performances vous permet de tester plusieurs configurations de laverie et d'obtenir un rapport chiffré pour votre banque ou vos partenaires.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-start">
                <Link to="/simulateur">
                  <Button size="default" className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white text-sm md:text-base w-full sm:w-auto">
                    <Calculator className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Tester le simulateur
                    <span className="ml-2 text-white text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: '#A5C800' }}>
                      Gratuit
                    </span>
                  </Button>
                </Link>
                <Link to="/subscribe-simulator">
                  <Button size="default" variant="outline" className="btn-bounce border-lavcom-orange/50 text-lavcom-orange-dark dark:text-lavcom-orange hover:bg-lavcom-orange/10 text-sm md:text-base w-full sm:w-auto">
                    Découvrir les packs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "À QUOI ÇA RESSEMBLE CONCRÈTEMENT" */}
      {/* ========================================== */}
      <section id="demo" className="py-12 md:py-20 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left md:text-center mb-8 md:mb-12">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[500px] md:max-w-none md:mx-auto">
              À quoi ressemble un rapport Lavcom Performances ?
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Visuel PDF mockup */}
            <div className="order-2 lg:order-1">
              <Card className="p-3 md:p-4 bg-card/80 backdrop-blur border-primary/20 shadow-xl overflow-hidden">
                <img 
                  src={pdfMockupPreview} 
                  alt="Exemple de rapport Lavcom Performances - Analyse des performances" 
                  className="w-full h-auto rounded-lg shadow-md"
                />
                <div className="mt-3 md:mt-4 text-center">
                  <span className="bg-primary text-primary-foreground px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium">
                    Exemple de rapport PDF
                  </span>
                </div>
              </Card>
            </div>
            
            {/* Texte descriptif */}
            <div className="order-1 lg:order-2 text-left">
              <p className="text-muted-foreground text-sm md:text-lg mb-4 md:mb-6">
                Chaque mois, vous recevez un rapport d'analyse des performances de votre laverie :
              </p>
              
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8 text-left">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Synthèse du mois</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Chiffres clés (CA, fréquentation, occupation)</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Focus machine par machine</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Recommandations concrètes</span>
                </li>
              </ul>
              
              <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8">
                Un document lisible, à partager avec votre banque ou expert-comptable.
              </p>
              
              <a 
                href="/exemple-rapport-laverie-demo.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block w-full sm:w-auto"
              >
                <Button size="default" className="btn-bounce text-sm md:text-base w-full sm:w-auto">
                  <FileText className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Voir un exemple (PDF)
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "SANS / AVEC LAVCOM" */}
      {/* ========================================== */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground text-left md:text-center mb-8 md:mb-12 leading-tight max-w-[400px] md:max-w-none">
            Sans Lavcom Performances / Avec Lavcom Performances
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            {/* Colonne Sans */}
            <Card className="p-4 md:p-6 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
              <h3 className="text-base md:text-lg font-semibold text-red-700 dark:text-red-400 mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-xl md:text-2xl">✗</span>
                Sans Lavcom Performances
              </h3>
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Je vois seulement le CA global.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Je ne sais pas quelles machines sont rentables.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Je change mes prix au feeling.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Pas de rapport clair pour ma banque.</span>
                </li>
              </ul>
            </Card>
            
            {/* Colonne Avec */}
            <Card className="p-4 md:p-6 border-lavcom-green/30 bg-lavcom-green/5">
              <h3 className="text-base md:text-lg font-semibold text-lavcom-green-dark dark:text-lavcom-green mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-xl md:text-2xl">✓</span>
                Avec Lavcom Performances
              </h3>
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>Je connais les machines qui couvrent mes charges.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>Je vois les créneaux saturés ou sous-utilisés.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>Recommandations concrètes chaque mois.</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>Rapport PDF pour ma banque.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 md:py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left md:text-center mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[400px] md:max-w-none">
              Comment ça marche ?
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl md:mx-auto">
              En 3 étapes simples, transformez vos données en décisions rentables
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: "1",
                title: "Importez vos données de centrales",
                description: "Importez les fichiers CSV de vos centrales (Nayax, LMPay, CPI…) en quelques clics."
              },
              {
                step: "2",
                title: "Visualisez vos données",
                description: "Tableau de bord en temps réel : CA, occupation, tendances."
              },
              {
                step: "3",
                title: "Optimisez la rentabilité",
                description: "Identifiez les machines sous-performantes, ajustez vos tarifs."
              }
            ].map((item, index) => (
              <div 
                key={item.step}
                className="relative text-left md:text-center animate-fade-in flex md:block items-start gap-4"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl md:text-2xl font-bold shrink-0 md:mx-auto md:mb-6">
                  {item.step}
                </div>
                <div className="flex-1 md:flex-none">
                  <h3 className="text-base md:text-xl font-semibold text-foreground mb-1 md:mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-left md:text-center mt-8 md:mt-12">
            <Link to="/pricing">
              <Button size="default" className="btn-bounce text-sm md:text-base w-full sm:w-auto">
                Commencer maintenant
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left md:text-center mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[400px] md:max-w-none">
              {t("landing").features.title}
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl md:mx-auto">
              {t("landing").features.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="p-3 md:p-6 card-lavcom-hover animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center mb-2 md:mb-4">
                  <feature.icon className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-sm md:text-xl font-semibold text-foreground mb-1 md:mb-2 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-xs md:text-base leading-snug">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-left">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-6 leading-tight max-w-[450px]">
                {t("landing").benefits.title}
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg mb-6 md:mb-8">
                {t("landing").benefits.subtitle}
              </p>
              
              <ul className="space-y-2 md:space-y-4">
                {benefits.map((benefit, index) => (
                  <li 
                    key={benefit}
                    className="flex items-start gap-2 md:gap-3 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CheckCircle2 className="h-4 w-4 md:h-6 md:w-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm md:text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 md:mt-8">
                <Link to="/pricing">
                  <Button size="default" className="btn-bounce bg-primary hover:bg-primary/90 text-sm md:text-base w-full sm:w-auto">
                    Découvrir nos offres
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              {[
                { value: "25%", label: "Augmentation CA" },
                { value: "40%", label: "Réduction pannes" },
                { value: "10h", label: "Gagnées / semaine" },
                { value: "24/7", label: "Accès données" }
              ].map((stat, index) => (
                <Card 
                  key={stat.label}
                  className="p-3 md:p-6 text-center card-lavcom-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="text-2xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-12 md:py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left md:text-center mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[350px] md:max-w-none">
              Ils nous font confiance
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl md:mx-auto">
              Témoignages de gérants qui ont transformé leur activité
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={testimonial.name}
                className="p-4 md:p-6 card-lavcom-hover relative animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <Quote className="absolute top-3 right-3 md:top-4 md:right-4 h-6 w-6 md:h-8 md:w-8 text-primary/20" />
                
                <div className="flex items-center gap-0.5 md:gap-1 mb-3 md:mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-accent text-accent" />
                  ))}
                </div>
                
                <p className="text-foreground text-sm md:text-base mb-4 md:mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                
                <div className="flex items-center gap-2 md:gap-3 pt-3 md:pt-4 border-t border-border">
                  <Avatar className="h-10 w-10 md:h-12 md:w-12">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground text-sm md:text-base">{testimonial.name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("landing").faq.title}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("landing").faq.subtitle}
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Comment Lavcom Performances se connecte-t-il à mes machines ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Lavcom Performances s'intègre facilement avec la plupart des systèmes de paiement et de gestion de laverie. 
                Notre équipe technique vous accompagne dans la configuration initiale qui prend généralement moins de 2 heures.
                Aucune modification matérielle n'est nécessaire.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Mes données sont-elles sécurisées ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolument. Toutes vos données sont chiffrées et stockées sur des serveurs sécurisés en Europe. 
                Nous sommes conformes au RGPD et ne partageons jamais vos informations avec des tiers. 
                Vous restez propriétaire de vos données à 100%.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Puis-je gérer plusieurs laveries avec un seul compte ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oui ! Lavcom Performances est conçu pour gérer aussi bien une seule laverie qu'un réseau complet. 
                Vous pouvez visualiser les performances de chaque établissement individuellement ou obtenir une vue consolidée de tout votre réseau.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Quelle est la durée de l'essai gratuit ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Vous bénéficiez d'un essai gratuit de 14 jours avec accès à toutes les fonctionnalités. 
                Aucune carte bancaire n'est requise pour commencer. À la fin de l'essai, vous choisissez l'offre qui vous convient.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Comment fonctionnent les alertes de maintenance ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Notre système analyse en continu les données de vos machines pour détecter les anomalies avant qu'elles ne causent des pannes. 
                Vous recevez des alertes par email ou SMS avec des recommandations d'action précises. 
                Cela vous permet d'intervenir de manière préventive et de réduire significativement les temps d'arrêt.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Quel support est inclus dans l'abonnement ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Tous nos abonnements incluent un support par email avec réponse sous 24h. 
                Les offres Pro et Business bénéficient d'un support prioritaire par téléphone et d'un accompagnement personnalisé 
                pour optimiser l'utilisation de la plateforme.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Une question ? Contactez-nous
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Notre équipe vous répond sous 24h pour vous accompagner dans votre projet.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <p className="text-muted-foreground">contact@lavcom.fr</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Horaires</h3>
                    <p className="text-muted-foreground">Lun-Ven : 9h-18h</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Réponse rapide</h3>
                    <p className="text-muted-foreground">Nous répondons sous 24h ouvrées</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Card className="p-6 md:p-8 card-lavcom">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-foreground font-medium">
                    Nom complet
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="contact-name"
                      placeholder="Jean Dupont"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      maxLength={100}
                    />
                  </div>
                  {contactErrors.name && (
                    <p className="text-sm text-destructive">{contactErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-foreground font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="jean.dupont@email.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      maxLength={255}
                    />
                  </div>
                  {contactErrors.email && (
                    <p className="text-sm text-destructive">{contactErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-foreground font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Comment pouvons-nous vous aider ?"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {contactErrors.message && (
                      <p className="text-destructive">{contactErrors.message}</p>
                    )}
                    <span className="ml-auto">{contactForm.message.length}/1000</span>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full btn-bounce bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("landing").contact.sending}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      {t("landing").contact.send}
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* RAPPEL DES DEUX PARCOURS */}
      {/* ========================================== */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-sidebar-background to-muted border-0">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
              Deux façons de travailler avec Lavcom Performances
            </h2>
            <p className="text-card-foreground/70 text-lg mb-8 max-w-xl mx-auto">
              Que vous soyez déjà exploitant ou futur exploitant, nous avons une solution adaptée à vos besoins.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/pricing">
                <Button size="lg" className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white text-lg px-8">
                  <Building2 className="mr-2 h-5 w-5" />
                  Je gère déjà une laverie
                </Button>
              </Link>
              <Link to="/simulateur">
                <Button size="lg" className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white text-lg px-8">
                  <Rocket className="mr-2 h-5 w-5" />
                  Je souhaite ouvrir une laverie
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC D – FOOTER */}
      {/* ========================================== */}
      <footer className="py-12 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          {/* Infos société */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Logo et description */}
            <div>
              <Link to="/" className="inline-block mb-4">
                <img src={lavcomLogo} alt="Lavcom Performances" className="h-8 w-auto" />
              </Link>
              <p className="text-sm text-muted-foreground">
                La plateforme d'analyse et d'optimisation pour les laveries automatiques.
              </p>
            </div>
            
            {/* Liens rapides */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Liens rapides</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    Tarifs exploitants
                  </Link>
                </li>
                <li>
                  <Link to="/simulateur" className="text-muted-foreground hover:text-foreground transition-colors">
                    Simulateur
                  </Link>
                </li>
                <li>
                  <Link to="/subscribe-simulator" className="text-muted-foreground hover:text-foreground transition-colors">
                    Packs simulateur
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  contact@lavcom.fr
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  88 avenue de Grammont, 37000 Tours
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lun-Ven : 9h-18h
                </li>
              </ul>
            </div>
          </div>
          
          {/* Séparateur */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Mention légale société */}
              <p className="text-xs text-muted-foreground text-center md:text-left">
                Lavcom Performances est une marque commerciale de Lavcom, elle-même marque commerciale de la société My'Po SARL – 88 avenue de Grammont, 37000 Tours
              </p>
              
              {/* Liens légaux */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">Mentions légales</a>
                <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
                <a href="#" className="hover:text-foreground transition-colors">CGV</a>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              © {new Date().getFullYear()} Lavcom Performances. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
