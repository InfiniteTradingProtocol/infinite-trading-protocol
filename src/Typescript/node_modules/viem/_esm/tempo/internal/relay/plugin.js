const accountsPlugins = new WeakSet();
const keyAuthorizationPlugins = new WeakSet();
/** Registers the built-in accounts plugin for transport capability detection. */
export function accounts(plugin) {
    accountsPlugins.add(plugin);
    return plugin;
}
export function isAccounts(plugin) {
    return accountsPlugins.has(plugin);
}
/** Registers the built-in key authorization plugin for transport capability detection. */
export function keyAuthorization(plugin) {
    keyAuthorizationPlugins.add(plugin);
    return plugin;
}
export function isKeyAuthorization(plugin) {
    return keyAuthorizationPlugins.has(plugin);
}
//# sourceMappingURL=plugin.js.map