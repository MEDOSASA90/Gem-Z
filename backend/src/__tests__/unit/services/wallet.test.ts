/**
 * GEM Z — Wallet Service Unit Tests
 *
 * Tests WalletService methods:
 * - getOrCreateWallet: creates new wallet, returns existing wallet
 * - getWalletSummary: returns correct data
 * - freezeWallet: sets is_frozen true
 * - unfreezeWallet: sets is_frozen false
 * - Cannot unfreeze non-frozen wallet
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { WalletService } from '../../../modules/wallet/wallet.service';
import { Wallet, toMoney } from '../../../modules/wallet/wallet.types';

// ─── Mock Pool ────────────────────────────────────────────────

function createMockPool() {
    const mockQuery = jest.fn();
    const mockConnect = jest.fn();
    const mockRelease = jest.fn();
    const mockBegin = jest.fn();
    const mockCommit = jest.fn();
    const mockRollback = jest.fn();

    const mockClient = {
        query: jest.fn(),
        release: mockRelease,
    };

    return {
        query: mockQuery,
        connect: mockConnect.mockResolvedValue(mockClient),
        on: jest.fn(),
        // Expose client for test assertions
        mockClient,
        mockRelease,
    };
}

describe('WalletService — Wallet', () => {
    let service: WalletService;
    let mockPool: ReturnType<typeof createMockPool>;

    beforeEach(() => {
        mockPool = createMockPool();
        service = new WalletService(mockPool as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ─── getOrCreateWallet ──────────────────────────────────────

    describe('getOrCreateWallet', () => {
        it('returns existing wallet when one is found', async () => {
            // Arrange
            const existingWallet = {
                id: 'wallet-123',
                owner_type: 'user',
                owner_id: 'user-123',
                currency: 'EGP',
                available_bal: 10000.0000,
                pending_bal: 0,
                frozen_bal: 0,
                lifetime_earned: 10000.0000,
                lifetime_spent: 0,
                daily_topup_limit: 50000.0000,
                daily_withdraw_limit: 25000.0000,
                is_frozen: false,
                frozen_reason: null,
                frozen_at: null,
                frozen_by: null,
                version: 1,
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockPool.query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [existingWallet],
            });

            // Act
            const result = await service.getOrCreateWallet('user', 'user-123', 'EGP');

            // Assert
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM wallets WHERE owner_type = $1 AND owner_id = $2 AND currency = $3'),
                ['user', 'user-123', 'EGP']
            );
            expect(result).toBeDefined();
            expect(result.id).toBe('wallet-123');
            expect(result.owner_id).toBe('user-123');
            expect(result.currency).toBe('EGP');
            expect(result.available_bal).toBe(toMoney(10000.0000));
        });

        it('creates new wallet when none exists', async () => {
            // Arrange: First query returns no wallet, second (INSERT) returns new wallet
            mockPool.query
                .mockResolvedValueOnce({
                    rowCount: 0,
                    rows: [],
                })
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{
                        id: 'wallet-new',
                        owner_type: 'user',
                        owner_id: 'user-new',
                        currency: 'EGP',
                        available_bal: 0,
                        pending_bal: 0,
                        frozen_bal: 0,
                        lifetime_earned: 0,
                        lifetime_spent: 0,
                        daily_topup_limit: 50000.0000,
                        daily_withdraw_limit: 25000.0000,
                        is_frozen: false,
                        frozen_reason: null,
                        frozen_at: null,
                        frozen_by: null,
                        version: 1,
                        created_at: new Date(),
                        updated_at: new Date(),
                    }],
                });

            // Act
            const result = await service.getOrCreateWallet('user', 'user-new', 'EGP');

            // Assert
            expect(mockPool.query).toHaveBeenCalledTimes(2);
            expect(result).toBeDefined();
            expect(result.id).toBe('wallet-new');
            expect(result.owner_id).toBe('user-new');
            expect(result.available_bal).toBe(0);
        });

        it('uses default currency EGP when not specified', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    id: 'wallet-egp',
                    owner_type: 'user',
                    owner_id: 'user-456',
                    currency: 'EGP',
                    available_bal: 5000,
                    pending_bal: 0,
                    frozen_bal: 0,
                    lifetime_earned: 5000,
                    lifetime_spent: 0,
                    daily_topup_limit: 50000,
                    daily_withdraw_limit: 25000,
                    is_frozen: false,
                    frozen_reason: null,
                    frozen_at: null,
                    frozen_by: null,
                    version: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            // Act
            const result = await service.getOrCreateWallet('user', 'user-456');

            // Assert
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM wallets WHERE owner_type = $1 AND owner_id = $2 AND currency = $3'),
                ['user', 'user-456', 'EGP']
            );
            expect(result.currency).toBe('EGP');
        });
    });

    // ─── getWalletById ──────────────────────────────────────────

    describe('getWalletById', () => {
        it('returns wallet by ID', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    id: 'wallet-789',
                    owner_type: 'user',
                    owner_id: 'user-789',
                    currency: 'EGP',
                    available_bal: 25000,
                    pending_bal: 0,
                    frozen_bal: 0,
                    lifetime_earned: 25000,
                    lifetime_spent: 0,
                    daily_topup_limit: 50000,
                    daily_withdraw_limit: 25000,
                    is_frozen: false,
                    frozen_reason: null,
                    frozen_at: null,
                    frozen_by: null,
                    version: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            // Act
            const result = await service.getWalletById('wallet-789');

            // Assert
            expect(result).toBeDefined();
            expect(result!.id).toBe('wallet-789');
        });

        it('returns null when wallet not found', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 0,
                rows: [],
            });

            // Act
            const result = await service.getWalletById('nonexistent-wallet');

            // Assert
            expect(result).toBeNull();
        });
    });

    // ─── getPlatformWallet ──────────────────────────────────────

    describe('getPlatformWallet', () => {
        it('returns platform wallet', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    id: 'platform-wallet',
                    owner_type: 'platform',
                    owner_id: 'system',
                    currency: 'EGP',
                    available_bal: 1000000,
                    pending_bal: 0,
                    frozen_bal: 0,
                    lifetime_earned: 1000000,
                    lifetime_spent: 0,
                    daily_topup_limit: 50000,
                    daily_withdraw_limit: 25000,
                    is_frozen: false,
                    frozen_reason: null,
                    frozen_at: null,
                    frozen_by: null,
                    version: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            // Act
            const result = await service.getPlatformWallet('EGP');

            // Assert
            expect(result).toBeDefined();
            expect(result.owner_type).toBe('platform');
        });

        it('throws when platform wallet not found', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 0,
                rows: [],
            });

            // Act & Assert
            await expect(service.getPlatformWallet('EGP')).rejects.toThrow(
                'CRITICAL: Platform wallet not found'
            );
        });
    });

    // ─── getWalletSummary ───────────────────────────────────────

    describe('getWalletSummary', () => {
        it('returns correct wallet summary', async () => {
            // Arrange: Mock getOrCreateWallet and subsequent queries
            const wallet = {
                id: 'wallet-summary',
                owner_type: 'user',
                owner_id: 'user-summary',
                currency: 'EGP',
                available_bal: 15000,
                pending_bal: 0,
                frozen_bal: 0,
                lifetime_earned: 15000,
                lifetime_spent: 0,
                daily_topup_limit: 50000,
                daily_withdraw_limit: 25000,
                is_frozen: false,
                frozen_reason: null,
                frozen_at: null,
                frozen_by: null,
                version: 1,
                created_at: new Date(),
                updated_at: new Date(),
            };

            // Mock getOrCreateWallet call (first query in getWalletSummary)
            mockPool.query
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [wallet],
                })
                // Today's top-ups
                .mockResolvedValueOnce({
                    rows: [{ total: 5000 }],
                })
                // Today's withdrawals
                .mockResolvedValueOnce({
                    rows: [{ total: 1000 }],
                })
                // Recent transactions
                .mockResolvedValueOnce({
                    rows: [],
                });

            // Act
            const result = await service.getWalletSummary('user-summary');

            // Assert
            expect(result).toBeDefined();
            expect(result.wallet).toBeDefined();
            expect(result.wallet.id).toBe('wallet-summary');
            expect(result.todayTopups).toBe(toMoney(5000));
            expect(result.todayWithdrawals).toBe(toMoney(1000));
            expect(result.recentTransactions).toBeDefined();
            expect(Array.isArray(result.recentTransactions)).toBe(true);
        });

        it('returns zero for empty activity', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-empty',
                owner_type: 'user',
                owner_id: 'user-empty',
                currency: 'EGP',
                available_bal: 0,
                pending_bal: 0,
                frozen_bal: 0,
                lifetime_earned: 0,
                lifetime_spent: 0,
                daily_topup_limit: 50000,
                daily_withdraw_limit: 25000,
                is_frozen: false,
                frozen_reason: null,
                frozen_at: null,
                frozen_by: null,
                version: 1,
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [wallet],
                })
                .mockResolvedValueOnce({
                    rows: [{ total: 0 }],
                })
                .mockResolvedValueOnce({
                    rows: [{ total: 0 }],
                })
                .mockResolvedValueOnce({
                    rows: [],
                });

            // Act
            const result = await service.getWalletSummary('user-empty');

            // Assert
            expect(result.todayTopups).toBe(0);
            expect(result.todayWithdrawals).toBe(0);
        });
    });

    // ─── getWalletHistory ───────────────────────────────────────

    describe('getWalletHistory', () => {
        it('returns paginated history', async () => {
            // Arrange
            const entries = [
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
                    txn_status: 'completed',
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
                    txn_status: 'completed',
                },
            ];

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ total: '2' }],
                })
                .mockResolvedValueOnce({
                    rows: entries,
                });

            // Act
            const result = await service.getWalletHistory({
                walletId: 'wallet-hist',
                limit: 50,
                offset: 0,
            });

            // Assert
            expect(result).toBeDefined();
            expect(result.entries).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.limit).toBe(50);
            expect(result.offset).toBe(0);
        });

        it('applies entry type filter', async () => {
            // Arrange
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ total: '1' }],
                })
                .mockResolvedValueOnce({
                    rows: [{
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
                        txn_status: 'completed',
                    }],
                });

            // Act
            const result = await service.getWalletHistory({
                walletId: 'wallet-hist',
                entryType: 'credit',
                limit: 50,
                offset: 0,
            });

            // Assert
            expect(result.total).toBe(1);
            expect(result.entries[0].entry_type).toBe('credit');
        });

        it('applies date range filter', async () => {
            // Arrange
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ total: '3' }],
                })
                .mockResolvedValueOnce({
                    rows: [],
                });

            // Act
            const result = await service.getWalletHistory({
                walletId: 'wallet-hist',
                fromDate: new Date('2024-01-01'),
                toDate: new Date('2024-12-31'),
                limit: 50,
                offset: 0,
            });

            // Assert
            expect(result).toBeDefined();
            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });

        it('enforces max limit of 100', async () => {
            // Arrange
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ total: '0' }],
                })
                .mockResolvedValueOnce({
                    rows: [],
                });

            // Act
            const result = await service.getWalletHistory({
                walletId: 'wallet-hist',
                limit: 500, // Try to request more than max
                offset: 0,
            });

            // Assert
            expect(result.limit).toBe(100); // Should be capped at 100
        });
    });

    // ─── freezeWallet ───────────────────────────────────────────

    describe('freezeWallet', () => {
        it('freezes wallet successfully', async () => {
            // Arrange
            const clientQuery = jest.fn();
            const clientRelease = jest.fn();

            mockPool.mockClient.query = clientQuery;
            mockPool.mockClient.release = clientRelease;

            // Set up client query responses
            clientQuery
                // BEGIN
                .mockResolvedValueOnce({})
                // SELECT FOR UPDATE
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{
                        id: 'wallet-freeze',
                        is_frozen: false,
                        frozen_reason: null,
                    }],
                })
                // UPDATE wallets
                .mockResolvedValueOnce({ rowCount: 1 })
                // INSERT audit log
                .mockResolvedValueOnce({ rowCount: 1 })
                // COMMIT
                .mockResolvedValueOnce({});

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act
            await service.freezeWallet('wallet-freeze', 'admin-1', 'Suspicious activity', '127.0.0.1', 'Mozilla/5.0');

            // Assert
            expect(mockPool.connect).toHaveBeenCalled();
            expect(clientQuery).toHaveBeenCalledWith('BEGIN');
            expect(clientQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE wallets'),
                expect.arrayContaining(['Suspicious activity', 'admin-1', 'wallet-freeze'])
            );
            expect(clientQuery).toHaveBeenCalledWith('COMMIT');
        });

        it('throws when wallet not found', async () => {
            // Arrange
            const clientQuery = jest.fn();

            mockPool.mockClient.query = clientQuery;

            clientQuery
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({
                    rowCount: 0,
                    rows: [],
                }); // SELECT FOR UPDATE - not found

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act & Assert
            await expect(
                service.freezeWallet('nonexistent-wallet', 'admin-1', 'Test')
            ).rejects.toThrow('Wallet nonexistent-wallet not found.');
        });

        it('throws when wallet is already frozen', async () => {
            // Arrange
            const clientQuery = jest.fn();

            mockPool.mockClient.query = clientQuery;

            clientQuery
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{
                        id: 'wallet-already-frozen',
                        is_frozen: true,
                        frozen_reason: 'Previous freeze',
                    }],
                }); // SELECT FOR UPDATE - already frozen

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act & Assert
            await expect(
                service.freezeWallet('wallet-already-frozen', 'admin-1', 'Test')
            ).rejects.toThrow('Wallet wallet-already-frozen is already frozen.');
        });

        it('rolls back on error', async () => {
            // Arrange
            const clientQuery = jest.fn();
            const clientRelease = jest.fn();

            mockPool.mockClient.query = clientQuery;
            mockPool.mockClient.release = clientRelease;

            clientQuery
                .mockResolvedValueOnce({}) // BEGIN
                .mockRejectedValueOnce(new Error('Database error')); // Error on first SELECT

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act & Assert
            await expect(
                service.freezeWallet('wallet-err', 'admin-1', 'Test')
            ).rejects.toThrow();

            // Should attempt rollback
            expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
            expect(clientRelease).toHaveBeenCalled();
        });
    });

    // ─── unfreezeWallet ─────────────────────────────────────────

    describe('unfreezeWallet', () => {
        it('unfreezes wallet successfully', async () => {
            // Arrange
            const clientQuery = jest.fn();
            const clientRelease = jest.fn();

            mockPool.mockClient.query = clientQuery;
            mockPool.mockClient.release = clientRelease;

            clientQuery
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{
                        id: 'wallet-unfreeze',
                        is_frozen: true,
                        frozen_reason: 'Previous freeze reason',
                    }],
                })
                .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
                .mockResolvedValueOnce({ rowCount: 1 }) // INSERT audit
                .mockResolvedValueOnce({}); // COMMIT

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act
            await service.unfreezeWallet('wallet-unfreeze', 'admin-1', '127.0.0.1', 'Mozilla/5.0');

            // Assert
            expect(mockPool.connect).toHaveBeenCalled();
            expect(clientQuery).toHaveBeenCalledWith('BEGIN');
            expect(clientQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE wallets'),
                expect.arrayContaining(['wallet-unfreeze'])
            );
            expect(clientQuery).toHaveBeenCalledWith('COMMIT');
        });

        it('throws when wallet is not frozen', async () => {
            // Arrange
            const clientQuery = jest.fn();

            mockPool.mockClient.query = clientQuery;

            clientQuery
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{
                        id: 'wallet-not-frozen',
                        is_frozen: false,
                        frozen_reason: null,
                    }],
                });

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act & Assert
            await expect(
                service.unfreezeWallet('wallet-not-frozen', 'admin-1')
            ).rejects.toThrow('Wallet wallet-not-frozen is not frozen.');
        });

        it('throws when wallet not found during unfreeze', async () => {
            // Arrange
            const clientQuery = jest.fn();

            mockPool.mockClient.query = clientQuery;

            clientQuery
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({
                    rowCount: 0,
                    rows: [],
                });

            mockPool.connect.mockResolvedValue(mockPool.mockClient as any);

            // Act & Assert
            await expect(
                service.unfreezeWallet('nonexistent-wallet', 'admin-1')
            ).rejects.toThrow('Wallet nonexistent-wallet not found.');
        });
    });

    // ─── checkTopUpLimit ────────────────────────────────────────

    describe('checkTopUpLimit', () => {
        it('returns allowed when under daily limit', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-limit',
                owner_type: 'user',
                owner_id: 'user-limit',
                currency: 'EGP',
                available_bal: 0,
                pending_bal: 0,
                frozen_bal: 0,
                lifetime_earned: 0,
                lifetime_spent: 0,
                daily_topup_limit: 50000,
                daily_withdraw_limit: 25000,
                is_frozen: false,
                frozen_reason: null,
                frozen_at: null,
                frozen_by: null,
                version: 1,
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [wallet],
                })
                .mockResolvedValueOnce({
                    rows: [{ today_total: 10000 }],
                });

            // Act
            const result = await service.checkTopUpLimit('user-limit', 20000);

            // Assert
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(toMoney(40000)); // 50000 - 10000
        });

        it('returns not allowed when exceeding daily limit', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-limit',
                owner_type: 'user',
                owner_id: 'user-limit',
                currency: 'EGP',
                available_bal: 0,
                pending_bal: 0,
                frozen_bal: 0,
                lifetime_earned: 0,
                lifetime_spent: 0,
                daily_topup_limit: 50000,
                daily_withdraw_limit: 25000,
                is_frozen: false,
                frozen_reason: null,
                frozen_at: null,
                frozen_by: null,
                version: 1,
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [wallet],
                })
                .mockResolvedValueOnce({
                    rows: [{ today_total: 48000 }],
                });

            // Act
            const result = await service.checkTopUpLimit('user-limit', 5000);

            // Assert
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(toMoney(2000));
        });
    });

    // ─── checkWithdrawLimit ─────────────────────────────────────

    describe('checkWithdrawLimit', () => {
        it('returns allowed when under daily withdraw limit', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{
                    id: 'wallet-wd',
                    daily_withdraw_limit: 25000,
                }],
            }).mockResolvedValueOnce({
                rows: [{ today_total: 5000 }],
            });

            // Act
            const result = await service.checkWithdrawLimit('user-wd', 'wallet-wd', 10000);

            // Assert
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(toMoney(20000));
        });

        it('throws when wallet not found', async () => {
            // Arrange
            mockPool.query.mockResolvedValueOnce({
                rowCount: 0,
                rows: [],
            });

            // Act & Assert
            await expect(
                service.checkWithdrawLimit('user-wd', 'nonexistent', 1000)
            ).rejects.toThrow('Wallet not found');
        });
    });
});
