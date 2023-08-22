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
     * @returns The connected mongo client instance
     */
    public static async getInstance(): Promise<MongoClient> {
        const uri = process.env.MONGO_URI;
        const dbName = process.env.MONGO_DB_NAME; 
        if(!uri || !dbName){
            throw new Error("Mongo Db Data missing!");
        }

        if (!this.client) {
            this.client = new MongoClient(uri);
        }

        // if the client is already connected mongo won't do anything
        await this.client.connect();

        return this.client;
    }

    public static async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }
}