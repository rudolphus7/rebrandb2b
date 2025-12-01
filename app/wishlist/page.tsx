"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Heart, ShoppingBag, Loader2 } from "lucide-react";
import ProductImage from "../components/ProductImage";
import Header from "../components/Header";
import CartDrawer from "../components/CartDrawer";
import { useCart } from "../components/CartContext";
import WishlistButton from "../components/WishlistButton";

function WishlistContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Завантажуємо товари з вішліста
  useEffect(() => {
    async function fetchWishlist() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Складний запит: беремо wishlist -> підтягуємо дані products
      const { data, error } = await supabase
        .from('wishlist')
        .select('product_id, products (*)')
        .eq('user_id', session.user.id);

      if (data) {
        // Витягуємо самі продукти з вкладеної структури
        const items = data.map((item: any) => item.products).filter(Boolean);
        setProducts(items);
      }
      setLoading(false);
    }
    fetchWishlist();
  }, []);

  const handleAddToCart = (product: any) => {
    addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
        quantity: 1
    });
    setIsCartOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans pb-20">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={handleLogout} />
      
      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
             <Link href="/" className="p-2 bg-[#222] rounded-lg hover:bg-white/10 transition"><ArrowLeft size={20}/></Link>
             <h1 className="text-3xl font-bold">Список бажань</h1>
             <span className="bg-[#222] px-3 py-1 rounded-full text-sm text-gray-400">{products.length} товарів</span>
        </div>

        {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
        ) : products.length === 0 ? (
             <div className="text-center py-20 bg-[#1a1a1a] rounded-2xl border border-white/5 border-dashed">
                 <Heart size={48} className="mx-auto text-gray-700 mb-4"/>
                 <p className="text-gray-500 text-lg">Ваш список бажань порожній</p>
                 <Link href="/catalog" className="text-blue-500 hover:text-blue-400 font-bold mt-2 inline-block">Перейти в каталог</Link>
             </div>
        ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {products.map(product => (
                     <div key={product.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:shadow-2xl transition group flex flex-col relative">
                         {/* Кнопка видалення (сердечко) */}
                         <div className="absolute top-3 right-3 z-10">
                             <WishlistButton productId={product.id} />
                         </div>

                         <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden mb-4 relative">
                             <Link href={`/product/${product.id}`} className="block w-full h-full">
                                 <ProductImage src={product.image_url} alt={product.title} fill className="group-hover:scale-105 transition duration-500"/>
                             </Link>
                         </div>

                         <div className="flex-1 flex flex-col">
                             <Link href={`/product/${product.id}`} className="font-bold text-sm leading-tight text-gray-100 hover:text-blue-400 transition line-clamp-2 mb-2">
                                 {product.title}
                             </Link>
                             <div className="mt-auto flex items-center justify-between">
                                 <div className="font-bold text-lg text-white">{product.price} ₴</div>
                                 <button onClick={() => handleAddToCart(product)} className="p-2 bg-white text-black rounded-lg hover:bg-blue-500 hover:text-white transition">
                                     <ShoppingBag size={18}/>
                                 </button>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
        )}
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default function WishlistPage() {
  return <Suspense fallback={<div className="bg-black min-h-screen"/>}><WishlistContent /></Suspense>;
}
