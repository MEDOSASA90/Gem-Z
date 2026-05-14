"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const user_controller_1 = require("./user.controller");
const router = express_1.default.Router();
const auth = auth_middleware_1.verifyToken;
router.put('/profile', auth, user_controller_1.UserController.updateProfile);
router.put('/change-password', auth, user_controller_1.UserController.changePassword);
router.post('/kyc', auth, user_controller_1.UserController.submitKyc);
exports.default = router;
