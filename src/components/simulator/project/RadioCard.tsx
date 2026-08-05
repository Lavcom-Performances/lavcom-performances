import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Option {
  value: string;
  label: string;
  shape?: string;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  options: readonly Option[];
  value?: string;
  onValueChange?: (v: string) => void;
  defaultValue?: string;
  name: string;
  required: boolean;
  optionKeyPrefix?: string;
}

export function RadioCard({ icon: Icon, title, description, options, value, onValueChange, defaultValue, name, required, optionKeyPrefix }: Props) {
  const { t } = useTranslation("paid-simulator");
  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          {required && <span className="text-sm font-medium text-destructive">*</span>}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={onValueChange}
          defaultValue={value === undefined ? defaultValue : undefined}
          className="space-y-2"
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/40 shadow-form"
            >
              <RadioGroupItem value={opt.value} id={`${name}-${opt.value}`} />
              <Label htmlFor={`${name}-${opt.value}`} className="flex items-center cursor-pointer text-sm">
                {optionKeyPrefix ? t(`${optionKeyPrefix}.${opt.value}`) : opt.label}
                {opt.shape && <span className="inline-block ml-3"><img src={opt.shape} alt="" /></span>}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </FormCard>
  );
}
