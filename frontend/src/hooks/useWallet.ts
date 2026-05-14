'use client';

import { useCallback } from 'react';
import { GemZApi } from '../lib/api';
import { useApi, useMutation } from './useApi';

// ─── Types ───────────────────────────────────────────────────

export interface WalletSummary {
    id: string;
    available_bal: number;
    pending_bal?: number;
    frozen_bal?: number;
    locked_bal?: number;
    currency: string;
    owner_type?: string;
    owner_id?: string;
}

export interface Transaction {
    id: string;
    type: string;
    amount: number;
    status: string;
    description: string | null;
    created_at: string;
}

export interface WalletData {
    wallet: WalletSummary;
    transactions: Transaction[];
    recent_transactions?: any[];
    squad_rank?: string;
    multiplier?: number;
}

/**
 * GEM Z — useWallet Hook
 *
 * Fetches wallet balance and recent transactions from the backend.
 * Provides topup/withdraw mutations.
 *
 * Usage:
 *   const { wallet, transactions, loading, topup, withdraw } = useWallet();
 */
export function useWallet() {
    const {
        data,
        loading,
        error,
        refetch,
    } = useApi<WalletData>(() => GemZApi.Finance.getWallet(), {
        immediate: true,
    });

    const { mutate: doTopup, loading: toppingUp } = useMutation(
        (amount: number) => GemZApi.Finance.topup(amount)
    );

    const { mutate: doWithdraw, loading: withdrawing } = useMutation(
        ({ amount, bankDetails }: { amount: number; bankDetails: Record<string, string> }) =>
            GemZApi.Finance.withdraw(amount, bankDetails)
    );

    const topup = useCallback(async (amount: number) => {
        const result = await doTopup(amount);
        await refetch(); // refresh balance after top-up
        return result;
    }, [doTopup, refetch]);

    const withdraw = useCallback(
        async (amount: number, bankDetails: Record<string, string>) => {
            const result = await doWithdraw({ amount, bankDetails });
            await refetch();
            return result;
        },
        [doWithdraw, refetch]
    );

    const transactions = (data?.transactions ?? data?.recent_transactions ?? []).map((txn: any) => {
        const signedAmount = txn.amount ?? (
            txn.ledger_amount !== undefined
                ? (txn.entry_type === 'credit' ? Number(txn.ledger_amount) : -Number(txn.ledger_amount))
                : 0
        );

        return {
            id: String(txn.id ?? txn.txn_id),
            type: txn.type ?? txn.txn_type ?? txn.reference_no ?? 'transaction',
            amount: signedAmount,
            status: txn.status ?? txn.txn_status ?? '',
            description: txn.description ?? txn.note ?? null,
            created_at: txn.created_at,
        };
    });

    return {
        wallet: data?.wallet ?? null,
        transactions,
        squadRank: data?.squad_rank ?? null,
        multiplier: data?.multiplier ?? null,
        loading,
        error,
        toppingUp,
        withdrawing,
        topup,
        withdraw,
        refetch,
    };
}
