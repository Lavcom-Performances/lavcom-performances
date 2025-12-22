import { useState, useMemo } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
  MapPin,
  Eye,
  Lightbulb,
  BookOpen,
  ExternalLink,
  Phone,
  Link2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { trackEbookClick, trackContactSubmit } from "@/lib/analytics";
import { z } from "zod";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import ebookAvantOuvrir from "@/assets/ebook-avant-ouvrir.jpg";
import { HeroValueSlider } from "@/components/landing/HeroValueSlider";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { LanguageSelector } from "@/components/ui/language-selector";
import { SEOHead } from "@/components/seo/SEOHead";

// Testimonials data moved to i18n - see landing:testimonials namespace

const LandingPage = () => {
  const { toast } = useToast();
  const { t } = useTranslation(['landing', 'common', 'errors', 'app']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({ 
    topic: "", 
    email: "", 
    message: "", 
    phone: "",
    pageUrl: ""
  });
  const [contactErrors, setContactErrors] = useState<{ 
    topic?: string; 
    email?: string; 
    message?: string;
    phone?: string;
  }>({});
  
  // Contact topic options
  const contactTopics = [
    { value: "support", label: t("landing:contact.topics.support") },
    { value: "billing", label: t("landing:contact.topics.billing") },
    { value: "simulator", label: t("landing:contact.topics.simulator") },
    { value: "demo", label: t("landing:contact.topics.demo") },
    { value: "press", label: t("landing:contact.topics.press") },
    { value: "other", label: t("landing:contact.topics.other") },
  ];
  
  // Track active section for nav highlighting
  const sectionIds = useMemo(() => ['features', 'testimonials', 'faq'], []);
  const activeSection = useActiveSection(sectionIds);

  // Dynamic schema with translations
  const contactSchema = z.object({
    topic: z.string().min(1, t('errors:validation.topicRequired')),
    email: z.string().trim().email(t('errors:validation.invalidEmail')).max(255, t('errors:validation.emailTooLong')),
    message: z.string().trim().min(10, t('errors:validation.messageMinLength')).max(1000, t('errors:validation.messageMaxLength')),
    phone: z.string().max(20, t('errors:validation.phoneTooLong')).optional(),
    pageUrl: z.string().max(500).optional(),
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactErrors({});

    const result = contactSchema.safeParse(contactForm);
    if (!result.success) {
      const errors: { topic?: string; email?: string; message?: string; phone?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        errors[field] = err.message;
      });
      setContactErrors(errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get topic label for the email
      const topicLabel = contactTopics.find(t => t.value === contactForm.topic)?.label || contactForm.topic;
      
      const { data, error } = await supabase.functions.invoke('send-contact', {
        body: {
          topic: topicLabel,
          topicValue: contactForm.topic,
          email: contactForm.email,
          message: contactForm.message,
          phone: contactForm.phone || undefined,
          pageUrl: contactForm.pageUrl || undefined,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: t("landing:contact.successTitle"),
        description: t("landing:contact.successDescription"),
      });
      setContactForm({ topic: "", email: "", message: "", phone: "", pageUrl: "" });
      trackContactSubmit();
    } catch (error) {
      console.error("Contact form error:", error);
      toast({
        title: t("landing:contact.errorTitle"),
        description: t("landing:contact.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead 
        url="/"
        title="Logiciel de gestion pour laveries automatiques"
        description="Lavcom Performances : logiciel d'analyse et de gestion pour laveries automatiques. Optimisez vos revenus avec des tableaux de bord intelligents, analyses de rentabilité et alertes en temps réel."
        keywords="laverie automatique, gestion laverie, logiciel laverie, analyse laverie, tableau de bord laverie, rentabilité laverie, simulateur laverie"
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={lavcomLogo} alt="Lavcom Performances" className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("common:pricing")}
            </Link>
            <Link to="/simulateur" className="text-lavcom-orange hover:text-lavcom-orange-dark font-medium transition-colors">
              {t("landing:futursExploitants.simulator")}
            </Link>
            <a 
              href="#features" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`transition-colors ${
                activeSection === 'features' 
                  ? 'text-lavcom-green font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t("common:features")}
            </a>
            <a 
              href="#testimonials" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`transition-colors ${
                activeSection === 'testimonials' 
                  ? 'text-lavcom-green font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t("common:testimonials")}
            </a>
            <a 
              href="#faq" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`transition-colors ${
                activeSection === 'faq' 
                  ? 'text-lavcom-green font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t("common:faq")}
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="compact" className="hidden sm:flex" />
            <LanguageSelector variant="compact" className="sm:hidden" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="btn-bounce">
                  {t("common:login")}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/login?mode=exploitant" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{t("app:dropdown.exploitant")}</p>
                      <p className="text-xs text-muted-foreground">{t("app:dropdown.exploitantDesc")}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/login?mode=simulateur" className="flex items-center gap-2 cursor-pointer">
                    <Calculator className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{t("app:dropdown.futureExploitant")}</p>
                      <p className="text-xs text-muted-foreground">{t("app:dropdown.futureExploitantDesc")}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/signup">
              <Button className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white font-semibold">
                {t("common:freeTrial")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
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
            {t("landing:hero.badge")}
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
                {t("landing:hero.optimizeLaundries")}
              </Button>
            </a>
            <a href="#futurs-exploitants" className="w-full sm:w-auto">
              <Button size="default" className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white text-sm md:text-lg px-4 md:px-8 w-full sm:w-auto">
                <Rocket className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                {t("landing:hero.openLaundry")}
              </Button>
            </a>
          </div>
          
          {/* Ligne de réassurance essai gratuit */}
          <div className="mt-4 md:mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground animate-fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-lavcom-green" />
              {t("common:freeTrial")}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-lavcom-green" />
              {t("common:noCommitment")}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-lavcom-green" />
              {t("common:noCreditCard")}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC – DEUX PROFILS, DEUX SOLUTIONS */}
      {/* ========================================== */}
      <section className="py-8 md:py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-3 md:mb-4">
              {t("landing:twoProfiles.title")}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
              {t("landing:twoProfiles.subtitle")}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC B – PARCOURS EXPLOITANTS */}
      {/* ========================================== */}
      <section id="exploitants" className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-lavcom-green/5 via-lavcom-green/10 to-lavcom-green/5 border-y border-lavcom-green/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Contenu texte */}
            <ScrollReveal direction="left" className="text-left">
              <div className="inline-flex items-center gap-2 bg-lavcom-green/20 text-lavcom-green-dark dark:text-lavcom-green px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                {t("landing:exploitants.badge")}
              </div>
              
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[500px]">
                {t("landing:exploitants.title")}
              </h2>
              
              {/* 3 bénéfices en bullet points */}
              <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6 text-left">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">{t("landing:exploitants.benefit1")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">{t("landing:exploitants.benefit2")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">{t("landing:exploitants.benefit3")}</span>
                </li>
              </ul>
              
              <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8 italic">
                {t("landing:exploitants.keepControl")}
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-start">
                <Link to="/signup">
                  <Button size="default" className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white text-sm md:text-base w-full sm:w-auto">
                    {t("landing:exploitants.tryFree")}
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </Link>
                <Link to="/login?mode=exploitant">
                  <Button size="default" variant="outline" className="btn-bounce border-lavcom-green/50 text-lavcom-green-dark dark:text-lavcom-green hover:bg-lavcom-green/10 text-sm md:text-base w-full sm:w-auto">
                    {t("landing:exploitants.signIn")}
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
            
            {/* Visuel / Stats */}
            <ScrollReveal direction="right" delay={0.2} className="grid grid-cols-2 gap-2 md:gap-4">
              {[
                { value: "24/7", label: t("landing:exploitants.stats.realtime"), icon: Clock },
                { value: "+25%", label: t("landing:exploitants.stats.avgRevenue"), icon: TrendingUp },
                { value: "10h", label: t("landing:exploitants.stats.timeSaved"), icon: Zap },
                { value: "40%", label: t("landing:exploitants.stats.reducedBreakdowns"), icon: Shield }
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
            </ScrollReveal>
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
            <ScrollReveal direction="left" className="order-2 lg:order-1">
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
                  
                  <div className="pt-3 md:pt-4 border-t border-border space-y-1 md:space-y-1.5">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Pack Essentiel</span>
                      <span className="font-semibold">79 € <span className="text-muted-foreground font-normal">TTC</span></span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Pack Projet</span>
                      <span className="font-semibold text-lavcom-orange">149 € <span className="text-muted-foreground font-normal">TTC</span></span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Pack Comparateur</span>
                      <span className="font-semibold">229 € <span className="text-muted-foreground font-normal">TTC</span></span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Pack Premium</span>
                      <span className="font-semibold">279 € <span className="text-muted-foreground font-normal">TTC</span></span>
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground pt-1.5 text-center italic">
                      Paiement unique — aucun renouvellement automatique
                    </p>
                  </div>
                </div>
              </Card>
            </ScrollReveal>
            
            {/* Contenu texte */}
            <ScrollReveal direction="right" delay={0.15} className="order-1 lg:order-2 text-left">
              <div className="inline-flex items-center gap-2 bg-lavcom-orange/20 text-lavcom-orange-dark dark:text-lavcom-orange px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Rocket className="h-3 w-3 md:h-4 md:w-4" />
                Pour les futurs exploitants
              </div>
              
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[500px]">
                Pour ceux qui veulent ouvrir une laverie avec des chiffres réalistes
              </h2>
              
              <p className="text-muted-foreground text-sm md:text-lg mb-4 md:mb-6">
                Le simulateur Lavcom Performances vous aide à estimer :
              </p>
              
              <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6 text-left">
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-orange shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Vos charges principales (loyer, prêts, énergie, eau, etc.)</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-orange shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Vos recettes possibles selon la fréquentation</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-orange shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm md:text-base">Votre seuil de rentabilité</span>
                </li>
              </ul>
              
              <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8 italic">
                Vous ne devinez pas. Vous partez avec des ordres de grandeur clairs.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-start">
                <Link to="/simulateur">
                  <Button size="default" className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white text-sm md:text-base w-full sm:w-auto">
                    <Calculator className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Essayer le simulateur
                  </Button>
                </Link>
                <Link to="/subscribe-simulator">
                  <Button size="default" variant="outline" className="btn-bounce border-lavcom-orange/50 text-lavcom-orange-dark dark:text-lavcom-orange hover:bg-lavcom-orange/10 text-sm md:text-base w-full sm:w-auto">
                    Découvrir les packs
                  </Button>
                </Link>
              </div>
              
              {/* Ressource recommandée - lien vers ebooks */}
              <div className="mt-4 md:mt-6 pt-4 border-t border-lavcom-orange/20">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm">
                  <span className="text-muted-foreground font-medium">{t("landing:simulatorResource.label")} :</span>
                  <span className="text-foreground">{t("landing:simulatorResource.text")}</span>
                </div>
                <a 
                  href="https://lavcom.fr/nos-ebooks-2/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs md:text-sm text-lavcom-orange hover:text-lavcom-orange-dark transition-colors group"
                  onClick={() => trackEbookClick('landing_simulator_block')}
                >
                  <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="font-medium">{t("landing:simulatorResource.cta")}</span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  <span className="text-muted-foreground ml-1">{t("landing:simulatorResource.note")}</span>
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "À QUOI ÇA RESSEMBLE CONCRÈTEMENT" */}
      {/* ========================================== */}
      <section id="demo" className="py-12 md:py-20 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal className="text-left md:text-center mb-8 md:mb-12">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[500px] md:max-w-none md:mx-auto">
              À quoi ressemble un rapport Lavcom Performances ?
            </h2>
          </ScrollReveal>
          
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Visuel PDF mockup */}
            <ScrollReveal direction="left" delay={0.1} className="order-2 lg:order-1">
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
            </ScrollReveal>
            
            {/* Texte descriptif */}
            <ScrollReveal direction="right" delay={0.2} className="order-1 lg:order-2 text-left">
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
                  {t("landing:pdfExample.cta")}
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </a>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "SANS / AVEC LAVCOM" */}
      {/* ========================================== */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground text-left md:text-center mb-8 md:mb-12 leading-tight max-w-[400px] md:max-w-none">
            {t("landing:comparison.title")}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            {/* Colonne Sans */}
            <Card className="p-4 md:p-6 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
              <h3 className="text-base md:text-lg font-semibold text-red-700 dark:text-red-400 mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-xl md:text-2xl">✗</span>
                {t("landing:comparison.withoutTitle")}
              </h3>
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{t("landing:comparison.without1")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{t("landing:comparison.without2")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{t("landing:comparison.without3")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-muted-foreground text-sm md:text-base">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{t("landing:comparison.without4")}</span>
                </li>
              </ul>
            </Card>
            
            {/* Colonne Avec */}
            <Card className="p-4 md:p-6 border-lavcom-green/30 bg-lavcom-green/5">
              <h3 className="text-base md:text-lg font-semibold text-lavcom-green-dark dark:text-lavcom-green mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-xl md:text-2xl">✓</span>
                {t("landing:comparison.withTitle")}
              </h3>
              <ul className="space-y-2 md:space-y-3">
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>{t("landing:comparison.with1")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>{t("landing:comparison.with2")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>{t("landing:comparison.with3")}</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3 text-foreground text-sm md:text-base">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-lavcom-green shrink-0 mt-0.5" />
                  <span>{t("landing:comparison.with4")}</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "COMMENT ÇA MARCHE CONCRÈTEMENT ?" */}
      {/* ========================================== */}
      <section id="how-it-works" className="py-12 md:py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left md:text-center mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[400px] md:max-w-none">
              {t("landing:howItWorks.title")}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: "1",
                title: t("landing:howItWorks.step1Title"),
                description: t("landing:howItWorks.step1Desc")
              },
              {
                step: "2",
                title: t("landing:howItWorks.step2Title"),
                description: t("landing:howItWorks.step2Desc")
              },
              {
                step: "3",
                title: t("landing:howItWorks.step3Title"),
                description: t("landing:howItWorks.step3Desc")
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
            <Link to="/signup">
              <Button size="default" className="btn-bounce text-sm md:text-base w-full sm:w-auto">
                {t("landing:cta.startNow")}
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "POURQUOI UTILISER LAVCOM PERFORMANCES ?" */}
      {/* ========================================== */}
      <section id="features" className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal className="text-left md:text-center mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[400px] md:max-w-none">
              {t("landing:whyUse.title")}
            </h2>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Eye,
                title: t("landing:whyUse.feature1Title"),
                description: t("landing:whyUse.feature1Desc")
              },
              {
                icon: Clock,
                title: t("landing:whyUse.feature2Title"),
                description: t("landing:whyUse.feature2Desc")
              },
              {
                icon: TrendingUp,
                title: t("landing:whyUse.feature3Title"),
                description: t("landing:whyUse.feature3Desc")
              }
            ].map((feature, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <Card 
                  className="p-4 md:p-6 card-lavcom-hover h-full"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                    <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <h3 className="text-sm md:text-lg font-semibold text-foreground mb-2 md:mb-3 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-xs md:text-base leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* BLOC "ALLER PLUS LOIN AVANT D'OUVRIR" (Guide) */}
      {/* ========================================== */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal direction="scale">
            <Card className="p-6 md:p-10 bg-gradient-to-br from-lavcom-orange/10 to-lavcom-orange/5 border-lavcom-orange/30">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                <div className="text-center md:text-left">
                  <img 
                    src={ebookAvantOuvrir} 
                    alt="Guide Avant d'ouvrir - Le guide du futur exploitant de laverie" 
                    className="w-full max-w-[280px] mx-auto md:mx-0 rounded-lg shadow-lg"
                  />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">
                    {t("landing:guide.title")}
                  </h2>
                  <h3 className="text-base md:text-lg font-semibold text-lavcom-orange mb-3 md:mb-4">
                    {t("landing:guide.subtitle")}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base mb-4 md:mb-6">
                    {t("landing:guide.description")}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <a href="https://lavcom.fr/nos-ebooks-2/" target="_blank" rel="noopener noreferrer">
                      <Button className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white w-full sm:w-auto">
                        <BookOpen className="mr-2 h-4 w-4" />
                        {t("landing:guide.cta")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {t("landing:guide.ctaNote")}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-12 md:py-20 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-left md:text-center mb-10 md:mb-16">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight max-w-[400px] md:max-w-none">
              {t("landing:testimonials.title")}
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl md:mx-auto">
              {t("landing:testimonials.subtitle")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                name: t("landing:testimonials.t1Name"),
                role: t("landing:testimonials.t1Role"),
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
                quote: t("landing:testimonials.t1Quote"),
                rating: 5
              },
              {
                name: t("landing:testimonials.t2Name"),
                role: t("landing:testimonials.t2Role"),
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                quote: t("landing:testimonials.t2Quote"),
                rating: 5
              },
              {
                name: t("landing:testimonials.t3Name"),
                role: t("landing:testimonials.t3Role"),
                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
                quote: t("landing:testimonials.t3Quote"),
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card 
                key={index}
                className="p-4 md:p-6 card-lavcom-hover animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-1 mb-3 md:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 md:h-5 md:w-5 fill-yellow-400 text-yellow-400" />
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
              {t("landing:faq.title")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("landing:faq.subtitle")}
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t("landing:faq.q1")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("landing:faq.a1")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t("landing:faq.q2")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("landing:faq.a2")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t("landing:faq.q3")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("landing:faq.a3")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t("landing:faq.q4")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("landing:faq.a4")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t("landing:faq.q5")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("landing:faq.a5")}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t("landing:faq.q6")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("landing:faq.a6")}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("landing:contact.titleFull")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing:contact.subtitleFull")}
            </p>
          </div>
          
          <Card className="p-6 md:p-8 card-lavcom max-w-3xl mx-auto">
            <form onSubmit={handleContactSubmit} className="space-y-6">
              {/* Row 1: Topic + Email */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Topic dropdown - REQUIRED */}
                <div className="space-y-2">
                  <Label htmlFor="contact-topic" className="text-foreground font-medium">
                    {t("landing:contact.topicLabel")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={contactForm.topic}
                    onValueChange={(value) => setContactForm(prev => ({ ...prev, topic: value, pageUrl: "" }))}
                  >
                    <SelectTrigger id="contact-topic" className="w-full">
                      <SelectValue placeholder={t("landing:contact.topicPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {contactTopics.map((topic) => (
                        <SelectItem key={topic.value} value={topic.value}>
                          {topic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contactErrors.topic && (
                    <p className="text-sm text-destructive">{contactErrors.topic}</p>
                  )}
                </div>

                {/* Email - REQUIRED */}
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-foreground font-medium">
                    {t("landing:contact.emailLabel")} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder={t("landing:contact.emailPlaceholder")}
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
              </div>

              {/* Conditional URL field for Support/Bug */}
              {contactForm.topic === "support" && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="contact-pageUrl" className="text-foreground font-medium text-sm">
                    {t("landing:contact.pageUrlLabel")} <span className="text-muted-foreground text-xs">({t("common:optional")})</span>
                  </Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contact-pageUrl"
                      placeholder={t("landing:contact.pageUrlPlaceholder")}
                      value={contactForm.pageUrl}
                      onChange={(e) => setContactForm(prev => ({ ...prev, pageUrl: e.target.value }))}
                      className="pl-10 text-sm"
                      maxLength={500}
                    />
                  </div>
                </div>
              )}
              
              {/* Message - REQUIRED */}
              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-foreground font-medium">
                  {t("landing:contact.messageLabel")} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="contact-message"
                  placeholder={t("landing:contact.messageHint")}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {contactErrors.message && (
                    <p className="text-destructive">{contactErrors.message}</p>
                  )}
                  <span className="ml-auto">{contactForm.message.length}/1000</span>
                </div>
              </div>

              {/* Row 3: Phone (optional) + Submit button */}
              <div className="grid md:grid-cols-2 gap-4 items-end">
                {/* Phone - OPTIONAL */}
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="text-foreground font-medium text-sm">
                    {t("landing:contact.phoneLabel")} <span className="text-muted-foreground text-xs">({t("common:optional")})</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder={t("landing:contact.phonePlaceholder")}
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                      maxLength={20}
                    />
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
                      {t("landing:contact.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      {t("landing:contact.send")}
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            {/* Contact info row below form */}
            <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("landing:contact.emailAddress")}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("landing:contact.hours")}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t("landing:contact.responseTime")}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ========================================== */}
      {/* BANDEAU 14 JOURS D'ESSAI */}
      {/* ========================================== */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-6 md:p-10 text-center bg-gradient-to-br from-lavcom-green/20 to-lavcom-green/10 border-lavcom-green/30">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              {t("landing:trialBanner.title")}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg mb-6">
              {t("landing:trialBanner.subtitle")}
            </p>
            <Link to="/signup">
              <Button size="lg" className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white text-lg px-8">
                {t("landing:trialBanner.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* ========================================== */}
      {/* RAPPEL DES DEUX PARCOURS */}
      {/* ========================================== */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-sidebar-background to-muted border-0">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
              {t("landing:twoPaths.title")}
            </h2>
            <p className="text-card-foreground/70 text-lg mb-8 max-w-xl mx-auto">
              {t("landing:twoPaths.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/pricing">
                <Button size="lg" className="btn-bounce bg-lavcom-green hover:bg-lavcom-green-dark text-white text-lg px-8">
                  <Building2 className="mr-2 h-5 w-5" />
                  {t("landing:twoPaths.existing")}
                </Button>
              </Link>
              <Link to="/simulateur">
                <Button size="lg" className="btn-bounce bg-lavcom-orange hover:bg-lavcom-orange-dark text-white text-lg px-8">
                  <Rocket className="mr-2 h-5 w-5" />
                  {t("landing:twoPaths.future")}
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
                {t("landing:footer.description")}
              </p>
            </div>
            
            {/* Liens rapides */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t("landing:footer.quickLinks")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t("landing:footer.pricingOperators")}
                  </Link>
                </li>
                <li>
                  <Link to="/simulateur" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t("landing:footer.simulator")}
                  </Link>
                </li>
                <li>
                  <Link to="/subscribe-simulator" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t("landing:footer.simulatorPacks")}
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t("common:faq")}
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t("common:contact")}
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t("landing:footer.contactTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("landing:contact.emailAddress")}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("landing:footer.address")}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("landing:contact.hours")}
                </li>
              </ul>
            </div>
          </div>
          
          {/* Séparateur */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Mention légale société */}
              <p className="text-xs text-muted-foreground text-center md:text-left">
                {t("landing:footer.legalNotice")}
              </p>
              
              {/* Liens légaux */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Link to="/mentions-legales" className="hover:text-foreground transition-colors">{t("landing:footer.legalLinks")}</Link>
                <Link to="/mentions-legales#confidentialite" className="hover:text-foreground transition-colors">{t("landing:footer.privacy")}</Link>
                <Link to="/mentions-legales#cgv" className="hover:text-foreground transition-colors">{t("landing:footer.terms")}</Link>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              {t("landing:footer.copyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default LandingPage;
