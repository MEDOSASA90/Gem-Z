"use strict";
/**
 * GEM Z — Wallet System Type Definitions
 * Central type definitions for the entire financial subsystem.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefNo = generateRefNo;
exports.toMoney = toMoney;
// ─── Utility ─────────────────────────────────────────────────
function generateRefNo(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
/**
 * Safe numeric conversion from PostgreSQL NUMERIC to JS number.
 * Always returns a 4-decimal-place number.
 */
function toMoney(value) {
    return Number(Number(value).toFixed(4));
}
