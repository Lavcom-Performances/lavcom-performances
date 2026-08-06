import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError } from "@/components/ui/field";
import { Trash2 } from "lucide-react";
import { SUBSCRIPTION_CATEGORIES } from "@/config/simulatorFormOptions";
import { useTranslation } from "react-i18next";
import { fixedCostSchema, variableCostSchema } from "@/lib/validation/simulatorProjectSchema";
import { FixedCostItem, VariableCostItem } from "@/types/simulator.types";

interface Props {
  cost: FixedCostItem | VariableCostItem;
  label?: string;
  subscription?: boolean;
  other?: boolean;
  value: number;
  suffix?: string;
  placeholder?: string;
  costType: "fixed" | "variable";
  attempted: boolean;
  onChangeLabel?: (value: string) => void;
  onChangeValue: (value: number) => void;
  onRemove?: () => void;
}

export function CostRow({
  cost,
  label,
  subscription,
  other,
  value,
  suffix,
  placeholder = "0",
  costType,
  attempted,
  onChangeLabel,
  onChangeValue,
  onRemove,
}: Props) {
  const { t } = useTranslation("paid-simulator");
  const suffixLabel = suffix ?? (costType === "fixed" ? t("common.euroPerMonth") : t("common.percentOfRevenue"));
  
  const schema = costType === "fixed" ? fixedCostSchema : variableCostSchema;
  const validation = schema.safeParse(cost);
  const formattedErrors = validation.success ? undefined : validation.error.format();
  
  const amountField = costType === "fixed" ? "amount" : "percent";
  const amountError = attempted ? formattedErrors?.[amountField]?._errors?.[0] : undefined;
  const labelError = attempted 
    ? (cost.category === "other" || cost.category === "subscription") 
      ? formattedErrors?.label?._errors?.[0]
      : undefined
    : undefined;

  const items: [string, {label: string; category:string}][] = Object.entries(SUBSCRIPTION_CATEGORIES);
  const itemsLabels: string[] = items.map(item => item[0]);
  
  const [isOtherSelected, setIsOtherSelected] = useState(
    (subscription
      && (!(itemsLabels.some(itemsLabel => itemsLabel === label)) && label !== "")
    ) ? true
    : false
  );

  const handleSubscriptionChange = (value: string) => {
    if (value === "Autre abonnement") {
      setIsOtherSelected(true);
      onChangeLabel?.("");
    } else {
      setIsOtherSelected(false);
      onChangeLabel?.(value);
    }
  };

  return (
    <div className="flex gap-2 items-baseline">
      { label && !other && !subscription && (
        <span className="text-sm text-foreground grow">
          {t(`options.${costType}CostCategories.${label}`)}
        </span>
      )}
      { subscription && (
        <>
          <Select 
            value={isOtherSelected
              ? "Autre abonnement" 
              : label !== ""
                ? SUBSCRIPTION_CATEGORIES[label].label
                : ""
            }
            onValueChange={(value) => handleSubscriptionChange(value)}
          >
            <SelectTrigger 
              className="bg-white shadow-form text-left w-max grow"
            >
              <SelectValue placeholder={t("charges.subscriptions.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item[0]} value={item[1].label}>
                    {t(`options.subscriptionCategories.${item[0]}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {isOtherSelected && (
            <Field className="flex flex-col gap-1" data-invalid={Boolean(labelError)}>
              <Input
                type="text"
                value={label || ""}
                onChange={(e) => onChangeLabel?.(e.target.value)}
                placeholder={t("common.label")}
                className="bg-white shadow-form grow"
                aria-invalid={Boolean(labelError)}
              />
              {labelError && <FieldError>{labelError}</FieldError>}
            </Field>
          )}
        </>
      )}
      { other && (
        <Field className="flex flex-col gap-1" data-invalid={Boolean(labelError)}>
          <Input
            type="text"
            value={label || ""}
            placeholder={t("common.label")}
            onChange={(e) => onChangeLabel?.(e.target.value)}
            className="bg-white shadow-form grow"
            aria-invalid={Boolean(labelError)}
          />
          {labelError && <FieldError>{labelError}</FieldError>}
        </Field>
      )}
      
      <div className="flex items-center gap-2 ml-auto">
        <Field className="flex flex-col gap-1 w-[82px]" data-invalid={Boolean(amountError)}>
          <Input
            type="number"
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChangeValue(Number(e.target.value))}
            className="bg-white shadow-form text-right"
            aria-invalid={Boolean(amountError)}
          />
          {amountError && <FieldError>{amountError}</FieldError>}
        </Field>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{suffixLabel}</span>
      
      {onRemove ? (
        <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ) : (
        <span className="hidden md:block md:w-9" />
      )}
    </div>
  );
}
