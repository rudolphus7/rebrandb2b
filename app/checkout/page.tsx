"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import Link from "next/link";
import { 
    ArrowLeft, ShoppingBag, Truck, CreditCard, FileText, CheckCircle, Info, User, Phone, Mail, MapPin, Home as HomeIcon
} from "lucide-react";

// === РЕАЛЬНІ ІМПОРТИ ===
// Перевірте, чи правильні шляхи відносно вашої папки checkout
import { supabase } from "../../lib/supabaseClient"; 
import { useCart } from "../components/CartContext"; 

// --- ДАНІ НОВОЇ ПОШТИ (Статичні поки що, можна теж тягнути з API НП, якщо треба) ---
const CITIES = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Івано-Франківськ", "Калуш"];
const WAREHOUSES = (city: string) => [
    `Відділення №1 (вул. Центральна, 10)`,
    `Відділення №2 (ТРЦ "Форум")`,
    `Відділення №3 (вул. Шевченка, 5)`,
    `Поштомат ${city} №543`
];

export default function CheckoutPage() {
    const router = useRouter();
    
    // Отримуємо реальні дані з контексту
    const { cart, totalPrice, clearCart } = useCart(); 

    const [loading, setLoading] = useState(true);

    // Дані форми
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        companyName: '',
        deliveryCity: '',
        deliveryWarehouse: '',
        paymentMethod: 'invoice', 
        comment: ''
    });

    // UI Стан для Нової Пошти
    const [citySearch, setCitySearch] = useState('');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

    useEffect(() => {
        // --- ЗАВАНТАЖЕННЯ ДАНИХ ПРОФІЛЮ З РЕАЛЬНОЇ БД ---
        const loadUserData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                // Заповнюємо Email з сесії
                setFormData(prev => ({ ...prev, email: session.user.email || '' }));

                // Пробуємо дістати профіль
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile && !error) {
                    setFormData(prev => ({
                        ...prev,
                        fullName: profile.full_name || '',
                        phone: profile.phone || '',
                        companyName: profile.company_name || ''
                    }));
                }
            }
            setLoading(false);
        };

        loadUserData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCitySelect = (city: string) => {
        setFormData(prev => ({ ...prev, deliveryCity: city, deliveryWarehouse: '' }));
        setCitySearch(city);
        setIsCityDropdownOpen(false);
    };

    // --- ФІНАЛІЗАЦІЯ ЗАМОВЛЕННЯ ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.deliveryCity || !formData.deliveryWarehouse) {
            alert('Будь ласка, вкажіть місто та відділення Нової Пошти.');
            return; 
        }

        if (cart.length === 0) {
            alert('Кошик порожній.');
            return;
        }

        // Формуємо об'єкт для бази даних
        const orderData = {
            user_email: formData.email,
            total_price: totalPrice,
            items: cart,
            delivery_data: {
                city: formData.deliveryCity,
                warehouse: formData.deliveryWarehouse,
                payment: formData.paymentMethod,
                comment: formData.comment,
                fullName: formData.fullName,
                phone: formData.phone,
                company: formData.companyName
            },
            status: 'new',
            created_at: new Date().toISOString()
        };

        // 1. Запис в Supabase
        const { data: newOrder, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) {
            console.error('Помилка Supabase:', error);
            alert(`Не вдалося оформити замовлення: ${error.message}`);
            return;
        }
        
        // 2. Сповіщення в Telegram (ВИПРАВЛЕНО)
        // Ми передаємо дані явно, щоб уникнути undefined
        try {
            await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: newOrder.id,
                    // Передаємо поля так, як їх очікує ваш API (швидше за все так):
                    email: formData.email,
                    phone: formData.phone,
                    name: formData.fullName, 
                    total: totalPrice,       
                    items: cart,
                    delivery: `${formData.deliveryCity}, ${formData.deliveryWarehouse}`,
                    payment: formData.paymentMethod,
                    comment: formData.comment
                })
            });
        } catch (e) {
            console.warn("Не вдалося відправити в Telegram, але замовлення збережено.", e);
        }

        // 3. Успіх та перенаправлення
        clearCart(); // Очищаємо кошик
        router.push('/order-success'); // Перенаправляємо на сторінку успіху
    };

    const filteredCities = CITIES.filter(city => 
        city.toLowerCase().includes(citySearch.toLowerCase())
    );

    if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Завантаження даних...</div>;
    
    // Якщо кошик порожній
    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6">
                <ShoppingBag size={64} className="text-gray-600 mb-4"/>
                <h1 className="text-3xl font-bold mb-2">Ваш кошик порожній</h1>
                <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl mt-4 transition">
                    <ArrowLeft size={16} className="inline mr-2"/> Перейти до каталогу
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111] text-white font-sans pb-20">
            <div className="bg-[#1a1a1a] border-b border-white/10 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="text-xl font-black italic tracking-tighter">REBRAND</Link>
                    <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-bold">
                        <ArrowLeft size={16}/> На головну
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-10">
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-4 text-white">
                        <Truck size={36} className="text-blue-500"/> Оформлення замовлення
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* === ЛІВА КОЛОНКА === */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Контакти */}
                        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
                            <h2 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3"><User size={24} className="text-blue-400"/> Контактна інформація</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <InputField name="fullName" label="ПІБ (Отримувач)" value={formData.fullName} onChange={handleInputChange} icon={User} required />
                                <InputField name="companyName" label="Назва компанії" value={formData.companyName} onChange={handleInputChange} icon={HomeIcon} />
                                <InputField name="phone" label="Телефон" value={formData.phone} onChange={handleInputChange} icon={Phone} required />
                                <InputField name="email" label="Email" value={formData.email} onChange={handleInputChange} icon={Mail} disabled={!!formData.email} /> 
                            </div>
                        </div>

                        {/* Доставка */}
                        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
                            <h2 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3"><MapPin size={24} className="text-blue-400"/> Доставка (Нова Пошта)</h2>
                            
                            {/* Пошук міста */}
                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-gray-400 uppercase">Місто</label>
                                <input 
                                    type="text" 
                                    name="deliveryCitySearch" 
                                    placeholder="Почніть вводити місто..." 
                                    value={citySearch}
                                    onChange={(e) => { 
                                        setCitySearch(e.target.value); 
                                        setIsCityDropdownOpen(true); 
                                        setFormData(prev => ({ ...prev, deliveryCity: '' }));
                                    }}
                                    onFocus={() => setIsCityDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsCityDropdownOpen(false), 200)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-blue-500 outline-none"
                                    required
                                />
                                {isCityDropdownOpen && citySearch.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-zinc-900 border border-white/10 rounded-lg max-h-48 overflow-y-auto z-10 shadow-lg">
                                        {filteredCities.length > 0 ? (
                                            filteredCities.map(city => (
                                                <div key={city} onMouseDown={() => handleCitySelect(city)} className="p-3 text-sm hover:bg-blue-600/50 cursor-pointer transition">
                                                    {city}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-sm text-gray-500">Місто не знайдено</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Відділення */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Відділення / Поштомат</label>
                                <select 
                                    name="deliveryWarehouse" 
                                    value={formData.deliveryWarehouse} 
                                    onChange={handleInputChange} 
                                    className={`w-full border rounded-lg py-3 px-4 focus:border-blue-500 outline-none ${formData.deliveryCity ? 'bg-black/50 text-white border-white/10' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
                                    disabled={!formData.deliveryCity}
                                    required
                                >
                                    <option value="" disabled>{formData.deliveryCity ? 'Виберіть відділення' : 'Спочатку виберіть місто'}</option>
                                    {formData.deliveryCity && WAREHOUSES(formData.deliveryCity).map(warehouse => (
                                        <option key={warehouse} value={warehouse}>{warehouse}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Коментар */}
                        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
                            <h2 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3"><Info size={24} className="text-blue-400"/> Коментар</h2>
                            <textarea
                                name="comment"
                                placeholder="Додаткова інформація для менеджера"
                                value={formData.comment}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    
                    {/* === ПРАВА КОЛОНКА === */}
                    <div className="lg:col-span-1 space-y-8">
                        
                        {/* Оплата */}
                        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
                            <h2 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3"><CreditCard size={24} className="text-blue-400"/> Спосіб оплати</h2>
                            
                            <PaymentOption 
                                id="invoice" name="paymentMethod" value="invoice" label="Оплата по рахунку (ФОП/ТОВ)" 
                                checked={formData.paymentMethod === 'invoice'} onChange={handleInputChange} icon={FileText} 
                            />
                            <PaymentOption 
                                id="card" name="paymentMethod" value="card" label="Оплата картою (Visa/Mastercard)" 
                                checked={formData.paymentMethod === 'card'} onChange={handleInputChange} icon={CreditCard} 
                            />
                        </div>

                        {/* Підсумок */}
                        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5 sticky top-24">
                            <h2 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3"><ShoppingBag size={24} className="text-blue-400"/> Ваше замовлення</h2>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border-b border-white/10 pb-4 custom-scrollbar">
                                {cart.map((item, index) => (
                                    <div key={index} className="flex justify-between text-sm text-gray-400 items-start">
                                        <div className="flex flex-col max-w-[70%]">
                                            <span className="text-white font-medium truncate">{item.title}</span>
                                            <span className="text-xs text-gray-500">
                                                {item.selectedSize ? `Розмір: ${item.selectedSize}` : ''} | x{item.quantity}
                                            </span>
                                        </div>
                                        <span className="font-bold text-white whitespace-nowrap">
                                            {item.price * item.quantity} ₴
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xl font-bold uppercase tracking-wider">Всього</span>
                                <span className="text-3xl font-black text-blue-400">{totalPrice} ₴</span>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition duration-300 shadow-lg mt-6"
                            >
                                <CheckCircle size={20}/> <span className="uppercase tracking-widest">Підтвердити замовлення</span>
                            </button>
                            
                            <div className="text-xs text-gray-500 text-center pt-4 border-t border-white/10">
                                <p>Натискаючи "Підтвердити", ви погоджуєтесь з умовами оферти.</p>
                            </div>
                        </div>
                        
                    </div>
                </form>
            </main>
        </div>
    );
}

// === Sub-components ===

function InputField({ name, label, value, onChange, icon: Icon, required = false, disabled = false }: any) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
            <div className="relative">
                <Icon size={20} className="absolute left-3 top-3 text-zinc-500"/>
                <input
                    type={name === 'phone' ? 'tel' : name === 'email' ? 'email' : 'text'}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    required={required}
                />
            </div>
        </div>
    );
}

function PaymentOption({ id, name, value, label, checked, onChange, icon: Icon }: any) {
    return (
        <label 
            htmlFor={id} 
            className={`flex items-center p-4 rounded-xl cursor-pointer transition duration-200 border-2 ${
                checked ? 'bg-blue-600/20 border-blue-600' : 'bg-black/50 border-white/10 hover:border-white/30'
            }`}
        >
            <input 
                type="radio" 
                id={id} 
                name={name} 
                value={value} 
                checked={checked} 
                onChange={onChange}
                className="hidden"
            />
            <Icon size={24} className={`mr-4 ${checked ? 'text-blue-400' : 'text-gray-500'}`}/>
            <div>
                <p className="font-bold text-white">{label}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {value === 'invoice' ? 'Ви отримаєте рахунок для оплати.' : 'Безпечна оплата онлайн.'}
                </p>
            </div>
        </label>
    );
}