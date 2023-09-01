import { Client, GatewayIntentBits, Partials, Message, TextBasedChannel, REST } from 'discord.js';

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
            this.client = new Client({ 
                intents: [
                    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, 
                    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, 
                    GatewayIntentBits.GuildMembers
                ],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
            });
            // Log in to Discord with bot's client token
            await this.client.login(botToken);
        }

        return this.client;
    }

    /**
     * Processes channel messages, based on https://stackoverflow.com/a/71620968
     * @param channel the channel with messages being processed
     * @param maxNumToProcess how many messages should be processed, -1 for all
     * @param task the processing being performed on each message
    */
    public static async processChannelMessages<T>(channel: TextBasedChannel, maxNumToProcess: number, task: (message: Message) => Promise<T>) {
        // return nothing if there are no messages to process
        if(!channel.messages || maxNumToProcess === 0) return;

        maxNumToProcess = Math.floor( maxNumToProcess );

        // fetch the first message from the channel
        let messagePage = await channel.messages.fetch({ limit: 1 });
        let message = messagePage.size === 1 ? messagePage.at(0) : null;

        // process the first message found
        if(!message) return;
        await task(message);
    
        // fetch 100 messages prior to the current message as long as there are still messages being retrieved
        let count = 1;
        while (message) {     
            messagePage = await channel.messages.fetch({ limit: 100, before: message.id })
            for(const messageTuple of messagePage){
                // if maxNumToProcess is below 0 this will never hit
                if(count === maxNumToProcess){
                    channel.messages.cache.clear();
                    return;
                };

                // making tasks synchronous because otherwise we run into memory issues...
                await task(messageTuple[1]);
                count++;
            };

            // Update the message pointer to be the last message on the page of messages
            message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            channel.messages.cache.clear();

        }
    }
    
}