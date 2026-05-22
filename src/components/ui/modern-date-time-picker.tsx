import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ModernDatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  value?: string;
  onChange?: (value: string) => void;
}

export function ModernDatePicker({ value, onChange, className, ...props }: ModernDatePickerProps) {
  return (
    <Input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn("w-full", className)}
      {...props}
    />
  );
}

interface ModernTimePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  value?: string;
  onChange?: (value: string) => void;
}

export function ModernTimePicker({ value, onChange, className, ...props }: ModernTimePickerProps) {
  return (
    <Input
      type="time"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn("w-full", className)}
      {...props}
    />
  );
}
