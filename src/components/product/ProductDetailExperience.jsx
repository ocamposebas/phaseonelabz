import { useEffect, useRef } from "react";
import { CartProvider } from "../cart/CartContext";

import Header from "../nav/Navbar.jsx";
import CartDrawer from "../cart/CartDrawer.jsx";
import ProductDetailSection from "./ProductDetailSection.jsx";
import NewsletterSection from "../footer/NewsletterSection.jsx";
import SiteFooter from "../footer/SiteFooter.jsx";
import SuggestedProductsSection from "./SuggestedProductsSection";
export default function ProductDetailExperience({
  product,
  recommendedProducts = [],
}) {
  const viewTrackedRef = useRef(false);

  useEffect(() => {
    if (
      viewTrackedRef.current ||
      typeof window.P1?.viewContent !== "function" ||
      !product
    ) {
      return;
    }

    window.P1.viewContent({
      name: product.name || "Product",
      price: Number(
        product.price || product.sale_price || product.regular_price || 0,
      ),
      sku: String(product.sku || product.id || product.slug || ""),
    });
    viewTrackedRef.current = true;
  }, [product]);

  return (
    <CartProvider>
      <Header logoSrc="/TRANSPARENCIA-03.webp" transparentOnTop={true} />

      <main className="product-detail-page">
        <ProductDetailSection
          product={product}
          recommendedProducts={recommendedProducts}
        />

<SuggestedProductsSection
  products={recommendedProducts}
  currentProductId={product?.id}
/>
        <div className="product-detail-after">
          <NewsletterSection />
          <SiteFooter />
        </div>
      </main>

      <CartDrawer />

      <style>{`
        .product-detail-after {
          position: relative;
          z-index: 5;
        }

        .product-detail-page .pdp {
          padding-top: 188px !important;
        }

        @media (max-width: 1180px) {
          .product-detail-page .pdp {
            padding-top: 250px !important;
          }
        }

        @media (max-width: 768px) {
          .product-detail-page .pdp {
            padding-top: 220px !important;
          }
        }
      `}</style>
    </CartProvider>
  );
}
