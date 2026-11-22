
$path = "a:\myshop\app\CONSTRUCTOR\components\ConstructorClient.tsx"
$content = Get-Content $path -Raw

# 1. Remove the outer handlePlaceOrder shell if it exists
# We look for the pattern where it's declared and then immediately starts a try block
$badShellPattern = 'const handlePlaceOrder = async \(\) => \{\r?\n\s+try \{'
# We also want to remove the captureMergedPreview that follows it
$badPreviewPattern = '(?s)\s+// 1\. Capture design thumbnail with product background.*?const captureMergedPreview = async \(\): Promise<string> => \{.*?return new Promise\(async \(resolve\) => \{'

# NEW Implementation
$newBody = @"
    const handlePlaceOrder = async () => {
        try {
            setIsLoadingProducts(true);
            if (!selectedProduct || !canvas) return;

            // Save current side design before processing
            const currentSide = getSideFromUrl(currentImageUrl || '');
            const currentJson = canvas.toJSON();
            const updatedDesigns = { ...designs, [currentSide]: currentJson };
            setDesigns(updatedDesigns);

            const hasFront = (updatedDesigns.front?.objects?.length || 0) > 0;
            const hasBack = (updatedDesigns.back?.objects?.length || 0) > 0;

            if (!hasFront && !hasBack) {
                if (!confirm('Ви не додали жодного дизайну. Продовжити оформлення без нанесення?')) {
                    setIsLoadingProducts(false);
                    return;
                }
            }

            // Calculation
            const frontCost = hasFront ? calculateBrandingPrice('chest-center', printSize, method) : 0;
            const backCost = hasBack ? calculateBrandingPrice('back-center', printSize, method) : 0;
            const totalBrandingPerUnit = frontCost + backCost;
            const unitPrice = selectedProduct.base_price + totalBrandingPerUnit;
            const subtotal = unitPrice * quantity;
            const disc = quantity >= 100 ? 0.15 : quantity >= 50 ? 0.1 : 0;
            const totalPriceCalculated = subtotal * (1 - disc);

            // Previews
            const captureSpecificView = async (side: 'front' | 'back', json: any): Promise<string | null> => {
                if (!json || (json.objects?.length || 0) === 0) return null;
                const bgUrl = availableAngles.find(u => getSideFromUrl(u) === side) || currentImageUrl;
                if (!bgUrl) return null;
                return new Promise((resolve) => {
                    const tempCanvas = document.createElement('canvas');
                    const size = 600;
                    tempCanvas.width = size; tempCanvas.height = size;
                    const ctx = tempCanvas.getContext('2d');
                    if (!ctx) return resolve(null);
                    const productImg = new Image();
                    productImg.crossOrigin = "anonymous";
                    productImg.onload = () => {
                        ctx.drawImage(productImg, 0, 0, size, size);
                        const hEl = document.createElement('canvas');
                        hEl.width = size; hEl.height = size;
                        const hFab = new fabric.StaticCanvas(hEl);
                        (hFab as any).loadFromJSON(json).then(() => {
                            ctx.drawImage(hFab.getElement(), 0, 0, size, size);
                            resolve(tempCanvas.toDataURL('image/png'));
                            hFab.dispose();
                        });
                    };
                    productImg.onerror = () => resolve(null);
                    productImg.src = bgUrl;
                });
            };

            const fP = await captureSpecificView('front', updatedDesigns.front);
            const bP = await captureSpecificView('back', updatedDesigns.back);

            const orderData = {
                user_id: user?.id || null,
                product_id: selectedProduct.id,
                product_title: selectedProduct.title,
                quantity,
                total_price: Math.round(totalPriceCalculated),
                print_method: method,
                print_placement: hasFront && hasBack ? 'front-back' : hasBack ? 'back-center' : 'chest-center',
                print_size: printSize,
                design_preview: fP || bP || selectedProduct.image_url,
                design_preview_back: bP || null,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase.from('constructor_orders').insert([orderData]).select();

            // Telegram
            const tgFormData = new FormData();
            const orderId = data?.[0]?.id || \`BC-\${Date.now()}\`;
            tgFormData.append('orderData', JSON.stringify({
                orderId, email: user?.email || 'guest@rebrand.ua', total: totalPriceCalculated,
                items: [{ title: selectedProduct.title, quantity, price: selectedProduct.base_price, branding: { enabled: true, method, sides: { front: hasFront, back: hasBack } } }]
            }));
            if (fP) {
                const res = await fetch(fP);
                tgFormData.append('visualization_front', await res.blob(), \`front_\${orderId}.png\`);
            }
            if (bP) {
                const res = await fetch(bP);
                tgFormData.append('visualization_back', await res.blob(), \`back_\${orderId}.png\`);
            }
            await fetch('/api/telegram', { method: 'POST', body: tgFormData });

            alert('Замовлення успішно оформлено!');
            router.push('/profile');
        } catch (error: any) {
            console.error(error);
            alert('Помилка: ' + error.message);
        } finally {
            setIsLoadingProducts(false);
        }
    };
"@

# This targets the entire problematic block from 844 to roughly 1100
# and replaces it with the consolidated one.
$fullPattern = '(?s)const handlePlaceOrder = async \(\) => \{.*?const handlePlaceOrder = async \(\) => \{.*?alert\(''Замовлення успішно оформлено! Очікуйте на дзвінок менеджера.''\);.*?router.push\(''/profile''\);.*?finally \{.*?setIsLoadingProducts\(false\);.*?\}[\s\n\r]*\};[\s\n\r]*\};'

$newContent = $content -replace $fullPattern, $newBody
$newContent | Set-Content $path -NoNewline
