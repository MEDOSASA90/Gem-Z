"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeController = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool();
class RecipeController {
    /**
     * GET /api/v1/recipes
     * Fetch all recipes from the Video Recipe Library
     */
    static async listRecipes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;
            let query = `
                SELECT r.*, c.name as category_name, c.name_ar as category_name_ar, c.icon as category_icon,
                       EXISTS(SELECT 1 FROM recipe_saves s WHERE s.recipe_id = r.id AND s.user_id = $1) as is_saved
                FROM recipes r
                JOIN recipe_categories c ON r.category_id = c.id
            `;
            const params = [req.user.userId];
            if (categoryId) {
                query += ` WHERE r.category_id = $2`;
                params.push(categoryId);
            }
            query += ` ORDER BY r.rating DESC, r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);
            const recipes = await pool.query(query, params);
            return res.status(200).json({ success: true, recipes: recipes.rows });
        }
        catch (error) {
            console.error('[RecipeController] listRecipes:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch recipes' });
        }
    }
    /**
     * POST /api/v1/recipes/:id/toggle-save
     * Toggles bookmark state for a recipe
     */
    static async toggleSave(req, res) {
        const recipeId = req.params.id;
        const userId = req.user.userId;
        try {
            const check = await pool.query('SELECT 1 FROM recipe_saves WHERE recipe_id = $1 AND user_id = $2', [recipeId, userId]);
            let isSaved = false;
            if (check.rows.length > 0) {
                await pool.query('DELETE FROM recipe_saves WHERE recipe_id = $1 AND user_id = $2', [recipeId, userId]);
            }
            else {
                await pool.query('INSERT INTO recipe_saves (recipe_id, user_id) VALUES ($1, $2)', [recipeId, userId]);
                isSaved = true;
            }
            return res.status(200).json({ success: true, is_saved: isSaved });
        }
        catch (error) {
            console.error('[RecipeController] toggleSave:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
}
exports.RecipeController = RecipeController;
