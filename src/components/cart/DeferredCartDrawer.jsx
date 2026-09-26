import { lazy, Suspense } from "react";
import { useCart } from "./CartContext.jsx";

const CartDrawer = lazy(() => import("./CartDrawer.jsx"));

export default function DeferredCartDrawer() {
  const { isCartOpen } = useCart();

  if (!isCartOpen) return null;

  return (
    <Suspense fallback={null}>
      <CartDrawer />
    </Suspense>
  );
}
