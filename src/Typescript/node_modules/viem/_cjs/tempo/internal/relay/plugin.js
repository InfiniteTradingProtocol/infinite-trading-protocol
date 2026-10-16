"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accounts = accounts;
exports.isAccounts = isAccounts;
exports.keyAuthorization = keyAuthorization;
exports.isKeyAuthorization = isKeyAuthorization;
const accountsPlugins = new WeakSet();
const keyAuthorizationPlugins = new WeakSet();
function accounts(plugin) {
    accountsPlugins.add(plugin);
    return plugin;
}
function isAccounts(plugin) {
    return accountsPlugins.has(plugin);
}
function keyAuthorization(plugin) {
    keyAuthorizationPlugins.add(plugin);
    return plugin;
}
function isKeyAuthorization(plugin) {
    return keyAuthorizationPlugins.has(plugin);
}
//# sourceMappingURL=plugin.js.map