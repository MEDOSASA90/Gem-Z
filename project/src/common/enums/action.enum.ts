/**
 * =============================================================================
 * ActionEnum - إجراءات CRUD
 * =============================================================================
 */

/** إجراءات CRUD الأساسية */
export enum CrudAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  SEARCH = 'SEARCH',
}

/** إجراءات المصادقة */
export enum AuthAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_PHONE = 'VERIFY_PHONE',
  ENABLE_MFA = 'ENABLE_MFA',
  DISABLE_MFA = 'DISABLE_MFA',
}

/** إجراءات المحفظة */
export enum WalletAction {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  TRANSFER = 'TRANSFER',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
  SET_LIMIT = 'SET_LIMIT',
}

/** إجراءات الـ HTTP */
export enum HttpAction {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}
