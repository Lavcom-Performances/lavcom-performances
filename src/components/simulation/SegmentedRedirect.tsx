import { ArrowRight, BookOpen, BarChart2, Rocket, Network, ChevronLeft } from "lucide-react";
import { SegmentType, LeadData } from "@/components/simulation/EmailCaptureModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackSegmentCTAClicked } from "@/lib/analytics";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import ebookAvantOuvrir from "@/assets/ebook-avant-ouvrir.jpg";

interface Props {
  lead: LeadData;
  onBack: () => void;
}

// ─── Config par segment ────────────────────────────────────────────────────────

const SEGMENT_CONFIG = {
  segment_a: {
    icon: BookOpen,
    badge: "Projet en préparation",
    title: "Votre projet est en phase de préparation",
    message:
      "Avant de passer aux chiffres détaillés, nous vous recommandons de consulter notre guide complet. Il vous aidera à poser les bonnes bases pour votre laverie : choix du local, configuration, fournisseurs, erreurs à éviter.",
    cta: "Découvrir le guide gratuit",
    ctaHref: "https://lavcom.fr/nos-ebooks-2/",
  },
  segment_b: {
    icon: BarChart2,
    badge: "Projet structuré",
    title: "Votre projet est structuré",
    message:
      "Votre profil correspond à un investissement sérieux. Le simulateur professionnel Lavcom vous permettra d'intégrer vos coûts réels, votre financement et vos projections sur 5 ans.",
    cta: "Accéder au simulateur professionnel",
    ctaHref: "/subscribe-simulator",
  },
  segment_c: {
    icon: Rocket,
    badge: "Exploitant actif",
    title: "Vous exploitez déjà une laverie",
    message:
      "Simulez l'impact d'un ajustement tarifaire sur votre rentabilité réelle. La plateforme Lavcom Performances est conçue pour piloter votre laverie au quotidien.",
    cta: "Découvrir la plateforme",
    ctaHref: "/connexion-exploitant",
  },
  segment_d: {
    icon: Network,
    badge: "Réseau / Multi-sites",
    title: "Vous pilotez un réseau ambitieux",
    message:
      "Pour des projets de cette envergure, notre offre de pilotage avancé vous donnera une vision complète de votre performance multi-sites avec des tableaux de bord dédiés.",
    cta: "Explorer le pilotage avancé",
    ctaHref: "/connexion-exploitant",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SegmentedRedirect({ lead, onBack }: Props) {
  const config = SEGMENT_CONFIG[lead.segmentation_type];
  const Icon = config.icon;

  const handleCta = () => {
    trackSegmentCTAClicked({
      segmentation_type: lead.segmentation_type,
      destination: config.ctaHref,
    });
    window.open(config.ctaHref, config.ctaHref.startsWith("http") ? "_blank" : "_self");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header with Lavcom logo */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="h-7 sm:h-8 w-auto"
            />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-4">
        <div className="w-full max-w-xl space-y-8">

          {/* ─── Hero section ─────────────────────────────── */}
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="w-14 h-14 bg-lavcom-orange-light rounded-2xl flex items-center justify-center mx-auto">
              <Icon size={28} className="text-lavcom-orange" />
            </div>

            {/* Badge segment */}
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-lavcom-orange-light text-lavcom-orange-dark">
              {config.badge}
            </span>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-snug">
              {config.title}
            </h2>

            {/* Message */}
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              {config.message}
            </p>

            {/* Email confirmation */}
            <p className="text-xs text-muted-foreground pt-1">
              Une synthèse a été préparée pour <strong className="text-foreground">{lead.email}</strong>
            </p>
          </div>

          {/* ─── Recommendation block ─────────────────────── */}
          <Card className="p-0 overflow-hidden border-lavcom-orange/25">
            <div className="border-l-4 border-lavcom-orange px-5 sm:px-6 py-5 bg-gradient-to-r from-lavcom-orange/5 to-transparent">
              <p className="text-xs font-bold text-lavcom-orange uppercase tracking-widest mb-2">
                Recommandation
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {config.message}
              </p>
            </div>
          </Card>

          {/* ─── Guide card ───────────────────────────────── */}
          <Card className="p-5 bg-gradient-to-br from-lavcom-orange/10 to-lavcom-orange/5 border-lavcom-orange/30">
            <div className="flex gap-5 items-start">
              <img 
                src={ebookAvantOuvrir} 
                alt="Guide Avant d'ouvrir" 
                className="w-[30%] h-auto rounded-md shadow-md shrink-0 hidden sm:block"
              />
              <div className="flex-1 min-w-0 py-2">
                <h3 className="text-sm font-bold text-foreground mb-2">
                  Aller plus loin avant d'ouvrir
                </h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-3">
                  Un guide concret pour vous aider à préparer votre projet de laverie : choix du local, configuration, fournisseurs, erreurs à éviter.
                </p>
                <a href="https://lavcom.fr/nos-ebooks-2/" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-lavcom-orange hover:bg-lavcom-orange-dark text-white">
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                    Découvrir le guide
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          {/* ─── Main CTA ─────────────────────────────────── */}
          <div className="text-center pt-2">
            <button
              onClick={handleCta}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-semibold text-base
                transition-all shadow-lg bg-lavcom-orange hover:bg-lavcom-orange-dark shadow-lavcom-orange/30 w-full sm:w-auto justify-center"
            >
              {config.cta}
              <ArrowRight size={18} />
            </button>
          </div>

          {/* ─── Back ─────────────────────────────────────── */}
          <div className="text-center">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} />
              Revenir à mes résultats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
