import type { ReactNode } from "react";

interface WelcomeHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function WelcomeHeader({ title, subtitle, actions }: WelcomeHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
