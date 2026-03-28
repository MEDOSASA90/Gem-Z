'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { GemZApi } from '../../../lib/api';
import { PackagePlus, Loader2, Store, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StoreDashboard() {
    const { isArabic } = useLanguage();
    const router = useRouter();

    const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: 'Supplements', image: '', discount: '' });
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const descFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const uploadRes = await fetch('http://localhost:5000/api/v1/upload', {
                method: 'POST',
                body: formData
            });
            const data = await uploadRes.json();
            return data.success ? data.url : null;
        } catch (error) {
            console.error('File upload failed:', error);
            return null;
        }
    };

    useEffect(() => {
        GemZApi.Store.getProducts().then(res => setProducts(res.products || [])).catch(console.error);
    }, []);

    const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const req = await GemZApi.request('/store/products', {
                method: 'POST',
                body: JSON.stringify({ 
                    ...form, 
                    price: Number(form.price), 
                    stock: Number(form.stock),
                    discount: Number(form.discount || 0),
                    images: form.image ? [form.image] : []
                })
            });
            if (req.success) {
                setProducts([req.product, ...products]);
                setForm({ name: '', description: '', price: '', stock: '', category: 'Supplements', image: '', discount: '' });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <header className="py-12 px-6 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <Store size={48} className="text-[var(--color-primary)]" />
                    <div>
                        <h1 className="text-3xl font-black">{isArabic ? 'لوحة تحكم المتجر' : 'Store Dashboard'}</h1>
                        <p className="text-gray-400">{isArabic ? 'أضف منتجاتك الجديدة وقم بإدارتها بسهولة' : 'Manage and add new products easily'}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Add Product Form */}
                <div className="md:col-span-1 p-6 rounded-3xl shadow-xl glass-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <PackagePlus className="text-[var(--color-secondary)]" /> {isArabic ? 'إضافة منتج' : 'Add Product'}
                    </h2>

                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <input name="name" value={form.name} onChange={handleChange} required placeholder={isArabic ? 'اسم المنتج' : 'Product Name'} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                        
                        <div className="relative">
                            <textarea id="desc-input" name="description" value={form.description} onChange={handleChange} placeholder={isArabic ? 'الوصف (يمكنك إضافة صور للشرح هنا)' : 'Description (Supports inserted images)'} rows={4} className="w-full p-4 pb-14 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            <input type="file" accept="image/*" className="hidden" ref={descFileInputRef} onChange={async (e) => {
                                if(e.target.files?.[0]) {
                                    setUploadingImage(true);
                                    const url = await handleFileUpload(e.target.files[0]);
                                    if(url) {
                                        setForm({...form, description: form.description + `\n<img src="${url}" alt="شرح" style="width:100%;border-radius:10px;margin-top:10px;" />\n`});
                                    }
                                    setUploadingImage(false);
                                }
                            }} />
                            <button type="button" onClick={() => descFileInputRef.current?.click()} className="absolute bottom-4 left-4 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-1" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' }} disabled={uploadingImage}>
                                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : null}
                                {isArabic ? '+ إدراج صورة في الوصف' : '+ Insert Image'}
                            </button>
                        </div>
                        
                        <div className="relative">
                            <input type="file" accept="image/*" onChange={async (e) => {
                                if(e.target.files?.[0]) {
                                    setUploadingImage(true);
                                    const url = await handleFileUpload(e.target.files[0]);
                                    if(url) setForm({...form, image: url});
                                    setUploadingImage(false);
                                }
                            }} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)] text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            {form.image && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-green-500 font-bold">{isArabic ? 'تم الرفع ✓' : 'Uploaded ✓'}</div>}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <input type="number" name="price" value={form.price} onChange={handleChange} required placeholder={isArabic ? 'السعر' : 'Price'} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            <input type="number" name="discount" value={form.discount} onChange={(e) => setForm({...form, discount: e.target.value})} placeholder={isArabic ? 'الخصم %' : 'Discount %'} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                            <input type="number" name="stock" value={form.stock} onChange={handleChange} required placeholder={isArabic ? 'الكمية' : 'Stock'} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }} />
                        </div>
                        
                        <select name="category" value={form.category} onChange={handleChange} className="w-full p-4 rounded-xl outline-none border focus:border-[var(--color-secondary)] appearance-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-medium)' }}>
                            <option value="Supplements">{isArabic ? 'مكملات غذائية' : 'Supplements'}</option>
                            <option value="Gear">{isArabic ? 'معدات رياضية' : 'Gear'}</option>
                            <option value="Apparel">{isArabic ? 'ملابس' : 'Apparel'}</option>
                        </select>

                        <button disabled={loading} type="submit" className="w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all hover:scale-105" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}>
                            {loading ? <Loader2 className="animate-spin" /> : <PackagePlus />} {isArabic ? 'حفظ المنتج' : 'Save Product'}
                        </button>
                    </form>
                </div>

                {/* Products List */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Tag className="text-[var(--color-purple)]" /> {isArabic ? 'المنتجات الحالية' : 'Current Products'}
                    </h2>
                    {products.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 rounded-3xl" style={{ border: '1px dashed var(--border-medium)' }}>
                            {isArabic ? 'لا توجد منتجات حتى الآن.' : 'No products added yet.'}
                        </div>
                    ) : (
                        products.map((p, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl glass-panel relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                                {Number(p.discount) > 0 && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg z-10">
                                        -{p.discount}%
                                    </div>
                                )}
                                <div className="w-16 h-16 rounded-xl bg-black/5 dark:bg-black/40 flex items-center justify-center shrink-0 overflow-hidden">
                                    {p.images && p.images.length > 0 ? (
                                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Tag size={20} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{p.name}</h3>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{isArabic ? 'الكمية المتبقية:' : 'Stock:'} {p.stock} | {p.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-[var(--color-primary)]">
                                            {(Number(p.price) * (1 - Number(p.discount || 0) / 100)).toFixed(2)} EGP
                                        </div>
                                        {Number(p.discount) > 0 && <div className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{Number(p.price).toFixed(2)} EGP</div>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
