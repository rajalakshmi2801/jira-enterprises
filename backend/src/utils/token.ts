
import {
    createHash,
    randomBytes
} from "crypto";

export const generateSessionToken = (): string => {
    return randomBytes(32).toString("hex");
};

export const hashSessionToken = (token: string): string => {
    return createHash("sha256")
        .update(token)
        .digest("hex");
};
