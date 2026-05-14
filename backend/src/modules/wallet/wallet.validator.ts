/**
 * GEM Z — Wallet Input Validators
 * 
 * Runtime validation for all wallet API inputs.
 * Uses simple validation functions (no external dependency required).
 */

// ─── UUID Validator ──────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
    return typeof value === 'string' && UUID_REGEX.test(value);
}

// ─── Common Validators ──────────────────────────────────────

function isPositiveNumber(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0 && isFinite(num);
}

function isValidAmount(value: any, max: number = 999999.9999): boolean {
    if (!isPositiveNumber(value)) return false;
    const num = Number(value);
    return num <= max;
}

// ─── Validation Result Type ─────────────────────────────────

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

function ok(): ValidationResult {
    return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
    return { valid: false, errors };
}

// ─── Endpoint Validators ────────────────────────────────────

export function validateTopUpRequest(body: any): ValidationResult {
    const errors: string[] = [];

    if (!isValidAmount(body.amount)) {
        errors.push('amount must be a positive number (max 999,999.9999).');
    }

    if (Number(body.amount) < 10) {
        errors.push('Minimum top-up amount is 10 EGP.');
    }

    if (!body.gateway || !['fawry', 'paymob', 'instapay', 'vodafone_cash'].includes(body.gateway)) {
        errors.push('gateway must be one of: fawry, paymob, instapay, vodafone_cash.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validatePaymentRequest(body: any): ValidationResult {
    const errors: string[] = [];

    if (!isValidAmount(body.amount)) {
        errors.push('amount must be a positive number.');
    }

    if (!isValidUUID(body.receiverId)) {
        errors.push('receiverId must be a valid UUID.');
    }

    if (!body.receiverType || !['gym', 'store', 'user'].includes(body.receiverType)) {
        errors.push('receiverType must be one of: gym, store, user.');
    }

    if (!body.txnType) {
        errors.push('txnType is required.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validateWithdrawRequest(body: any): ValidationResult {
    const errors: string[] = [];

    if (!isValidAmount(body.amount)) {
        errors.push('amount must be a positive number.');
    }

    if (!body.method || !['instapay', 'vodafone_cash', 'bank_transfer'].includes(body.method)) {
        errors.push('method must be one of: instapay, vodafone_cash, bank_transfer.');
    }

    if (body.method === 'bank_transfer') {
        if (!body.accountNumber) errors.push('accountNumber is required for bank transfers.');
        if (!body.bankName) errors.push('bankName is required for bank transfers.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validateP2PTransfer(body: any): ValidationResult {
    const errors: string[] = [];

    if (!isValidAmount(body.amount)) {
        errors.push('amount must be a positive number.');
    }

    if (Number(body.amount) < 1) {
        errors.push('Minimum transfer amount is 1 EGP.');
    }

    if (!isValidUUID(body.recipientUserId)) {
        errors.push('recipientUserId must be a valid UUID.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validateCoinsRedemption(body: any): ValidationResult {
    const errors: string[] = [];

    if (!body.coinsAmount || !Number.isInteger(Number(body.coinsAmount)) || Number(body.coinsAmount) < 1) {
        errors.push('coinsAmount must be a positive integer.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validateAdjustment(body: any): ValidationResult {
    const errors: string[] = [];

    if (!isValidUUID(body.walletId)) {
        errors.push('walletId must be a valid UUID.');
    }

    if (!isValidAmount(body.amount)) {
        errors.push('amount must be a positive number.');
    }

    if (!body.direction || !['credit', 'debit'].includes(body.direction)) {
        errors.push('direction must be one of: credit, debit.');
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
        errors.push('reason must be a string with at least 5 characters.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validateFreezeRequest(body: any): ValidationResult {
    const errors: string[] = [];

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
        errors.push('reason must be a string with at least 5 characters.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}

export function validateHistoryQuery(query: any): ValidationResult {
    const errors: string[] = [];

    if (query.entryType && !['debit', 'credit'].includes(query.entryType)) {
        errors.push('entryType must be one of: debit, credit.');
    }

    if (query.limit && (isNaN(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
        errors.push('limit must be between 1 and 100.');
    }

    if (query.offset && (isNaN(Number(query.offset)) || Number(query.offset) < 0)) {
        errors.push('offset must be a non-negative number.');
    }

    return errors.length > 0 ? fail(...errors) : ok();
}
