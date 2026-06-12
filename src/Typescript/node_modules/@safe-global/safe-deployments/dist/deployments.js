"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._SAFE_TO_L2_SETUP_DEPLOYMENTS = exports._SAFE_TO_L2_MIGRATION_DEPLOYMENTS = exports._SAFE_MIGRATION_DEPLOYMENTS = exports._SIGN_MESSAGE_LIB_DEPLOYMENTS = exports._CREATE_CALL_DEPLOYMENTS = exports._MULTI_SEND_CALL_ONLY_DEPLOYMENTS = exports._MULTI_SEND_DEPLOYMENTS = exports._SAFE_L2_DEPLOYMENTS = exports._SAFE_DEPLOYMENTS = exports._EXTENSIBLE_FALLBACK_HANDLER_DEPLOYMENTS = exports._COMPAT_FALLBACK_HANDLER_DEPLOYMENTS = exports._TOKEN_CALLBACK_HANDLER_DEPLOYMENTS = exports._FACTORY_DEPLOYMENTS = exports._ACCESSOR_DEPLOYMENTS = void 0;
// This is a file where all the deployments are consolidated
// We do it in a separate file so we don't have to repeat comments about the array order and the type casting.
// We use some specific types (like `AddressType`) in the `SingletonDeploymentJSON` type, but the TypeScript cannot infer that from the JSON files.
// So we need to cast them to `SingletonDeploymentJSON` manually. The casting is valid because we have a test in `__tests__/assets.test.ts` that checks that the JSON files are valid.
// The arrays are sorted by preference, which at the moment means from the most recent version to the oldest.
// The arrays are prefixed with an underscore because they are not meant to be imported directly.
const simulate_tx_accessor_json_1 = __importDefault(require("./assets/v1.3.0/simulate_tx_accessor.json"));
const simulate_tx_accessor_json_2 = __importDefault(require("./assets/v1.4.1/simulate_tx_accessor.json"));
const simulate_tx_accessor_json_3 = __importDefault(require("./assets/v1.5.0/simulate_tx_accessor.json"));
const _ACCESSOR_DEPLOYMENTS = [
    simulate_tx_accessor_json_3.default,
    simulate_tx_accessor_json_2.default,
    simulate_tx_accessor_json_1.default,
];
exports._ACCESSOR_DEPLOYMENTS = _ACCESSOR_DEPLOYMENTS;
const proxy_factory_json_1 = __importDefault(require("./assets/v1.0.0/proxy_factory.json"));
const proxy_factory_json_2 = __importDefault(require("./assets/v1.1.1/proxy_factory.json"));
const proxy_factory_json_3 = __importDefault(require("./assets/v1.3.0/proxy_factory.json"));
const safe_proxy_factory_json_1 = __importDefault(require("./assets/v1.4.1/safe_proxy_factory.json"));
const safe_proxy_factory_json_2 = __importDefault(require("./assets/v1.5.0/safe_proxy_factory.json"));
const _FACTORY_DEPLOYMENTS = [
    safe_proxy_factory_json_2.default,
    safe_proxy_factory_json_1.default,
    proxy_factory_json_3.default,
    proxy_factory_json_2.default,
    proxy_factory_json_1.default,
];
exports._FACTORY_DEPLOYMENTS = _FACTORY_DEPLOYMENTS;
const default_callback_handler_json_1 = __importDefault(require("./assets/v1.1.1/default_callback_handler.json"));
const token_callback_handler_json_1 = __importDefault(require("./assets/v1.5.0/token_callback_handler.json"));
const _TOKEN_CALLBACK_HANDLER_DEPLOYMENTS = [
    token_callback_handler_json_1.default,
    default_callback_handler_json_1.default,
];
exports._TOKEN_CALLBACK_HANDLER_DEPLOYMENTS = _TOKEN_CALLBACK_HANDLER_DEPLOYMENTS;
const compatibility_fallback_handler_json_1 = __importDefault(require("./assets/v1.3.0/compatibility_fallback_handler.json"));
const compatibility_fallback_handler_json_2 = __importDefault(require("./assets/v1.4.1/compatibility_fallback_handler.json"));
const compatibility_fallback_handler_json_3 = __importDefault(require("./assets/v1.5.0/compatibility_fallback_handler.json"));
const _COMPAT_FALLBACK_HANDLER_DEPLOYMENTS = [
    compatibility_fallback_handler_json_3.default,
    compatibility_fallback_handler_json_2.default,
    compatibility_fallback_handler_json_1.default,
];
exports._COMPAT_FALLBACK_HANDLER_DEPLOYMENTS = _COMPAT_FALLBACK_HANDLER_DEPLOYMENTS;
const extensible_fallback_handler_json_1 = __importDefault(require("./assets/v1.5.0/extensible_fallback_handler.json"));
const _EXTENSIBLE_FALLBACK_HANDLER_DEPLOYMENTS = [extensible_fallback_handler_json_1.default];
exports._EXTENSIBLE_FALLBACK_HANDLER_DEPLOYMENTS = _EXTENSIBLE_FALLBACK_HANDLER_DEPLOYMENTS;
const gnosis_safe_json_1 = __importDefault(require("./assets/v1.0.0/gnosis_safe.json"));
const gnosis_safe_json_2 = __importDefault(require("./assets/v1.1.1/gnosis_safe.json"));
const gnosis_safe_json_3 = __importDefault(require("./assets/v1.2.0/gnosis_safe.json"));
const gnosis_safe_json_4 = __importDefault(require("./assets/v1.3.0/gnosis_safe.json"));
const safe_json_1 = __importDefault(require("./assets/v1.4.1/safe.json"));
const safe_json_2 = __importDefault(require("./assets/v1.5.0/safe.json"));
const _SAFE_DEPLOYMENTS = [
    safe_json_2.default,
    safe_json_1.default,
    gnosis_safe_json_4.default,
    gnosis_safe_json_3.default,
    gnosis_safe_json_2.default,
    gnosis_safe_json_1.default,
];
exports._SAFE_DEPLOYMENTS = _SAFE_DEPLOYMENTS;
const gnosis_safe_l2_json_1 = __importDefault(require("./assets/v1.3.0/gnosis_safe_l2.json"));
const safe_l2_json_1 = __importDefault(require("./assets/v1.4.1/safe_l2.json"));
const safe_l2_json_2 = __importDefault(require("./assets/v1.5.0/safe_l2.json"));
const _SAFE_L2_DEPLOYMENTS = [safe_l2_json_2.default, safe_l2_json_1.default, gnosis_safe_l2_json_1.default];
exports._SAFE_L2_DEPLOYMENTS = _SAFE_L2_DEPLOYMENTS;
const multi_send_json_1 = __importDefault(require("./assets/v1.1.1/multi_send.json"));
const multi_send_json_2 = __importDefault(require("./assets/v1.3.0/multi_send.json"));
const multi_send_json_3 = __importDefault(require("./assets/v1.4.1/multi_send.json"));
const multi_send_json_4 = __importDefault(require("./assets/v1.5.0/multi_send.json"));
const _MULTI_SEND_DEPLOYMENTS = [multi_send_json_4.default, multi_send_json_3.default, multi_send_json_2.default, multi_send_json_1.default];
exports._MULTI_SEND_DEPLOYMENTS = _MULTI_SEND_DEPLOYMENTS;
const multi_send_call_only_json_1 = __importDefault(require("./assets/v1.3.0/multi_send_call_only.json"));
const multi_send_call_only_json_2 = __importDefault(require("./assets/v1.4.1/multi_send_call_only.json"));
const multi_send_call_only_json_3 = __importDefault(require("./assets/v1.5.0/multi_send_call_only.json"));
const _MULTI_SEND_CALL_ONLY_DEPLOYMENTS = [
    multi_send_call_only_json_3.default,
    multi_send_call_only_json_2.default,
    multi_send_call_only_json_1.default,
];
exports._MULTI_SEND_CALL_ONLY_DEPLOYMENTS = _MULTI_SEND_CALL_ONLY_DEPLOYMENTS;
const create_call_json_1 = __importDefault(require("./assets/v1.3.0/create_call.json"));
const create_call_json_2 = __importDefault(require("./assets/v1.4.1/create_call.json"));
const create_call_json_3 = __importDefault(require("./assets/v1.5.0/create_call.json"));
const _CREATE_CALL_DEPLOYMENTS = [create_call_json_3.default, create_call_json_2.default, create_call_json_1.default];
exports._CREATE_CALL_DEPLOYMENTS = _CREATE_CALL_DEPLOYMENTS;
const sign_message_lib_json_1 = __importDefault(require("./assets/v1.3.0/sign_message_lib.json"));
const sign_message_lib_json_2 = __importDefault(require("./assets/v1.4.1/sign_message_lib.json"));
const sign_message_lib_json_3 = __importDefault(require("./assets/v1.5.0/sign_message_lib.json"));
const _SIGN_MESSAGE_LIB_DEPLOYMENTS = [
    sign_message_lib_json_3.default,
    sign_message_lib_json_2.default,
    sign_message_lib_json_1.default,
];
exports._SIGN_MESSAGE_LIB_DEPLOYMENTS = _SIGN_MESSAGE_LIB_DEPLOYMENTS;
const safe_migration_json_1 = __importDefault(require("./assets/v1.4.1/safe_migration.json"));
const safe_migration_json_2 = __importDefault(require("./assets/v1.5.0/safe_migration.json"));
const _SAFE_MIGRATION_DEPLOYMENTS = [safe_migration_json_2.default, safe_migration_json_1.default];
exports._SAFE_MIGRATION_DEPLOYMENTS = _SAFE_MIGRATION_DEPLOYMENTS;
const safe_to_l2_migration_json_1 = __importDefault(require("./assets/v1.4.1/safe_to_l2_migration.json"));
const _SAFE_TO_L2_MIGRATION_DEPLOYMENTS = [safe_to_l2_migration_json_1.default];
exports._SAFE_TO_L2_MIGRATION_DEPLOYMENTS = _SAFE_TO_L2_MIGRATION_DEPLOYMENTS;
const safe_to_l2_setup_json_1 = __importDefault(require("./assets/v1.4.1/safe_to_l2_setup.json"));
const safe_to_l2_setup_json_2 = __importDefault(require("./assets/v1.5.0/safe_to_l2_setup.json"));
const _SAFE_TO_L2_SETUP_DEPLOYMENTS = [safe_to_l2_setup_json_2.default, safe_to_l2_setup_json_1.default];
exports._SAFE_TO_L2_SETUP_DEPLOYMENTS = _SAFE_TO_L2_SETUP_DEPLOYMENTS;
