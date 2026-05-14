"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const integration_controller_1 = require("./integration.controller");
const router = express_1.default.Router();
router.post('/wearables/sync', auth_middleware_1.verifyToken, integration_controller_1.IntegrationController.syncWearableData);
router.post('/notifications/trigger', auth_middleware_1.verifyToken, integration_controller_1.IntegrationController.triggerPushNotification);
exports.default = router;
