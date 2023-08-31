import { MongoClient } from 'mongodb';
require("dotenv").config();

/**
 * Singleton for the mongo db client
 */
export class MongoConnection {
    private static client: MongoClient;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    /**
     * @returns The connected mongo client instance or null if mongo could not be connected to
     */
    public static async getInstance(): Promise<MongoClient | null> {
        try{
            const uri = process.env.MONGO_URI ?? "";
            if (!this.client) {
                this.client = new MongoClient(uri);
                // if the client is already connected mongo won't do anything
                await this.client.connect();
            }
        }
        catch(error){
            return null;
        }


        return this.client;
    }

    public static async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }
}