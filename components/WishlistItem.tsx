'use client';

import { useWishlist } from "@/components/WishlistContext";
import { Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";

export default function WishlistItem({ product }: { product: any }) {
    const { toggleItem } = useWishlist();
    const { addItem } = useCart();

    const handleAddToCart = () => {
        addItem({
            id: product.vendor_article,
            productId: product.id,
            title: product.title,
            price: product.base_price,
            image: product.image_url,
            color: 'Standard',
            size: 'One Size',
            vendorArticle: product.vendor_article
        });
    };

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 flex flex-col sm:flex-row group transition-colors duration-300">
            <Link href={`/product/${product.slug}`} className="w-full sm:w-48 aspect-square sm:aspect-auto bg-black relative">
                {product.image_url && <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={product.title} />}
            </Link>

            <div className="flex-1 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <Link href={`/product/${product.slug}`} className="font-bold text-gray-900 dark:text-white text-lg hover:text-blue-500 transition mb-1 block">
                            {product.title}
                        </Link>
                        <p className="text-sm text-gray-500">Артикул: {product.vendor_article}</p>
                    </div>
                    <button
                        onClick={() => toggleItem(product.id)}
                        className="text-gray-500 hover:text-red-500 transition p-2"
                        title="Видалити з обраного"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="mt-auto flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('uk-UA').format(product.base_price)} <span className="text-sm text-gray-500 font-medium">грн</span>
                    </span>

                    <button
                        onClick={handleAddToCart}
                        className="bg-white text-black px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition"
                    >
                        <ShoppingBag size={18} /> До кошика
                    </button>
                </div>
            </div>
        </div>
    );
}
