import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. Імпортуємо провайдер
import { CartProvider } from "./components/CartContext"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "REBRAND B2B",
  description: "Простір вашого бренду",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={inter.className}>
        {/* 2. Обгортаємо children у CartProvider */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}