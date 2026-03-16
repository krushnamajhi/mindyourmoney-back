import { AsyncLocalStorage } from "async_hooks";

interface RequestContextData {
    user: { id: number, email: string };
}
// Setup the context storage to hold our user ID
export const requestContext = new AsyncLocalStorage<RequestContextData>();
// NEW FUNCTION: Use this inside your Services/Repositories!
// It pulls the User ID from the magic global context.
export function getContextUserId(): number {
    const store = requestContext.getStore();
    if (!store || !store.user) {
        throw new Error("Missing Context: Ensure authMiddleware is used on this route.");
    }
    return store.user.id;
}

export const context = () => {
    return {
        getUser: () => {
            const store = requestContext.getStore();
            if (!store || !store.user) {
                throw new Error("Missing Context: Ensure authMiddleware is used on this route.");
            }
            return store.user;
        }
    }
}

export function getLoggedInUserId(req: any): number {
    return req.user?.id;
}