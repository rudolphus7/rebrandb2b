"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "./WishlistContext"; // Переконайтесь, що цей файл теж існує
import { motion } from "framer-motion";

interface WishlistButtonProps {
    productId: number;
    className?: string;
}

export default function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isLiked = isInWishlist(productId);

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.preventDefault(); // Щоб не переходило на сторінку товару при кліку
        e.stopPropagation();
        toggleWishlist(productId);
      }}
      className={`p-2 rounded-full backdrop-blur-sm transition z-20 flex items-center justify-center ${
        isLiked 
          ? "bg-red-500/20 text-red-500 border border-red-500/50" 
          : "bg-black/50 text-white hover:bg-white/20"
      } ${className || ""}`}
    >
      <Heart 
        size={18} 
        fill={isLiked ? "currentColor" : "none"} 
        className={isLiked ? "animate-pulse" : ""}
      />
    </motion.button>
  );
}