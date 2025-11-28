// Рівні лояльності згідно вашого зображення
export const LOYALTY_TIERS = [
    { name: "Start", threshold: 0, percent: 5, color: "text-gray-400", bg: "from-gray-700 to-gray-500" },
    { name: "Bronze", threshold: 10000, percent: 7, color: "text-orange-400", bg: "from-orange-700 to-orange-500" },
    { name: "Silver", threshold: 20000, percent: 10, color: "text-slate-300", bg: "from-slate-500 to-slate-300" },
    { name: "Gold", threshold: 100000, percent: 12, color: "text-yellow-400", bg: "from-yellow-600 to-yellow-400" },
    { name: "Platinum", threshold: 200000, percent: 15, color: "text-cyan-400", bg: "from-cyan-600 to-blue-500" },
    { name: "Elite", threshold: 500000, percent: 17, color: "text-purple-400", bg: "from-purple-600 to-purple-400" },
];

// Функція визначення поточного рівня на основі суми покупок
export function getCurrentTier(totalSpent: number) {
    // Сортуємо від найбільшого до найменшого, щоб знайти найвищий досягнутий рівень
    return LOYALTY_TIERS.slice().reverse().find(tier => totalSpent >= tier.threshold) || LOYALTY_TIERS[0];
}

// Функція визначення наступного рівня
export function getNextTier(totalSpent: number) {
    return LOYALTY_TIERS.find(tier => tier.threshold > totalSpent) || null;
}

// Розрахунок максимально доступних бонусів для списання (Правило 3 грн)
export function calculateMaxWriteOff(orderTotal: number, itemsCount: number, userBalance: number) {
    // За кожну позицію треба сплатити мінімум 3 грн живими грошима
    const minPayment = itemsCount * 3;
    
    // Скільки можна покрити бонусами теоретично (сума замовлення мінус мінімальний платіж)
    const maxAllowedByOrder = Math.max(0, orderTotal - minPayment);
    
    // Реальний ліміт - це менше з двох чисел: дозволене замовленням АБО баланс юзера
    return Math.floor(Math.min(maxAllowedByOrder, userBalance));
}

// Розрахунок нарахування (кешбек)
export function calculateCashback(payAmount: number, tierPercent: number) {
    return Math.floor(payAmount * (tierPercent / 100));
}