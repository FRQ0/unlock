"use client";
import { useActionState } from "react";
import { startCheckoutAction } from "./actions";
import { SubmitButton } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";

export function CheckoutButton({ available }: { available: boolean }) {
  const [state, action] = useActionState(startCheckoutAction, undefined);
  if (!available) return null;
  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton size="lg" pendingText="Abrindo pagamento...">Pagar assinatura</SubmitButton>
    </form>
  );
}
