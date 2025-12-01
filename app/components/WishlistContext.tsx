"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { WishlistProvider } from "../components/WishlistContext";
interface WishlistContextType {
  wishlistIds: number[];
  toggleWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export default function RootLayout({ children }: ... ) {
  return (
    <html>
      <body>
        <CartProvider>
           <WishlistProvider>  {/* <--- Обгортаємо тут */}
              {children}
           </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Завантажуємо ID лайкнутих товарів при старті
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data } = await supabase
          .from('wishlist')
          .select('product_id')
          .eq('user_id', session.user.id);
        
        if (data) {
          setWishlistIds(data.map(item => item.product_id));
        }
      }
    };
    init();
  }, []);

  // 2. Функція Лайк/Дизлайк
  const toggleWishlist = async (productId: number) => {
    if (!userId) {
      alert("Будь ласка, увійдіть, щоб додавати в обране.");
      return;
    }

    // Оптимістичне оновлення (миттєво міняємо UI)
    const isLiked = wishlistIds.includes(productId);
    let newIds = isLiked 
      ? wishlistIds.filter(id => id !== productId)
      : [...wishlistIds, productId];
    
    setWishlistIds(newIds);

    if (isLiked) {
      // Видаляємо з бази
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
    } else {
      // Додаємо в базу
      await supabase
        .from('wishlist')
        .insert({ user_id: userId, product_id: productId });
    }
  };

  const isInWishlist = (productId: number) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider value={{ wishlistIds, toggleWishlist, isInWishlist, count: wishlistIds.length }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};