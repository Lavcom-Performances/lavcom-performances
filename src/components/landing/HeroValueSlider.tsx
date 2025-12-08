import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const valuePropositions = [
  {
    title: "Gagnez plus avec vos laveries",
    subtitle: "Suivez votre CA en temps réel, identifiez vos machines sous-performantes et prenez les bonnes décisions pour augmenter votre rentabilité."
  },
  {
    title: "Fini les laveries qui tournent à perte",
    subtitle: "Visualisez enfin ce qui se passe vraiment dans votre laverie : recettes, taux d'occupation, rentabilité par machine."
  },
  {
    title: "Savez-vous combien vous rapporte chaque machine ?",
    subtitle: "Lavcom Analytics connecte vos centrales de paiement et vous montre exactement où optimiser votre rentabilité."
  },
  {
    title: "Transformez vos données en décisions rentables",
    subtitle: "La première plateforme analytics 100% dédiée aux exploitants de laveries automatiques."
  }
];

export const HeroValueSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % valuePropositions.length);
        setIsAnimating(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentProposition = valuePropositions[currentIndex];

  return (
    <div className="relative min-h-[180px] md:min-h-[200px] flex flex-col items-center justify-center">
      {/* Title */}
      <h1 
        className={cn(
          "text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight transition-all duration-500 text-center",
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}
      >
        {currentProposition.title}
      </h1>
      
      {/* Subtitle */}
      <p 
        className={cn(
          "text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto transition-all duration-500 delay-100 text-center",
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}
      >
        {currentProposition.subtitle}
      </p>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {valuePropositions.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsAnimating(true);
              setTimeout(() => {
                setCurrentIndex(index);
                setIsAnimating(false);
              }, 300);
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex 
                ? "bg-primary w-6" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Proposition ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
