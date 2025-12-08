import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import heroSlide1 from "@/assets/hero-slide-new.png";
import heroSlide2 from "@/assets/hero-slide-2-new.png";
import heroSlide3 from "@/assets/hero-slide-3-new.png";
import heroSlide4 from "@/assets/hero-slide-4-new.png";

type HeroSlideId = "slide1" | "slide2" | "slide3" | "slide4";

type HeroSlide = {
  id: HeroSlideId;
  title: string;
  subtitle: string;
  ctaLabel: string;
  image: string;
};

const heroSlides: HeroSlide[] = [
  {
    id: "slide1",
    title: "Gagnez plus avec vos laveries",
    subtitle: "Suivez votre CA en temps réel, identifiez vos machines sous-performantes et prenez les bonnes décisions pour augmenter votre rentabilité.",
    ctaLabel: "Découvrir le tableau de bord",
    image: heroSlide1
  },
  {
    id: "slide2",
    title: "Fini les laveries qui tournent à perte",
    subtitle: "Visualisez enfin ce qui se passe vraiment dans votre laverie : recettes, taux d'occupation, rentabilité par machine. Et simulez votre prochain projet avant d'investir.",
    ctaLabel: "Comprendre mes chiffres",
    image: heroSlide2
  },
  {
    id: "slide3",
    title: "Transformez vos données de paiement en décisions rentables",
    subtitle: "La première plateforme analytics 100% dédiée aux exploitants de laveries automatiques.",
    ctaLabel: "Voir comment ça marche",
    image: heroSlide3
  },
  {
    id: "slide4",
    title: "Savez-vous vraiment combien vous rapporte chaque machine ?",
    subtitle: "Lavcom Analytics connecte vos centrales de paiement et vous montre exactement où optimiser votre rentabilité.",
    ctaLabel: "Analyser mes machines",
    image: heroSlide4
  }
];

type UserContext = {
  isAuthenticated: boolean;
  hasLaundromat?: boolean;
};

function getHeroCtaHref(slideId: HeroSlideId, user?: UserContext): string {
  switch (slideId) {
    case "slide1":
      // Découvrir le tableau de bord
      if (user?.isAuthenticated && user?.hasLaundromat) {
        return "/dashboard";
      }
      return "/pricing";

    case "slide2":
      // Comprendre mes chiffres → simulateur
      return "/simulateur";

    case "slide3":
      // Voir comment ça marche → section de la landing
      return "/#how-it-works";

    case "slide4":
      // Analyser mes machines
      if (user?.isAuthenticated && user?.hasLaundromat) {
        return "/dashboard";
      }
      return "/pricing";

    default:
      return "/";
  }
}

export const HeroValueSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // TODO: Replace with actual auth context when implemented
  const user: UserContext | undefined = undefined;

  const goToSlide = (newIndex: number) => {
    if (newIndex === currentIndex || isTransitioning) return;
    setPreviousIndex(currentIndex);
    setCurrentIndex(newIndex);
    setIsTransitioning(true);
    
    // End transition after animation completes
    setTimeout(() => {
      setPreviousIndex(null);
      setIsTransitioning(false);
    }, 800);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % heroSlides.length;
      goToSlide(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, isTransitioning]);

  const currentSlide = heroSlides[currentIndex];
  const previousSlide = previousIndex !== null ? heroSlides[previousIndex] : null;
  const ctaHref = getHeroCtaHref(currentSlide.id, user);
  const isAnchorLink = ctaHref.startsWith("/#");

  return (
    <section className="relative w-full min-h-[400px] md:min-h-[480px] lg:min-h-[520px] overflow-hidden">
      {/* Layer 1: Background images with crossfade */}
      {heroSlides.map((slide, index) => (
        <div 
          key={slide.id}
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
          style={{ 
            backgroundImage: `url(${slide.image})`,
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 1 : 0
          }}
        />
      ))}

      {/* Layer 2: Gradient overlay - from solid left to transparent right */}
      <div 
        className="absolute inset-0 z-[2] dark:hidden"
        style={{
          background: `linear-gradient(
            to right,
            hsl(80, 25%, 92%) 0%,
            hsl(80, 25%, 92%, 0.95) 25%,
            hsl(80, 25%, 92%, 0.8) 40%,
            hsl(80, 25%, 92%, 0.5) 55%,
            transparent 70%
          )`
        }}
      />

      {/* Layer 2: Dark mode gradient overlay */}
      <div 
        className="absolute inset-0 z-[2] hidden dark:block"
        style={{
          background: `linear-gradient(
            to right,
            hsl(80, 10%, 15%) 0%,
            hsl(80, 10%, 15%, 0.95) 25%,
            hsl(80, 10%, 15%, 0.8) 40%,
            hsl(80, 10%, 15%, 0.5) 55%,
            transparent 70%
          )`
        }}
      />

      {/* Layer 3: Blur effect on left side */}
      <div 
        className="absolute inset-y-0 left-0 w-[55%] z-[3]"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 100%)'
        }}
      />

      {/* Layer 4: Text content with crossfade */}
      <div className="relative z-[4] h-full min-h-[400px] md:min-h-[480px] lg:min-h-[520px] flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="max-w-xl relative">
            {/* Previous slide text (fading out) */}
            {previousSlide && (
              <div className="absolute inset-0 animate-fade-out pointer-events-none">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
                  {previousSlide.title}
                </h1>
                <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                  {previousSlide.subtitle}
                </p>
              </div>
            )}

            {/* Current slide text (fading in) */}
            <div className={cn(
              "transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "100ms" }}>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
                {currentSlide.title}
              </h1>
            </div>
            
            <div className={cn(
              "transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "200ms" }}>
              <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                {currentSlide.subtitle}
              </p>
            </div>

            <div className={cn(
              "transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "300ms" }}>
              <div className="flex items-center gap-3">
                {isAnchorLink ? (
                  <Button asChild size="lg" className="group rounded-full px-8">
                    <a href={ctaHref}>
                      {currentSlide.ctaLabel}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="group rounded-full px-8">
                    <Link to={ctaHref}>
                      {currentSlide.ctaLabel}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: '#A5C800' }}>
                  Gratuit
                </span>
              </div>
            </div>

            {/* Dots indicator */}
            <div className="flex items-center gap-2 mt-8 md:mt-12">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentIndex 
                      ? "bg-primary w-8" 
                      : "bg-foreground/30 hover:bg-foreground/50 w-2"
                  )}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
