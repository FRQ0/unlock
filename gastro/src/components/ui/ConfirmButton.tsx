"use client";
import type { ComponentProps } from "react";
import { buttonClass, type Variant } from "./Button";

/** Botão de envio que pede confirmação antes (ex.: excluir). */
export function ConfirmButton({ message, variant = "danger", size = "sm", className = "", ...props }: ComponentProps<"button"> & { message: string; variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="submit"
      className={buttonClass(variant, size, className)}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
      {...props}
    />
  );
}
