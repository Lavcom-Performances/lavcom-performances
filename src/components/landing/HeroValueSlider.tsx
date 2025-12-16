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
    title: "Combien d'argent votre laverie laisse-t-elle sur la table ?",
    subtitle: "Vos centrales vous montrent ce que vous encaissez. Lavcom Performances vous montre ce que vous auriez pu encaisser : machines qui ne tournent pas, créneaux saturés, prix mal positionnés. Une laverie peut faire 150 000 € de chiffre d'affaires par an et laisser 10 à 20 000 € de potentiel inexploité.",
    ctaLabel: "Découvrir le tableau de bord",
    image: heroSlide1
  },
  {
    id: "slide2",
    title: "Une laverie peut tourner… et perdre de l'argent. Sans que vous le voyiez.",
    subtitle: "Beaucoup d'exploitants ne savent pas si leur laverie est vraiment rentable. Lavcom Performances calcule pour vous : votre seuil de rentabilité, les machines qui couvrent vos charges et celles qui grignotent votre marge. Vous ne regarderez plus votre chiffre d'affaires de la même façon.",
    ctaLabel: "Comprendre mes chiffres",
    image: heroSlide2
  },
  {
    id: "slide3",
    title: "Voir ses chiffres ne suffit pas. Il faut savoir quoi en faire.",
    subtitle: "Vos centrales collectent déjà des milliers de lignes de données. Problème : personne n'a le temps de les analyser. Lavcom Performances transforme ces données en recommandations claires : \"Augmenter tel prix\", \"Réduire tel horaire\", \"Vérifier telle machine\". 3 actions concrètes par mois, pas 300 tableaux Excel.",
    ctaLabel: "Voir comment ça marche",
    image: heroSlide3
  },
  {
    id: "slide4",
    title: "Vous connaissez le prix d'un cycle. Mais connaissez-vous le profit de chaque machine ?",
    subtitle: "Deux machines au même prix ne rapportent pas la même chose. Lavcom Performances vous montre quelles machines financent réellement votre laverie, lesquelles dorment, et où optimiser vos décisions (prix, parc, horaires). C'est la différence entre avoir des machines et piloter un parc rentable.",
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // TODO: Replace with actual auth context when implemented
  const user: UserContext | undefined = undefined;

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

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

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % heroSlides.length;
    goToSlide(nextIndex);
  };

  const goToPrev = () => {
    const prevIndex = (currentIndex - 1 + heroSlides.length) % heroSlides.length;
    goToSlide(prevIndex);
  };

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, isTransitioning]);

  const currentSlide = heroSlides[currentIndex];
  const previousSlide = previousIndex !== null ? heroSlides[previousIndex] : null;
  const ctaHref = getHeroCtaHref(currentSlide.id, user);
  const isAnchorLink = ctaHref.startsWith("/#");

  return (
    <section 
      className="relative w-full min-h-[400px] md:min-h-[480px] lg:min-h-[520px] overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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

      {/* Layer 2: Gradient overlay - Mobile: stronger gradient on left half */}
      <div 
        className="absolute inset-0 z-[2] dark:hidden"
        style={{
          background: `linear-gradient(
            to right,
            hsl(80, 25%, 92%) 0%,
            hsl(80, 25%, 92%, 0.98) 20%,
            hsl(80, 25%, 92%, 0.9) 35%,
            hsl(80, 25%, 92%, 0.6) 45%,
            transparent 55%
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
            hsl(80, 10%, 15%, 0.98) 20%,
            hsl(80, 10%, 15%, 0.9) 35%,
            hsl(80, 10%, 15%, 0.6) 45%,
            transparent 55%
          )`
        }}
      />

      {/* Layer 3: Blur effect on left side - narrower on mobile */}
      <div 
        className="absolute inset-y-0 left-0 w-[50%] md:w-[55%] z-[3]"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: 'linear-gradient(to right, black 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, black 30%, transparent 100%)'
        }}
      />

      {/* Layer 4: Text content with crossfade */}
      <div className="relative z-[4] h-full min-h-[400px] md:min-h-[480px] lg:min-h-[520px] flex items-center">
        <div className="w-[55%] md:w-full max-w-7xl md:mx-auto px-3 md:px-8 lg:px-16 xl:px-20">
          <div className="max-w-full md:max-w-[520px] lg:max-w-[540px] relative">
            {/* Previous slide text (fading out) */}
            {previousSlide && (
              <div className="absolute inset-0 animate-fade-out pointer-events-none">
                <h1 className="text-base md:text-3xl lg:text-[2.5rem] xl:text-[2.6rem] font-bold text-foreground mb-4 md:mb-6 leading-[1.15] max-w-full md:max-w-[480px]">
                  {previousSlide.title}
                </h1>
                <p className="hidden md:block text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                  {previousSlide.subtitle}
                </p>
              </div>
            )}

            {/* Current slide text (fading in) */}
            <div className={cn(
              "transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "100ms" }}>
              <h1 className="text-base md:text-3xl lg:text-[2.5rem] xl:text-[2.6rem] font-bold text-foreground mb-4 md:mb-6 leading-[1.15] max-w-full md:max-w-[480px]">
                {currentSlide.title}
              </h1>
            </div>
            
            {/* Subtitle - hidden on mobile */}
            <div className={cn(
              "hidden md:block transition-all duration-700 ease-out",
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
              {isAnchorLink ? (
                <Button asChild size="default" className="group rounded-full px-4 md:px-8 text-sm md:text-base">
                  <a href={ctaHref}>
                    {currentSlide.ctaLabel}
                    <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              ) : (
                <Button asChild size="default" className="group rounded-full px-4 md:px-8 text-sm md:text-base">
                  <Link to={ctaHref}>
                    {currentSlide.ctaLabel}
                    <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Dots indicator */}
            <div className="flex items-center gap-1.5 md:gap-2 mt-6 md:mt-12">
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
