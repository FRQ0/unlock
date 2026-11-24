"use client";
import { useActionState } from "react";
import { loginAction } from "../actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  const error = state?.error ?? initialError;
  return (
    <form action={action} className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton size="lg" pendingText="Entrando...">Entrar</SubmitButton>
    </form>
  );
}
