"use client";
import { useCallback, useState } from "react";
import type { MenuData, MenuProduct } from "@/lib/menu";
import { CartProvider } from "./cart";
import { MenuShell, MenuView } from "./MenuView";
import { ProductSheet } from "./ProductSheet";
import { CartSheet } from "./CartSheet";
import { CartBar } from "./CartBar";

export function orderingState(info: MenuData["info"]) {
  if (!info.acceptsOrders) return { canOrder: false, reason: "Pedidos pelo cardápio estão desativados. Peça ao atendente." };
  if (info.openNow === false) return { canOrder: false, reason: "Estamos fechados agora. Confira o horário de funcionamento." };
  return { canOrder: true, reason: null };
}

export function MenuApp({ data }: { data: MenuData }) {
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { canOrder, reason } = orderingState(data.info);
  const close = useCallback(() => setProduct(null), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  return (
    <CartProvider slug={data.info.slug}>
      <MenuShell data={data} className="min-h-dvh">
        <MenuView data={data} onOpenProduct={setProduct} />
        <ProductSheet product={product} onClose={close} canOrder={canOrder} closedReason={reason} />
        <CartSheet open={cartOpen} onClose={closeCart} info={data.info} canOrder={canOrder} closedReason={reason} />
        <CartBar onOpen={() => setCartOpen(true)} />
      </MenuShell>
    </CartProvider>
  );
}
