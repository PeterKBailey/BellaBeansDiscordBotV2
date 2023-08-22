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
     * @returns The connected discord client instance
     */
    public static async getInstance(): Promise<Client> {
        const botToken = process.env.BOT_TOKEN;
        if(!botToken){
            throw new Error("Discord bot token missing!");
        }

        if (!this.client) {
            this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
            // Log in to Discord with bot's client token
            await this.client.login(botToken);
        }

        return this.client;
    }
}