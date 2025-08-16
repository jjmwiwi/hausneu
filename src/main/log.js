const log = (...a) => console.log("[MAIN]", ...a);
const warn = (...a) => console.warn("[MAIN]", ...a);
const err = (...a) => console.error("[MAIN]", ...a);

module.exports = { log, warn, err };
