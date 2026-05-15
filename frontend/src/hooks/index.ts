// ─── GEM Z Hooks — Barrel Export ─────────────────────────────

export {
  useApiQuery,
  useApiMutation,
  useApiInfiniteQuery,
  useOptimisticMutation,
} from './useApiQuery';

export { useAuth } from './useAuth';
export type { AuthUser, AuthState } from './useAuth';

export { useWallet } from './useWallet';
export type { WalletSummary, Transaction, WalletData } from './useWallet';

export { useForm } from './useForm';
export type { FormErrors, FormTouched, UseFormOptions, UseFormReturn } from './useForm';

export { usePagination, PaginationControls, PageSizeSelector } from './usePagination';
export type {
  UsePaginationOptions,
  PaginationInfo,
  PaginationActions,
  PaginationUIProps,
  UsePaginationReturn,
} from './usePagination';

export { useToast } from './useToast';
export type { ToastContextValue, ToastOptions } from './useToast';

export { useApi, useMutation } from './useApi';

export { useWearables } from './useWearables';
