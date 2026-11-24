"use client";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "md" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none whitespace-nowrap";
const sizes: Record<Size, string> = { sm: "h-10 px-3.5 text-sm rounded-[10px]", md: "h-12 px-5 text-[15px] rounded-xl", lg: "h-14 px-6 text-base rounded-2xl" };
const variants: Record<Variant, string> = {
  primary: "bg-brasa text-grafite hover:bg-[#FF8259]",
  secondary: "border border-paper-line-2 text-ink bg-transparent hover:bg-black/5",
  ghost: "text-brasa-ink hover:bg-brasa-soft/60",
  danger: "border border-red-300 text-red-800 hover:bg-red-50",
  dark: "bg-grafite text-gelo hover:bg-carvao",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** Botão de envio que mostra "Salvando..." enquanto a ação roda. */
export function SubmitButton({ children, pendingText = "Salvando...", variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size; pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} aria-busy={pending} className={buttonClass(variant, size, className)} {...props}>
      {pending ? pendingText : children}
    </button>
  );
}
