"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = format;
exports.formatEther = formatEther;
exports.formatGwei = formatGwei;
exports.from = from;
exports.fromEther = fromEther;
exports.fromGwei = fromGwei;
const exponents = {
    wei: 0,
    gwei: 9,
    szabo: 12,
    finney: 15,
    ether: 18,
};
function format(value, decimals = 0) {
    if (!Number.isInteger(decimals) || decimals < 0)
        throw new InvalidDecimalsError({ decimals });
    let display = value.toString();
    const negative = display.startsWith('-');
    if (negative)
        display = display.slice(1);
    display = display.padStart(decimals, '0');
    let [integer, fraction] = [
        display.slice(0, display.length - decimals),
        display.slice(display.length - decimals),
    ];
    fraction = fraction.replace(/(0+)$/, '');
    return `${negative ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`;
}
function formatEther(wei, unit = 'wei') {
    return format(wei, exponents.ether - exponents[unit]);
}
function formatGwei(wei, unit = 'wei') {
    return format(wei, exponents.gwei - exponents[unit]);
}
function from(value, decimals = 0) {
    if (!Number.isInteger(decimals) || decimals < 0)
        throw new InvalidDecimalsError({ decimals });
    if (!/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(value))
        throw new InvalidDecimalNumberError({ value });
    let [integer = '', fraction = '0'] = value.split('.');
    const negative = integer.startsWith('-');
    if (negative)
        integer = integer.slice(1);
    if (integer === '')
        integer = '0';
    fraction = fraction.replace(/(0+)$/, '');
    if (decimals === 0) {
        if (fraction.length > 0 && Number.parseInt(fraction[0], 10) >= 5)
            integer = `${BigInt(integer) + 1n}`;
        fraction = '';
    }
    else if (fraction.length > decimals) {
        const left = fraction.slice(0, decimals);
        const roundDigit = Number.parseInt(fraction.slice(decimals, decimals + 1), 10);
        if (roundDigit >= 5) {
            const carried = carry(left);
            if (carried.length > decimals) {
                fraction = carried.slice(1);
                integer = `${BigInt(integer) + 1n}`;
            }
            else {
                fraction = carried;
            }
        }
        else {
            fraction = left;
        }
    }
    else {
        fraction = fraction.padEnd(decimals, '0');
    }
    return BigInt(`${negative ? '-' : ''}${integer}${fraction}`);
}
function carry(digits) {
    const out = digits.split('');
    let i = out.length - 1;
    while (i >= 0) {
        const d = Number.parseInt(out[i], 10) + 1;
        if (d < 10) {
            out[i] = String(d);
            return out.join('');
        }
        out[i] = '0';
        i--;
    }
    return `1${out.join('')}`;
}
function fromEther(ether, unit = 'wei') {
    return from(ether, exponents.ether - exponents[unit]);
}
function fromGwei(gwei, unit = 'wei') {
    return from(gwei, exponents.gwei - exponents[unit]);
}
class InvalidDecimalNumberError extends Error {
    constructor({ value }) {
        super(`Value \`${value}\` is not a valid decimal number.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Value.InvalidDecimalNumberError'
        });
    }
}
class InvalidDecimalsError extends Error {
    constructor({ decimals }) {
        super(`\`decimals\` must be a non-negative integer. Got \`${decimals}\`.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Value.InvalidDecimalsError'
        });
    }
}
//# sourceMappingURL=Value.js.map