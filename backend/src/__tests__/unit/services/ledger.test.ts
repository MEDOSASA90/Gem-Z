/**
 * GEM Z — Ledger Engine Unit Tests
 *
 * Tests LedgerEngine methods:
 * - executeTransfer: valid instructions, unbalanced debits/credits, negative amount, frozen wallet
 * - verifyDoubleEntry: passes for balanced txn, fails for unbalanced txn
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { LedgerEngine } from '../../../modules/wallet/ledger.engine';
import { LedgerInstruction, toMoney } from '../../../modules/wallet/wallet.types';

// ─── Mock Pool & Client ───────────────────────────────────────

function createMockPool() {
    const mockQuery = jest.fn();
    const mockConnect = jest.fn();

    return {
        query: mockQuery,
        connect: mockConnect,
        on: jest.fn(),
    };
}

function createMockClient() {
    const mockQuery = jest.fn();
    const mockRelease = jest.fn();

    return {
        query: mockQuery,
        release: mockRelease,
    };
}

describe('LedgerEngine — Ledger', () => {
    let engine: LedgerEngine;
    let mockPool: ReturnType<typeof createMockPool>;
    let mockClient: ReturnType<typeof createMockClient>;

    beforeEach(() => {
        mockPool = createMockPool();
        mockClient = createMockClient();
        engine = new LedgerEngine(mockPool as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ─── executeTransfer — Success ──────────────────────────────

    describe('executeTransfer', () => {
        it('executes transfer with valid instructions', async () => {
            // Arrange
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-debit',
                    entryType: 'debit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Payment',
                },
                {
                    walletId: 'wallet-credit',
                    entryType: 'credit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Payment received',
                },
            ];

            // Mock wallet UPDATE for debit
            mockClient.query
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{ new_balance: 9000, id: 'wallet-debit' }],
                })
                // Mock wallet UPDATE for credit
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{ new_balance: 11000, id: 'wallet-credit' }],
                })
                // Mock ledger entry inserts (2x)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rowCount: 1 })
                // Mock verifyDoubleEntry
                .mockResolvedValueOnce({
                    rows: [{
                        total_debits: 1000,
                        total_credits: 1000,
                    }],
                });

            // Act
            await engine.executeTransfer(mockClient as any, 'txn-valid', instructions);

            // Assert
            expect(mockClient.query).toHaveBeenCalled();

            // Verify UPDATE was called for each wallet
            const updateCalls = (mockClient.query as jest.Mock).mock.calls.filter(
                (call) => call[0] && call[0].includes('UPDATE wallets')
            );
            expect(updateCalls).toHaveLength(2);

            // Verify ledger entries were inserted
            const insertCalls = (mockClient.query as jest.Mock).mock.calls.filter(
                (call) => call[0] && call[0].includes('INSERT INTO ledger_entries')
            );
            expect(insertCalls).toHaveLength(2);
        });

        it('executes transfer with multiple entries', async () => {
            // Arrange: 1 debit + 2 credits (e.g., payment with platform fee)
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-user',
                    entryType: 'debit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Payment',
                },
                {
                    walletId: 'wallet-platform',
                    entryType: 'credit',
                    amount: 150,
                    balanceField: 'available',
                    note: 'Platform fee',
                },
                {
                    walletId: 'wallet-gym',
                    entryType: 'credit',
                    amount: 850,
                    balanceField: 'available',
                    note: 'Gym payment',
                },
            ];

            mockClient.query
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{ new_balance: 9000, id: 'wallet-user' }],
                })
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{ new_balance: 150, id: 'wallet-platform' }],
                })
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{ new_balance: 10850, id: 'wallet-gym' }],
                })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({
                    rows: [{
                        total_debits: 1000,
                        total_credits: 1000,
                    }],
                });

            // Act
            await engine.executeTransfer(mockClient as any, 'txn-split', instructions);

            // Assert
            const insertCalls = (mockClient.query as jest.Mock).mock.calls.filter(
                (call) => call[0] && call[0].includes('INSERT INTO ledger_entries')
            );
            expect(insertCalls).toHaveLength(3);
        });

        // ─── executeTransfer — Error Paths ──────────────────────

        it('fails with unbalanced debits and credits', async () => {
            // Arrange: debit ≠ credit
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-debit',
                    entryType: 'debit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Payment',
                },
                {
                    walletId: 'wallet-credit',
                    entryType: 'credit',
                    amount: 900,
                    balanceField: 'available',
                    note: 'Payment received (short)',
                },
            ];

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-unbalanced', instructions)
            ).rejects.toThrow('LEDGER PRE-CHECK FAILED');

            // Should not execute any UPDATE or INSERT
            const updateCalls = (mockClient.query as jest.Mock).mock.calls.filter(
                (call) => call[0] && (call[0].includes('UPDATE') || call[0].includes('INSERT'))
            );
            expect(updateCalls).toHaveLength(0);
        });

        it('fails with negative amount', async () => {
            // Arrange: negative amount
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-debit',
                    entryType: 'debit',
                    amount: -100,
                    balanceField: 'available',
                    note: 'Invalid negative',
                },
                {
                    walletId: 'wallet-credit',
                    entryType: 'credit',
                    amount: -100,
                    balanceField: 'available',
                    note: 'Invalid negative',
                },
            ];

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-negative', instructions)
            ).rejects.toThrow('LEDGER ERROR: Amount must be positive.');
        });

        it('fails with zero amount', async () => {
            // Arrange: zero amount
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-debit',
                    entryType: 'debit',
                    amount: 0,
                    balanceField: 'available',
                    note: 'Invalid zero',
                },
                {
                    walletId: 'wallet-credit',
                    entryType: 'credit',
                    amount: 0,
                    balanceField: 'available',
                    note: 'Invalid zero',
                },
            ];

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-zero', instructions)
            ).rejects.toThrow('LEDGER ERROR: Amount must be positive.');
        });

        it('fails for frozen wallet', async () => {
            // Arrange
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-frozen',
                    entryType: 'debit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Payment',
                },
                {
                    walletId: 'wallet-credit',
                    entryType: 'credit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Payment received',
                },
            ];

            // Mock frozen wallet (rowCount = 0 means wallet is frozen)
            mockClient.query.mockResolvedValueOnce({
                rowCount: 0,
                rows: [],
            });

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-frozen', instructions)
            ).rejects.toThrow('LEDGER ERROR: Wallet wallet-frozen not found or is frozen.');
        });

        it('fails with less than 2 instructions', async () => {
            // Arrange: only 1 instruction
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-single',
                    entryType: 'debit',
                    amount: 1000,
                    balanceField: 'available',
                    note: 'Single entry',
                },
            ];

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-single', instructions)
            ).rejects.toThrow('A transfer requires at least 2 entries');
        });

        it('fails with empty instructions', async () => {
            // Arrange: empty array
            const instructions: LedgerInstruction[] = [];

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-empty', instructions)
            ).rejects.toThrow('A transfer requires at least 2 entries');
        });

        it('rejects transaction that would cause negative balance', async () => {
            // Arrange: debit more than available
            const instructions: LedgerInstruction[] = [
                {
                    walletId: 'wallet-poor',
                    entryType: 'debit',
                    amount: 5000,
                    balanceField: 'available',
                    note: 'Overdraft attempt',
                },
                {
                    walletId: 'wallet-rich',
                    entryType: 'credit',
                    amount: 5000,
                    balanceField: 'available',
                    note: 'Payment received',
                },
            ];

            // Return negative balance for the debit
            mockClient.query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ new_balance: -1000, id: 'wallet-poor' }],
            });

            // Act & Assert
            await expect(
                engine.executeTransfer(mockClient as any, 'txn-overdraft', instructions)
            ).rejects.toThrow('INSUFFICIENT FUNDS');
        });
    });

    // ─── verifyDoubleEntry ──────────────────────────────────────

    describe('verifyDoubleEntry', () => {
        it('passes for balanced transaction', async () => {
            // Arrange
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 5000,
                    total_credits: 5000,
                }],
            });

            // Act & Assert (should not throw)
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-balanced')
            ).resolves.not.toThrow();
        });

        it('passes for zero-debit zero-credit transaction', async () => {
            // Arrange
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 0,
                    total_credits: 0,
                }],
            });

            // Act & Assert (should not throw)
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-zero')
            ).resolves.not.toThrow();
        });

        it('fails for unbalanced transaction', async () => {
            // Arrange
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 5000,
                    total_credits: 4999,
                }],
            });

            // Act & Assert
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-unbalanced')
            ).rejects.toThrow('LEDGER VIOLATION');
        });

        it('fails for transaction with missing credit entry', async () => {
            // Arrange
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 10000,
                    total_credits: 0,
                }],
            });

            // Act & Assert
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-missing-credit')
            ).rejects.toThrow('LEDGER VIOLATION');
        });

        it('fails for transaction with missing debit entry', async () => {
            // Arrange
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 0,
                    total_credits: 10000,
                }],
            });

            // Act & Assert
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-missing-debit')
            ).rejects.toThrow('LEDGER VIOLATION');
        });

        it('handles small rounding differences (tolerance check)', async () => {
            // Arrange: difference within tolerance (0.0001)
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 1000.00001,
                    total_credits: 1000.00002,
                }],
            });

            // Act & Assert (should not throw due to tolerance)
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-tiny-diff')
            ).resolves.not.toThrow();
        });

        it('fails when difference exceeds tolerance', async () => {
            // Arrange: difference exceeds tolerance
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    total_debits: 1000.001,
                    total_credits: 1000.002,
                }],
            });

            // Act & Assert
            await expect(
                engine.verifyDoubleEntry(mockClient as any, 'txn-over-tolerance')
            ).rejects.toThrow('LEDGER VIOLATION');
        });
    });

    // ─── computeBalanceFromLedger ───────────────────────────────

    describe('computeBalanceFromLedger', () => {
        it('computes correct balance from ledger entries', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rows: [{ computed_balance: 8500 }],
            });

            // Act
            const result = await engine.computeBalanceFromLedger('wallet-123', 'available');

            // Assert
            expect(result).toBe(toMoney(8500));
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['wallet-123', 'available']
            );
        });

        it('returns zero for wallet with no entries', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rows: [{ computed_balance: null }],
            });

            // Act
            const result = await engine.computeBalanceFromLedger('wallet-empty', 'available');

            // Assert
            expect(result).toBe(0);
        });
    });

    // ─── getWalletLedgerHistory ─────────────────────────────────

    describe('getWalletLedgerHistory', () => {
        it('returns ledger history with defaults', async () => {
            // Arrange
            const history = [
                {
                    id: 1,
                    txn_id: 'txn-1',
                    entry_type: 'credit',
                    amount: 5000,
                    running_balance: 5000,
                    balance_field: 'available',
                    note: null,
                    created_at: new Date(),
                    reference_no: 'TXN-001',
                    txn_type: 'wallet_topup',
                    description: 'Top-up',
                    status: 'completed',
                },
                {
                    id: 2,
                    txn_id: 'txn-2',
                    entry_type: 'debit',
                    amount: 1500,
                    running_balance: 3500,
                    balance_field: 'available',
                    note: null,
                    created_at: new Date(),
                    reference_no: 'TXN-002',
                    txn_type: 'order_payment',
                    description: 'Payment',
                    status: 'completed',
                },
            ];

            mockPool.query.mockResolvedValueOnce({ rows: history });

            // Act
            const result = await engine.getWalletLedgerHistory('wallet-123');

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].entry_type).toBe('credit');
            expect(result[1].entry_type).toBe('debit');
        });

        it('respects limit and offset parameters', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 3, entry_type: 'debit', amount: 500 }],
            });

            // Act
            const result = await engine.getWalletLedgerHistory('wallet-123', 1, 2);

            // Assert
            expect(result).toHaveLength(1);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT $2 OFFSET $3'),
                ['wallet-123', 1, 2]
            );
        });
    });
});
