import "server-only";

/**
 * Integração com gateway de pagamento recorrente.
 *
 * Hoje NÃO há gateway conectado (PAYMENT_PROVIDER="none"). Nesse caso a
 * assinatura fica com status PENDING e o painel mostra "pagamento pendente".
 * Nenhum pagamento é simulado: a Unlock pode confirmar manualmente um
 * pagamento recebido (ex.: Pix) pelo Painel Master, e isso fica registrado.
 *
 * Para integrar (Asaas, Mercado Pago, Stripe, Pagar.me...), implemente
 * `PaymentGateway` em um arquivo novo nesta pasta e registre em `gateway()`.
 */
export type CheckoutInput = {
  tenantId: string;
  subscriptionId: string;
  planName: string;
  amountCents: number;
  customer: { name: string; email: string };
  returnUrl: string;
};

export type CheckoutResult = { url: string; providerRef: string };

export type WebhookEvent =
  | { type: "payment.paid"; providerRef: string; amountCents: number; paidAt: Date; method?: string }
  | { type: "payment.failed"; providerRef: string }
  | { type: "subscription.canceled"; providerRef: string };

export interface PaymentGateway {
  readonly id: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  parseWebhook(req: Request): Promise<WebhookEvent | null>;
}

export function gatewayId(): string {
  return process.env.PAYMENT_PROVIDER?.trim() || "none";
}

export function gateway(): PaymentGateway | null {
  switch (gatewayId()) {
    case "none":
      return null;
    default:
      console.warn(`PAYMENT_PROVIDER="${gatewayId()}" ainda não foi implementado.`);
      return null;
  }
}
