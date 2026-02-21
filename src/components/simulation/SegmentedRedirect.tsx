import { ArrowRight, BookOpen, BarChart2, Rocket, Network, ChevronLeft } from "lucide-react";
import { SegmentType, LeadData } from "@/components/simulation/EmailCaptureModal";

interface Props {
  lead: LeadData;
  onBack: () => void;
}

// ─── Config par segment ────────────────────────────────────────────────────────

const SEGMENT_CONFIG = {
  segment_a: {
    icon: BookOpen,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "Projet en préparation",
    badgeBg: "bg-blue-100 text-blue-700",
    title: "Votre projet est en phase de préparation",
    message:
      "Avant de passer aux chiffres détaillés, nous vous recommandons de consulter notre guide complet. Il vous aidera à poser les bonnes bases pour votre laverie : choix du local, configuration, fournisseurs, erreurs à éviter.",
    cta: "Découvrir le guide gratuit",
    ctaHref: "https://lavcom.fr/nos-ebooks-2/",
    ctaBg: "bg-blue-600 hover:bg-blue-700 shadow-blue-200",
  },
  segment_b: {
    icon: BarChart2,
    iconBg: "bg-[#FFF3DC]",
    iconColor: "text-[#E8A020]",
    badge: "Projet structuré",
    badgeBg: "bg-[#FFF3DC] text-[#C47D0A]",
    title: "Votre projet est structuré",
    message:
      "Votre profil correspond à un investissement sérieux. Le simulateur professionnel Lavcom vous permettra d'intégrer vos coûts réels, votre financement et vos projections sur 5 ans.",
    cta: "Accéder au simulateur professionnel",
    ctaHref: "/subscribe-simulator",
    ctaBg: "bg-[#E8A020] hover:bg-[#D4920E] shadow-[#E8A020]/30",
  },
  segment_c: {
    icon: Rocket,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    badge: "Exploitant actif",
    badgeBg: "bg-green-100 text-green-700",
    title: "Vous exploitez déjà une laverie",
    message:
      "Simulez l'impact d'un ajustement tarifaire sur votre rentabilité réelle. La plateforme Lavcom Performances est conçue pour piloter votre laverie au quotidien.",
    cta: "Découvrir la plateforme",
    ctaHref: "/connexion-exploitant",
    ctaBg: "bg-green-600 hover:bg-green-700 shadow-green-200",
  },
  segment_d: {
    icon: Network,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "Réseau / Multi-sites",
    badgeBg: "bg-purple-100 text-purple-700",
    title: "Vous pilotez un réseau ambitieux",
    message:
      "Pour des projets de cette envergure, notre offre de pilotage avancé vous donnera une vision complète de votre performance multi-sites avec des tableaux de bord dédiés.",
    cta: "Explorer le pilotage avancé",
    ctaHref: "/connexion-exploitant",
    ctaBg: "bg-purple-600 hover:bg-purple-700 shadow-purple-200",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SegmentedRedirect({ lead, onBack }: Props) {
  const config = SEGMENT_CONFIG[lead.segmentation_type];
  const Icon = config.icon;

  const handleCta = () => {
    window.open(config.ctaHref, config.ctaHref.startsWith("http") ? "_blank" : "_self");
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg text-center space-y-6">

        {/* Icône */}
        <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto`}>
          <Icon size={32} className={config.iconColor} />
        </div>

        {/* Badge segment */}
        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${config.badgeBg}`}>
          {config.badge}
        </span>

        {/* Titre */}
        <h2 className="text-2xl font-bold text-[#2C2C2C] leading-snug">
          {config.title}
        </h2>

        {/* Message */}
        <p className="text-[#6B6B6B] text-base leading-relaxed max-w-md mx-auto">
          {config.message}
        </p>

        {/* Email de confirmation discret */}
        <p className="text-xs text-[#9E9E9E]">
          Une synthèse a été préparée pour <strong>{lead.email}</strong>
        </p>

        {/* CTA principal */}
        <button
          onClick={handleCta}
          className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-semibold text-base
            transition-all shadow-lg ${config.ctaBg}`}
        >
          {config.cta}
          <ArrowRight size={18} />
        </button>

        {/* Retour */}
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-[#9E9E9E] hover:text-[#2C2C2C] transition-colors mt-2"
          >
            <ChevronLeft size={14} />
            Revenir à mes résultats
          </button>
        </div>
      </div>
    </div>
  );
}