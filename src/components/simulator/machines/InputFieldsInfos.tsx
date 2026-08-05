import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input";
import { ZodFormattedError } from "zod";
import type { MachineConfig } from "@/types/simulator.types";
import { useTranslation } from "react-i18next";

interface Props {
  count: number;
  price: number;
  cyclesPerDay: number;
  errors?: ZodFormattedError<MachineConfig, string>;
  onCountChange?: (value: number) => void;
  onPriceChange?: (value: number) => void;
  onCyclesChange?: (value: number) => void;
}

export function InputFieldsInfos({
  count,
  price,
  cyclesPerDay,
  errors,
  onCountChange,
  onPriceChange,
  onCyclesChange,
}: Props) {
  const { t } = useTranslation("paid-simulator");

  interface ErrorMessages {
    countError?: string;
    priceError?: string;
    cyclesPerDayError?: string;
  }

  const countError = errors?.count?._errors?.join(', ');
  const priceError = errors?.price?._errors?.join(', ');
  const cyclesPerDayError = errors?.cyclesPerDay?._errors?.join(', ');
  
  return (
    <FieldSet>
      <FieldGroup className="flex flex-row">
        <Field className="flex flex-col gap-1" data-invalid={Boolean(countError)}>
          <FieldLabel htmlFor="machine-number" className="text-xs text-muted-foreground">
            {t("machines.fields.count")}
          </FieldLabel>
          <Input 
            id="machine-number"
            className="bg-white"
            type="number"
            value={count}
            min={0}
            onChange={(e) => onCountChange?.(Number(e.target.value))}
            aria-invalid={Boolean(countError)}
          />
          {countError && <FieldError>{countError}</FieldError>}
        </Field>
        <Field className="flex flex-col gap-1" data-invalid={Boolean(priceError)}>
          <FieldLabel htmlFor="price" className="text-xs text-muted-foreground">
            {t("machines.fields.price")}
          </FieldLabel>
          <Input
            id="price"
            className="bg-white"
            type="number"
            step="0.5"
            value={price}
            min={0}
            onChange={(e) => onPriceChange?.(Number(e.target.value))}
            aria-invalid={Boolean(priceError)}
          />
          {priceError && <FieldError>{priceError}</FieldError>}
        </Field>
        <Field className="flex flex-col gap-1" data-invalid={Boolean(cyclesPerDayError)}>
          <FieldLabel htmlFor="cycles" className="text-xs text-muted-foreground">
            {t("machines.fields.cyclesPerDay")}
          </FieldLabel>
          <Input
            id="cycles"
            className="bg-white"
            type="number"
            value={cyclesPerDay}
            min={0}
            onChange={(e) => onCyclesChange?.(Number(e.target.value))}
            aria-invalid={Boolean(cyclesPerDayError)}
          />
          {cyclesPerDayError && <FieldError>{cyclesPerDayError}</FieldError>}
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}