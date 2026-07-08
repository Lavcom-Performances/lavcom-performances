interface Props {
  title: string;
  description?: string;
  align?: "center" | "left";
}

export function SectionHeading({ title, description, align = "center" }: Props) {
  const alignClass = align === "center" ? "text-center" : "text-left";
  return (
    <div className={`space-y-2 ${alignClass}`}>
      <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
      {description && <p className="text-base text-muted-foreground">{description}</p>}
    </div>
  );
}
