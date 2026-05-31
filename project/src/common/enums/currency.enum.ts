/**
 * =============================================================================
 * CurrencyEnum - العملات المدعومة
 * =============================================================================
 */

export enum Currency {
  EGP = 'EGP', // الجنيه المصري
  SAR = 'SAR', // الريال السعودي
  USD = 'USD', // الدولار الأمريكي
  EUR = 'EUR', // اليورو
  AED = 'AED', // الدرهم الإماراتي
  KWD = 'KWD', // الدينار الكويتي
  QAR = 'QAR', // الريال القطري
  BHD = 'BHD', // الدينار البحريني
  OMR = 'OMR', // الريال العماني
  JOD = 'JOD', // الدينار الأردني
}

/** معلومات إضافية عن كل عملة */
export const CurrencyInfo: Record<Currency, { name: string; symbol: string; decimals: number; country: string }> = {
  [Currency.EGP]: { name: 'Egyptian Pound', symbol: 'E£', decimals: 2, country: 'Egypt' },
  [Currency.SAR]: { name: 'Saudi Riyal', symbol: 'SR', decimals: 2, country: 'Saudi Arabia' },
  [Currency.USD]: { name: 'US Dollar', symbol: '$', decimals: 2, country: 'United States' },
  [Currency.EUR]: { name: 'Euro', symbol: '€', decimals: 2, country: 'European Union' },
  [Currency.AED]: { name: 'UAE Dirham', symbol: 'AED', decimals: 2, country: 'UAE' },
  [Currency.KWD]: { name: 'Kuwaiti Dinar', symbol: 'KD', decimals: 3, country: 'Kuwait' },
  [Currency.QAR]: { name: 'Qatari Riyal', symbol: 'QR', decimals: 2, country: 'Qatar' },
  [Currency.BHD]: { name: 'Bahraini Dinar', symbol: 'BD', decimals: 3, country: 'Bahrain' },
  [Currency.OMR]: { name: 'Omani Rial', symbol: 'RO', decimals: 3, country: 'Oman' },
  [Currency.JOD]: { name: 'Jordanian Dinar', symbol: 'JD', decimals: 3, country: 'Jordan' },
};
