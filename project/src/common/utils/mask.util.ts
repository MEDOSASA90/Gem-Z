/**
 * =============================================================================
 * MaskUtil - أدوات إخفاء البيانات الحساسة
 * =============================================================================
 */

/**
 * إخفاء البريد الإلكتروني
 * @example maskEmail("john.doe@example.com") => "jo***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;

  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex);

  if (local.length <= 2) {
    return `${local[0]}***${domain}`;
  }

  const visible = local.substring(0, 2);
  return `${visible}***${domain}`;
}

/**
 * إخفاء رقم الهاتف
 * @example maskPhone("+201234567890") => "+20******7890"
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;

  // أظهر آخر 4 أرقام
  const visible = digits.slice(-4);
  const prefix = phone.substring(0, phone.length - 4);
  return `${prefix.replace(/./g, '*')}${visible}`;
}

/**
 * إخفاء رقم البطاقة
 * @example maskCard("1234567890123456") => "****-****-****-3456"
 */
export function maskCard(cardNumber: string): string {
  if (!cardNumber || typeof cardNumber !== 'string') return '';

  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return cardNumber;

  const last4 = digits.slice(-4);
  return `****-****-****-${last4}`;
}

/**
 * إخفاء رقم البطاقة الوطنية
 * @example maskNationalId("12345678901234") => "**********1234"
 */
export function maskNationalId(id: string): string {
  if (!id || typeof id !== 'string') return '';
  if (id.length < 4) return '*'.repeat(id.length);

  return `${'*'.repeat(id.length - 4)}${id.slice(-4)}`;
}

/**
 * إخفاء الاسم (إظهار الحرف الأول فقط)
 * @example maskName("John Doe") => "J*** D**"
 */
export function maskName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .split(' ')
    .map((part) => {
      if (part.length <= 1) return part;
      return `${part[0]}${'*'.repeat(part.length - 1)}`;
    })
    .join(' ');
}

/**
 * إخفاء IBAN
 * @example maskIBAN("EG12345678901234567890") => "EG******************7890"
 */
export function maskIBAN(iban: string): string {
  if (!iban || typeof iban !== 'string') return '';
  if (iban.length < 8) return iban;

  const prefix = iban.substring(0, 2); // كود الدولة
  const suffix = iban.slice(-4);
  return `${prefix}${'*'.repeat(iban.length - 6)}${suffix}`;
}

/**
 * إخفاء نص عشوائي (إظهار أول وآخر حرف)
 * @example maskString("secret") => "s****t"
 */
export function maskString(value: string, visibleChars = 1): string {
  if (!value || typeof value !== 'string') return '';
  if (value.length <= visibleChars * 2) return value;

  const start = value.substring(0, visibleChars);
  const end = value.slice(-visibleChars);
  return `${start}${'*'.repeat(value.length - visibleChars * 2)}${end}`;
}

/**
 * إخفاء IP address
 * @example maskIP("192.168.1.100") => "192.168.*.*"
 */
export function maskIP(ip: string): string {
  if (!ip || typeof ip !== 'string') return '';

  const parts = ip.split('.');
  if (parts.length !== 4) return ip;

  return `${parts[0]}.${parts[1]}.*.*`;
}

/**
 * إخفاء Token
 * @example maskToken("abcdef1234567890") => "abcd...7890"
 */
export function maskToken(token: string, visible = 4): string {
  if (!token || typeof token !== 'string') return '';
  if (token.length <= visible * 2) return token;

  const start = token.substring(0, visible);
  const end = token.slice(-visible);
  return `${start}...${end}`;
}
