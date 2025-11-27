"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  
  // --- НОВЕ: Стан для кошика ---
  const [cart, setCart] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);

  // Стан для форми входу
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Перевірка сесії при запуску
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProducts();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProducts();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase.from("products").select("*");
    if (!error) setProducts(data || []);
  }

  // --- НОВЕ: Логіка Кошика ---
  
  // 1. Додати в кошик
  function addToCart(product: any) {
    setCart([...cart, product]);
    // Можна додати alert("Додано!"), але краще просто візуально оновити кошик
  }

  // 2. Видалити з кошика (за індексом, щоб не видалити всі однакові товари)
  function removeFromCart(indexToRemove: number) {
    setCart(cart.filter((_, index) => index !== indexToRemove));
  }

  // 3. Підрахунок суми
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  // 4. ВІДПРАВКА ЗАМОВЛЕННЯ В SUPABASE
  async function placeOrder() {
    if (cart.length === 0) return alert("Кошик порожній!");
    setIsOrdering(true);

    // 1. Записуємо в Supabase (як і раніше)
    const { error } = await supabase.from('orders').insert([
      {
        user_email: session.user.email,
        total_price: totalPrice,
        items: cart 
      }
    ]);

    if (error) {
      alert("Помилка бази даних: " + error.message);
      setIsOrdering(false);
      return;
    }

    // 2. ВІДПРАВЛЯЄМО В TELEGRAM (Нова частина)
    // Ми "стукаємо" в наш власний API, який ми створили в кроці 3
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        total: totalPrice,
        items: cart
      })
    });

    // 3. Успіх
    alert("Замовлення прийнято! Менеджери вже біжать на склад.");
    setCart([]); 
    setIsOrdering(false);
  }

  // Логіка входу (Login)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Помилка: " + error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProducts([]);
    setCart([]);
  }

  // --- ВІЗУАЛЬНА ЧАСТИНА ---

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">B2B Portal Login</h1>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 p-2 border rounded" required />
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-6 p-2 border rounded" required />
          <button disabled={loading} className="w-full bg-blue-900 text-white p-2 rounded hover:bg-blue-800">{loading ? "Вхід..." : "Увійти"}</button>
        </form>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* ЛІВА ЧАСТИНА - ТОВАРИ */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">Товари</h1>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">Вийти ({session.user.email})</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
           
  <div key={product.id} className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition flex flex-col justify-between">
    <div>
      {/* --- НОВЕ: КАРТИНКА --- */}
      {product.image_url ? (
        <img 
          src={product.image_url} 
          alt={product.title} 
          className="w-full h-48 object-cover mb-4 rounded"
        />
      ) : (
        <div className="w-full h-48 bg-gray-200 mb-4 rounded flex items-center justify-center text-gray-400">
          Немає фото
        </div>
      )}
      {/* ---------------------- */}

      <h2 className="text-xl font-bold mb-2">{product.title}</h2>
      <p className="text-gray-600 mb-4">Ціна: <span className="text-green-600 font-bold">{product.price} грн</span></p>
    </div>
    <button 
      onClick={() => addToCart(product)}
      className="w-full bg-blue-100 text-blue-800 py-2 rounded hover:bg-blue-200 font-medium"
    >
      + Додати в кошик
    </button>
  </div>
          ))}
        </div>
      </div>

      {/* ПРАВА ЧАСТИНА - КОШИК (Sidebar) */}
      <div className="w-full md:w-96 bg-white border-l shadow-xl p-6 min-h-screen sticky top-0">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Ваше замовлення</h2>
        
        {cart.length === 0 ? (
          <p className="text-gray-400">Кошик порожній. Виберіть товари зліва.</p>
        ) : (
          <>
            <div className="space-y-4 mb-8 max-h-[60vh] overflow-auto">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.price} грн</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-bold px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-xl font-bold mb-6">
                <span>Разом:</span>
                <span>{totalPrice} грн</span>
              </div>
              
              <button 
                onClick={placeOrder}
                disabled={isOrdering}
                className="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-green-700 shadow-md disabled:bg-gray-400"
              >
                {isOrdering ? "Відправка..." : "ОФОРМИТИ ЗАМОВЛЕННЯ"}
              </button>
            </div>
          </>
        )}
      </div>

    </main>
  );
}