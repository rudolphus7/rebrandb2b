'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrandingOptions } from '@/lib/brandingTypes';

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
  color: string;
  size: string;
  vendorArticle: string;
  branding?: BrandingOptions;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  isCartOpen: boolean;
  toggleCart: () => void;
  // Logo file management (not persisted in localStorage)
  logoFiles: Map<string, File>;
  setLogoFile: (itemId: string, file: File) => void;
  getLogoFile: (itemId: string) => File | undefined;
  clearLogoFiles: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [logoFiles, setLogoFiles] = useState<Map<string, File>>(new Map());

  // Завантажуємо кошик з localStorage при запуску
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedItems = JSON.parse(savedCart);
        // Remove logo File objects as they can't be serialized
        const cleanedItems = parsedItems.map((item: CartItem) => {
          if (item.branding?.logo) {
            const { logo, ...restBranding } = item.branding;
            return { ...item, branding: restBranding };
          }
          return item;
        });
        setItems(cleanedItems);
      } catch (e) {
        console.error('Error parsing cart', e);
      }
    }
  }, []);

  // Зберігаємо кошик при кожній зміні (without File objects)
  useEffect(() => {
    const itemsToSave = items.map(item => {
      if (item.branding?.logo) {
        const { logo, ...restBranding } = item.branding;
        return { ...item, branding: restBranding };
      }
      return item;
    });
    localStorage.setItem('cart', JSON.stringify(itemsToSave));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
    setIsCartOpen(true); // Відкриваємо кошик
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setLogoFiles(new Map());
  };

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  // Logo file management functions
  const setLogoFile = (itemId: string, file: File) => {
    setLogoFiles(prev => new Map(prev).set(itemId, file));
  };

  const getLogoFile = (itemId: string) => {
    return logoFiles.get(itemId);
  };

  const clearLogoFiles = () => {
    setLogoFiles(new Map());
  };

  // Calculate total price including branding costs
  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = item.price * item.quantity;
    const brandingPrice = item.branding?.enabled ? (item.branding.price * item.quantity) : 0;
    return sum + itemPrice + brandingPrice;
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalPrice,
      isCartOpen,
      toggleCart,
      logoFiles,
      setLogoFile,
      getLogoFile,
      clearLogoFiles
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};