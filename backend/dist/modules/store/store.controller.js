"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreController = void 0;
class StoreController {
    /**
     * GET /api/v1/store/products
     */
    static async getProducts(req, res) {
        try {
            // MOCK RESPONSE
            const mockProducts = [
                { id: 'p1', name: 'Whey Protein Isolate', price_egp: 1200, stock: 50, store_name: 'Supplements Pro', store_rating: 4.8 },
                { id: 'p2', name: 'Creatine Monohydrate', price_egp: 650, stock: 120, store_name: 'FitGear Sports', store_rating: 4.6 },
                { id: 'p3', name: 'Lifting Belt Pro', price_egp: 450, stock: 15, store_name: 'FitGear Sports', store_rating: 4.6 }
            ];
            return res.status(200).json({ success: true, products: mockProducts });
        }
        catch (error) {
            console.error('[StoreController] getProducts:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
    /**
     * POST /api/v1/store/checkout
     */
    static async checkoutCart(req, res) {
        try {
            const { items } = req.body;
            // MOCKED SUCCESSFUL CHECKOUT
            if (!items || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Cart is empty' });
            }
            // Assume success mock
            return res.status(200).json({ success: true, message: 'Checkout successful', totalPaid: 1850 });
        }
        catch (error) {
            console.error('[StoreController] checkoutCart:', error);
            res.status(500).json({ success: false, message: 'Server checkout error' });
        }
    }
}
exports.StoreController = StoreController;
