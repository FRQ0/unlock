/** Contato comercial da Unlock (WhatsApp, se configurado; senão o Instagram). */
export function unlockContactUrl(message = "Olá! Quero conhecer o Unlock Gastro para o meu estabelecimento."): string {
  const wa = process.env.NEXT_PUBLIC_UNLOCK_WHATSAPP?.replace(/\D/g, "");
  if (wa) return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
  return "https://instagram.com/unlock_systems";
}
