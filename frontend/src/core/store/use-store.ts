import { create } from 'zustand';

export interface UserProfile {
  id: string;
  phone: string;
  role: 'TRAINEE' | 'TRAINER' | 'GYM_OWNER' | 'HR_ADMIN';
  tenantId: string;
  name: string;
}

export interface WalletState {
  balance: number;
  currency: 'EGP';
  withdrawableBalance: number;
  heldBalance: number;
}

interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  user: UserProfile | null;
  authToken: string | null;
  
  // Wallet information
  wallet: WalletState;
  
  // Global Translation & Theme Governance
  lang: 'ar' | 'en';
  theme: 'dark' | 'light';
  toggleLang: () => void;
  toggleTheme: () => void;
  
  // OTP flow state
  loginPhone: string;
  otpSent: boolean;
  verificationLoading: boolean;
  verificationError: string | null;
  
  // Actions
  setLoginPhone: (phone: string) => void;
  triggerOtpSend: () => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  logout: () => void;
  updateWalletBalance: (amount: number, withdrawable: number, held: number) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  authToken: null,
  
  // Initial wallet state defaulted strictly to Egyptian Pounds (EGP)
  wallet: {
    balance: 8500.00,
    currency: 'EGP',
    withdrawableBalance: 6800.00,
    heldBalance: 1700.00,
  },
  
  // Global Translation & Theme settings
  lang: 'ar', // Defaulting to Arabic (RTL)
  theme: 'dark', // Defaulting to Cyber Dark mode
  
  toggleLang: () => set((state) => ({ lang: state.lang === 'ar' ? 'en' : 'ar' })),
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (nextTheme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
    set({ theme: nextTheme });
  },
  
  loginPhone: '',
  otpSent: false,
  verificationLoading: false,
  verificationError: null,

  setLoginPhone: (phone) => set({ loginPhone: phone, verificationError: null }),

  triggerOtpSend: async () => {
    const { loginPhone, lang } = get();
    if (!loginPhone || loginPhone.length < 9) {
      set({ 
        verificationError: lang === 'ar' 
          ? 'الرجاء إدخال رقم هاتف مصري صحيح (مثال: 1012345678)' 
          : 'Please enter a valid Egyptian phone number (e.g. 1012345678)' 
      });
      return false;
    }
    
    set({ verificationLoading: true, verificationError: null });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    set({ otpSent: true, verificationLoading: false });
    return true;
  },

  verifyOtp: async (code) => {
    const { lang } = get();
    if (code !== '123456') {
      set({ 
        verificationError: lang === 'ar'
          ? 'كود التحقق غير صحيح، حاول مرة أخرى (الرمز التجريبي: 123456)' 
          : 'Incorrect verification code. Please try again (Demo code: 123456)' 
      });
      return false;
    }
    
    set({ verificationLoading: true, verificationError: null });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const mockUser: UserProfile = {
      id: 'usr-eg-802',
      phone: get().loginPhone,
      role: 'HR_ADMIN',
      tenantId: 'GEMZ-EG-CAIRO-902',
      name: lang === 'ar' ? 'محمود عبد العزيز' : 'Mahmoud Abdelaziz',
    };
    
    set({
      isAuthenticated: true,
      user: mockUser,
      authToken: 'mock-jwt-token-egypt-10298',
      otpSent: false,
      verificationLoading: false,
      wallet: {
        balance: 14500.00,
        currency: 'EGP',
        withdrawableBalance: 12000.00,
        heldBalance: 2500.00,
      }
    });
    
    return true;
  },

  logout: () => set({
    isAuthenticated: false,
    user: null,
    authToken: null,
    loginPhone: '',
    otpSent: false,
    verificationError: null
  }),

  updateWalletBalance: (amount, withdrawable, held) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        balance: amount,
        withdrawableBalance: withdrawable,
        heldBalance: held,
      }
    }));
  },

  clearError: () => set({ verificationError: null }),
}));
