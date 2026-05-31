'use client';

import React, { useState } from 'react';
import { Heading2, BodyText, NeonButton } from '../../../core/theme/design-tokens';
import { useAuthStore } from '../../../core/store/use-store';
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  Package,
  Search,
  Sparkles,
  DollarSign,
  Award,
} from 'lucide-react';

interface ProductMock {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  condition: 'EXCELLENT' | 'OPEN_BOX';
  conditionDescAr: string;
  conditionDescEn: string;
  sellerId: string;
  imgPlaceholder: string;
  brand: string;
  specsAr: string[];
  specsEn: string[];
}

interface EscrowOrderMock {
  id: string;
  productNameAr: string;
  productNameEn: string;
  price: number;
  status: 'CREATED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'RELEASED';
  sellerNameAr: string;
  sellerNameEn: string;
  buyerNameAr: string;
  buyerNameEn: string;
}

export default function MarketplaceDashboard() {
  const { wallet, lang, updateWalletBalance } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'EXCELLENT' | 'OPEN_BOX'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const isAr = lang === 'ar';

  // Bilingual translation dictionary for Marketplace
  const marketDict = {
    ar: {
      title: 'سوق تداول الأجهزة الرياضية والمعدات المؤمنة (Used Marketplace & Escrow System)',
      subtitle: 'أقوى متجر تداول بمصر لحفظ حقوق البائع والمشتري بآلة الحالة الذكية وقفل الأرصدة بالجنيه المصري.',
      statSecured: 'الصفقات المؤمنة نشطة',
      statSecuredDesc: 'عدد الصفقات المعلقة المقفلة داخل المنصة',
      statVault: 'إجمالي الضمان المالي المقفل',
      statVaultDesc: 'إجمالي الضمان المالي المقفل بالجنيه المصري',
      statListed: 'سلع رياضية فاخرة معروضة',
      statListedDesc: 'إجمالي المنتجات المتاحة للتداول الفوري بمصر',
      escrowTitle: 'متتبع دورة الضمان المالي التفاعلي للطلب (Used Escrow State Machine)',
      escrowSubtitle: 'مراحل دورة الشحن والتأمين بالجنيه المصري لصفقتك الحالية',
      shipBtn: 'محاكاة شحن المنتج بمصر (Ship)',
      deliverBtn: 'محاكاة تأكيد استلام العميل (Deliver)',
      releaseBtn: 'تحرير الأموال للبائع الآن (Release)',
      catalogTitle: 'الكتالوج التاريخي الفاخر للسلع المعروضة بمصر',
      catalogSubtitle: 'تصفح واقتن أرقى المعدات الرياضية المؤمنة بآلة الأمان المالي',
      searchPlaceholder: 'البحث عن منتج...',
      filterAll: 'الكل',
      filterExcellent: 'ممتازة',
      filterOpenBox: 'علبة مفتوحة',
      specsTitle: 'المواصفات والخصائص التقنية الفنية',
      priceLabel: 'سعر السلعة بالجنيه',
      btnBuy: 'شراء وضمان السلعة بأمان',
      insufficientFunds: '❌ رصيد محفظتك بالجنيه المصري غير كافٍ لإتمام عملية الشراء والضمان المالي!',
      successBuy: '💰 تم حجز وشراء المنتج بنجاح! تم قفل مبلغ {amount} جنيه مصري في محفظة الضمان المالي الآمن (Escrow) لحين تسليم المنتج.',
      successRelease: '🎉 تم فك الضمان المالي والإفراج عن الأموال لحساب البائع بالجنيه المصري!',
      successShip: '🚚 تم شحن المنتج وتسليمه لشركة الشحن الشريكة بمصر!',
      successDeliver: '📦 تم تسليم المنتج للمشتري وتأكيد فحص skeletal مفاصل الجهاز!',
      brandLabel: 'العلامة الفاخرة: ',
      cairoDumbbell: 'مجموعة دمبل حديد ذكي 24 كجم (Smart Dumbbell Elite)',
      cairoDumbbellDesc: 'استعمال خفيف - خالي من الخدوش والعيوب',
      appleWatch: 'ساعة آبل الرياضية الذكية الجيل السابع (Apple Watch S7)',
      appleWatchDesc: 'حالة ممتازة - بطارية 94%',
      cadenceBelt: 'حزام تتبع الـ Cadence وسرعة الركض الاحترافي',
      cadenceBeltDesc: 'مفتوح العلبة للتجربة والتحقق فقط',
      secPrefix: 'صفقات معلقة',
      secListed: 'سلع فاخرة',
      seller1: 'الكابتن علي محمود - الجيزة',
      seller2: 'الكابتن أحمد كمال - القاهرة',
      buyerMe: 'محمود عبد العزيز',
      spec1_1: 'معايرة تلقائية للوزن بنصف ثانية',
      spec1_2: 'مستشعرات تتبع الحركة ومزامنة البلوتوث',
      spec1_3: 'عمر بطارية للمستشعر يدوم 90 يوماً',
      spec2_1: 'توافق كامل مع تطبيق الخطوات GEM Z',
      spec2_2: 'تتبع نبضات القلب والـ GPS الحي',
      spec2_3: 'مستشعر التسارع الهاتف لمنع التلاعب',
      spec3_1: 'مطابقة وتيرة الخطوات مع الـ GPS',
      spec3_2: 'دقة قياس تتجاوز 99.8% للأداء الحركي',
      spec3_3: 'حماية كاملة ضد الغش والحركات الوهمية',
      treadmillAr: 'مشاية التمارين الشاقة الرياضية (Treadmill Force)',
      treadmillEn: 'Treadmill Force',
    },
    en: {
      title: 'Protected Used Sports Marketplace (Used Marketplace & Escrow)',
      subtitle: 'Egypt’s premier elite used equipment exchange safeguarding buyer and seller cashflows under 5-stage Escrow state machines.',
      statSecured: 'Secured Trades Active',
      statSecuredDesc: 'Count of active escrow contracts held securely by platform vault',
      statVault: 'Total Escrow Vault (EGP)',
      statVaultDesc: 'Aggregated EGP assets locked under regional security guards',
      statListed: 'Premium Items Listed',
      statListedDesc: 'Luxury equipment listings cleared for immediate dispatch in Egypt',
      escrowTitle: 'Interactive Escrow Order Lifecycle Tracker (Used Escrow State Machine)',
      escrowSubtitle: 'Track e-commerce shipping and funds verification progress',
      shipBtn: 'Mark Shipped in Egypt (Ship)',
      deliverBtn: 'Confirm Buyer Delivery (Deliver)',
      releaseBtn: 'Release Escrow Vault (Release)',
      catalogTitle: 'Elite "Historical" Luxury Equipment Catalog',
      catalogSubtitle: 'Browse and purchase premium certified gear secured under financial escrows',
      searchPlaceholder: 'Search catalog products...',
      filterAll: 'All Items',
      filterExcellent: 'Excellent',
      filterOpenBox: 'Open Box',
      specsTitle: 'TECHNICAL SPECIFICATIONS',
      priceLabel: 'Product Price in EGP',
      btnBuy: 'Purchase & Initialize Escrow',
      insufficientFunds: '❌ Insufficient EGP balance in your active Egyptian wallet to secure this escrow purchase!',
      successBuy: '💰 Purchase completed! {amount} EGP has been locked in secure Escrow platform vaults awaiting shipping.',
      successRelease: '🎉 Escrow released! Funds successfully disbursed to the Egyptian seller account.',
      successShip: '🚚 Product marked as shipped in Egypt! Telemetry tracked in logistics network.',
      successDeliver: '📦 Product delivered successfully! Trainee checked and confirmed skeletal parameters.',
      brandLabel: 'Premium Brand: ',
      cairoDumbbell: 'Smart Iron Dumbbell Set 24kg (Smart Dumbbell Elite)',
      cairoDumbbellDesc: 'Lightly used - zero scratches or visual defects',
      appleWatch: 'Apple Watch Series 7 Sport Edition (Apple Watch S7)',
      appleWatchDesc: 'Like new - battery health 94% original capacity',
      cadenceBelt: 'Professional Cadence & Geolocation Runner Belt',
      cadenceBeltDesc: 'Open box - unpacked only for certification test',
      secPrefix: 'escrow trades',
      secListed: 'luxury products',
      seller1: 'Captain Ali Mahmoud - Giza',
      seller2: 'Captain Ahmed Kemal - Cairo',
      buyerMe: 'Mahmoud Abdelaziz',
      spec1_1: 'Auto weight recalibration in 0.5 seconds',
      spec1_2: 'Move telemetry tracking & Bluetooth sync',
      spec1_3: 'Hardware sensor battery lifecycle 90 days',
      spec2_1: 'Flawless hardware sync to GEM Z step counter',
      spec2_2: 'Real-time heart rates & GPS tracking',
      spec2_3: 'Accelerometer device check integration',
      spec3_1: 'GPS speed matched with stepper frequency',
      spec3_2: 'Pose check and sensor accuracies >99.8%',
      spec3_3: 'Hardware filter bypass prevention algorithms',
      treadmillAr: 'مشاية التمارين الشاقة الرياضية (Treadmill Force)',
      treadmillEn: 'Treadmill Force',
    }
  } as const;

  const t = marketDict[lang];

  const products: ProductMock[] = [
    {
      id: 'prod-egy-109',
      nameAr: t.cairoDumbbell,
      nameEn: t.cairoDumbbell,
      price: 12500.00,
      condition: 'EXCELLENT',
      conditionDescAr: t.cairoDumbbellDesc,
      conditionDescEn: t.cairoDumbbellDesc,
      sellerId: 'usr-seller-902',
      brand: 'IronGlow Cairo',
      imgPlaceholder: '🏋️‍♂️',
      specsAr: [t.spec1_1, t.spec1_2, t.spec1_3],
      specsEn: [t.spec1_1, t.spec1_2, t.spec1_3],
    },
    {
      id: 'prod-egy-204',
      nameAr: t.appleWatch,
      nameEn: t.appleWatch,
      price: 9800.00,
      condition: 'EXCELLENT',
      conditionDescAr: t.appleWatchDesc,
      conditionDescEn: t.appleWatchDesc,
      sellerId: 'usr-seller-771',
      brand: 'Apple Refurbished',
      imgPlaceholder: '⌚',
      specsAr: [t.spec2_1, t.spec2_2, t.spec2_3],
      specsEn: [t.spec2_1, t.spec2_2, t.spec2_3],
    },
    {
      id: 'prod-egy-302',
      nameAr: t.cadenceBelt,
      nameEn: t.cadenceBelt,
      price: 3600.00,
      condition: 'OPEN_BOX',
      conditionDescAr: t.cadenceBeltDesc,
      conditionDescEn: t.cadenceBeltDesc,
      sellerId: 'usr-seller-303',
      brand: 'SenzOS Global',
      imgPlaceholder: '🎗️',
      specsAr: [t.spec3_1, t.spec3_2, t.spec3_3],
      specsEn: [t.spec3_1, t.spec3_2, t.spec3_3],
    },
  ];

  const [escrowOrders, setEscrowOrders] = useState<EscrowOrderMock[]>([
    {
      id: 'order-esc-egy-901',
      productNameAr: t.treadmillAr,
      productNameEn: t.treadmillEn,
      price: 18500.00,
      status: 'PAID',
      sellerNameAr: t.seller2,
      sellerNameEn: t.seller2,
      buyerNameAr: t.buyerMe,
      buyerNameEn: t.buyerMe,
    },
  ]);

  const advanceEscrowState = async (orderId: string, currentStatus: EscrowOrderMock['status']) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let nextStatus: EscrowOrderMock['status'] = 'CREATED';
    let msg = '';

    if (currentStatus === 'CREATED') {
      nextStatus = 'PAID';
      msg = isAr 
        ? '💰 تم تفويض ودفع الأموال في محفظة الضمان بنجاح بالجنيه المصري!'
        : '💰 Funds successfully locked in Escrow vault in EGP!';
    } else if (currentStatus === 'PAID') {
      nextStatus = 'SHIPPED';
      msg = t.successShip;
    } else if (currentStatus === 'SHIPPED') {
      nextStatus = 'DELIVERED';
      msg = t.successDeliver;
    } else if (currentStatus === 'DELIVERED') {
      nextStatus = 'RELEASED';
      msg = t.successRelease;
      
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
      setSuccessMsg(t.insufficientFunds);
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const newBalance = wallet.balance - product.price;
    updateWalletBalance(newBalance, wallet.withdrawableBalance, wallet.heldBalance);

    const newOrder: EscrowOrderMock = {
      id: `order-esc-egy-${Math.floor(Math.random() * 9000) + 1000}`,
      productNameAr: product.nameAr,
      productNameEn: product.nameEn,
      price: product.price,
      status: 'PAID',
      sellerNameAr: t.seller1,
      sellerNameEn: t.seller1,
      buyerNameAr: t.buyerMe,
      buyerNameEn: t.buyerMe,
    };

    setEscrowOrders((prev) => [newOrder, ...prev]);
    
    const msg = isAr 
      ? t.successBuy.replace('{amount}', product.price.toLocaleString('ar-EG'))
      : t.successBuy.replace('{amount}', product.price.toLocaleString('en-US'));
      
    setSuccessMsg(msg);
    setLoading(false);
  };

  const filteredProducts = products.filter((p) => {
    const name = isAr ? p.nameAr : p.nameEn;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || p.condition === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`space-y-8 animate-fade-in ${isAr ? 'text-right' : 'text-left'}`}>
      
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom pb-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-text-primary">
            {t.title}
          </h1>
          <BodyText className="text-xs">
            {t.subtitle}
          </BodyText>
        </div>
      </div>

      {/* العدادات التفاعلية للسوق */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border-neon-cyan/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statSecured}</span>
            <ShieldCheck className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider">
            {escrowOrders.length} <span className="text-neon-cyan text-xs">{t.secPrefix}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statSecuredDesc}</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-volt-green/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statVault}</span>
            <DollarSign className="w-4 h-4 text-volt-green" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider font-mono">
            {escrowOrders.reduce((acc, curr) => acc + curr.price, 0).toFixed(2)} <span className="text-volt-green text-xs">{wallet.currency}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statVaultDesc}</BodyText>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-premium-gold/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t.statListed}</span>
            <ShoppingBag className="w-4 h-4 text-premium-gold" />
          </div>
          <p className="text-2xl font-black text-text-primary tracking-wider">
            {products.length} <span className="text-premium-gold text-xs">{t.secListed}</span>
          </p>
          <BodyText className="text-[10px] pt-1">{t.statListedDesc}</BodyText>
        </div>
      </div>

      {/* متتبع صفقات الضمان المالي التفاعلي (Escrow State Machine) */}
      <section className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-border-custom pb-3">
          <Heading2 className="text-base">{t.escrowTitle}</Heading2>
          <span className="text-[10px] text-text-muted">{t.escrowSubtitle}</span>
        </div>

        {/* إشعار النجاح */}
        {successMsg && (
          <div className="bg-volt-green/10 border border-volt-green/20 text-volt-green text-xs rounded-xl p-4 shadow-[0_0_10px_rgba(57,255,20,0.05)] animate-fade-in">
            {successMsg}
          </div>
        )}

        <div className="space-y-6">
          {escrowOrders.map((ord, index) => {
            const steps = ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED', 'RELEASED'] as const;
            const currentStepIdx = steps.indexOf(ord.status);
            
            return (
              <div key={index} className={`glass-panel p-6 rounded-2xl space-y-6 border-border-custom transition-all duration-300 ${isAr ? 'border-r-4 border-neon-cyan/50' : 'border-l-4 border-neon-cyan/50'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1 w-full">
                    <h3 className={`text-sm font-bold text-text-primary flex items-center gap-2 ${isAr ? 'justify-end' : 'justify-start'}`}>
                      <span>{isAr ? ord.productNameAr : ord.productNameEn}</span>
                      <span className="bg-neon-cyan/10 border border-neon-cyan/25 px-2 py-0.5 rounded text-[8px] text-neon-cyan font-bold font-mono">
                        {ord.id}
                      </span>
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {isAr 
                        ? `قيمة الضمان المقفل: ${ord.price.toFixed(2)} جنيه | المشتري: ${ord.buyerNameAr} | البائع: ${ord.sellerNameAr}`
                        : `Vault Held: ${ord.price.toFixed(2)} EGP | Buyer: ${ord.buyerNameEn} | Seller: ${ord.sellerNameEn}`}
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
                      {ord.status === 'PAID' ? t.shipBtn : ord.status === 'SHIPPED' ? t.deliverBtn : t.releaseBtn}
                    </NeonButton>
                  )}
                </div>

                {/* متتبع خط سير الـ State Machine التفاعلي */}
                <div className="flex justify-between items-center relative pt-4" style={{ direction: 'ltr' }}>
                  <div className="absolute left-4 right-4 top-[2.2rem] h-[2px] bg-text-muted/10 z-0" />
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
                            : 'bg-cyber-dark border-border-custom text-text-muted'
                        }`}>
                          {stepIdx + 1}
                        </div>
                        <span className={`text-[9px] font-bold ${active ? 'text-neon-cyan' : done ? 'text-volt-green' : 'text-text-muted'}`}>
                          {st === 'CREATED' ? (isAr ? 'إنشاء' : 'Created') 
                            : st === 'PAID' ? (isAr ? 'حجز' : 'Paid') 
                            : st === 'SHIPPED' ? (isAr ? 'شحن' : 'Shipped') 
                            : st === 'DELIVERED' ? (isAr ? 'توصيل' : 'Delivered') 
                            : (isAr ? 'إفراج' : 'Released')}
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-3">
          <div className="space-y-1">
            <Heading2 className="text-base flex items-center gap-2">
              <span>{t.catalogTitle}</span>
              <Sparkles className="w-4 h-4 text-premium-gold" />
            </Heading2>
            <BodyText className="text-[10px]">{t.catalogSubtitle}</BodyText>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            {/* منتقي التصفية */}
            <div className="flex bg-cyber-dark p-1 rounded-xl text-xs gap-1 border border-border-custom">
              <button
                onClick={() => setSelectedFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${selectedFilter === 'ALL' ? 'bg-neon-cyan text-black' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t.filterAll}
              </button>
              <button
                onClick={() => setSelectedFilter('EXCELLENT')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${selectedFilter === 'EXCELLENT' ? 'bg-neon-cyan text-black' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t.filterExcellent}
              </button>
              <button
                onClick={() => setSelectedFilter('OPEN_BOX')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${selectedFilter === 'OPEN_BOX' ? 'bg-neon-cyan text-black' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t.filterOpenBox}
              </button>
            </div>

            {/* صندوق البحث */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-cyber-dark text-text-primary pl-4 pr-10 py-1.5 rounded-xl border border-border-custom outline-none text-xs focus:border-neon-cyan"
              />
              <Search className="absolute right-3 top-2 w-4 h-4 text-text-muted" />
            </div>
          </div>
        </div>

        {/* عرض البطاقات الفاخرة النيون (Historical Glow Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredProducts.map((p, index) => (
            <div key={index} className="glass-panel p-6 rounded-3xl flex flex-col justify-between space-y-6 hover:scale-[1.03] hover:border-premium-gold/30 transition-all duration-300 border-border-custom shadow-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-3xl bg-cyber-dark w-12 h-12 rounded-2xl flex items-center justify-center border border-border-custom shadow-[0_0_10px_rgba(255,255,255,0.02)]">
                    {p.imgPlaceholder}
                  </span>
                  <span className="bg-cyber-dark border border-border-custom px-2 py-0.5 rounded text-[8px] text-text-muted font-mono">
                    {p.id}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] text-premium-gold font-bold tracking-widest uppercase font-mono">{t.brandLabel}{p.brand}</span>
                  <h3 className="text-xs font-bold text-text-primary leading-normal h-8">{isAr ? p.nameAr : p.nameEn}</h3>
                  <span className="inline-block bg-volt-green/10 border border-volt-green/20 px-2 py-0.5 rounded text-[8px] text-volt-green font-bold">
                    {isAr ? p.conditionDescAr : p.conditionDescEn}
                  </span>
                </div>

                {/* المواصفات والخصائص التاريخية التفصيلية للسلعة (Specs List) */}
                <div className="space-y-1.5 pt-2 border-t border-border-custom">
                  <span className="text-[8px] text-text-muted font-bold block">TECHNICAL SPECIFICATIONS</span>
                  <ul className={`text-[9px] text-text-secondary space-y-1 ${isAr ? 'list-disc list-outside pr-3' : 'list-disc list-outside pl-3'}`}>
                    {(isAr ? p.specsAr : p.specsEn).map((sp, spIdx) => (
                      <li key={spIdx}>{sp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* تفاصيل الأسعار وأزرار الشراء المتوهجة بالجنيه المصري */}
              <div className="space-y-3 pt-3 border-t border-border-custom text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t.priceLabel}</span>
                  <span className="text-text-primary font-black font-mono text-sm tracking-wide">
                    {isAr ? p.price.toLocaleString('ar-EG') : p.price.toLocaleString('en-US')} {wallet.currency}
                  </span>
                </div>
                
                <NeonButton
                  variant="cyan"
                  glow={true}
                  disabled={loading}
                  onClick={() => buyProduct(p)}
                  className="w-full text-xs py-2.5 mt-2"
                >
                  {t.btnBuy}
                </NeonButton>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
