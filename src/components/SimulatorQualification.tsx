// PHASE 1 — Lavcom Performances
// Composant : SimulatorQualification.tsx
// Écran de qualification pré-simulateur (3 questions)

import { useState } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, Search, FileText, Store } from "lucide-react";
import lavcomLogo from "@/assets/lavcom-performances-header.png";

// ─── Types ───────────────────────────────────────────────────────────────────

export type QualifData = {
  stage: "exploring" | "location" | "financing" | "operator";
  capital_range: "lt20k" | "20_50k" | "50_100k" | "gt100k";
  machine_range: "1_4" | "5_8" | "9_14" | "15plus";
};

interface Props {
  onComplete: (data: QualifData) => void;
}

// ─── Questions config ─────────────────────────────────────────────────────────

const STEPS = [
  {
    key: "stage",
    question: "Où en êtes-vous dans votre projet ?",
    label: "Votre situation",
    options: [
      { label: "Je réfléchis à un projet", sub: "Phase d'exploration", value: "exploring", icon: Lightbulb },
      { label: "Je cherche un local", sub: "Phase de recherche", value: "location", icon: Search },
      { label: "Je suis en cours de financement", sub: "Phase de montage", value: "financing", icon: FileText },
      { label: "J'exploite déjà une laverie", sub: "Exploitant actif", value: "operator", icon: Store },
    ],
  },
  {
    key: "capital_range",
    question: "Quel apport personnel prévoyez-vous ?",
    label: "Votre apport",
    options: [
      { label: "Moins de 20 000 €", sub: "Projet en amorçage", value: "lt20k", icon: Lightbulb },
      { label: "20 000 – 50 000 €", sub: "Budget intermédiaire", value: "20_50k", icon: FileText },
      { label: "50 000 – 100 000 €", sub: "Budget structuré", value: "50_100k", icon: Store },
      { label: "Plus de 100 000 €", sub: "Investissement significatif", value: "gt100k", icon: Search },
    ],
  },
  {
    key: "machine_range",
    question: "Combien de machines envisagez-vous ?",
    label: "Votre projet",
    options: [
      { label: "1 à 4 machines", sub: "Petite laverie", value: "1_4", icon: Store },
      { label: "5 à 8 machines", sub: "Laverie standard", value: "5_8", icon: Store },
      { label: "9 à 14 machines", sub: "Grande laverie", value: "9_14", icon: Store },
      { label: "15 machines et plus", sub: "Réseau / multi-sites", value: "15plus", icon: Store },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SimulatorQualification({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QualifData>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const handleSelect = (value: string) => {
    setSelected(value);
  };

  const handleNext = () => {
    if (!selected || animating) return;

    const updatedAnswers = { ...answers, [currentStep.key]: selected };
    setAnswers(updatedAnswers);

    if (isLastStep) {
      setAnimating(true);
      setTimeout(() => {
        onComplete(updatedAnswers as QualifData);
      }, 400);
      return;
    }

    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setSelected(null);
      setAnimating(false);
    }, 300);
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
          <span className="text-xs text-muted-foreground font-medium">
            {step + 1} / {STEPS.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full bg-lavcom-orange transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8 sm:py-10 transition-opacity duration-300 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-lavcom-orange text-white"
                    : i === step
                    ? "bg-foreground text-background"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
            ))}
            <div className="ml-2 text-xs text-muted-foreground font-medium">
              {currentStep.label}
            </div>
          </div>

          {/* Intro text (step 0 only) */}
          {step === 0 && (
            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Avant de commencer
              </h1>
              <p className="text-muted-foreground text-base">
                3 questions rapides pour personnaliser votre estimation de rentabilité.
              </p>
            </div>
          )}

          {/* Question */}
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">
            {currentStep.question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {currentStep.options.map((opt) => {
              const isActive = selected === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    group relative text-left p-4 rounded-2xl border-2 transition-all duration-200
                    ${
                      isActive
                        ? "border-lavcom-orange bg-lavcom-orange-light shadow-md"
                        : "border-border bg-card hover:border-lavcom-orange/50 hover:bg-lavcom-orange-light/50"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isActive ? "bg-lavcom-orange/20" : "bg-muted"
                    }`}>
                      <Icon size={18} className={isActive ? "text-lavcom-orange" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-snug text-foreground">
                        {opt.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.sub}</div>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-lavcom-orange flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={handleNext}
            disabled={!selected}
            className={`
              w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl
              font-semibold text-base transition-all duration-200
              ${
                selected
                  ? "bg-lavcom-orange text-white hover:bg-lavcom-orange-dark shadow-lg shadow-lavcom-orange/30 cursor-pointer"
                  : "bg-border text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {isLastStep ? "Démarrer mon estimation" : "Continuer"}
            <ArrowRight size={18} />
          </button>

          {/* Trust signal */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            ✓ Estimation gratuite &nbsp;·&nbsp; ✓ Sans engagement &nbsp;·&nbsp; ✓ En moins de 2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
