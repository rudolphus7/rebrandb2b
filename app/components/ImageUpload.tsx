"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      // Генеруємо унікальну назву
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Завантажуємо в бакет 'products'
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Отримуємо публічне посилання
      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
      
    } catch (error: any) {
      alert("Помилка завантаження: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Зображення</label>
      
      {value ? (
        <div className="relative w-40 h-40 bg-black rounded-xl border border-white/10 overflow-hidden group">
           <div className="relative w-full h-full">
             <Image src={value} alt="Upload" fill className="object-cover"/>
           </div>
           <button 
             onClick={() => onChange("")}
             disabled={disabled}
             type="button"
             className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
           >
             <X size={14}/>
           </button>
        </div>
      ) : (
        <label className={`
            border-2 border-dashed border-white/10 rounded-xl p-6 
            flex flex-col items-center justify-center gap-2 cursor-pointer
            hover:border-blue-500/50 hover:bg-blue-500/5 transition h-40
            ${isUploading || disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}>
            {isUploading ? (
                <Loader2 size={24} className="text-blue-500 animate-spin"/>
            ) : (
                <UploadCloud size={24} className="text-gray-400"/>
            )}
            <div className="text-center">
                <p className="text-xs font-bold text-gray-300">
                    {isUploading ? "Завантаження..." : "Завантажити фото"}
                </p>
            </div>
            <input 
                type="file" 
                accept="image/*" 
                disabled={isUploading || disabled}
                onChange={handleUpload}
                className="hidden"
            />
        </label>
      )}
    </div>
  );
}