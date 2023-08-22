import { Client, GatewayIntentBits } from 'discord.js';
require("dotenv").config();

/**
 * Singleton for the discord client
 */
export class DiscordConnection {
    private static client: Client;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    /**
     * @returns The connected mongo client instance
     */
    public static async getInstance(): Promise<Client> {
        const uri = process.env.MONGO_URI;
        const dbName = process.env.MONGO_DB_NAME; 
        if(!uri || !dbName){
            throw new Error("Mongo Db Data missing!");
        }

        if (!this.client) {
            this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
            // Log in to Discord with bot's client token
            await this.client.login(process.env.BOT_TOKEN);
        }

        return this.client;
    }
}