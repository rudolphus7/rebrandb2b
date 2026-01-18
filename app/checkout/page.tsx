"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  CreditCard,
  FileText,
  CheckCircle,
  Info,
  User,
  Phone,
  Mail,
  MapPin,
  Home as HomeIcon,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/CartContext";
import BrandingBadge from "@/components/BrandingBadge";
import { calculateMaxWriteOff, calculateCashback, getCurrentTier } from "@/lib/loyaltyUtils";
import { PLACEMENT_LABELS, SIZE_LABELS, METHOD_LABELS } from "@/lib/brandingTypes";

const CITIES = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Івано-Франківськ", "Калуш"];

const WAREHOUSES = (city: string) => [
  `Відділення №1 (вул. Центральна, 10)`,
  `Відділення №2 (ТРЦ "Форум")`,
  `Відділення №3 (вул. Шевченка, 5)`,
  `Поштомат ${city} №543`,
];

export default function CheckoutPage() {
  const router = useRouter();

  // --- ВИПРАВЛЕННЯ ТУТ ---
  // Ми беремо 'items' з контексту, але перейменовуємо його в 'cart', 
  // щоб не переписувати весь файл знизу.
  const { items: cart, totalPrice, clearCart, getLogoFile, clearLogoFiles } = useCart();

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const [loading, setLoading] = useState(true);

  const [userBalance, setUserBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const [userEdrpou, setUserEdrpou] = useState("");

  const [bonusesToUse, setBonusesToUse] = useState(0);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    deliveryCity: "",
    deliveryWarehouse: "",
    paymentMethod: "invoice",
    comment: "",
  });

  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);
        setFormData((prev) => ({ ...prev, email: session.user.email || "" }));

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setFormData((prev) => ({
            ...prev,
            fullName: profile.full_name || "",
            phone: profile.phone || "",
            companyName: profile.company_name || "",
          }));
          if (profile.edrpou) setUserEdrpou(profile.edrpou);
        }

        const { data: logs } = await supabase
          .from("loyalty_logs")
          .select("*")
          .eq("user_id", session.user.id);

        const balance = logs
          ? logs.reduce((acc, log) => acc + (log.type === "earn" ? log.amount : -log.amount), 0)
          : 0;
        setUserBalance(balance);

        const { data: orders } = await supabase
          .from("orders")
          .select("total_price")
          .eq("user_email", session.user.email);

        const spent = orders ? orders.reduce((acc, o) => acc + o.total_price, 0) : 0;
        setTotalSpent(spent);
      }
      setLoading(false);
    };
    loadUserData();
  }, []);

  const maxBonusWriteOff = calculateMaxWriteOff(totalPrice, totalItems, userBalance);
  const userTier = getCurrentTier(totalSpent);

  const payAmount = totalPrice - bonusesToUse;
  const earnedCashback = calculateCashback(payAmount, userTier.percent);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- NOVA POSHTA LOGIC ---
  const [npCities, setNpCities] = useState<any[]>([]);
  const [npWarehouses, setNpWarehouses] = useState<any[]>([]);
  const [selectedCityRef, setSelectedCityRef] = useState("");
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [npError, setNpError] = useState("");

  // Warehouse Search State
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);

  // Debounced City Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setNpError("");
      if (citySearch.length > 1) {
        try {
          const res = await fetch('/api/nova-poshta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchCities', cityName: citySearch })
          });
          const data = await res.json();
          if (data.success) {
            setNpCities(data.data);
            if (data.data.length === 0) setNpError("Нічого не знайдено");
          } else {
            setNpCities([]);
            setNpError(data.error || "Помилка API");
          }
        } catch (error: any) {
          console.error("NP Search Error:", error);
          setNpError("Помилка з'єднання");
        }
      } else {
        setNpCities([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [citySearch]);

  // Debounced Warehouse Search
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!selectedCityRef) return;
      setLoadingWarehouses(true);
      try {
        const res = await fetch('/api/nova-poshta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getWarehouses',
            cityRef: selectedCityRef,
            searchString: warehouseSearch // Pass search string
          })
        });
        const data = await res.json();
        if (data.success) {
          setNpWarehouses(data.data);
        } else {
          console.error("Warehouses Error:", data.error);
        }
      } catch (error) {
        console.error("NP Warehouses Error:", error);
      } finally {
        setLoadingWarehouses(false);
      }
    };

    const delayDebounceFn = setTimeout(fetchWarehouses, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedCityRef, warehouseSearch]);

  const handleCitySelect = (city: any) => {
    setFormData((prev) => ({ ...prev, deliveryCity: city.Description, deliveryWarehouse: "" }));
    setCitySearch(city.Description);
    setSelectedCityRef(city.Ref);
    setIsCityDropdownOpen(false);
    setNpError("");

    // Reset warehouse search
    setWarehouseSearch("");
    setNpWarehouses([]);
  };

  const handleWarehouseSelect = (warehouse: any) => {
    setFormData((prev) => ({ ...prev, deliveryWarehouse: warehouse.Description }));
    setWarehouseSearch(warehouse.Description);
    setIsWarehouseDropdownOpen(false);
  };
  // --------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deliveryCity || !formData.deliveryWarehouse) {
      alert("Будь ласка, вкажіть місто та відділення Нової Пошти.");
      return;
    }
    if (cart.length === 0) {
      alert("Кошик порожній.");
      return;
    }

    // Prepare branding details for database
    const brandingDetails = cart
      .map((item, index) => {
        if (item.branding?.enabled) {
          return {
            itemIndex: index,
            itemTitle: `${item.title} ${item.size !== 'One Size' ? item.size : ''}`.trim(),
            placement: item.branding.placement,
            size: item.branding.size,
            method: item.branding.method,
            price: item.branding.price,
            logoFileName: getLogoFile(item.id)?.name || 'logo.file',
          };
        }
        return null;
      })
      .filter(Boolean);

    const hasBranding = brandingDetails.length > 0;

    const orderData = {
      user_email: formData.email,
      total_price: totalPrice,
      discount_bonuses: bonusesToUse,
      final_price: payAmount,
      items: cart,
      has_branding: hasBranding,
      branding_details: hasBranding ? brandingDetails : null,
      delivery_data: {
        city: formData.deliveryCity,
        cityRef: selectedCityRef, // Save Ref for future TTN
        warehouse: formData.deliveryWarehouse,
        payment: formData.paymentMethod,
        comment: formData.comment,
        fullName: formData.fullName,
        phone: formData.phone,
        company: formData.companyName,
        edrpou: userEdrpou,
      },
      status: "new",
    };

    // 1. Зберігаємо в Supabase
    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (error) {
      alert(`Помилка: ${error.message}`);
      return;
    }

    // 2. Логіка Бонусів
    if (userId) {
      if (bonusesToUse > 0) {
        await supabase.from("loyalty_logs").insert({
          user_id: userId,
          amount: bonusesToUse,
          description: `Оплата замовлення #${newOrder.id}`,
          type: "spend",
        });
      }
      if (earnedCashback > 0) {
        await supabase.from("loyalty_logs").insert({
          user_id: userId,
          amount: earnedCashback,
          description: `Кешбек за замовлення #${newOrder.id} (${userTier.percent}%)`,
          type: "earn",
        });
      }
    }

    // 3. CRM Sync
    try {
      const crmPayload = {
        externalId: `ORD-${newOrder.id}`,
        client: {
          name: formData.companyName || formData.fullName,
          phone: formData.phone,
          email: formData.email,
          edrpou: userEdrpou || "",
        },
        items: cart.map((item) => ({
          name: item.title + (item.size && item.size !== 'One Size' ? ` (${item.size})` : ""),
          qty: item.quantity,
          price: item.price,
        })),
        totalSum: payAmount,
        delivery: {
          city: formData.deliveryCity,
          cityRef: selectedCityRef,
          warehouse: formData.deliveryWarehouse,
        },
        isPaid: false,
      };

      await fetch("/api/crm/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crmPayload),
      });
    } catch (crmError) {
      console.error("CRM Sync Error (Background):", crmError);
    }

    // 4. Telegram Notification with Logo Files
    try {
      const telegramFormData = new FormData();

      // Add order data as JSON string
      telegramFormData.append('orderData', JSON.stringify({
        orderId: newOrder.id,
        email: formData.email,
        phone: formData.phone,
        name: formData.fullName,
        total: totalPrice,
        pay_amount: payAmount,
        bonuses_used: bonusesToUse,
        items: cart,
        delivery: `${formData.deliveryCity}, ${formData.deliveryWarehouse}`,
        payment: formData.paymentMethod,
        comment: formData.comment,
      }));

      // Add logo files for items with branding
      cart.forEach((item, index) => {
        if (item.branding?.enabled) {
          const logoFile = getLogoFile(item.id);
          if (logoFile) {
            telegramFormData.append(`logo_${index}`, logoFile, `logo_${item.id}.${logoFile.name.split('.').pop()}`);
            telegramFormData.append(`logo_${index}_itemId`, item.id);
          }
        }
      });

      await fetch("/api/telegram", {
        method: "POST",
        body: telegramFormData, // NO Content-Type header - browser sets it with boundary
      });
    } catch (e) {
      console.warn("Telegram error", e);
    }

    clearCart();
    clearLogoFiles();
    router.push("/order-success");
  };

  const filteredCities = npCities; // Use NP cities

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        Завантаження даних...
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-6">
        <ShoppingBag size={64} className="text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Ваш кошик порожній</h1>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl mt-4 transition flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" /> Перейти до каталогу
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20 transition-colors duration-300">
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-white/10 py-4 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-black italic tracking-tighter">
            REBRAND
          </Link>
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
          >
            <ArrowLeft size={16} /> На головну
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4 text-gray-900 dark:text-white">
            <Truck size={36} className="text-blue-500" /> Оформлення замовлення
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ЛІВА КОЛОНКА */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none space-y-5 transition-colors">
              <h2 className="text-2xl font-bold border-b border-gray-100 dark:border-white/10 pb-3 flex items-center gap-3 text-gray-900 dark:text-white">
                <User size={24} className="text-blue-500" /> Контактна інформація
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <InputField
                  name="fullName"
                  label="ПІБ (Отримувач)"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  icon={User}
                  required
                />
                <InputField
                  name="companyName"
                  label="Назва компанії"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  icon={HomeIcon}
                />
                <InputField
                  name="phone"
                  label="Телефон"
                  value={formData.phone}
                  onChange={handleInputChange}
                  icon={Phone}
                  required
                />
                <InputField
                  name="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  icon={Mail}
                  disabled={!!formData.email}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none space-y-5 transition-colors">
              <h2 className="text-2xl font-bold border-b border-gray-100 dark:border-white/10 pb-3 flex items-center gap-3 text-gray-900 dark:text-white">
                <MapPin size={24} className="text-blue-500" /> Доставка (Нова Пошта)
              </h2>
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-gray-400 uppercase">Місто</label>
                <input
                  type="text"
                  placeholder="Почніть вводити місто..."
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setIsCityDropdownOpen(true);
                    if (e.target.value === "") {
                      setFormData((prev) => ({ ...prev, deliveryCity: "", deliveryWarehouse: "" }));
                      setSelectedCityRef("");
                      setNpWarehouses([]);
                    }
                  }}
                  onFocus={() => setIsCityDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsCityDropdownOpen(false), 200)}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-colors"
                  required
                />
                {isCityDropdownOpen && (citySearch.length > 1 || npCities.length > 0 || npError) && (
                  <div className="absolute top-full left-0 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg max-h-48 overflow-y-auto z-10 shadow-lg text-gray-900 dark:text-white">
                    {npError ? (
                      <div className="p-3 text-sm text-red-500 font-bold">{npError}</div>
                    ) : npCities.length > 0 ? (
                      npCities.map((city, cityIndex) => (
                        <div
                          key={`${city.Ref}-${cityIndex}`}
                          onMouseDown={() => handleCitySelect(city)}
                          className="p-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-600/50 cursor-pointer transition flex justify-between"
                        >
                          <span>{city.Description}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500">
                        {citySearch.length < 2 ? "Введіть ще символи..." : "Місто не знайдено"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Відділення {loadingWarehouses && <span className="text-blue-500 animate-pulse">(Завантаження...)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={formData.deliveryCity ? "Введіть номер або адресу..." : "Спочатку виберіть місто"}
                    value={warehouseSearch}
                    onChange={(e) => {
                      setWarehouseSearch(e.target.value);
                      setIsWarehouseDropdownOpen(true);
                      setFormData((prev) => ({ ...prev, deliveryWarehouse: "" }));
                    }}
                    onFocus={() => setIsWarehouseDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsWarehouseDropdownOpen(false), 200)}
                    disabled={!formData.deliveryCity}
                    className={`w-full border rounded-lg py-3 px-4 outline-none transition-colors ${formData.deliveryCity
                      ? "bg-gray-50 dark:bg-black/50 text-gray-900 dark:text-white border-gray-200 dark:border-white/10 focus:border-blue-500"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                      }`}
                    required
                  />
                  {isWarehouseDropdownOpen && npWarehouses.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg max-h-48 overflow-y-auto z-10 shadow-lg text-gray-900 dark:text-white mt-1">
                      {npWarehouses.map((warehouse) => (
                        <div
                          key={warehouse.Ref}
                          onMouseDown={() => handleWarehouseSelect(warehouse)}
                          className="p-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-600/50 cursor-pointer transition border-b border-gray-100 dark:border-white/5 last:border-0"
                        >
                          {warehouse.Description}
                        </div>
                      ))}
                    </div>
                  )}
                  {isWarehouseDropdownOpen && warehouseSearch.length > 0 && npWarehouses.length === 0 && !loadingWarehouses && (
                    <div className="absolute top-full left-0 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm text-gray-500 z-10 shadow-lg mt-1">
                      Відділення не знайдено
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none space-y-5 transition-colors">
              <h2 className="text-2xl font-bold border-b border-gray-100 dark:border-white/10 pb-3 flex items-center gap-3 text-gray-900 dark:text-white">
                <CreditCard size={24} className="text-blue-500" /> Спосіб оплати
              </h2>
              <PaymentOption
                id="invoice"
                name="paymentMethod"
                value="invoice"
                label="Оплата по рахунку (ФОП/ТОВ)"
                checked={formData.paymentMethod === "invoice"}
                onChange={handleInputChange}
                icon={FileText}
              />
              <PaymentOption
                id="card"
                name="paymentMethod"
                value="card"
                label="Оплата картою"
                checked={formData.paymentMethod === "card"}
                onChange={handleInputChange}
                icon={CreditCard}
              />
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none space-y-5 transition-colors">
              <h2 className="text-2xl font-bold border-b border-gray-100 dark:border-white/10 pb-3 flex items-center gap-3 text-gray-900 dark:text-white">
                <Info size={24} className="text-blue-500" /> Коментар
              </h2>
              <textarea
                name="comment"
                placeholder="Додаткова інформація..."
                value={formData.comment}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-colors placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* ПРАВА КОЛОНКА */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none space-y-5 sticky top-24 transition-colors">
              <h2 className="text-2xl font-bold border-b border-gray-100 dark:border-white/10 pb-3 flex items-center gap-3 text-gray-900 dark:text-white">
                <ShoppingBag size={24} className="text-blue-500" /> Ваше замовлення
              </h2>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border-b border-gray-100 dark:border-white/10 pb-4 custom-scrollbar">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm text-gray-500 dark:text-gray-400 items-start">
                    <div className="flex flex-col max-w-[70%]">
                      <span className="text-gray-900 dark:text-white font-medium truncate">{item.title}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {item.size && item.size !== 'One Size' ? `Розмір: ${item.size}` : ""} | x{item.quantity}
                      </span>
                      {item.branding?.enabled && (
                        <div className="mt-2">
                          <BrandingBadge branding={item.branding} />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {(item.price + (item.branding?.price || 0)) * item.quantity} ₴
                    </span>
                  </div>
                ))}
              </div>

              {userId && (
                <div className="bg-gray-100 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-white/10 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400 font-bold">
                      <Wallet size={18} /> Бонуси
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Баланс: {userBalance}</div>
                  </div>
                  {maxBonusWriteOff > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-300">Списати:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{bonusesToUse} грн</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={maxBonusWriteOff}
                        step="1"
                        value={bonusesToUse}
                        onChange={(e) => setBonusesToUse(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>0</span>
                        <span>Макс: {maxBonusWriteOff} (ліміт: 3 грн/од.)</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Бонуси недоступні (мін. оплата 3 грн/шт)
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>Сума товарів:</span>
                  <span>{totalPrice} ₴</span>
                </div>
                {bonusesToUse > 0 && (
                  <div className="flex justify-between items-center text-sm text-yellow-400">
                    <span>Бонусами:</span>
                    <span>- {bonusesToUse} ₴</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/10">
                  <span className="text-xl font-bold uppercase tracking-wider text-gray-900 dark:text-white">До сплати</span>
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{payAmount} ₴</span>
                </div>
                {userId && (
                  <div className="text-right text-xs text-green-500 font-bold mt-1">
                    + {earnedCashback} бонусів буде нараховано
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#111] dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-blue-600 hover:text-white dark:hover:text-white transition duration-300 shadow-lg mt-6"
              >
                <CheckCircle size={20} />{" "}
                <span className="uppercase tracking-widest">Підтвердити</span>
              </button>
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4 border-t border-gray-100 dark:border-white/10">
                <p>Натискаючи "Підтвердити", ви погоджуєтесь з умовами оферти.</p>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

function InputField({
  name,
  label,
  value,
  onChange,
  icon: Icon,
  required = false,
  disabled = false,
}: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{label}</label>
      <div className="relative">
        <Icon size={20} className="absolute left-3 top-3 text-gray-400 dark:text-zinc-500" />
        <input
          type={name === "phone" ? "tel" : name === "email" ? "email" : "text"}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      className={`flex items-center p-4 rounded-xl cursor-pointer transition duration-200 border-2 ${checked
        ? "bg-blue-600/10 dark:bg-blue-600/20 border-blue-600"
        : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30"
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
      <Icon size={24} className={`mr-4 ${checked ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />
      <div>
        <p className="font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {value === "invoice" ? "Ви отримаєте рахунок для оплати." : "Безпечна оплата онлайн."}
        </p>
      </div>
    </label>
  );
}