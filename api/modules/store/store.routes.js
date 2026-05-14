"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const store_controller_1 = require("./store.controller");
const router = express_1.default.Router();
router.post('/products', auth_middleware_1.verifyToken, store_controller_1.StoreController.addProduct);
router.get('/products', auth_middleware_1.verifyToken, store_controller_1.StoreController.getProducts);
router.post('/checkout', auth_middleware_1.verifyToken, store_controller_1.StoreController.checkoutCart);
router.post('/marketplace/item', auth_middleware_1.verifyToken, store_controller_1.StoreController.listMarketplaceItem);
router.get('/marketplace/items', auth_middleware_1.verifyToken, store_controller_1.StoreController.getMarketplaceItems);
exports.default = router;
