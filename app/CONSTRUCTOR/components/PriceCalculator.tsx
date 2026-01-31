'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { calculateBrandingPrice } from '../../../lib/brandingPricing';
import { PrintPlacement, PrintSize, PrintMethod, METHOD_LABELS } from '../../../lib/brandingTypes';

interface Props {
    basePrice: number;
    quantity: number;
    setQuantity: (q: number) => void;
    method: PrintMethod;
    setMethod: (m: PrintMethod) => void;
    placement: PrintPlacement;
    size: PrintSize;
}

export default function PriceCalculator({ basePrice, quantity, setQuantity, method, setMethod, placement, size }: Props) {
    const brandingPrice = calculateBrandingPrice(placement, size, method);
    const unitPriceTotal = basePrice + brandingPrice;
    const total = unitPriceTotal * quantity;

    // Tiered B2B discounts
    const discount = quantity >= 100 ? 0.15 : quantity >= 50 ? 0.1 : 0;
    const finalTotal = total * (1 - discount);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest">Кількість (шт)</label>
                <div className="flex items-center gap-4">
                    <input
                        type="range" min="1" max="500" value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="flex-1 accent-blue-500"
                    />
                    <input
                        type="number" min="1" value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg py-2 text-center font-bold"
                    />
                </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Ціна за товар:</span>
                    <span className="font-bold">₴{basePrice}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Друк ({METHOD_LABELS[method]}):</span>
                    <span className="font-bold text-blue-400">+₴{brandingPrice}</span>
                </div>

                <div className="h-[1px] bg-white/5"></div>

                <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60 font-medium">Разом за одиницю:</span>
                    <span className="font-bold">₴{unitPriceTotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                    <div className="flex justify-between items-center text-xs text-green-400 bg-green-400/10 p-2 rounded-lg">
                        <span>B2B Знижка ({discount * 100}%):</span>
                        <span className="font-bold">-₴{(total * discount).toFixed(0)}</span>
                    </div>
                )}

                <div className="pt-2 flex justify-between items-end">
                    <div className="text-xs text-white/40 mb-1">Загальна вартість:</div>
                    <div className="text-2xl font-black text-blue-500 tracking-tighter">
                        ₴{finalTotal.toLocaleString()}
                    </div>
                </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-3 transition-all">
                <ShoppingCart size={20} />
                Створити замовлення
            </button>
        </div>
    );
}
