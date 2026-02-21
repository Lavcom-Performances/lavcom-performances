// PHASE 1 — Lavcom Performances
// Composant : SimulatorQualification.tsx
// Écran de qualification pré-simulateur (3 questions)

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
      { label: "Je réfléchis à un projet", sub: "Phase d'exploration", value: "exploring", emoji: "💡" },
      { label: "Je cherche un local", sub: "Phase de recherche", value: "location", emoji: "🔍" },
      { label: "Je suis en cours de financement", sub: "Phase de montage", value: "financing", emoji: "📋" },
      { label: "J'exploite déjà une laverie", sub: "Exploitant actif", value: "operator", emoji: "🏪" },
    ],
  },
  {
    key: "capital_range",
    question: "Quel apport personnel prévoyez-vous ?",
    label: "Votre apport",
    options: [
      { label: "Moins de 20 000 €", sub: "Projet en amorçage", value: "lt20k", emoji: "🌱" },
      { label: "20 000 – 50 000 €", sub: "Budget intermédiaire", value: "20_50k", emoji: "📈" },
      { label: "50 000 – 100 000 €", sub: "Budget structuré", value: "50_100k", emoji: "💼" },
      { label: "Plus de 100 000 €", sub: "Investissement significatif", value: "gt100k", emoji: "🏦" },
    ],
  },
  {
    key: "machine_range",
    question: "Combien de machines envisagez-vous ?",
    label: "Votre projet",
    options: [
      { label: "1 à 4 machines", sub: "Petite laverie", value: "1_4", emoji: "🔵" },
      { label: "5 à 8 machines", sub: "Laverie standard", value: "5_8", emoji: "🟢" },
      { label: "9 à 14 machines", sub: "Grande laverie", value: "9_14", emoji: "🟠" },
      { label: "15 machines et plus", sub: "Réseau / multi-sites", value: "15plus", emoji: "🔶" },
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
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DC] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[#2C2C2C] font-bold text-sm tracking-widest uppercase">
              LAV<span className="text-[#E8A020]">COM</span>
            </span>
            <span className="text-[#2C2C2C] font-bold text-sm tracking-widest uppercase ml-1">
              PERFORMANCES
            </span>
          </div>
          <span className="text-xs text-[#9E9E9E] font-medium">
            {step + 1} / {STEPS.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#E8E4DC]">
        <div
          className="h-full bg-[#E8A020] transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-4 py-10 transition-opacity duration-300 ${
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
                    ? "bg-[#E8A020] text-white"
                    : i === step
                    ? "bg-[#2C2C2C] text-white"
                    : "bg-[#E8E4DC] text-[#9E9E9E]"
                }`}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
            ))}
            <div className="ml-2 text-xs text-[#9E9E9E] font-medium">
              {currentStep.label}
            </div>
          </div>

          {/* Intro text (step 0 only) */}
          {step === 0 && (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#2C2C2C] mb-2">
                Avant de commencer
              </h1>
              <p className="text-[#6B6B6B] text-base">
                3 questions rapides pour personnaliser votre estimation de rentabilité.
              </p>
            </div>
          )}

          {/* Question */}
          <h2 className="text-xl font-bold text-[#2C2C2C] mb-6">
            {currentStep.question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {currentStep.options.map((opt) => {
              const isActive = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    group relative text-left p-4 rounded-2xl border-2 transition-all duration-200
                    ${
                      isActive
                        ? "border-[#E8A020] bg-[#FFF8EC] shadow-md"
                        : "border-[#E8E4DC] bg-white hover:border-[#E8A020]/50 hover:bg-[#FFFCF7]"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-snug text-[#2C2C2C]">
                        {opt.label}
                      </div>
                      <div className="text-xs text-[#9E9E9E] mt-0.5">{opt.sub}</div>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-[#E8A020] flex items-center justify-center flex-shrink-0">
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
                  ? "bg-[#E8A020] text-white hover:bg-[#D4920E] shadow-lg shadow-[#E8A020]/30 cursor-pointer"
                  : "bg-[#E8E4DC] text-[#B0A898] cursor-not-allowed"
              }
            `}
          >
            {isLastStep ? "Démarrer mon estimation" : "Continuer"}
            <ArrowRight size={18} />
          </button>

          {/* Trust signal */}
          <p className="text-center text-xs text-[#B0A898] mt-4">
            ✓ Estimation gratuite &nbsp;·&nbsp; ✓ Sans engagement &nbsp;·&nbsp; ✓ En moins de 2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
