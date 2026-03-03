export const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};

const decodeBase64Url = (value) => {
    if (!value || typeof value !== "string") return "";
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return atob(`${normalized}${padding}`);
};

export const getRoleFromToken = (tokenValue) => {
    try {
        const token = normalizeToken(tokenValue);
        const parts = token.split(".");
        if (parts.length < 2) return "";
        const payload = JSON.parse(decodeBase64Url(parts[1]));
        if (typeof payload?.role === "string") return payload.role;
        if (typeof payload?.authorities?.[0] === "string") return payload.authorities[0];
        if (payload?.authorities?.[0] && typeof payload.authorities[0] === "object") {
            return payload.authorities[0].authority ?? payload.authorities[0].role ?? "";
        }
        return "";
    } catch {
        return "";
    }
};

export const isAdminRole = (role) => String(role || "").toUpperCase().includes("ADMIN");
