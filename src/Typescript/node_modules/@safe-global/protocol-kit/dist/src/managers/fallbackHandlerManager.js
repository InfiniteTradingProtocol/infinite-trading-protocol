"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _FallbackHandlerManager_safeProvider, _FallbackHandlerManager_safeContract, _FallbackHandlerManager_slot;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const constants_1 = require("../utils/constants");
const types_1 = require("../utils/types");
class FallbackHandlerManager {
    constructor(safeProvider, safeContract) {
        _FallbackHandlerManager_safeProvider.set(this, void 0);
        _FallbackHandlerManager_safeContract.set(this, void 0);
        // keccak256("fallback_manager.handler.address")
        _FallbackHandlerManager_slot.set(this, '0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5');
        __classPrivateFieldSet(this, _FallbackHandlerManager_safeProvider, safeProvider, "f");
        __classPrivateFieldSet(this, _FallbackHandlerManager_safeContract, safeContract, "f");
    }
    validateFallbackHandlerAddress(fallbackHandlerAddress) {
        const isValidAddress = __classPrivateFieldGet(this, _FallbackHandlerManager_safeProvider, "f").isAddress(fallbackHandlerAddress);
        if (!isValidAddress || (0, utils_1.isZeroAddress)(fallbackHandlerAddress)) {
            throw new Error('Invalid fallback handler address provided');
        }
    }
    validateFallbackHandlerIsNotEnabled(currentFallbackHandler, newFallbackHandlerAddress) {
        if ((0, utils_1.sameString)(currentFallbackHandler, newFallbackHandlerAddress)) {
            throw new Error('Fallback handler provided is already enabled');
        }
    }
    validateFallbackHandlerIsEnabled(fallbackHandlerAddress) {
        if ((0, utils_1.isZeroAddress)(fallbackHandlerAddress)) {
            throw new Error('There is no fallback handler enabled yet');
        }
    }
    async isFallbackHandlerCompatible() {
        if (!__classPrivateFieldGet(this, _FallbackHandlerManager_safeContract, "f")) {
            throw new Error('Safe is not deployed');
        }
        const safeVersion = __classPrivateFieldGet(this, _FallbackHandlerManager_safeContract, "f").safeVersion;
        if (!(0, utils_1.hasSafeFeature)(utils_1.SAFE_FEATURES.SAFE_FALLBACK_HANDLER, safeVersion)) {
            throw new Error('Current version of the Safe does not support the fallback handler functionality');
        }
        return __classPrivateFieldGet(this, _FallbackHandlerManager_safeContract, "f");
    }
    async getFallbackHandler() {
        const safeContract = await this.isFallbackHandlerCompatible();
        return __classPrivateFieldGet(this, _FallbackHandlerManager_safeProvider, "f").getStorageAt(safeContract.getAddress(), __classPrivateFieldGet(this, _FallbackHandlerManager_slot, "f"));
    }
    async encodeEnableFallbackHandlerData(fallbackHandlerAddress) {
        const safeContract = await this.isFallbackHandlerCompatible();
        this.validateFallbackHandlerAddress(fallbackHandlerAddress);
        const currentFallbackHandler = await this.getFallbackHandler();
        this.validateFallbackHandlerIsNotEnabled(currentFallbackHandler, fallbackHandlerAddress);
        return safeContract.encode('setFallbackHandler', [(0, types_1.asHex)(fallbackHandlerAddress)]);
    }
    async encodeDisableFallbackHandlerData() {
        const safeContract = await this.isFallbackHandlerCompatible();
        const currentFallbackHandler = await this.getFallbackHandler();
        this.validateFallbackHandlerIsEnabled(currentFallbackHandler);
        return safeContract.encode('setFallbackHandler', [(0, types_1.asHex)(constants_1.ZERO_ADDRESS)]);
    }
}
_FallbackHandlerManager_safeProvider = new WeakMap(), _FallbackHandlerManager_safeContract = new WeakMap(), _FallbackHandlerManager_slot = new WeakMap();
exports.default = FallbackHandlerManager;
//# sourceMappingURL=fallbackHandlerManager.js.map