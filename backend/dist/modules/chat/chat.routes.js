"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_controller_1 = require("./chat.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const router = express_1.default.Router();
router.get('/history/:contactId', auth_middleware_1.verifyToken, chat_controller_1.ChatController.getHistory);
router.get('/contacts', auth_middleware_1.verifyToken, chat_controller_1.ChatController.getContacts);
exports.default = router;
