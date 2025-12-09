import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import Header from "@/components/Header"; // <--- Імпорт

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
        <CartProvider>
          <Header /> {/* <--- Шапка тут, вона буде на ВСІХ сторінках */}
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}