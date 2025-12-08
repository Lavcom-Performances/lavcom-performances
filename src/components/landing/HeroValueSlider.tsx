import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import heroSlide1 from "@/assets/hero-slide-1.png";
import heroSlide2 from "@/assets/hero-slide-2.png";
import heroSlide3 from "@/assets/hero-slide-3.png";
import heroSlide4 from "@/assets/hero-slide-4.png";

const valuePropositions = [
  {
    title: "Gagnez plus avec vos laveries",
    subtitle: "Suivez votre CA en temps réel, identifiez vos machines sous-performantes et prenez les bonnes décisions pour augmenter votre rentabilité.",
    image: heroSlide1
  },
  {
    title: "Fini les laveries qui tournent à perte",
    subtitle: "Visualisez enfin ce qui se passe vraiment dans votre laverie : recettes, taux d'occupation, rentabilité par machine.",
    image: heroSlide2
  },
  {
    title: "Savez-vous combien vous rapporte chaque machine ?",
    subtitle: "Lavcom Analytics connecte vos centrales de paiement et vous montre exactement où optimiser votre rentabilité.",
    image: heroSlide3
  },
  {
    title: "Transformez vos données en décisions rentables",
    subtitle: "La première plateforme analytics 100% dédiée aux exploitants de laveries automatiques.",
    image: heroSlide4
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

  const handleDotClick = (index: number) => {
    if (index === currentIndex) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <section className="relative w-full min-h-[420px] md:min-h-[480px] bg-lavcom-gray-100 dark:bg-lavcom-gray-800 overflow-hidden">
      {/* Grid layout: text left, image right */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[420px] md:min-h-[480px]">
        {/* Left: Text content */}
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 md:py-16 z-10">
          <h1 
            className={cn(
              "text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight transition-all duration-500",
              isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            )}
          >
            {currentProposition.title}
          </h1>
          
          <p 
            className={cn(
              "text-base md:text-lg text-muted-foreground max-w-lg mb-6 md:mb-8 transition-all duration-500 delay-100",
              isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            )}
          >
            {currentProposition.subtitle}
          </p>

          <div 
            className={cn(
              "transition-all duration-500 delay-200",
              isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            )}
          >
            <Button asChild size="lg" className="group">
              <Link to="/pricing">
                Découvrir Lavcom Analytics
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Dots indicator */}
          <div className="flex items-center gap-2 mt-8 md:mt-12">
            {valuePropositions.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === currentIndex 
                    ? "bg-primary w-8" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                )}
                aria-label={`Proposition ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right: Image with gradient overlay */}
        <div className="relative hidden md:block">
          {/* Image */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500",
              isAnimating ? "opacity-0" : "opacity-100"
            )}
            style={{ backgroundImage: `url(${currentProposition.image})` }}
          />
          
          {/* Gradient overlay from left (blending with background) */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-lavcom-gray-100 via-lavcom-gray-100/80 via-30% to-transparent dark:from-lavcom-gray-800 dark:via-lavcom-gray-800/80"
          />
        </div>
      </div>

      {/* Mobile: Background image with overlay */}
      <div 
        className={cn(
          "absolute inset-0 md:hidden bg-cover bg-center bg-no-repeat transition-opacity duration-500",
          isAnimating ? "opacity-0" : "opacity-20"
        )}
        style={{ backgroundImage: `url(${currentProposition.image})` }}
      />
    </section>
  );
};
