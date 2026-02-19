'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, Type, Palette, Layout, Settings, Layers as LayersIcon, ChevronLeft, ChevronRight, Save, FileDown, ShoppingCart, Menu, X, ChevronUp, Trash2, Eraser, LayoutGrid, ShoppingBag } from 'lucide-react';
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
    preSelectedProduct?: ConstructorProduct | null;
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

export default function ConstructorClient({ initialProducts, categories, preSelectedProduct }: Props) {
    // If a pre-selected product was provided, inject it into the list and select it
    const effectiveInitialProducts = React.useMemo(() => {
        if (preSelectedProduct && !initialProducts.find(p => p.id === preSelectedProduct.id)) {
            return [preSelectedProduct, ...initialProducts];
        }
        return initialProducts;
    }, [initialProducts, preSelectedProduct]);

    const [products, setProducts] = useState<ConstructorProduct[]>(effectiveInitialProducts);
    const [selectedProduct, setSelectedProduct] = useState<ConstructorProduct | null>(
        preSelectedProduct || effectiveInitialProducts[0] || null
    );
    const [activeTab, setActiveTab] = useState<'catalog' | 'upload' | 'text' | 'settings' | null>(
        preSelectedProduct ? 'upload' : 'catalog'
    );
    const router = useRouter();
    const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
    const [currentView, setCurrentView] = useState<'front' | 'back'>('front');
    const [quantity, setQuantity] = useState(50);
    const [method, setMethod] = useState<PrintMethod>('dtf');
    const [placement, setPlacement] = useState<PrintPlacement>('chest-center');
    const [printSize, setPrintSize] = useState<PrintSize>('medium');
    const [user, setUser] = useState<any>(null);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasSize, setCanvasSize] = useState(600);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(true);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [uploadedLogos, setUploadedLogos] = useState<string[]>([]);
    const [showInStockOnly, setShowInStockOnly] = useState(false);

    // Hierarchical state
    const [selectedMainCat, setSelectedMainCat] = useState<string | null>(null);
    const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);

    // Text State
    const [textInput, setTextInput] = useState('');
    const [selectedFont, setSelectedFont] = useState('Inter');
    const fonts = ['Inter', 'Roboto', 'Montserrat', 'Georgia', 'Playfair Display', 'Oswald'];

    // Get unique colors for the current product
    const uniqueColorVariants = React.useMemo(() => {
        if (!selectedProduct?.product_variants) return [];
        const unique = new Map();

        selectedProduct.product_variants.forEach(v => {
            if (v.color && v.color !== 'N/A' && v.image_url) {
                // Check stock if filter is active
                const stock = (v.available ?? v.stock ?? v.quantity ?? 0);
                if (showInStockOnly && stock <= 0) {
                    return;
                }

                let matchFound = false;
                for (let existingColor of unique.keys()) {
                    const matches = isColorMatch(existingColor, v.color);
                    const bothSimple = !existingColor.includes('(') && !v.color.includes('(');

                    if (matches && (bothSimple || existingColor === v.color)) {
                        matchFound = true;
                        break;
                    }
                }

                if (!matchFound) {
                    const stock = (v.available ?? v.stock ?? v.quantity ?? 0);
                    unique.set(v.color, { color: v.color, image: v.image_url, inStock: stock > 0 });
                }
            }
        });
        return Array.from(unique.values());
    }, [selectedProduct, showInStockOnly]);

    // Update selectedColor when product changes
    useEffect(() => {
        if (selectedProduct) {
            const initialColor = selectedProduct.product_variants?.find(v => v.image_url === selectedProduct.image_url)?.color ||
                selectedProduct.product_variants?.[0]?.color || null;
            setSelectedColor(initialColor);
            setCurrentImageUrl(selectedProduct.image_url);
        }
    }, [selectedProduct]);

    // Auto-switch to available color if current one becomes filtered out
    useEffect(() => {
        if (showInStockOnly && selectedColor && uniqueColorVariants.length > 0) {
            const isCurrentAvailable = uniqueColorVariants.some(v => isColorMatch(v.color, selectedColor));
            if (!isCurrentAvailable) {
                const fallback = uniqueColorVariants[0];
                setSelectedColor(fallback.color);
                setCurrentImageUrl(fallback.image);
            }
        }
    }, [showInStockOnly, uniqueColorVariants, selectedColor]);

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

    const mainCategories = categories.filter(c => !c.parent_id);
    const subCategories = selectedMainCat ? categories.filter(c => c.parent_id === selectedMainCat) : [];

    // Auth Integration
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUser(user);
        });
    }, []);

    // Dynamic Product Fetching on Category Change & Stock Filter
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            const categoryObj = categories.find(c => c.id === (selectedSubCat || selectedMainCat));
            const categorySlug = categoryObj?.slug;

            setCategoryName(categoryObj?.name || 'Всі товари');

            const { products: fetchedProducts } = await getProducts({
                category: categorySlug,
                page: '1',
                inStock: showInStockOnly ? 'true' : 'false'
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
            // Local filtering for default initial products
            let filtered = effectiveInitialProducts;
            if (showInStockOnly) {
                filtered = effectiveInitialProducts.filter(p => {
                    const hasStock = p.product_variants?.some(v => (v.available ?? v.stock ?? 0) > 0);
                    return hasStock;
                });
            }
            setProducts(filtered);
            setCategoryName('Всі товари');
        }
    }, [selectedMainCat, selectedSubCat, showInStockOnly, effectiveInitialProducts, categories]);

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

        // Initialize global Fabric defaults for better UX across all objects
        (fabric as any).Object.prototype.set({
            transparentCorners: false,
            cornerColor: '#3b82f6',
            cornerStrokeColor: '#ffffff',
            cornerSize: 10,
            cornerStyle: 'circle',
            touchCornerSize: 24, // Larger handles for mobile
            padding: 4,
            borderDashArray: [5, 5],
            borderColor: '#3b82f6',
        });

        // Enable better touch handling for mobile
        const isMobile = 'ontouchstart' in window;
        if (isMobile) {
            fabricCanvas.set({
                enableRetinaScaling: true,
                touchAction: 'none' as any,
            });
        }

        // Keyboard Shortcut for Delete - BUT NOT when editing text
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = fabricCanvas.getActiveObjects();
                if (activeObjects.length > 0) {
                    const isEditingText = activeObjects.some((obj: any) =>
                        obj.type === 'i-text' && obj.isEditing
                    );
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
            const container = canvasRef.current?.parentElement?.parentElement;
            if (!container || !fabricCanvas) return;
            if (!(fabricCanvas as any).lowerCanvasEl) return;

            const rect = container.getBoundingClientRect();
            const size = Math.floor(Math.min(rect.width, rect.height));
            if (size <= 100) return;

            const scale = size / 600;

            try {
                fabricCanvas.setZoom(scale);
                fabricCanvas.setDimensions({
                    width: size,
                    height: size
                });
                setCanvasSize(size);
                fabricCanvas.renderAll();
            } catch (err) {
                // Ignore silent errors during transition
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas();
        });

        const observerContainer = canvasRef.current?.parentElement?.parentElement;
        if (observerContainer) {
            resizeObserver.observe(observerContainer);
        }

        window.addEventListener('resize', resizeCanvas);

        const timers = [
            setTimeout(resizeCanvas, 100),
            setTimeout(resizeCanvas, 500),
            setTimeout(resizeCanvas, 1500)
        ];

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', resizeCanvas);
            resizeObserver.disconnect();
            timers.forEach(t => clearTimeout(t));
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

                // Add to upload history
                setUploadedLogos(prev => [data, ...prev.slice(0, 11)]); // Keep last 12

                // Auto-close on mobile for immediate feedback
                setIsMobilePanelOpen(false);
                setActiveTab(null);
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

    const applyColorTint = (color: string) => {
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
        if (!canvas || !textInput.trim()) return;
        const text = new fabric.IText(textInput, {
            left: 200, top: 200,
            fontFamily: selectedFont,
            fill: '#ffffff',
            fontSize: 40,
            fontWeight: 'bold',
            minScaleLimit: 0.01
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        setTextInput('');
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

    const handleExportPDF = async () => {
        if (!canvas) return;
        alert('Експорт у PDF готується...');
    };

    const handleExportImage = () => {
        if (!canvas) return;
        const dataURL = canvas.toDataURL({
            format: 'png',
            multiplier: 2
        });
        const link = document.createElement('a');
        link.download = `design-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    };

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
        <div className="constructor-shell font-sans tracking-tight">
            {/* Sidebar - Desktop Side Navigation (Hidden on Mobile) */}
            <aside className="hidden md:flex flex-col nav-panel">
                <div className="studio-title-v">Студія</div>
                <nav className="flex flex-col w-full flex-1">
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
                    >
                        <Layout className="nav-item-icon" />
                        <span className="nav-item-label">Каталог</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
                    >
                        <Upload className="nav-item-icon" />
                        <span className="nav-item-label">Дизайн</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`nav-item ${activeTab === 'text' ? 'active' : ''}`}
                    >
                        <Type className="nav-item-icon" />
                        <span className="nav-item-label">Текст</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('settings'); setIsMobilePanelOpen(true); }}
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                        <Settings className="nav-item-icon" />
                        <span className="nav-item-label">Кошик</span>
                    </button>
                </nav>
                {user && (
                    <div className="mt-auto mb-2 px-3 w-full">
                        <div className="w-8 h-8 mx-auto rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-400">
                            {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)}
                        </div>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden mobile-nav">
                <button
                    onClick={() => { setActiveTab('catalog'); setIsMobilePanelOpen(true); }}
                    className={`nav-item ${activeTab === 'catalog' && isMobilePanelOpen ? 'active' : ''} flex-1`}
                >
                    <Layout className="nav-item-icon" />
                    <span className="nav-item-label">База</span>
                </button>
                <button
                    onClick={() => { setActiveTab('upload'); setIsMobilePanelOpen(true); }}
                    className={`nav-item ${activeTab === 'upload' && isMobilePanelOpen ? 'active' : ''} flex-1`}
                >
                    <Upload className="nav-item-icon" />
                    <span className="nav-item-label">Дизайн</span>
                </button>

                <div className="w-20 flex justify-center -mt-6">
                    <button
                        className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-4 border-[var(--c-bg-sidebar)]"
                        onClick={() => { setActiveTab('settings'); setIsMobilePanelOpen(true); }}
                    >
                        <ShoppingCart size={24} className="text-white" />
                    </button>
                </div>

                <button
                    onClick={() => { setActiveTab('text'); setIsMobilePanelOpen(true); }}
                    className={`nav-item ${activeTab === 'text' && isMobilePanelOpen ? 'active' : ''} flex-1`}
                >
                    <Type className="nav-item-icon" />
                    <span className="nav-item-label">Текст</span>
                </button>
                <div className="flex-1 invisible"></div> {/* Spacer for symmetry if needed, but flex-1 on others should handle it */}
            </nav>

            {/* Backdrop for Mobile */}
            <div className={`
                fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity md:hidden
                ${isMobilePanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `} onClick={() => { setIsMobilePanelOpen(false); setActiveTab(null); }} />

            {/* Control Panel / Mobile Drawer */}
            {/* Resource Panel (Catalog/Uploads) - Slides from left on desktop, from bottom on mobile */}
            <aside className={`
                ${activeTab ? 'flex' : 'hidden md:hidden'} 
                fixed md:relative inset-0 md:inset-auto z-[60] md:z-auto md:w-[var(--pane-w)] bg-[var(--c-bg-panel)] border-r border-[var(--c-border)] flex-col shadow-2xl md:shadow-none animate-in md:animate-none slide-in-from-bottom md:slide-in-from-left duration-300
                transform transition-transform duration-300 ease-out 
                ${isMobilePanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
            `}>
                <div className="panel-header">
                    <div className="md:hidden panel-drag-handle" />
                    <div className="panel-mobile-top">
                        <h2 className="panel-title text-zinc-100 font-black tracking-tighter">
                            {activeTab === 'catalog' && "КАТАЛОГ ТОВАРІВ"}
                            {activeTab === 'upload' && "ВАШІ ДИЗАЙНИ"}
                            {activeTab === 'text' && "ДОДАТИ ТЕКСТ"}
                            {activeTab === 'settings' && "ОПЦІЇ ЗАМОВЛЕННЯ"}
                        </h2>
                        <button
                            onClick={() => { setIsMobilePanelOpen(false); setActiveTab(null); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 active:scale-90 transition-all border border-white/5"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="panel-scroll">
                    {activeTab === 'catalog' && (
                        <div className="animate-pane flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setSelectedMainCat(null); setSelectedSubCat(null); }}
                                    className={`btn-studio btn-studio-secondary text-[11px] ${!selectedMainCat ? 'border-zinc-500 bg-zinc-800' : ''}`}
                                >
                                    Всі категорії
                                </button>
                                {mainCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setSelectedMainCat(cat.id); setSelectedSubCat(null); }}
                                        className={`btn-studio btn-studio-secondary text-[11px] ${selectedMainCat === cat.id ? 'border-zinc-500 bg-zinc-800' : ''}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {selectedMainCat && subCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2 py-2 overflow-visible">
                                    {subCategories.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setSelectedSubCat(sub.id)}
                                            className={`sub-pill ${selectedSubCat === sub.id ? 'active' : ''}`}
                                        >
                                            {sub.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isLoadingProducts ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="asset-card animate-pulse bg-zinc-800/50">
                                            <div className="w-[85%] h-[85%] bg-zinc-700/50 rounded-md"></div>
                                            <div className="h-3 w-3/4 bg-zinc-700/50 rounded mt-1"></div>
                                            <div className="h-2 w-1/2 bg-zinc-700/50 rounded mt-1"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {products.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedProduct(p);
                                                setIsMobilePanelOpen(false);
                                                setActiveTab(null);
                                            }}
                                            className={`asset-card ${selectedProduct?.id === p.id ? 'active' : ''}`}
                                        >
                                            <div className="asset-img-container shadow-inner">
                                                <img src={p.image_url} alt={p.title} className="w-[85%] h-[85%] object-contain" />
                                            </div>
                                            <p className="text-[10px] font-bold text-zinc-300 truncate mb-1">{p.title}</p>
                                            <p className="text-[10px] font-mono text-zinc-500">₴{p.base_price}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="animate-pane space-y-6">
                            <label className="drop-zone border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-zinc-800/50 transition-colors cursor-pointer">
                                <Upload className="text-zinc-500 mb-2" size={24} />
                                <p className="text-[13px] font-bold">Протокол завантаження</p>
                                <p className="text-[11px] text-zinc-500 mt-1">PNG, SVG, JPG або WebP</p>
                                <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                            </label>

                            {uploadedLogos.length > 0 && (
                                <div className="space-y-4">
                                    <p className="section-tag">Історія завантажень</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {uploadedLogos.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    fabric.Image.fromURL(url).then((img: any) => {
                                                        img.scaleToWidth(150);
                                                        img.set({
                                                            left: 220, top: 180,
                                                            globalCompositeOperation: 'multiply',
                                                            opacity: 0.95
                                                        });
                                                        canvas?.add(img);
                                                        canvas?.setActiveObject(img);
                                                        canvas?.renderAll();
                                                        setIsMobilePanelOpen(false);
                                                        setActiveTab(null);
                                                    });
                                                }}
                                                className="aspect-square bg-white rounded-lg p-1 border border-zinc-800 hover:border-blue-500 transition-all overflow-hidden"
                                            >
                                                <img src={url} className="w-full h-full object-contain" alt="History" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <p className="section-tag">Модифікатори об'єкта</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => applyLogoFilter('invert')} className="btn-studio btn-studio-secondary text-[11px]">Інверсія</button>
                                    <button onClick={() => applyLogoFilter('grayscale')} className="btn-studio btn-studio-secondary text-[11px]">Відтінки сірого</button>
                                    <button onClick={removeBackground} className="btn-studio btn-studio-secondary text-[11px] border-emerald-900/50 text-emerald-500">Видалити фон</button>
                                    <button onClick={() => applyLogoFilter('none')} className="btn-studio btn-studio-secondary text-[11px] border-red-900/50 text-red-500">Скинути</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="section-tag">Тонування об'єкта</p>
                                <div className="swatch-grid">
                                    {['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#FFFF00', '#00FF00', '#808080', '#FFA500'].map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => applyColorTint(c)}
                                            className="swatch-circle"
                                            style={{ backgroundColor: c, border: c === '#FFFFFF' ? '1px solid #3f3f46' : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-zinc-800">
                                <p className="section-tag">Трансформація</p>
                                <div className="grid grid-cols-4 gap-2">
                                    <button onClick={() => scaleActiveObject(0.5)} className="text-xs py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">50%</button>
                                    <button onClick={() => scaleActiveObject(1)} className="text-xs py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">100%</button>
                                    <button onClick={() => scaleActiveObject(1.5)} className="text-xs py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">150%</button>
                                    <button onClick={centerActiveObject} className="text-xs py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">🎯</button>
                                </div>
                                <button onClick={deleteActiveObject} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 text-xs font-bold">
                                    <Trash2 size={16} /> Видалити об'єкт
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="animate-pane space-y-6">
                            <div className="space-y-4">
                                <p className="section-tag">Додати текст</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Введіть текст..."
                                        className="input-studio flex-1"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addText()}
                                    />
                                    <button onClick={addText} className="btn-studio btn-studio-primary px-4">+</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="section-tag">Шрифтова пара</p>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {fonts.map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => { setSelectedFont(f); updateTextStyle({ fontFamily: f }); }}
                                            className={`btn-studio btn-studio-secondary justify-start text-[12px] h-10 ${selectedFont === f ? 'active border-zinc-500 bg-zinc-800' : ''}`}
                                            style={{ fontFamily: f }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-zinc-800">
                                <p className="section-tag">Стилізація тексту</p>
                                <div className="flex gap-2">
                                    <button onClick={() => updateTextStyle({ fontWeight: 'bold' })} className="btn-studio btn-studio-secondary flex-1 font-bold">B</button>
                                    <button onClick={() => updateTextStyle({ fontStyle: 'italic' })} className="btn-studio btn-studio-secondary flex-1 italic">I</button>
                                    <button onClick={deleteActiveObject} className="btn-studio btn-studio-secondary flex-1 text-red-400"><Trash2 size={14} /></button>
                                </div>
                                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                    <div className="flex-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Колір шрифту</div>
                                    <input
                                        type="color"
                                        onChange={(e) => updateTextStyle({ fill: e.target.value })}
                                        className="w-10 h-6 bg-transparent cursor-pointer border-none"
                                        defaultValue="#ffffff"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-pane space-y-6">
                            <div className="inspector-section p-0 border-none">
                                <PriceCalculator
                                    basePrice={selectedProduct?.base_price || 0}
                                    quantity={quantity} setQuantity={setQuantity}
                                    method={method} setMethod={setMethod}
                                    placement={placement} size={printSize}
                                    onPlaceOrder={handlePlaceOrder}
                                    isLoading={isLoadingProducts}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="flex-1 flex flex-col workspace relative">
                {/* Workspace Header - Desktop Only */}
                <div className="!hidden md:flex workspace-header px-6 py-3 border-b border-[var(--c-border)]/50">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-[var(--c-text-dim)] uppercase tracking-wider truncate max-w-[200px]">
                            {selectedProduct?.title} // ВІЗУАЛІЗАЦІЯ
                        </span>
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={clearCanvas} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--c-bg-surface)] hover:bg-[var(--c-bg-hover)] text-xs font-bold transition-all">
                            <Trash2 size={14} /> <span>Очистити</span>
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--c-bg-surface)] hover:bg-[var(--c-bg-hover)] text-xs font-bold transition-all">
                            <Save size={14} /> <span>Синхрон.</span>
                        </button>
                        <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest">
                            <FileDown size={14} /> Експорт PDF
                        </button>
                    </div>
                </div>

                {/* Mobile Top Bar (Restored from Screenshot 1) */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-bg-sidebar)]">
                    <div className="text-[10px] font-black uppercase text-[var(--c-text-dim)] truncate max-w-[150px]">
                        {selectedProduct?.title}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportPDF} className="p-2 rounded-lg bg-blue-600/10 text-blue-500 active:scale-90 transition-all">
                            <Save size={18} />
                        </button>
                        <button onClick={clearCanvas} className="p-2 rounded-lg bg-red-500/10 text-red-500 active:scale-90 transition-all">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Top Controls (Colors & Angles) - Desktop Only */}
                <div className="hidden md:flex top-controls flex-col items-center py-3 bg-[var(--c-bg-workspace)]/50 border-b border-[var(--c-border)]/20 z-20 overflow-hidden">
                    <div className="w-full max-w-7xl px-4 flex flex-row items-center gap-10">

                        <div className="flex items-center gap-3 whitespace-nowrap">
                            <button
                                onClick={() => setShowInStockOnly(!showInStockOnly)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-tight group hover:bg-white/5 ${showInStockOnly ? 'text-green-500' : 'text-zinc-400'}`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showInStockOnly ? 'bg-green-500 border-green-500' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'}`}>
                                    {showInStockOnly && <Check size={12} className="text-white" />}
                                </div>
                                Тільки в наявності
                            </button>
                        </div>

                        {/* Color Swatches - Scrollable row */}
                        {uniqueColorVariants.length > 1 && (
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                                <p className="hidden xl:block text-[9px] uppercase font-black text-[var(--c-text-muted)] tracking-widest shrink-0">Колір</p>
                                <div className="flex gap-2 p-1.5 bg-[var(--c-bg-panel)]/40 backdrop-blur-md border border-[var(--c-border)] rounded-full shadow-lg overflow-x-auto no-scrollbar scroll-smooth flex-nowrap">
                                    {uniqueColorVariants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setSelectedColor(v.color); setCurrentImageUrl(v.image); }}
                                            className={`w-7 h-7 rounded-full border-2 transition-all active:scale-90 shrink-0 ${selectedColor === v.color ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80'}`}
                                        >
                                            <img src={v.image} alt={v.color} className="w-full h-full object-contain bg-white rounded-full p-0.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* View Angles - Scrollable row */}
                        <div className="flex items-center gap-3 shrink-0">
                            <p className="hidden xl:block text-[9px] uppercase font-black text-[var(--c-text-muted)] tracking-widest shrink-0">Ракурс</p>
                            <div className="flex gap-2 p-1.5 bg-[var(--c-bg-panel)]/40 backdrop-blur-md border border-[var(--c-border)] rounded-full shadow-lg overflow-x-auto no-scrollbar flex-nowrap min-w-[100px]">
                                {availableAngles.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageUrl(url)}
                                        className={`w-7 h-7 rounded-full border-2 transition-all active:scale-95 overflow-hidden shrink-0 ${currentImageUrl === url ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80'}`}
                                    >
                                        <img src={url} alt={`View ${idx}`} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="workspace-canvas-container flex-1 relative flex items-center justify-center">
                    <div className="canvas-wrapper" style={{ width: canvasSize, height: canvasSize }}>
                        {currentImageUrl && (
                            <img
                                src={currentImageUrl.startsWith('http') ? `https://images.weserv.nl/?url=${encodeURIComponent(currentImageUrl.replace('https://', '').replace('http://', ''))}&w=800` : currentImageUrl}
                                alt="Product"
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300"
                            />
                        )}
                        <div className="absolute inset-0 z-10">
                            <canvas ref={canvasRef} className="w-full h-full" />
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Control Block (New Phase 8.3) */}
                <div className="md:hidden bottom-controls flex flex-col gap-4 p-4 bg-[var(--c-bg-sidebar)] border-t border-[var(--c-border)]/50">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase text-[var(--c-text-dim)] tracking-widest">Вибір варіанту</p>

                            {/* Mobile Stock Filter */}
                            <button
                                onClick={() => setShowInStockOnly(!showInStockOnly)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-tight ${showInStockOnly ? 'text-green-500' : 'text-zinc-400'}`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showInStockOnly ? 'bg-green-500 border-green-500' : 'border-zinc-700 bg-zinc-900'}`}>
                                    {showInStockOnly && <Check size={12} className="text-white" />}
                                </div>
                                Тільки в наявності
                            </button>
                        </div>

                        {/* Mobile Color Swatches - Larger buttons + Scrollable */}
                        {uniqueColorVariants.length > 1 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-[9px] font-black uppercase opacity-40 tracking-widest pl-1">КОЛІР</p>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                    {uniqueColorVariants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setSelectedColor(v.color); setCurrentImageUrl(v.image); }}
                                            className={`w-11 h-11 rounded-full border-2 transition-all active:scale-90 shrink-0 ${selectedColor === v.color ? 'border-blue-500 scale-110 shadow-lg' : 'border-white/10 opacity-70'}`}
                                        >
                                            <img src={v.image} alt={v.color} className="w-full h-full object-contain bg-white rounded-full p-0.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mobile View Angles - Larger buttons + Scrollable */}
                        <div className="flex flex-col gap-2">
                            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest pl-1">РАКУРС</p>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                {availableAngles.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageUrl(url)}
                                        className={`w-11 h-11 rounded-full border-2 transition-all active:scale-95 overflow-hidden shrink-0 ${currentImageUrl === url ? 'border-blue-500 scale-110 shadow-lg' : 'border-white/10 opacity-70'}`}
                                    >
                                        <img src={url} alt={`View ${idx}`} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Tools (Colors & Angles) - MOVED TO TOP */}

                {/* Mobile Bottom Tab Bar */}
                {/* Mobile Bottom Tab Bar */}
                <div className="md:hidden flex items-center justify-around bg-[var(--c-bg-sidebar)] border-t border-[var(--c-border)] safe-area-pb">
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`flex flex-col items-center gap-1 p-3 flex-1 ${activeTab === 'catalog' ? 'text-blue-500' : 'text-[var(--c-text-dim)]'}`}
                    >
                        <LayoutGrid size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Каталог</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')} // Changed from 'assets' to 'upload' to match existing tab logic
                        className={`flex flex-col items-center gap-1 p-3 flex-1 ${activeTab === 'upload' ? 'text-blue-500' : 'text-[var(--c-text-dim)]'}`}
                    >
                        <Upload size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Дизайн</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`flex flex-col items-center gap-1 p-3 flex-1 ${activeTab === 'text' ? 'text-blue-500' : 'text-[var(--c-text-dim)]'}`}
                    >
                        <Type size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Текст</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')} // Changed from 'cart' to 'settings' to match existing tab logic
                        className={`flex flex-col items-center gap-1 p-3 flex-1 ${activeTab === 'settings' ? 'text-blue-500' : 'text-[var(--c-text-dim)]'}`}
                    >
                        <ShoppingBag size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Опції</span>
                    </button>
                </div>
            </main>

            {/* Inspector Panel / Right Sidebar */}
            <aside className="inspector-panel">
                <div className="inspector-section">
                    <PriceCalculator
                        basePrice={selectedProduct?.base_price || 0}
                        quantity={quantity} setQuantity={setQuantity}
                        method={method} setMethod={setMethod}
                        placement={placement} size={printSize}
                        onPlaceOrder={handlePlaceOrder}
                        isLoading={isLoadingProducts}
                    />
                </div>
            </aside>
        </div>
    );
}

function TabButton({ active, icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`tab-icon ${active ? 'active' : ''}`}>
            <span className="indicator" />
            <div className={`p-2.5 rounded-xl transition-all ${active ? 'bg-[var(--c-accent-subtle)]' : ''}`}>{icon}</div>
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}

function MobileTabButton({ active, icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-500' : 'text-[var(--c-text-muted)]'}`}>
            {icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}

function Check({ className, size }: any) {
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
            <path d="M20 6 9 17l-5-5" />
        </svg>
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
        <button className={`py-3 px-3 rounded-xl border text-xs font-semibold transition-all ${active ? 'border-[var(--c-accent)] bg-[var(--c-accent-subtle)] text-[var(--c-accent-light)]' : 'border-[var(--c-border)] hover:border-[var(--c-border-hover)]'}`}>
            {label}
        </button>
    );
}
