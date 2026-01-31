'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, Type, Palette, Layout, Settings, Layers as LayersIcon, ChevronLeft, ChevronRight, Save, FileDown, ShoppingCart, Menu, X, ChevronUp, Trash2, Eraser } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MOCK_IMPRINT_ZONES, ConstructorProduct } from '../lib/types';
import * as fabric from 'fabric';

import PriceCalculator from './PriceCalculator';
import { PrintMethod, PrintPlacement, PrintSize } from '../../../lib/brandingTypes';
import { calculateBrandingPrice } from '../../../lib/brandingPricing';
import { supabase } from '../../../lib/supabaseClient';
import { getProducts } from '../../../lib/catalog';

interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
}

interface Props {
    initialProducts: ConstructorProduct[];
    categories: Category[];
}

// Helper to match colors across languages (Ukr/Eng)
const isColorMatch = (dbColor: string | null | undefined, target: string | null | undefined) => {
    if (!dbColor || !target) return false;

    const s1 = dbColor.toLowerCase();
    const s2 = target.toLowerCase();

    // If both specify details in parentheses and they differ, they are distinct colors
    const getDetail = (s: string) => s.match(/\((.*)\)/)?.[1]?.toLowerCase().trim() || '';
    const d1 = getDetail(s1);
    const d2 = getDetail(s2);
    if (d1 && d2 && d1 !== d2) return false;

    // Check strict equality or translations
    if (s1 === s2) return true;

    // First word check (base color)
    const b1 = s1.split(/[ \/\(]/)[0].trim();
    const b2 = s2.split(/[ \/\(]/)[0].trim();

    // Standard mappings
    const mappings: Record<string, string[]> = {
        'black': ['чорний', 'чорн', 'black'],
        'white': ['білий', 'біл', 'white'],
        'red': ['червоний', 'червон', 'red'],
        'blue': ['синій', 'блакитний', 'blue', 'navy', 'royal'],
        'green': ['зелений', 'зелен', 'green'],
        'grey': ['сірий', 'сір', 'grey', 'gray', 'silver'],
        'yellow': ['жовтий', 'жовт', 'yellow', 'gold'],
        'orange': ['помаранчевий', 'оранж', 'orange'],
        'purple': ['фіолетовий', 'purple', 'violet'],
        'pink': ['рожевий', 'pink', 'rose'],
        'brown': ['коричневий', 'brown', 'beige', 'натуральний'],
    };

    for (const [eng, aliases] of Object.entries(mappings)) {
        if ((eng === b1 || aliases.includes(b1)) && (eng === b2 || aliases.includes(b2))) return true;
    }

    return b1 === b2 || b1.includes(b2) || b2.includes(b1);
};

export default function ConstructorClient({ initialProducts, categories }: Props) {
    const [products, setProducts] = useState<ConstructorProduct[]>(initialProducts);
    const [selectedProduct, setSelectedProduct] = useState<ConstructorProduct | null>(initialProducts[0] || null);
    const [activeTab, setActiveTab] = useState<'catalog' | 'upload' | 'text' | 'settings'>('catalog');
    const router = useRouter();
    const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
    const [currentView, setCurrentView] = useState<'front' | 'back'>('front');
    const [quantity, setQuantity] = useState(50);
    const [method, setMethod] = useState<PrintMethod>('dtf');
    const [placement, setPlacement] = useState<PrintPlacement>('chest-center');
    const [printSize, setPrintSize] = useState<PrintSize>('medium');
    const [user, setUser] = useState<any>(null);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    // Hierarchical state
    const [selectedMainCat, setSelectedMainCat] = useState<string | null>(null);
    const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);

    // Get unique colors for the current product
    const uniqueColorVariants = React.useMemo(() => {
        if (!selectedProduct?.product_variants) return [];
        const unique = new Map();

        // Group by normalized color to avoid duplicates like "black" and "чорний"
        selectedProduct.product_variants.forEach(v => {
            if (v.color && v.color !== 'N/A' && v.image_url) {
                // Find if we already have a matching color in the map
                let matchFound = false;
                for (let existingColor of unique.keys()) {
                    // Stricter match for UI grouping: either exact same string or translation-matched broad color
                    // BUT: do not group if they specify different details (in brackets or after slash)
                    const matches = isColorMatch(existingColor, v.color);
                    const bothSimple = !existingColor.includes('(') && !v.color.includes('(');

                    if (matches && (bothSimple || existingColor === v.color)) {
                        matchFound = true;
                        break;
                    }
                }

                if (!matchFound) {
                    unique.set(v.color, { color: v.color, image: v.image_url });
                }
            }
        });
        return Array.from(unique.values());
    }, [selectedProduct]);

    // Update selectedColor when product changes
    useEffect(() => {
        if (selectedProduct) {
            const initialColor = selectedProduct.product_variants?.find(v => v.image_url === selectedProduct.image_url)?.color ||
                selectedProduct.product_variants?.[0]?.color || null;
            setSelectedColor(initialColor);
            setCurrentImageUrl(selectedProduct.image_url);
        }
    }, [selectedProduct]);

    const [availableAngles, setAvailableAngles] = useState<string[]>([]);

    // Aggregate all available angles for the selected product/color
    useEffect(() => {
        if (!selectedProduct) {
            setAvailableAngles([]);
            return;
        }

        const normalizedColor = selectedColor?.trim().toLowerCase();

        console.log('--- DEBUG: Aggregating Angles for', selectedProduct.title, '---');
        console.log('Selected Color:', selectedColor, 'Normalized:', normalizedColor);

        let angles: string[] = [];

        // 1. Try to find images in the product_images table
        if (selectedProduct.product_images && selectedProduct.product_images.length > 0) {
            // Find images specifically for this color
            const colorImages = selectedProduct.product_images.filter(img =>
                isColorMatch(img.color, selectedColor)
            );

            // Find general/main images (if no color-specific found)
            const generalImages = selectedProduct.product_images.filter(img => !img.color || img.is_main);

            console.log(`Found ${colorImages.length} color-specific and ${generalImages.length} general images`);

            if (colorImages.length > 0) {
                // If we have color-specific angles, use them
                colorImages.forEach(img => angles.push(img.image_url));
            } else if (generalImages.length > 0) {
                // Fallback to general angles
                generalImages.forEach(img => angles.push(img.image_url));
            }
        }

        // 2. Add product's default image as fallback
        if (selectedProduct.image_url) {
            angles.push(selectedProduct.image_url);
        }

        // 3. Fallback to variants
        const variantImages = selectedProduct.product_variants
            ?.filter((v: any) => isColorMatch(v.color, selectedColor))
            .map((v: any) => v.image_url)
            .filter(Boolean) || [];

        angles = [...angles, ...variantImages];

        const uniqueAngles = Array.from(new Set(angles)).filter(u => u && u.length > 10);
        console.log('Final available angles:', uniqueAngles.length);
        setAvailableAngles(uniqueAngles);

        // DO NOT reset image if it already matches the color
        if (uniqueAngles.length > 0) {
            const isCurrentInList = uniqueAngles.includes(currentImageUrl || '');
            if (!isCurrentInList) {
                let target = uniqueAngles[0];
                const isCap = selectedProduct.title.toLowerCase().includes('кепка') ||
                    selectedProduct.category_id === '241' ||
                    selectedProduct.category_id === '226';

                if (isCap) {
                    const frontal = uniqueAngles.find(u => u.toLowerCase().includes('front'));
                    if (frontal) target = frontal;
                }
                setCurrentImageUrl(target);
            }
        }
    }, [selectedProduct, selectedColor]);
    const [categoryName, setCategoryName] = useState('Всі товари');

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const mainCategories = categories.filter(c => !c.parent_id);
    const subCategories = selectedMainCat ? categories.filter(c => c.parent_id === selectedMainCat) : [];

    // Auth Integration
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUser(user);
        });
    }, []);

    // Dynamic Product Fetching on Category Change
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            const categoryObj = categories.find(c => c.id === (selectedSubCat || selectedMainCat));
            const categorySlug = categoryObj?.slug;

            setCategoryName(categoryObj?.name || 'Всі товари');

            const { products: fetchedProducts } = await getProducts({
                category: categorySlug,
                page: '1'
            });

            if (fetchedProducts) {
                setProducts(fetchedProducts as any);
                if (fetchedProducts.length > 0 && !selectedProduct) {
                    setSelectedProduct(fetchedProducts[0] as any);
                }
            }
            setIsLoadingProducts(false);
        };

        if (selectedMainCat || selectedSubCat) {
            fetchProducts();
        } else {
            setProducts(initialProducts);
            setCategoryName('Всі товари');
        }
    }, [selectedMainCat, selectedSubCat, initialProducts, categories]);

    // Initialize Canvas...
    // (Assuming identical initialization)

    useEffect(() => {
        if (!canvasRef.current) return;
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
            width: 600,
            height: 600,
            backgroundColor: 'transparent',
            allowTouchScrolling: false,
        });

        // Enable better touch handling for mobile
        const isMobile = 'ontouchstart' in window;
        if (isMobile) {
            fabricCanvas.set({
                enableRetinaScaling: true,
                touchAction: 'none' as any,
            });
        }

        // NO CONSTRAINTS - Allow free placement anywhere on canvas
        // Removed object:moving constraint handler to allow logos anywhere

        // Keyboard Shortcut for Delete - BUT NOT when editing text
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = fabricCanvas.getActiveObjects();
                if (activeObjects.length > 0) {
                    // Check if any active object is a text being edited
                    const isEditingText = activeObjects.some((obj: any) =>
                        obj.type === 'i-text' && obj.isEditing
                    );

                    // Only delete objects if NOT editing text
                    if (!isEditingText) {
                        activeObjects.forEach(obj => fabricCanvas.remove(obj));
                        fabricCanvas.discardActiveObject();
                        fabricCanvas.renderAll();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        setCanvas(fabricCanvas);

        // Handle Responsive Scaling
        const resizeCanvas = () => {
            const container = canvasRef.current?.parentElement;
            if (!container || !fabricCanvas) return;

            // On desktop we want it to be larger
            const isMobile = window.innerWidth < 768;
            const padding = isMobile ? 20 : 60;
            const size = Math.min(container.clientWidth, container.clientHeight) - padding;

            // Base resolution for coordinates is still 600
            const scale = size / 600;

            fabricCanvas.setZoom(scale);
            fabricCanvas.setDimensions({ width: size, height: size });
            fabricCanvas.renderAll();
        };

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 100);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', resizeCanvas);
            fabricCanvas.dispose();
        };
    }, []);

    useEffect(() => {
        if (!canvas) return;
        canvas.clear();
        canvas.backgroundColor = 'transparent';
        canvas.renderAll();
    }, [selectedProduct, currentView, canvas]);

    // Handle Logo Upload with Inversion & Recolor
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            const data = f.target?.result as string;
            fabric.Image.fromURL(data).then((img: any) => {
                img.scaleToWidth(150);
                img.set({
                    left: 220,
                    top: 180,
                    globalCompositeOperation: 'multiply',
                    opacity: 0.95,
                    // Corner handles = proportional scaling
                    // Edge handles = cropping (non-uniform scaling)
                    lockScalingFlip: true,
                    centeredScaling: false,
                });

                // Configure controls behavior
                img.setControlsVisibility({
                    mt: true, mb: true, ml: true, mr: true,
                    tl: true, tr: true, bl: true, br: true,
                    mtr: true,
                });

                img.set({
                    lockScalingFlip: true,
                    minScaleLimit: 0.01,
                    originX: 'left',
                    originY: 'top',
                    // Store the original file for later use (e.g. sending to manager)
                    _sourceFile: file
                } as any);

                img.on('scaling', (e: any) => {
                    const target = e.transform.target;
                    const corner = e.transform.corner;
                    if (!corner) return;

                    const isSideHandle = ['ml', 'mr', 'mt', 'mb'].includes(corner);

                    if (isSideHandle) {
                        const masterScale = (corner === 'ml' || corner === 'mr') ? target.scaleY : target.scaleX;
                        const originalWidth = target._originalElement?.width || target.width;
                        const originalHeight = target._originalElement?.height || target.height;

                        if (corner === 'mr' || corner === 'ml') {
                            const newVisibleWidthSource = (target.width * target.scaleX) / masterScale;
                            const diff = newVisibleWidthSource - target.width;

                            if (corner === 'ml') {
                                const newCropX = (target.cropX || 0) - diff;
                                if (newCropX >= 0 && newCropX + newVisibleWidthSource <= originalWidth) {
                                    target.set({
                                        width: newVisibleWidthSource,
                                        cropX: newCropX,
                                        scaleX: masterScale
                                    });
                                } else {
                                    target.set({ scaleX: masterScale });
                                }
                            } else {
                                if ((target.cropX || 0) + newVisibleWidthSource <= originalWidth) {
                                    target.set({
                                        width: newVisibleWidthSource,
                                        scaleX: masterScale
                                    });
                                } else {
                                    target.set({ scaleX: masterScale });
                                }
                            }
                        }

                        if (corner === 'mt' || corner === 'mb') {
                            const newVisibleHeightSource = (target.height * target.scaleY) / masterScale;
                            const diff = newVisibleHeightSource - target.height;

                            if (corner === 'mt') {
                                const newCropY = (target.cropY || 0) - diff;
                                if (newCropY >= 0 && newCropY + newVisibleHeightSource <= originalHeight) {
                                    target.set({
                                        height: newVisibleHeightSource,
                                        cropY: newCropY,
                                        scaleY: masterScale
                                    });
                                } else {
                                    target.set({ scaleY: masterScale });
                                }
                            } else {
                                if ((target.cropY || 0) + newVisibleHeightSource <= originalHeight) {
                                    target.set({
                                        height: newVisibleHeightSource,
                                        scaleY: masterScale
                                    });
                                } else {
                                    target.set({ scaleY: masterScale });
                                }
                            }
                        }
                    } else {
                        target.set({ lockUniScaling: true });
                    }
                });

                canvas?.add(img);
                canvas?.setActiveObject(img);
                canvas?.renderAll();

                // Auto-close on mobile for immediate feedback
                setIsMobilePanelOpen(false);
            });
        };
        reader.readAsDataURL(file);
    };

    const applyLogoFilter = (type: 'invert' | 'grayscale' | 'none') => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'image') return;
        activeObj.filters = [];
        if (type === 'invert') activeObj.filters.push(new (fabric as any).filters.Invert());
        if (type === 'grayscale') activeObj.filters.push(new (fabric as any).filters.Grayscale());
        activeObj.applyFilters();
        canvas?.renderAll();
    };

    const applyLogoTint = (color: string) => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'image') return;

        if (color === 'none') {
            activeObj.filters = activeObj.filters.filter((f: any) => f.type !== 'BlendColor');
        } else {
            // Remove existing BlendColor filters first
            activeObj.filters = activeObj.filters.filter((f: any) => f.type !== 'BlendColor');

            // Apply new tint filter that behaves like a mask
            // mode: 'tint' colorizes while preserving transparency
            activeObj.filters.push(new (fabric as any).filters.BlendColor({
                color,
                mode: 'tint',
                alpha: 1.0 // Full mask effect 
            }));
        }

        activeObj.applyFilters();
        canvas?.renderAll();
    };

    const removeBackground = () => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'image') return;

        // Progressive Background Removal
        // Pass 1: Remove common background colors with fuzzy logic
        const commonColors = ['#FFFFFF', '#F0F0F0', '#E0E0E0', '#000000'];

        // Clear previous removal filters to avoid stacking too many
        activeObj.filters = activeObj.filters.filter((f: any) => f.type !== 'RemoveColor');

        // Add a "smart" removal based on white as primary
        activeObj.filters.push(new (fabric as any).filters.RemoveColor({
            color: '#FFFFFF',
            distance: 0.15 // Increased tolerance for "progressive" effect
        }));

        // Pass 2: Grayscale + Contrast to help refine mask if needed
        // (Optional: can be added if users want even better edges)

        activeObj.applyFilters();
        canvas?.renderAll();
    };

    // Advanced Text Tools
    const addText = () => {
        if (!canvas) return;
        const text = new fabric.IText('Текст...', {
            left: 200, top: 200, fontFamily: 'Inter', fill: '#ffffff', fontSize: 40, fontWeight: 'bold',
            minScaleLimit: 0.01
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
    };

    const updateTextStyle = (style: { fontWeight?: string, fontStyle?: string, fill?: string, fontFamily?: string }) => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'itext') return;
        activeObj.set(style);
        canvas?.renderAll();
    };

    const deleteActiveObject = () => {
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    };

    const clearCanvas = () => {
        if (!canvas) return;
        if (confirm('Ви впевнені, що хочете очистити весь дизайн?')) {
            canvas.clear();
            canvas.backgroundColor = 'transparent';
            canvas.renderAll();
        }
    };

    // Image Cropping Functions
    const enableCropMode = () => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'image') {
            alert('Спочатку виберіть зображення для обрізки');
            return;
        }

        setIsCropping(true);

        // Enable cropping controls
        activeObj.set({
            clipPath: undefined, // Clear any existing clip
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockMovementX: false,
            lockMovementY: false,
        });

        canvas?.renderAll();
        setIsMobilePanelOpen(false);
    };

    const applyCrop = () => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'image') return;

        // Get current dimensions
        const scaleX = activeObj.scaleX || 1;
        const scaleY = activeObj.scaleY || 1;

        // Create a new cropped version by adjusting the image element
        const cropWidth = (activeObj.width || 100) * scaleX;
        const cropHeight = (activeObj.height || 100) * scaleY;

        // Reset scale and adjust size
        activeObj.set({
            scaleX: 1,
            scaleY: 1,
            width: cropWidth,
            height: cropHeight,
        });

        setIsCropping(false);
        canvas?.renderAll();
        setIsMobilePanelOpen(false);
    };

    // Mobile Helper Functions
    const scaleActiveObject = (scaleFactor: number) => {
        const activeObj = canvas?.getActiveObject();
        if (!activeObj) {
            alert('Спочатку виберіть об\'єкт');
            return;
        }

        activeObj.scale(scaleFactor);
        canvas?.renderAll();
        setIsMobilePanelOpen(false);
    };

    const centerActiveObject = () => {
        const activeObj = canvas?.getActiveObject();
        if (!activeObj || !canvas) {
            alert('Спочатку виберіть об\'єкт');
            return;
        }

        // Manually center the object
        const canvasCenter = canvas.getVpCenter();
        activeObj.set({
            left: canvasCenter.x,
            top: canvasCenter.y,
        });
        activeObj.setCoords();
        canvas.renderAll();
        setIsMobilePanelOpen(false);
    };

    // --- Pricing Logic for Order Save ---
    const brandingPrice = calculateBrandingPrice(placement, printSize, method);
    const unitPriceTotal = (selectedProduct?.base_price || 0) + brandingPrice;
    const subtotal = unitPriceTotal * quantity;
    const discount = quantity >= 100 ? 0.15 : quantity >= 50 ? 0.1 : 0;
    const totalPrice = subtotal * (1 - discount);

    const handlePlaceOrder = async () => {
        if (!canvas || !selectedProduct) return;
        setIsLoadingProducts(true);

        try {
            // 1. Capture design thumbnail with product background
            // We need to merge product image and canvas content safely
            const captureMergedPreview = async (): Promise<string> => {
                return new Promise(async (resolve) => {
                    // First, try to get the product image
                    if (!currentImageUrl) {
                        console.warn('No product image URL, exporting design only');
                        return resolve(canvas.toDataURL({ format: 'png', multiplier: 1 }));
                    }

                    const tempCanvas = document.createElement('canvas');
                    const size = 800; // Higher resolution for better quality
                    tempCanvas.width = size;
                    tempCanvas.height = size;
                    const ctx = tempCanvas.getContext('2d', { alpha: true });

                    if (!ctx) {
                        console.warn('Failed to get canvas context');
                        return resolve(canvas.toDataURL({ format: 'png', multiplier: 1 }));
                    }

                    // Fill with white background first (so we can see the product)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);

                    try {
                        console.log('Fetching product image:', currentImageUrl);

                        // Use proxy to avoid CORS issues
                        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(currentImageUrl)}`;

                        // Use a timeout for the fetch to avoid hanging
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 8000);

                        const response = await fetch(proxyUrl, {
                            signal: controller.signal,
                            cache: 'force-cache'
                        });
                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        const productImg = new Image();

                        productImg.onload = () => {
                            console.log('Product image loaded successfully');

                            // Draw product image (centered and scaled to fit)
                            ctx.drawImage(productImg, 0, 0, size, size);
                            URL.revokeObjectURL(blobUrl);

                            // Now overlay the canvas design on top
                            // Export canvas with proper settings to preserve transparency
                            const fabricCanvasElement = canvas.getElement();
                            if (fabricCanvasElement) {
                                // Scale the design to match the temp canvas size
                                ctx.drawImage(fabricCanvasElement, 0, 0, size, size);

                                console.log('Design overlay applied successfully');
                                resolve(tempCanvas.toDataURL('image/png', 0.95));
                            } else {
                                console.warn('Could not get canvas element, returning product only');
                                resolve(tempCanvas.toDataURL('image/png', 0.95));
                            }
                        };

                        productImg.onerror = (err) => {
                            console.error('Product image load failed:', err);
                            URL.revokeObjectURL(blobUrl);
                            // Fallback: just export the design
                            resolve(canvas.toDataURL({ format: 'png', multiplier: 1 }));
                        };

                        productImg.src = blobUrl;

                    } catch (e) {
                        console.error('Preview capture error:', e);
                        // Fallback: Export design only
                        resolve(canvas.toDataURL({ format: 'png', multiplier: 1 }));
                    }
                });
            };

            const designThumbnail = await captureMergedPreview();

            // 2. Prepare order data
            const orderData = {
                user_id: user?.id || null,
                product_id: selectedProduct.id,
                product_title: selectedProduct.title,
                quantity: quantity,
                total_price: Math.round(totalPrice),
                print_method: method,
                print_placement: placement,
                print_size: printSize,
                design_preview: designThumbnail,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            // 3. Save to Supabase
            // Note: Since this is a specialized table, we use 'maybeSingle' to avoid issues
            const { data, error } = await supabase
                .from('constructor_orders')
                .insert([orderData])
                .select();

            if (error) {
                // FALLBACK: If table doesn't exist, we'll try to save to local storage for demo
                console.warn('constructor_orders table might not exist, saving to localStorage as fallback');
                const savedOrders = JSON.parse(localStorage.getItem('temp_constructor_orders') || '[]');
                savedOrders.push(orderData);
                localStorage.setItem('temp_constructor_orders', JSON.stringify(savedOrders));
            }

            // 4. Send to Telegram for Manager
            try {
                console.log('Preparing Telegram notification...');
                const tgFormData = new FormData();
                const orderId = data?.[0]?.id || `CONSTR-${Date.now()}`;

                tgFormData.append('orderData', JSON.stringify({
                    orderId: orderId,
                    email: user?.email || 'guest@rebrand.ua',
                    phone: user?.user_metadata?.phone || '-',
                    name: user?.user_metadata?.full_name || 'Guest',
                    total: totalPrice,
                    pay_amount: totalPrice,
                    bonuses_used: 0,
                    items: [{
                        title: selectedProduct.title,
                        quantity: quantity,
                        price: selectedProduct.base_price,
                        branding: {
                            enabled: true,
                            placement: placement,
                            size: printSize,
                            method: method,
                            price: brandingPrice
                        }
                    }],
                    delivery: 'Конструктор (уточнюється)',
                    payment: 'invoice',
                    comment: `Замовлення з конструктора. Метод: ${method}, Місце: ${placement}, Розмір: ${printSize}.`
                }));

                // Add visualization blob
                console.log('Converting design thumbnail to blob...');
                const vizResponse = await fetch(designThumbnail);
                const visualizationBlob = await vizResponse.blob();
                console.log('Visualization blob size:', visualizationBlob.size, 'bytes');
                tgFormData.append('visualization', visualizationBlob, `visualization_${orderId}.png`);

                // Collect and add source files from canvas
                const canvasObjects = canvas.getObjects();
                console.log('Found', canvasObjects.length, 'canvas objects');
                canvasObjects.forEach((obj: any, idx) => {
                    if (obj._sourceFile) {
                        console.log(`Adding logo file ${idx}:`, obj._sourceFile.name);
                        tgFormData.append(`logo_${idx}`, obj._sourceFile);
                        tgFormData.append(`logo_${idx}_itemId`, 'constructor_item');
                    }
                });

                console.log('Sending to Telegram API...');
                const tgResponse = await fetch('/api/telegram', {
                    method: 'POST',
                    body: tgFormData
                });

                if (!tgResponse.ok) {
                    const errorText = await tgResponse.text();
                    console.error('Telegram API error:', tgResponse.status, errorText);
                    throw new Error(`Telegram API failed: ${tgResponse.status}`);
                }

                const tgResult = await tgResponse.json();
                console.log('Telegram notification sent successfully:', tgResult);
            } catch (tgError) {
                console.error('Telegram notification failed:', tgError);
                // Don't block the order, just log the error
            }

            alert('Замовлення успішно оформлено! Наш менеджер зв\'яжеться з вами найближчим часом.');
            setIsMobilePanelOpen(false);

            // Redirect to profile to see the order
            router.push('/profile');
        } catch (error: any) {
            console.error('Error placing order:', error);
            alert('Помилка при оформленні замовлення: ' + error.message);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const cropToSelection = () => {
        const activeObj = canvas?.getActiveObject() as any;
        if (!activeObj || activeObj.type !== 'image') {
            alert('Спочатку виберіть зображення');
            return;
        }

        // Get the bounding box
        const boundingRect = activeObj.getBoundingRect();

        // Calculate crop parameters
        const scaleX = activeObj.scaleX || 1;
        const scaleY = activeObj.scaleY || 1;

        // Apply crop by creating a clipping rectangle
        const clipRect = new fabric.Rect({
            left: -activeObj.width! / 2,
            top: -activeObj.height! / 2,
            width: activeObj.width!,
            height: activeObj.height!,
            absolutePositioned: true,
        });

        activeObj.set({
            clipPath: clipRect,
        });

        setIsCropping(false);
        canvas?.renderAll();
    };


    function getAllImageUrls(images: any): string[] {
        if (!images) return [];
        let urls: string[] = [];

        // Handle if images is actually just a single URL string
        if (typeof images === 'string' && !images.startsWith('{') && !images.startsWith('[')) {
            return [images.startsWith('http://') ? `https://images.weserv.nl/?url=${encodeURIComponent(images.replace('http://', ''))}` : images];
        }

        if (Array.isArray(images)) {
            urls = images;
        } else if (typeof images === 'string') {
            let clean = images.trim();
            if (clean.startsWith('{') && clean.endsWith('}')) {
                urls = clean.slice(1, -1).split(',').map(s => s.replace(/["']/g, '').trim());
            } else if (clean.startsWith('[') && clean.endsWith(']')) {
                try {
                    urls = JSON.parse(clean);
                } catch { urls = [clean]; }
            } else {
                urls = [clean.replace(/["']/g, '')];
            }
        }

        return urls.filter(u => u.length > 5).map(url => {
            if (url.startsWith('http://')) {
                const cleanUrl = url.replace('http://', '');
                return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
            }
            return url;
        });
    }

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-white font-sans flex-col md:flex-row">
            {/* Sidebar - Desktop Navigation */}
            <aside className="hidden md:flex w-16 flex-col items-center py-6 border-r border-white/10 bg-black">
                <div className="mb-10 text-blue-500 font-bold text-xl tracking-tighter">B2B</div>
                <nav className="flex flex-col gap-8 flex-1">
                    <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} icon={<Layout size={20} />} label="Товари" />
                    <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<Upload size={20} />} label="Дизайн" />
                    <TabButton active={activeTab === 'text'} onClick={() => setActiveTab('text')} icon={<Type size={20} />} label="Текст" />
                    <TabButton active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobilePanelOpen(true); }} icon={<Settings size={20} />} label="Налашт." />
                </nav>
                {user && (
                    <div className="mt-auto mb-4 group relative">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                            {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div className="absolute left-16 bottom-0 w-max bg-black/90 backdrop-blur border border-white/10 p-3 rounded-xl opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50">
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Вітаємо</p>
                            <p className="text-sm font-bold text-white whitespace-nowrap">Привіт, {user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                        </div>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-white/10 flex items-center justify-around px-4 z-50">
                <MobileTabButton active={activeTab === 'catalog' && isMobilePanelOpen} onClick={() => { setActiveTab('catalog'); setIsMobilePanelOpen(true); }} icon={<Layout size={20} />} label="Товари" />
                <MobileTabButton active={activeTab === 'upload' && isMobilePanelOpen} onClick={() => { setActiveTab('upload'); setIsMobilePanelOpen(true); }} icon={<Upload size={20} />} label="Дизайн" />

                <div
                    className="relative -top-4 w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-black active:scale-95 transition-transform"
                    onClick={() => { setActiveTab('settings'); setIsMobilePanelOpen(true); }}
                >
                    <ShoppingCart size={24} className="text-white" />
                </div>

                <MobileTabButton active={activeTab === 'text' && isMobilePanelOpen} onClick={() => { setActiveTab('text'); setIsMobilePanelOpen(true); }} icon={<Type size={20} />} label="Текст" />
                <MobileTabButton active={activeTab === 'settings' && isMobilePanelOpen} onClick={() => { setActiveTab('settings'); setIsMobilePanelOpen(true); }} icon={<Settings size={20} />} label="Кошик" />
            </nav>

            {/* Backdrop for Mobile */}
            <div className={`
                fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden
                ${isMobilePanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setIsMobilePanelOpen(false)} />

            {/* Control Panel / Mobile Drawer */}
            <main className={`
                fixed inset-x-0 bottom-0 md:relative md:inset-auto md:w-80 
                h-[85vh] md:h-full bg-[#121212] border-t md:border-t-0 md:border-r border-white/5 
                overflow-y-auto z-50 transition-transform duration-300 md:translate-y-0
                ${isMobilePanelOpen ? 'translate-y-0' : 'translate-y-full'} rounded-t-[32px] md:rounded-none
            `}>
                <div className="p-6 space-y-8 pb-32">
                    {activeTab === 'catalog' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold tracking-tight">Каталог</h2>
                                <button onClick={() => setIsMobilePanelOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setSelectedMainCat(null); setSelectedSubCat(null); }}
                                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${!selectedMainCat ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    Всі товари
                                </button>
                                {mainCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setSelectedMainCat(cat.id); setSelectedSubCat(null); }}
                                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${selectedMainCat === cat.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {selectedMainCat && subCategories.length > 0 && (
                                <div className="flex flex-nowrap gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth mask-fade-right">
                                    {subCategories.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setSelectedSubCat(sub.id)}
                                            className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${selectedSubCat === sub.id ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                                        >
                                            {sub.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isLoadingProducts ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Завантаження...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {products.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedProduct(p); setIsMobilePanelOpen(false); }}
                                            className={`group p-2 rounded-2xl transition-all border ${selectedProduct?.id === p.id ? 'border-blue-500 bg-blue-500/20' : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="overflow-hidden rounded-xl mb-2 aspect-square bg-[#1a1a1a]">
                                                <img src={p.image_url} alt={p.title} className="w-full h-full object-contain transition-transform group-hover:scale-110" />
                                            </div>
                                            <p className="text-[10px] font-bold text-white/80 leading-tight truncate px-1">{p.title}</p>
                                            <p className="text-[10px] text-blue-400 font-bold mt-1 px-1">₴{p.base_price}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Логотипи</h2>
                                <button onClick={() => setIsMobilePanelOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <label className="group flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-10 hover:border-blue-500/50 cursor-pointer transition-all bg-white/5">
                                <Upload className="text-blue-500 mb-4" size={24} />
                                <p className="text-sm font-semibold">Завантажити файл</p>
                                <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                            </label>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Фільтри</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => applyLogoFilter('invert')} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">Інверсія</button>
                                    <button onClick={() => applyLogoFilter('grayscale')} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">Ч/Б</button>
                                    <button onClick={removeBackground} className="text-xs py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30">Видалити фон</button>
                                    <button onClick={() => applyLogoFilter('none')} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">Скинути</button>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40 mb-2 font-bold uppercase tracking-widest">Накладання кольору (Маска)</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => { applyLogoTint('#ffffff'); }} className="w-8 h-8 rounded-lg bg-white border border-white/20 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#000000'); }} className="w-8 h-8 rounded-lg bg-black border border-white/20 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#ff0000'); }} className="w-8 h-8 rounded-lg bg-red-600 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#3b82f6'); }} className="w-8 h-8 rounded-lg bg-blue-600 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#eab308'); }} className="w-8 h-8 rounded-lg bg-yellow-500 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#22c55e'); }} className="w-8 h-8 rounded-lg bg-green-500 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#a855f7'); }} className="w-8 h-8 rounded-lg bg-purple-500 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#f97316'); }} className="w-8 h-8 rounded-lg bg-orange-500 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#ec4899'); }} className="w-8 h-8 rounded-lg bg-pink-500 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('#06b6d4'); }} className="w-8 h-8 rounded-lg bg-cyan-500 shadow-lg transition-transform hover:scale-110 active:scale-95"></button>
                                        <button onClick={() => { applyLogoTint('none'); }} className="w-8 h-8 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 active:scale-95">X</button>
                                    </div>
                                </div>

                                {/* Transformation Tools */}
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Трансформація</h3>

                                    {isCropping && (
                                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                                            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Режим обрізки</p>
                                            <button
                                                onClick={() => setIsCropping(false)}
                                                className="w-full py-2 bg-purple-500 text-white text-xs font-bold rounded-lg"
                                            >
                                                Завершити
                                            </button>
                                        </div>
                                    )}

                                    {/* Mobile-friendly scaling */}
                                    <div>
                                        <p className="text-[10px] text-white/40 mb-2">Швидке масштабування</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            <button onClick={() => scaleActiveObject(0.5)} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">50%</button>
                                            <button onClick={() => scaleActiveObject(0.75)} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">75%</button>
                                            <button onClick={() => scaleActiveObject(1)} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">100%</button>
                                            <button onClick={() => scaleActiveObject(1.5)} className="text-xs py-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5">150%</button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={centerActiveObject}
                                        className="w-full text-xs py-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 font-semibold"
                                    >
                                        🎯 Відцентрувати об'єкт
                                    </button>
                                </div>

                                <button onClick={deleteActiveObject} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 text-xs font-bold mt-4">
                                    <Trash2 size={16} />
                                    Видалити лого
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Додати текст</h2>
                                <button onClick={() => setIsMobilePanelOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <button onClick={() => { addText(); setIsMobilePanelOpen(false); }} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">Додати текстовий шар</button>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Стиль тексту</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => updateTextStyle({ fontWeight: 'bold' })} className="flex-1 py-2 bg-white/5 rounded-lg font-bold border border-white/5">B</button>
                                    <button onClick={() => updateTextStyle({ fontStyle: 'italic' })} className="flex-1 py-2 bg-white/5 rounded-lg italic border border-white/5">I</button>
                                    <button onClick={() => updateTextStyle({ fontWeight: 'normal', fontStyle: 'normal' })} className="flex-1 py-2 bg-white/5 rounded-lg border border-white/5">Reset</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        onChange={(e) => updateTextStyle({ fontFamily: e.target.value })}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Georgia">Georgia</option>
                                    </select>
                                    <input
                                        type="color"
                                        onChange={(e) => updateTextStyle({ fill: e.target.value })}
                                        className="w-full h-10 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 cursor-pointer"
                                    />
                                </div>
                                <button onClick={deleteActiveObject} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 text-xs font-bold mt-4">
                                    <Trash2 size={16} />
                                    Видалити текст
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Замовлення</h2>
                                <button onClick={() => setIsMobilePanelOpen(false)} className="md:hidden px-4 py-1.5 bg-blue-600 rounded-lg text-xs font-black uppercase tracking-widest">Готово</button>
                            </div>

                            {/* Color Selection */}
                            {uniqueColorVariants.length > 1 && (
                                <div className="space-y-3 pb-4 border-b border-white/5">
                                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Колір виробу</p>
                                    <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-2 mask-fade-right">
                                        {uniqueColorVariants.map((v, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedColor(v.color);
                                                    setCurrentImageUrl(v.image);
                                                }}
                                                className={`w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${selectedColor === v.color ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                                title={v.color}
                                            >
                                                <img src={v.image} alt={v.color} className="w-full h-full object-contain rounded-full bg-white" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Mobile View/Angle Selector */}
                            <div className="md:hidden space-y-3 pb-4 border-b border-white/5">
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Ракурс виробу</p>
                                <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-2 mask-fade-right">
                                    {availableAngles.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageUrl(url)}
                                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-white/5 ${currentImageUrl === url ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-50'}`}
                                        >
                                            <img src={url} alt={`View ${idx}`} className="w-full h-full object-contain" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <PriceCalculator
                                basePrice={selectedProduct?.base_price || 0}
                                quantity={quantity} setQuantity={setQuantity}
                                method={method} setMethod={setMethod}
                                placement={placement} size={printSize}
                            />

                            <button
                                onClick={handlePlaceOrder}
                                disabled={isLoadingProducts}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl mt-6 flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                            >
                                {isLoadingProducts ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <ShoppingCart size={20} />
                                        ОФОРМИТИ ЗАМОВЛЕННЯ — ₴{Math.round(totalPrice).toLocaleString()}
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-white/20 font-medium py-2">Замовлення буде збережено у вашому кабінеті</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Workspace */}
            <section className="flex-1 relative flex flex-col md:items-center md:justify-center bg-[#080808] overflow-hidden pt-16 md:pt-0">
                <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 md:px-8 bg-black/40 backdrop-blur-xl z-20 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">{selectedProduct?.title}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button onClick={clearCanvas} className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-white/60 bg-white/5 px-4 py-2 md:px-5 md:py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all">
                            <Eraser size={18} />
                            <span className="hidden md:inline">Очистити</span>
                        </button>
                        <button className="p-2 md:px-5 md:py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all">
                            <Save size={18} className="md:hidden" />
                            <span className="hidden md:inline text-xs font-bold">Зберегти</span>
                        </button>
                        <button className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-white bg-blue-600 px-4 py-2 md:px-6 md:py-2.5 rounded-xl shadow-lg shadow-blue-500/40 border border-blue-400/30">
                            <FileDown size={18} />
                            <span className="hidden md:inline">Експорт PDF</span>
                        </button>
                    </div>
                </header>

                <div className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-12">
                    <div className="relative w-full max-w-[450px] md:max-w-none md:w-[800px] md:h-[800px] aspect-square bg-[#1a1a1a] rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                        {currentImageUrl && <img src={currentImageUrl} alt="Product" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90 transition-opacity" />}
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <canvas ref={canvasRef} className="w-full h-full" />
                        </div>
                    </div>

                    <div className="mt-6 md:mt-8 flex flex-col items-center gap-6 pb-20 md:pb-0">
                        {uniqueColorVariants.length > 1 && (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">В наявності різні кольори</p>
                                <div className="flex flex-nowrap gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar max-w-full backdrop-blur-md mask-fade-right">
                                    {uniqueColorVariants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedColor(v.color);
                                                setCurrentImageUrl(v.image);
                                            }}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all flex-shrink-0 overflow-hidden ${selectedColor === v.color ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                            title={v.color}
                                        >
                                            <img src={v.image} alt={v.color} className="w-full h-full object-contain bg-white" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-3">
                            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Оберіть ракурс виробу</p>
                            <div className="flex flex-nowrap gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar max-w-full backdrop-blur-md mask-fade-right">
                                {availableAngles.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageUrl(url)}
                                        className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-[#1a1a1a] ${currentImageUrl === url ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                    >
                                        <img src={url} alt={`View ${idx}`} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Desktop-only Summary Sidebar */}
            <aside className="hidden lg:flex w-[380px] bg-[#121212] border-l border-white/5 p-8 flex flex-col overflow-y-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-600/10 rounded-lg">
                        <ShoppingCart className="text-blue-500" size={20} />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Розрахунок вартості</h2>
                </div>

                <div className="flex-1">
                    <PriceCalculator
                        basePrice={selectedProduct?.base_price || 0}
                        quantity={quantity} setQuantity={setQuantity}
                        method={method} setMethod={setMethod}
                        placement={placement} size={printSize}
                    />
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Підсумок</span>
                        <span className="text-2xl font-black">₴{(selectedProduct?.base_price || 0) * quantity}</span>
                    </div>
                    <button className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-white/5">
                        Додати в кошик
                    </button>
                </div>
            </aside>
        </div>
    );
}

function TabButton({ active, icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 group transition-all ${active ? 'text-blue-500' : 'text-white/30 hover:text-white/60'}`}>
            <div className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-500/10' : ''}`}>{icon}</div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}

function MobileTabButton({ active, icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-500' : 'text-white/40'}`}>
            {icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}

function ChevronDown({ className, size }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

function MethodButton({ active, label }: any) {
    return (
        <button className={`py-3 px-3 rounded-xl border text-xs font-medium transition-all ${active ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-white/10 hover:border-white/20'}`}>
            {label}
        </button>
    );
}
