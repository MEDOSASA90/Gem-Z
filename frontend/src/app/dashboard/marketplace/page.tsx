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
  SlidersHorizontal,
  Search,
  Sliders,
  Sparkles,
  Dumbbell,
} from 'lucide-react';

interface ProductMock {
  id: string;
  name: string;
  price: number;
  condition: string;
  conditionDesc: string;
  sellerId: string;
  imgPlaceholder: string;
  brand: string;
  specs: string[];
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
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'EXCELLENT' | 'OPEN_BOX'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // كتالوج المنتجات الرياضية المعروضة بنسق تاريخي فاخر (Historical used equipment)
  const products: ProductMock[] = [
    {
      id: 'prod-egy-109',
      name: 'مجموعة دمبل حديد ذكي 24 كجم (Smart Dumbbell Elite)',
      price: 12500.00,
      condition: 'EXCELLENT',
      conditionDesc: 'استعمال خفيف - خالي من الخدوش',
      sellerId: 'usr-seller-902',
      brand: 'IronGlow Cairo',
      imgPlaceholder: '🏋️‍♂️',
      specs: [
        'معايرة تلقائية للوزن بنصف ثانية',
        'مستشعرات تتبع الحركة ومزامنة البلوتوث',
        'عمر بطارية للمستشعر يدوم 90 يوماً',
      ]
    },
    {
      id: 'prod-egy-204',
      name: 'ساعة آبل الرياضية الذكية الجيل السابع (Apple Watch S7)',
      price: 9800.00,
      condition: 'EXCELLENT',
      conditionDesc: 'حالة ممتازة - بطارية 94%',
      sellerId: 'usr-seller-771',
      brand: 'Apple Refurbished',
      imgPlaceholder: '⌚',
      specs: [
        'توافق كامل مع تطبيق الخطوات GEM Z',
        'تتبع نبضات القلب والـ GPS الحي',
        'مستشعر التسارع الهاتف لمنع التلاعب',
      ]
    },
    {
      id: 'prod-egy-302',
      name: 'حزام تتبع الـ Cadence وسرعة الركض الاحترافي',
      price: 3600.00,
      condition: 'OPEN_BOX',
      conditionDesc: 'مفتوح العلبة للتجربة والتحقق فقط',
      sellerId: 'usr-seller-303',
      brand: 'SenzOS Global',
      imgPlaceholder: '🎗️',
      specs: [
        'مطابقة وتيرة الخطوات مع الـ GPS',
        'دقة قياس تتجاوز 99.8% للأداء الحركي',
        'حماية كاملة ضد الغش والحركات الوهمية',
      ]
    },
  ];

  // سجل صفقات الأمان المالي المعلقة (Escrow Transactions)
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrderMock[]>([
    {
      id: 'order-esc-egy-901',
      productName: 'مشاية التمارين الشاقة الرياضية (Treadmill Force)',
      price: 18500.00,
      status: 'PAID',
      sellerName: 'الكابتن أحمد كمال - القاهرة',
      buyerName: 'محمود عبد العزيز',
    },
  ]);

  const advanceEscrowState = async (orderId: string, currentStatus: EscrowOrderMock['status']) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let nextStatus: EscrowOrderMock['status'] = 'CREATED';
    let msg = '';

    if (currentStatus === 'CREATED') {
      nextStatus = 'PAID';
      msg = '💰 تم تفويض ودفع الأموال في محفظة الضمان بنجاح بالجنيه المصري!';
    } else if (currentStatus === 'PAID') {
      nextStatus = 'SHIPPED';
      msg = '🚚 تم شحن المنتج وتسليمه لشركة الشحن الشريكة بمصر!';
    } else if (currentStatus === 'SHIPPED') {
      nextStatus = 'DELIVERED';
      msg = '📦 تم تسليم المنتج للمشتري وتأكيد فحص skeletal مفاصل الجهاز!';
    } else if (currentStatus === 'DELIVERED') {
      nextStatus = 'RELEASED';
      msg = '🎉 تم فك الضمان المالي والإفراج عن الأموال لحساب البائع بالجنيه المصري!';
      
      const order = escrowOrders.find((o) => o.id === orderId);
      if (order) {
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

  const buyProduct = async (product: ProductMock) => {
    if (wallet.balance < product.price) {
      setSuccessMsg('❌ رصيد محفظتك بالجنيه المصري غير كافٍ لإتمام عملية الشراء والضمان المالي!');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const newBalance = wallet.balance - product.price;
    updateWalletBalance(newBalance, wallet.withdrawableBalance, wallet.heldBalance);

    const newOrder: EscrowOrderMock = {
      id: `order-esc-egy-${Math.floor(Math.random() * 9000) + 1000}`,
      productName: product.name,
      price: product.price,
      status: 'PAID',
      sellerName: 'الكابتن علي محمود - الجيزة',
      buyerName: 'محمود عبد العزيز',
    };

    setEscrowOrders((prev) => [newOrder, ...prev]);
    setSuccessMsg(`💰 تم حجز وشراء المنتج بنجاح! تم قفل مبلغ ${product.price.toFixed(2)} ${wallet.currency} في محفظة الضمان المالي الآمن (Escrow) لحين تسليم المنتج.`);
    setLoading(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || p.condition === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
            سوق تداول الأجهزة الرياضية والمعدات المؤمنة (Used Marketplace & Escrow System)
          </h1>
          <BodyText className="text-xs">
            أقوى متجر تداول بمصر لحفظ حقوق البائع والمشتري بآلة الحالة الذكية وقفل الأرصدة بالجنيه المصري.
          </BodyText>
        </div>
      </div>

      {/* العدادات التفاعلية للسوق */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">ESCROW TRANSACTIONS SECURED</span>
            <ShieldCheck className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {escrowOrders.length} <span className="text-neon-cyan text-xs">عمليات مؤمنة</span>
          </p>
          <BodyText className="text-[10px] pt-1">عدد الصفقات المعلقة المقفلة داخل المنصة</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">TOTAL ESCROW VAULT (EGP)</span>
            <DollarSign className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {escrowOrders.reduce((acc, curr) => acc + curr.price, 0).toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">إجمالي الضمان المالي المقفل بالجنيه المصري</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-premium-gold/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-500 font-bold">PREMIUM USED ITEMS LISTED</span>
            <ShoppingBag className="w-4 h-4 text-premium-gold" />
          </div>
          <p className="text-2xl font-black text-white tracking-wider">
            {products.length} <span className="text-premium-gold text-xs">سلع فاخرة</span>
          </p>
          <BodyText className="text-[10px] pt-1">إجمالي المنتجات المتاحة للتداول الفوري بمصر</BodyText>
        </div>
      </div>

      {/* متتبع صفقات الضمان المالي التفاعلي (Escrow State Machine) */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <Heading2 className="text-base text-white">متتبع دورة الضمان المالي التفاعلي للطلب (Used Escrow State Machine)</Heading2>
          <span className="text-[10px] text-gray-500">مراحل دورة الشحن والتأمين بالجنيه المصري</span>
        </div>

        {/* إشعار النجاح */}
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
                      قيمة الضمان المقفل: <strong className="text-white font-mono">{ord.price.toFixed(2)} {wallet.currency}</strong> | المشتري: <strong className="text-white">{ord.buyerName}</strong> | البائع: <strong className="text-white">{ord.sellerName}</strong>
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
                      {ord.status === 'PAID' ? 'محاكاة شحن المنتج بمصر (Ship)' : ord.status === 'SHIPPED' ? 'محاكاة تأكيد استلام العميل (Deliver)' : 'تحرير الأموال للبائع الآن (Release)'}
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
                          {st === 'CREATED' ? 'إنشاء' : st === 'PAID' ? 'دفع' : st === 'SHIPPED' ? 'شحن' : st === 'DELIVERED' ? 'توصيل' : 'صرف'}
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

      {/* الكتالوج التاريخي الفاخر للمنتجات والمعدات الرياضية المعروضة */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        
        {/* ترويسة تصفية الكتالوج والبحث */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-3">
          <div className="space-y-1">
            <Heading2 className="text-base text-white flex items-center gap-2 justify-end">
              <span>الكتالوج التاريخي الفاخر للسلع المعروضة بمصر</span>
              <Sparkles className="w-4 h-4 text-premium-gold" />
            </Heading2>
            <BodyText className="text-[10px] text-gray-500">تصفح واقتن أرقى المعدات الرياضية المؤمنة بآلة الأمان المالي</BodyText>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            {/* منتقي التصفية */}
            <div className="flex bg-white/5 p-1 rounded-xl text-xs gap-1">
              <button
                onClick={() => setSelectedFilter('ALL')}
                className={`px-3 py-1 rounded-lg ${selectedFilter === 'ALL' ? 'bg-neon-cyan text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedFilter('EXCELLENT')}
                className={`px-3 py-1 rounded-lg ${selectedFilter === 'EXCELLENT' ? 'bg-neon-cyan text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                ممتازة
              </button>
              <button
                onClick={() => setSelectedFilter('OPEN_BOX')}
                className={`px-3 py-1 rounded-lg ${selectedFilter === 'OPEN_BOX' ? 'bg-neon-cyan text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                علبة مفتوحة
              </button>
            </div>

            {/* صندوق البحث */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="البحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card-dark text-white pl-4 pr-10 py-1.5 rounded-xl border border-white/10 outline-none text-xs focus:border-neon-cyan"
              />
              <Search className="absolute right-3 top-2 w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>

        {/* عرض البطاقات الفاخرة النيون (Historical Glow Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredProducts.map((p, index) => (
            <div key={index} className="glass-panel p-6 rounded-3xl flex flex-col justify-between space-y-6 hover:scale-[1.03] hover:border-premium-gold/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-3xl bg-white/5 w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.02)]">
                    {p.imgPlaceholder}
                  </span>
                  <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[8px] text-gray-400 font-mono">
                    {p.id}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] text-premium-gold font-bold tracking-widest uppercase font-mono">{p.brand}</span>
                  <h3 className="text-xs font-bold text-white leading-normal h-8">{p.name}</h3>
                  <span className="inline-block bg-volt-green/10 border border-volt-green/20 px-2 py-0.5 rounded text-[8px] text-volt-green font-bold">
                    {p.conditionDesc}
                  </span>
                </div>

                {/* المواصفات والخصائص التاريخية التفصيلية للسلعة (Specs List) */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[8px] text-gray-500 font-bold block">TECHNICAL SPECIFICATIONS</span>
                  <ul className="text-[9px] text-gray-400 space-y-1 pr-3 list-disc list-outside text-right">
                    {p.specs.map((sp, spIdx) => (
                      <li key={spIdx}>{sp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* تفاصيل الأسعار وأزرار الشراء المتوهجة بالجنيه المصري */}
              <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">سعر السلعة بالجنيه</span>
                  <span className="text-white font-black font-mono text-sm tracking-wide">
                    {p.price.toLocaleString('ar-EG')} {wallet.currency}
                  </span>
                </div>
                
                <NeonButton
                  variant="cyan"
                  glow={true}
                  disabled={loading}
                  onClick={() => buyProduct(p)}
                  className="w-full text-xs py-2.5 mt-2"
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
