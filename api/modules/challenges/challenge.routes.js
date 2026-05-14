"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const challenge_controller_1 = require("./challenge.controller");
const router = express_1.default.Router();
router.get('/', auth_middleware_1.verifyToken, challenge_controller_1.ChallengeController.listChallenges);
router.post('/join', auth_middleware_1.verifyToken, challenge_controller_1.ChallengeController.joinChallenge);
router.post('/live-squad', auth_middleware_1.verifyToken, challenge_controller_1.ChallengeController.createLiveSquadChallenge);
router.post('/track-habit', auth_middleware_1.verifyToken, challenge_controller_1.ChallengeController.trackUserHabit);
exports.default = router;
