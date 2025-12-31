import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import heroSlide1 from "@/assets/hero-slide-new.png";
import heroSlide2 from "@/assets/hero-slide-2-new.png";
import heroSlide3 from "@/assets/hero-slide-3-new.png";
import heroSlide4 from "@/assets/hero-slide-4-new.png";

type HeroSlideId = "slide1" | "slide2" | "slide3" | "slide4";

type HeroSlide = {
  id: HeroSlideId;
  titleKey: string;
  subtitleKey: string;
  ctaLabelKey: string;
  image: string;
};

const heroSlidesConfig: HeroSlide[] = [
  {
    id: "slide1",
    titleKey: "hero.slides.slide1.title",
    subtitleKey: "hero.slides.slide1.subtitle",
    ctaLabelKey: "hero.slides.slide1.cta",
    image: heroSlide1
  },
  {
    id: "slide2",
    titleKey: "hero.slides.slide2.title",
    subtitleKey: "hero.slides.slide2.subtitle",
    ctaLabelKey: "hero.slides.slide2.cta",
    image: heroSlide2
  },
  {
    id: "slide3",
    titleKey: "hero.slides.slide3.title",
    subtitleKey: "hero.slides.slide3.subtitle",
    ctaLabelKey: "hero.slides.slide3.cta",
    image: heroSlide3
  },
  {
    id: "slide4",
    titleKey: "hero.slides.slide4.title",
    subtitleKey: "hero.slides.slide4.subtitle",
    ctaLabelKey: "hero.slides.slide4.cta",
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
      // Je veux optimiser mes laveries → inscription
      return "/signup";

    case "slide2":
      // Voir un exemple de tableau de bord → section démo
      return "/#demo";

    case "slide3":
      // Comprendre comment ça marche → section how-it-works
      return "/#how-it-works";

    case "slide4":
      // Analyser mes machines → inscription
      return "/signup";

    default:
      return "/";
  }
}

export const HeroValueSlider = () => {
  const { t } = useTranslation("landing");
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
    const nextIndex = (currentIndex + 1) % heroSlidesConfig.length;
    goToSlide(nextIndex);
  };

  const goToPrev = () => {
    const prevIndex = (currentIndex - 1 + heroSlidesConfig.length) % heroSlidesConfig.length;
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

  const currentSlide = heroSlidesConfig[currentIndex];
  const previousSlide = previousIndex !== null ? heroSlidesConfig[previousIndex] : null;
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
      {heroSlidesConfig.map((slide, index) => (
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

      {/* Layer 2: Gradient overlay - Mobile: stronger gradient on larger area */}
      <div 
        className="absolute inset-0 z-[2] dark:hidden"
        style={{
          background: `linear-gradient(
            to right,
            hsl(80, 25%, 92%) 0%,
            hsl(80, 25%, 92%, 0.98) 30%,
            hsl(80, 25%, 92%, 0.9) 45%,
            hsl(80, 25%, 92%, 0.6) 55%,
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
            hsl(80, 10%, 15%, 0.98) 30%,
            hsl(80, 10%, 15%, 0.9) 45%,
            hsl(80, 10%, 15%, 0.6) 55%,
            transparent 70%
          )`
        }}
      />

      {/* Layer 3: Blur effect on left side - wider on mobile for better readability */}
      <div 
        className="absolute inset-y-0 left-0 w-[65%] sm:w-[60%] md:w-[55%] z-[3]"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 100%)'
        }}
      />

      {/* Layer 4: Text content with crossfade */}
      <div className="relative z-[4] h-full min-h-[400px] md:min-h-[480px] lg:min-h-[520px] flex items-center">
        <div className="w-[70%] sm:w-[60%] md:w-full max-w-7xl md:mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-full md:max-w-[520px] lg:max-w-[560px] relative md:ml-4 lg:ml-8">
            {/* Previous slide text (fading out) */}
            {previousSlide && (
              <div className="absolute inset-0 animate-fade-out pointer-events-none">
                <h1 className="text-lg sm:text-xl md:text-3xl lg:text-[2.5rem] xl:text-[2.6rem] font-bold text-foreground mb-4 md:mb-6 leading-[1.2] md:leading-[1.15] max-w-full md:max-w-[500px]">
                  {t(previousSlide.titleKey)}
                </h1>
                <p className="hidden md:block text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-[460px]">
                  {t(previousSlide.subtitleKey)}
                </p>
              </div>
            )}

            {/* Current slide text (fading in) */}
            <div className={cn(
              "transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "100ms" }}>
              <h1 className="text-lg sm:text-xl md:text-3xl lg:text-[2.5rem] xl:text-[2.6rem] font-bold text-foreground mb-4 md:mb-6 leading-[1.2] md:leading-[1.15] max-w-full md:max-w-[500px]">
                {t(currentSlide.titleKey)}
              </h1>
            </div>
            
            {/* Subtitle - hidden on mobile */}
            <div className={cn(
              "hidden md:block transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "200ms" }}>
              <p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-10 leading-relaxed max-w-[460px]">
                {t(currentSlide.subtitleKey)}
              </p>
            </div>

            <div className={cn(
              "transition-all duration-700 ease-out",
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            )} style={{ transitionDelay: isTransitioning ? "0ms" : "300ms" }}>
              {isAnchorLink ? (
                <Button asChild size="default" className="group rounded-full px-4 md:px-8 text-sm md:text-base">
                  <a href={ctaHref}>
                    {t(currentSlide.ctaLabelKey)}
                    <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              ) : (
                <Button asChild size="default" className="group rounded-full px-4 md:px-8 text-sm md:text-base">
                  <Link to={ctaHref}>
                    {t(currentSlide.ctaLabelKey)}
                    <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Dots indicator */}
            <div className="flex items-center gap-1.5 md:gap-2 mt-8 md:mt-14">
              {heroSlidesConfig.map((_, index) => (
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
