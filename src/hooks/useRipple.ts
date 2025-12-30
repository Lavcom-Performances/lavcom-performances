import { useCallback, useRef } from "react";

interface RippleStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useRipple<T extends HTMLElement>() {
  const rippleRef = useRef<HTMLSpanElement | null>(null);

  const createRipple = useCallback((event: React.MouseEvent<T>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    
    const diameter = Math.max(rect.width, rect.height) * 2;
    const radius = diameter / 2;
    
    const rippleStyle: RippleStyle = {
      width: diameter,
      height: diameter,
      left: event.clientX - rect.left - radius,
      top: event.clientY - rect.top - radius,
    };

    // Remove existing ripple
    const existingRipple = element.querySelector(".ripple-effect");
    if (existingRipple) {
      existingRipple.remove();
    }

    // Create new ripple
    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    ripple.style.width = `${rippleStyle.width}px`;
    ripple.style.height = `${rippleStyle.height}px`;
    ripple.style.left = `${rippleStyle.left}px`;
    ripple.style.top = `${rippleStyle.top}px`;
    
    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.appendChild(ripple);

    // Remove ripple after animation
    ripple.addEventListener("animationend", () => {
      ripple.remove();
    });
  }, []);

  return { createRipple };
}
