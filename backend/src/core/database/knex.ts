/**
 * GEM Z — Knex Instance
 *
 * Single Knex instance for migrations, seeds, and ad-hoc query building.
 * Uses the environment-specific config from knexfile.ts.
 */

import knex from 'knex';
import knexConfig from '../../../knexfile';

const env = process.env.NODE_ENV || 'development';

export const knexInstance = knex(knexConfig[env] || knexConfig['development']);

// Graceful cleanup helper
export async function destroyKnex(): Promise<void> {
    await knexInstance.destroy();
}
