import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollTableProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScrollTable({ children, className }: HorizontalScrollTableProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    // Check after a small delay to ensure content is rendered
    const timer = setTimeout(checkScroll, 100);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    
    const scrollAmount = el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative group", className)}>
      {/* Left fade + arrow indicator */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />
      <button
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center transition-all duration-200",
          canScrollLeft
            ? "opacity-100 md:opacity-0 md:group-hover:opacity-100"
            : "opacity-0 pointer-events-none"
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Right fade + arrow indicator */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
      <button
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center transition-all duration-200",
          canScrollRight
            ? "opacity-100 md:opacity-0 md:group-hover:opacity-100"
            : "opacity-0 pointer-events-none"
        )}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
      >
        {children}
      </div>

      {/* Mobile scroll hint */}
      <div
        className={cn(
          "flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground md:hidden transition-opacity duration-200",
          canScrollRight || canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronLeft className="h-3 w-3" />
        <span>Glisser pour voir plus</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}
