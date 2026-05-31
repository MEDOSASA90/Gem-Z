'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  ShoppingBag,
  ShieldCheck,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  DollarSign,
  Info,
} from 'lucide-react';

interface ProductMock {
  id: string;
  name: string;
  price: number;
  condition: string;
  sellerId: string;
  imgPlaceholder: string;
}

interface EscrowOrderMock {
  id: string;
  productName: string;
  price: number;
  status: 'CREATED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'RELEASED';
  sellerName: string;
  buyerName: string;
}

export default function MarketplaceDashboard() {
  const { wallet, updateWalletBalance } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // المنتجات المتاحة للتداول بالسوق
  const products: ProductMock[] = [
    {
      id: 'prod-109',
      name: 'دمبل حديدي ذكي 24 كجم (Smart Dumbbell)',
      price: 250.00,
      condition: 'شبه جديد - استعمال شهر',
      sellerId: 'usr-seller-902',
      imgPlaceholder: '🏋️‍♂️',
    },
    {
      id: 'prod-204',
      name: 'ساعة آبل الذكية الجيل السابع (Apple Watch S7)',
      price: 450.00,
      condition: 'ممتازة - خالية من الخدوش',
      sellerId: 'usr-seller-771',
      imgPlaceholder: '⌚',
    },
    {
      id: 'prod-302',
      name: 'حزام تتبع الخطوات وسرعة الـ Cadence للركض',
      price: 120.00,
      condition: 'مفتوح العلبة للتجربة فقط',
      sellerId: 'usr-seller-303',
      imgPlaceholder: '🎗️',
    },
  ];

  // سجل طلبات الأمان المالي المعلق (Escrow state transitions)
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrderMock[]>([
    {
      id: 'order-esc-901',
      productName: 'دراجة هوائية للتمارين الشاقة (Spin Bike)',
      price: 350.00,
      status: 'PAID',
      sellerName: 'الكابتن أحمد كمال',
      buyerName: 'محمود عبد العزيز',
    },
  ]);

  // محاكاة التقدم بدورة الضمان المالي للمنتجات (State Machine Advancement)
  const advanceEscrowState = async (orderId: string, currentStatus: EscrowOrderMock['status']) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let nextStatus: EscrowOrderMock['status'] = 'CREATED';
    let msg = '';

    if (currentStatus === 'CREATED') {
      nextStatus = 'PAID';
      msg = '💰 تم تفويض ودفع الأموال في محفظة الضمان بنجاح!';
    } else if (currentStatus === 'PAID') {
      nextStatus = 'SHIPPED';
      msg = '🚚 تم شحن المنتج وتسليمه لشركة الشحن الشريكة!';
    } else if (currentStatus === 'SHIPPED') {
      nextStatus = 'DELIVERED';
      msg = '📦 تم تسليم المنتج للمشتري والتحقق من سلامته!';
    } else if (currentStatus === 'DELIVERED') {
      nextStatus = 'RELEASED';
      msg = '🎉 تم فك الضمان المالي والإفراج عن الأموال لحساب البائع بنجاح!';
      
      // تحديث محفظة المنشئ/البائع في Zustand
      const order = escrowOrders.find((o) => o.id === orderId);
      if (order) {
        // إضافة الأرباح للبائع
        const newBalance = wallet.balance + order.price;
        updateWalletBalance(newBalance, wallet.withdrawableBalance + order.price, wallet.heldBalance);
      }
    }

    setEscrowOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    setSuccessMsg(msg);
    setLoading(false);
  };

  // شراء منتج جديد وبدء دورة الضمان المالي
  const buyProduct = async (product: ProductMock) => {
    if (wallet.balance < product.price) {
      setSuccessMsg('❌ رصيد محفظتك غير كافٍ لإتمام عملية الشراء والضمان المالي!');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // خصم الرصيد
    const newBalance = wallet.balance - product.price;
    updateWalletBalance(newBalance, wallet.withdrawableBalance, wallet.heldBalance);

    const newOrder: EscrowOrderMock = {
      id: `order-esc-${Math.floor(Math.random() * 9000) + 1000}`,
      productName: product.name,
      price: product.price,
      status: 'PAID',
      sellerName: 'الكابتن علي محمود',
      buyerName: 'محمود عبد العزيز',
    };

    setEscrowOrders((prev) => [newOrder, ...prev]);
    setSuccessMsg(`💰 تم حجز وشراء المنتج بنجاح! تم قفل مبلغ ${product.price.toFixed(2)} ${wallet.currency} في محفظة الضمان المالي الآمن (Escrow) لحين تسليم المنتج.`);
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            سوق تداول الأجهزة الرياضية والضمان المالي (Used Marketplace & Escrow Portal)
          </h1>
          <BodyText className="text-xs">
            تداول الأجهزة الرياضية المستعملة بأمان مطلق من خلال محرك ضمان مالي صارم يحفظ حقوق البائع والمشتري.
          </BodyText>
        </div>
      </div>

      {/* العدادات التفاعلية للسوق */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">ESCROW SECURED TRANSACTIONS</span>
            <ShieldCheck className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {escrowOrders.length} <span className="text-neon-cyan text-xs">طلبات آمنة</span>
          </p>
          <BodyText className="text-[10px] pt-1">عدد صفقات الضمان المالي الجارية حالياً</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">TOTAL MARKETPLACE VALUE</span>
            <DollarSign className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {escrowOrders.reduce((acc, curr) => acc + curr.price, 0).toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">إجمالي المبالغ المؤمنة والمقفلة داخل نظام الأمان المالي</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-purple-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">AVAILABLE PRODUCTS LISTED</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {products.length} <span className="text-purple-400 text-xs">سلعة معروضة</span>
          </p>
          <BodyText className="text-[10px] pt-1">إجمالي المنتجات المتاحة للتداول والشراء الفوري</BodyText>
        </div>
      </div>

      {/* متتبع صفقات الضمان المالي ومراحل الـ State Machine التفاعلية */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">تتبع صفقات الضمان المالي الجارية ومراحل التسليم (Escrow State Machine)</Heading2>
          <span className="text-[10px] text-gray-500">مراحل التنفيذ: إنشاء العقد -&gt; الدفع -&gt; الشحن -&gt; التسليم -&gt; تحرير الأموال</span>
        </div>

        {/* إشعارات الحركات الضامنة للحقوق */}
        {successMsg && (
          <div className="bg-volt-green/10 border border-volt-green/20 text-volt-green text-xs rounded-xl p-4 text-right shadow-[0_0_10px_rgba(57,255,20,0.05)] animate-fade-in">
            {successMsg}
          </div>
        )}

        <div className="space-y-6">
          {escrowOrders.map((ord, index) => {
            const steps = ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED', 'RELEASED'] as const;
            const currentStepIdx = steps.indexOf(ord.status);
            
            return (
              <div key={index} className="glass-panel p-6 rounded-2xl space-y-6 border-r-4 border-neon-cyan/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1 text-right">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 justify-end">
                      <span>{ord.productName}</span>
                      <span className="bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded text-[8px] text-neon-cyan font-bold font-mono">
                        {ord.id}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      قيمة الصفقة: <strong className="text-white font-mono">{ord.price.toFixed(2)} {wallet.currency}</strong> | المشتري: <strong className="text-white">{ord.buyerName}</strong> | البائع: <strong className="text-white">{ord.sellerName}</strong>
                    </p>
                  </div>

                  {/* زر ترقية حالة الضمان المالي */}
                  {ord.status !== 'RELEASED' && (
                    <NeonButton
                      variant={ord.status === 'DELIVERED' ? 'green' : 'cyan'}
                      glow={true}
                      disabled={loading}
                      onClick={() => advanceEscrowState(ord.id, ord.status)}
                      className="text-xs py-2 px-4 whitespace-nowrap self-stretch sm:self-auto justify-center"
                    >
                      {ord.status === 'PAID' ? 'محاكاة شحن المنتج (Ship)' : ord.status === 'SHIPPED' ? 'محاكاة وصول واستلام المشتري (Deliver)' : 'تحرير وصرف الأموال للبائع (Release)'}
                    </NeonButton>
                  )}
                </div>

                {/* متتبع خط سير الـ State Machine التفاعلي */}
                <div className="flex justify-between items-center relative pt-4">
                  <div className="absolute left-4 right-4 top-[2.2rem] h-[2px] bg-white/5 z-0" />
                  <div
                    className="absolute left-4 right-4 top-[2.2rem] h-[2px] bg-gradient-to-r from-neon-cyan to-volt-green z-0 transition-all duration-500"
                    style={{
                      width: `${(currentStepIdx / 4) * 85}%`,
                      right: 'auto',
                      left: '20px',
                    }}
                  />

                  {steps.map((st, stepIdx) => {
                    const done = stepIdx <= currentStepIdx;
                    const active = stepIdx === currentStepIdx;
                    
                    return (
                      <div key={stepIdx} className="flex flex-col items-center space-y-2 z-10 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          active
                            ? 'bg-[#0B0B0F] border-neon-cyan text-neon-cyan shadow-glow-cyan scale-110'
                            : done
                            ? 'bg-volt-green border-volt-green text-black'
                            : 'bg-[#12121A] border-white/5 text-gray-600'
                        }`}>
                          {stepIdx + 1}
                        </div>
                        <span className={`text-[9px] font-bold ${active ? 'text-neon-cyan' : done ? 'text-volt-green' : 'text-gray-600'}`}>
                          {st === 'CREATED' ? 'إنشاء' : st === 'PAID' ? 'تم الدفع' : st === 'SHIPPED' ? 'شحن' : st === 'DELIVERED' ? 'توصيل' : 'صرف'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* كتالوج المنتجات المعروضة للبيع بالسوق */}
      <section className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">السلع الرياضية المتاحة للشراء والتداول</Heading2>
          <span className="text-[10px] text-purple-400 font-bold">بوابة التداول الآمن</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((p, index) => (
            <div key={index} className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:scale-[1.02] transition-transform">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-2xl">{p.imgPlaceholder}</span>
                  <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[8px] text-gray-400 font-mono">
                    {p.id}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white leading-normal h-8">{p.name}</h3>
                <p className="text-[10px] text-volt-green font-semibold">{p.condition}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">القيمة والافتتاح</span>
                  <span className="text-white font-extrabold font-mono">{p.price.toFixed(2)} {wallet.currency}</span>
                </div>
                
                <NeonButton
                  variant="cyan"
                  glow={true}
                  disabled={loading}
                  onClick={() => buyProduct(p)}
                  className="w-full text-xs py-2 mt-2"
                >
                  شراء وضمان السلعة بأمان
                </NeonButton>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
