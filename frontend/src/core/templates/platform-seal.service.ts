/**
 * =============================================================================
 * PlatformSealService - محرك توليد الأختام والرموز الرقمية المبرمجة
 * =============================================================================
 * - يولد رمز ختم نيون ناقل (SVG Vector) للأندية المتعاقدة والفرنشايز.
 * - يطبع اسم المستأجر [Tenant_ID] وتاريخ التحقق [Verified_Date] على محيط الختم دائرياً.
 * - يدمج شعار المنصة الجيومتري "Z" في المنتصف مع توهج نيون سيبراني.
 */

export class PlatformSealService {
  /**
   * توليد كود SVG لختم التحقق الرقمي للمنصة
   */
  static generatePlatformSeal(tenantId: string, verifiedDate: string): string {
    const formattedDate = verifiedDate || new Date().toLocaleDateString('ar-EG');
    const safeTenant = (tenantId || 'SYSTEM-HQ').toUpperCase();
    
    // بناء معرّف النص الدائري على المحيط
    const circularText = `GEM Z ENTERPRISE SECURITY * SECURE SEAL * ${safeTenant} * ${formattedDate} *`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
      <defs>
        <!-- التدرج اللوني النيون السيبراني -->
        <linearGradient id="sealCyberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00F0FF" />
          <stop offset="100%" stop-color="#39FF14" />
        </linearGradient>
        
        <!-- فلتر توهج نيون ناعم للختم -->
        <filter id="sealNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- مسار النص الدائري الداخلي لتوزيع الكلمات -->
        <path id="sealTextPath" d="M 150, 150 m -95, 0 a 95,95 0 1,1 190,0 a 95,95 0 1,1 -190,0" fill="none" />
      </defs>

      <!-- 1. خلفية داكنة للختم -->
      <circle cx="150" cy="150" r="130" fill="#0B0B0F" stroke="url(#sealCyberGradient)" stroke-width="2" opacity="0.9" />
      
      <!-- 2. الحدود المزدوجة الخارجية المتوهجة -->
      <circle cx="150" cy="150" r="122" fill="none" stroke="#00F0FF" stroke-width="1.5" stroke-dasharray="8, 4" filter="url(#sealNeonGlow)" opacity="0.8" />
      <circle cx="150" cy="150" r="115" fill="none" stroke="#39FF14" stroke-width="1" opacity="0.5" />

      <!-- 3. مسار النص الدائري المغلق -->
      <text fill="url(#sealCyberGradient)" font-family="monospace, sans-serif" font-size="10" font-weight="900" letter-spacing="3">
        <textPath href="#sealTextPath" startOffset="0%">
          ${circularText}
        </textPath>
      </text>

      <!-- 4. الدائرة الداخلية وحماية شعار المنصة -->
      <circle cx="150" cy="150" r="75" fill="#12121A" stroke="url(#sealCyberGradient)" stroke-width="2" />
      <circle cx="150" cy="150" r="70" fill="none" stroke="#00F0FF" stroke-width="1" opacity="0.3" stroke-dasharray="4, 2" />

      <!-- 5. مجسم شعار المنصة الجيومتري "Z" في المنتصف -->
      <g filter="url(#sealNeonGlow)">
        <!-- شكل Z الهندسي النيون الفاقع -->
        <path d="M 120,110 L 180,110 L 120,190 L 180,190" fill="none" stroke="url(#sealCyberGradient)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
        <!-- عنصر نيون متوهج إضافي -->
        <circle cx="150" cy="150" r="8" fill="#39FF14" />
      </g>
    </svg>`;
  }

  /**
   * تحويل كود الـ SVG المولد إلى صيغة Base64 Data URI ليتم استخدامه مباشرة كـ Image Source
   */
  static generatePlatformSealBase64(tenantId: string, verifiedDate: string): string {
    const svgString = this.generatePlatformSeal(tenantId, verifiedDate);
    // تشفير الـ SVG بأمان في بيئات المتصفح والخادم Node.js
    const base64 = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(svgString)))
      : Buffer.from(svgString).toString('base64');
    
    return `data:image/svg+xml;base64,${base64}`;
  }
}
