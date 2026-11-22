
$path = "a:\myshop\app\CONSTRUCTOR\components\ConstructorClient.tsx"
$content = Get-Content $path -Raw

# This regex targets the duplicated and nested handlePlaceOrder structure
# It looks for the start of the first handlePlaceOrder and captures until the closing braces of the second one.
$pattern = 'const handlePlaceOrder = async \(\) => \{[\s\S]+?const handlePlaceOrder = async \(\) => \{[\s\S]+?alert\(''Замовлення успішно оформлено![\s\S]+?router.push\(''/profile''\);[\s\S]+?finally \{[\s\S]+?setIsLoadingProducts\(false\);[\s\S]+?\}[\s\S]+?\}[\s\S]+?\}'

$replacement = @"
const handlePlaceOrder = async () => {
        try {
            setIsLoadingProducts(true);
            if (!selectedProduct || !canvas) return;

            // Save the CURRENT view design to designs state before processing
            const currentSide = getSideFromUrl(currentImageUrl || '');
            const currentJson = canvas.toJSON();
            const updatedDesigns = { ...designs, [currentSide]: currentJson };
            setDesigns(updatedDesigns);

            // 1. Identify which sides have active designs
            const hasFront = (updatedDesigns.front?.objects?.length || 0) > 0;
            const hasBack = (updatedDesigns.back?.objects?.length || 0) > 0;

            if (!hasFront && !hasBack) {
                if (!confirm('Ви не додали жодного дизайну. Продовжити оформлення без нанесення?')) {
                    setIsLoadingProducts(false);
                    return;
                }
            }

            // 2. Calculate Total Pricing for both sides
            const frontCost = hasFront ? calculateBrandingPrice('chest-center', printSize, method) : 0;
            const backCost = hasBack ? calculateBrandingPrice('back-center', printSize, method) : 0;
            const totalBrandingPerUnit = frontCost + backCost;
            const unitPrice = selectedProduct.base_price + totalBrandingPerUnit;
            
            const subtotal = unitPrice * quantity;
            const discount = quantity >= 100 ? 0.15 : quantity >= 50 ? 0.1 : 0;
            const totalPriceCalculated = subtotal * (1 - discount);

            // 3. Helper to capture a merged preview for a specific side/JSON
            const captureSpecificView = async (side: 'front' | 'back', json: any): Promise<string | null> => {
                if (!json || (json.objects?.length || 0) === 0) return null;
                
                // Find correct background image for this side
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
                        
                        // Create a temporary hidden fabric canvas to render the design
                        const hiddenEl = document.createElement('canvas');
                        hiddenEl.width = size; hiddenEl.height = size;
                        const hiddenFabric = new fabric.StaticCanvas(hiddenEl);
                        
                        (hiddenFabric as any).loadFromJSON(json).then(() => {
                            const designEl = hiddenFabric.getElement();
                            ctx.drawImage(designEl, 0, 0, size, size);
                            const dataUrl = tempCanvas.toDataURL('image/png');
                            hiddenFabric.dispose();
                            resolve(dataUrl);
                        });
                    };
                    productImg.onerror = () => resolve(null);
                    productImg.src = bgUrl;
                });
            };

            console.log('Generating multi-side previews...');
            const frontPreview = await captureSpecificView('front', updatedDesigns.front);
            const backPreview = await captureSpecificView('back', updatedDesigns.back);

            // 4. Prepare order data
            const orderData = {
                user_id: user?.id || null,
                product_id: selectedProduct.id,
                product_title: selectedProduct.title,
                quantity: quantity,
                total_price: Math.round(totalPriceCalculated),
                print_method: method,
                print_placement: hasFront && hasBack ? 'front-back' : hasBack ? 'back-center' : 'chest-center',
                print_size: printSize,
                design_preview: frontPreview || backPreview || selectedProduct.image_url,
                design_preview_back: backPreview || null,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            // 5. Save to Supabase
            const { data, error } = await supabase.from('constructor_orders').insert([orderData]).select();

            if (error) {
                 console.warn('Supabase save failed.', error);
            }

            // 6. Send Extensive Telegram Notification
            try {
                const tgFormData = new FormData();
                const orderId = data?.[0]?.id || \`BC-\${Date.now()}\`;

                tgFormData.append('orderData', JSON.stringify({
                    orderId: orderId,
                    email: user?.email || 'guest@rebrand.ua',
                    phone: user?.user_metadata?.phone || '-',
                    name: user?.user_metadata?.full_name || 'Guest',
                    total: totalPriceCalculated,
                    items: [{
                        title: selectedProduct.title,
                        quantity: quantity,
                        price: selectedProduct.base_price,
                        branding: {
                            enabled: hasFront || hasBack,
                            method: method,
                            sides: { front: hasFront, back: hasBack },
                            total_branding_price: totalBrandingPerUnit
                        }
                    }],
                    comment: \`КОНСТРУКТОР: \${hasFront ? 'ПЕРЕД' : ''}\${hasFront && hasBack ? ' + ' : ''}\${hasBack ? 'СПИНА' : ''}. Метод: \${METHOD_LABELS[method]}. \`
                }));

                if (frontPreview) {
                    const res = await fetch(frontPreview);
                    const blob = await res.blob();
                    tgFormData.append('visualization_front', blob, \`front_\${orderId}.png\`);
                }
                if (backPreview) {
                    const res = await fetch(backPreview);
                    const blob = await res.blob();
                    tgFormData.append('visualization_back', blob, \`back_\${orderId}.png\`);
                }

                await fetch('/api/telegram', { method: 'POST', body: tgFormData });
            } catch (err) {
                console.error('Telegram notification error:', err);
            }

            alert('Замовлення успішно оформлено! Очікуйте на дзвінок менеджера.');
            router.push('/profile');
        } catch (error: any) {
            console.error('Error in handlePlaceOrder:', error);
            alert('Помилка: ' + error.message);
        } finally {
            setIsLoadingProducts(false);
        }
    }
"@

$newContent = $content -replace $pattern, $replacement
$newContent | Set-Content $path -NoNewline
