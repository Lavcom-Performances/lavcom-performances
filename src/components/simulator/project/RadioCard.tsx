import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LucideIcon } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  options: readonly Option[];
  defaultValue?: string;
  name: string;
}

export function RadioCard({ icon: Icon, title, description, options, defaultValue, name }: Props) {
  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          <span className="text-sm font-medium text-destructive">*</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <RadioGroup defaultValue={defaultValue} className="space-y-2">
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/40"
            >
              <RadioGroupItem value={opt.value} id={`${name}-${opt.value}`} />
              <Label htmlFor={`${name}-${opt.value}`} className="flex-1 cursor-pointer text-sm">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </FormCard>
  );
}
