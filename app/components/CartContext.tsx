"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';

interface CartItem {
  id: number;
  title: string;
  price: number;
  image_url: string;
  quantity: number;
  selectedSize?: string;
}

interface CartContextType {
  cart: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  updateQuantity: (index: number, newQuantity: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  // Використовуємо функцію для завантаження початкового стану з localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('rebrand_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  // Збереження кошика в localStorage при зміні
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rebrand_cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Рахуємо загальну кількість і суму
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (item: CartItem) => {
    setCart(prevCart => {
      // Перевіряємо, чи такий самий товар (з тим самим розміром) вже є
      const existingIndex = prevCart.findIndex(
        (i) => i.id === item.id && i.selectedSize === item.selectedSize
      );

      if (existingIndex > -1) {
        // Якщо є - збільшуємо кількість
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += item.quantity;
        return newCart;
      }
      // Якщо немає - додаємо новий
      return [...prevCart, { ...item }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  };
  
  const updateQuantity = (index: number, newQuantity: number) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      if (newQuantity > 0) {
        newCart[index].quantity = newQuantity;
      } else {
        return newCart.filter((_, i) => i !== index); // Видалити, якщо кількість 0
      }
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, totalItems, totalPrice, addToCart, removeFromCart, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
