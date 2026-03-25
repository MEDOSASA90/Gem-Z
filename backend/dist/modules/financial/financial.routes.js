"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financial_controller_1 = require("./financial.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const router = express_1.default.Router();
router.get('/wallet', auth_middleware_1.verifyToken, financial_controller_1.FinancialController.getWalletBalance);
router.post('/payout', auth_middleware_1.verifyToken, financial_controller_1.FinancialController.requestPayout);
exports.default = router;
