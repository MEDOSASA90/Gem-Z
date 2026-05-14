"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const bidding_controller_1 = require("./bidding.controller");
const router = express_1.default.Router();
router.post('/request', auth_middleware_1.verifyToken, bidding_controller_1.BiddingController.createRequest);
router.get('/requests', auth_middleware_1.verifyToken, bidding_controller_1.BiddingController.getOpenRequests);
router.post('/request/:id/bid', auth_middleware_1.verifyToken, bidding_controller_1.BiddingController.submitBid);
router.post('/bid/:bidId/accept', auth_middleware_1.verifyToken, bidding_controller_1.BiddingController.acceptBid);
exports.default = router;
