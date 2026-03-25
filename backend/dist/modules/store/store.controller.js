"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreController = void 0;
const db_1 = require("../../core/database/db");
class StoreController {
    /**
     * POST /api/v1/store/products
     * Store owners can add new products.
     */
    static async addProduct(req, res) {
        try {
            const storeId = req.user?.userId;
            const { name, description, price, stock, category, discount = 0, images = [] } = req.body;
            if (!name || !price || stock === undefined) {
                return res.status(400).json({ success: false, message: 'Missing product details' });
            }
            const insertQuery = `
                INSERT INTO store_products (store_id, name, description, price_egp, stock_qty, category, discount_pct, images)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, description, price_egp as price, stock_qty as stock, category, discount_pct as discount, images;
            `;
            const { rows } = await db_1.db.query(insertQuery, [storeId, name, description, price, stock, category, discount, images]);
            res.status(201).json({ success: true, product: rows[0] });
        }
        catch (error) {
            console.error('[StoreController] addProduct:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
    /**
     * GET /api/v1/store/products
     * Trainees can browse products.
     */
    static async getProducts(req, res) {
        try {
            const { rows } = await db_1.db.query(`
                SELECT p.id, p.name, p.description, p.price_egp as price, p.stock_qty as stock, p.category, p.images, p.is_active, s.name as store_name 
                FROM store_products p
                JOIN stores s ON p.store_id = s.owner_user_id
                WHERE p.stock_qty > 0
                ORDER BY p.created_at DESC
            `);
            return res.status(200).json({ success: true, products: rows });
        }
        catch (error) {
            console.error('[StoreController] getProducts:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
    /**
     * POST /api/v1/store/checkout
     * Trainees checkout their cart. Automatically creates financial transactions.
     */
    static async checkoutCart(req, res) {
        const client = await db_1.db.connect();
        try {
            const buyerId = req.user?.userId;
            const { items } = req.body; // Array of { productId, quantity }
            if (!items || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Cart is empty' });
            }
            await client.query('BEGIN');
            let totalTotal = 0;
            for (const item of items) {
                // 1. Verify stock and price
                const { rows: productRows } = await client.query('SELECT * FROM store_products WHERE id = $1 FOR UPDATE', [item.productId]);
                if (productRows.length === 0)
                    throw new Error(`Product ${item.productId} not found`);
                const product = productRows[0];
                if (product.stock_qty < item.quantity)
                    throw new Error(`Insufficient stock for ${product.name}`);
                // 2. Deduct stock
                await client.query('UPDATE store_products SET stock_qty = stock_qty - $1 WHERE id = $2', [item.quantity, item.productId]);
                const lineTotal = Number(product.price_egp) * item.quantity;
                totalTotal += lineTotal;
                // 3. Create cart_items record (acts as order line)
                await client.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)', [buyerId, item.productId, item.quantity]);
                // 4. Create financial transaction for the store
                const platformFee = lineTotal * 0.20; // 20% GEM Z commission
                const netAmount = lineTotal - platformFee;
                await client.query(`
                    INSERT INTO financial_transactions (user_id, buyer_id, amount, platform_fee, net_amount, type)
                    VALUES ($1, $2, $3, $4, $5, 'STORE_SALE')
                `, [product.store_id, buyerId, lineTotal, platformFee, netAmount]);
            }
            await client.query('COMMIT');
            return res.status(200).json({ success: true, message: 'Checkout successful', totalPaid: totalTotal });
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('[StoreController] checkoutCart:', error);
            res.status(500).json({ success: false, message: error.message || 'Checkout failed' });
        }
        finally {
            client.release();
        }
    }
    static async listMarketplaceItem(req, res) {
        try {
            const sellerId = req.user?.userId;
            const { title, description, price, condition, images = [] } = req.body;
            if (!title || !price || !condition) {
                return res.status(400).json({ success: false, message: 'Missing marketplace item details' });
            }
            // Insert into a user_marketplace_items table (mocked here)
            return res.status(201).json({
                success: true,
                message: 'Item listed on marketplace successfully',
                item: { sellerId, title, description, price, condition, images, status: 'available' }
            });
        }
        catch (error) {
            console.error('[StoreController] listMarketplaceItem:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
    static async getMarketplaceItems(req, res) {
        try {
            // Fetch from user_marketplace_items table (mocked here)
            const mockItems = [
                { id: 1, title: 'Used Dumbbells 10kg', price: 500, condition: 'Good', sellerId: 'u_123' },
                { id: 2, title: 'Resistance Bands Set', price: 150, condition: 'Like New', sellerId: 'u_456' }
            ];
            return res.status(200).json({ success: true, items: mockItems });
        }
        catch (error) {
            console.error('[StoreController] getMarketplaceItems:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
    static async listWorkoutTemplate(req, res) {
        try {
            const trainerId = req.user?.userId;
            const { title, description, priceEgp, fileUrl } = req.body;
            if (!title || !priceEgp)
                return res.status(400).json({ success: false, message: 'Missing template details' });
            return res.status(201).json({
                success: true,
                message: 'Template listed for sale successfully',
                template: { trainerId, title, description, priceEgp, fileUrl }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Server error listing template' });
        }
    }
    static async mintFitnessNFT(req, res) {
        try {
            const userId = req.user?.userId;
            const { milestoneId } = req.body;
            if (!milestoneId)
                return res.status(400).json({ success: false, message: 'Missing milestone ID' });
            // Mock blockchain minting process
            return res.status(201).json({
                success: true,
                message: 'Exclusive Fitness NFT Minted!',
                nft: {
                    tokenId: 'gemz_nft_' + Date.now(),
                    owner: userId,
                    milestone: '365 Days Streak',
                    imageUrl: 'https://gemz.app/assets/nfts/streak-365.png'
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Server error minting NFT' });
        }
    }
}
exports.StoreController = StoreController;
