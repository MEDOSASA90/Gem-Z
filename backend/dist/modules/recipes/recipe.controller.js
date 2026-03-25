"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeController = void 0;
class RecipeController {
    static async listRecipes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const mockRecipes = [
                { id: 'rec_1', name: 'High Protein Oats', category_name: 'Breakfast', rating: 4.8, is_saved: false },
                { id: 'rec_2', name: 'Chicken & Rice Bowl', category_name: 'Lunch', rating: 4.5, is_saved: true }
            ];
            return res.status(200).json({ success: true, recipes: mockRecipes });
        }
        catch (error) {
            console.error('[RecipeController] listRecipes:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch recipes' });
        }
    }
    static async toggleSave(req, res) {
        try {
            return res.status(200).json({ success: true, is_saved: true, message: 'Toggle saved (mock)' });
        }
        catch (error) {
            console.error('[RecipeController] toggleSave:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
    static async generateGroceryList(req, res) {
        try {
            const userId = req.user?.userId;
            const { planId } = req.query;
            if (!planId)
                return res.status(400).json({ success: false, message: 'Missing planId' });
            // Mock generated list
            const groceryList = [
                { item: 'Chicken Breast', quantity: '2 kg' },
                { item: 'Rolled Oats', quantity: '1 kg' },
                { item: 'Eggs', quantity: '30 pcs' }
            ];
            return res.status(200).json({ success: true, groceryList });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Server error generating grocery list' });
        }
    }
    static async startLiveCookAlong(req, res) {
        try {
            const hostId = req.user?.userId;
            const { title, recipeId } = req.body;
            if (!title)
                return res.status(400).json({ success: false, message: 'Missing stream title' });
            // Mock logic to create a streaming room
            return res.status(201).json({
                success: true,
                message: 'Live cook-along session initialized',
                session: { hostId, title, recipeId, streamUrl: `rtmp://live.gemz.app/stream/${hostId}` }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Server error starting live cook along' });
        }
    }
}
exports.RecipeController = RecipeController;
