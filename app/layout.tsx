import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext"; // Імпорт 1
import CartDrawer from "@/components/CartDrawer"; // Імпорт 2

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2B Portal",
  description: "Wholesale portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={inter.className}>
        <CartProvider> {/* Обгортка */}
          {children}
          <CartDrawer /> {/* Сам кошик */}
        </CartProvider>
      </body>
    </html>
  );
}