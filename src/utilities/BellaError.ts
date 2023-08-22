/**
 * Custom error class for handling errors thrown by Bella
 */
export class BellaError extends Error {
    private notifyUser: boolean;

    /**
     * @param message the error message
     * @param notifyUser whether the error message should be sent back to the interaction source
     */
    constructor(message: string, notifyUser: boolean){
        super(message);
        this.name = "BellaError";
        this.notifyUser = notifyUser;
    }

    public getNotifyUser(): boolean {
        return this.notifyUser;
    }
}