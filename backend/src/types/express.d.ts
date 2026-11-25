
export {};

declare global {
    namespace Express {
        interface Request {
            authUser?: {
                id: string;
                ownerName: string;
                role: "owner" | "viewer";
            };
        }
    }
}
