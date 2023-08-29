import { Client, GatewayIntentBits, Partials, Message, TextBasedChannel } from 'discord.js';
import v8 from 'node:v8';

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
                intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction]
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
     * @param returnResults if the results of processing should be returned
     * @returns the results of the processing if requested - this could drastically increase memory usage
     */
    public static async processChannelMessages<T>(channel: TextBasedChannel, maxNumToProcess: number, task: (message: Message) => Promise<T>, returnResults: boolean): Promise<T[]> {
        // return nothing if there are no messages to process
        if(!channel.messages || maxNumToProcess === 0) return [];

        maxNumToProcess = Math.floor( maxNumToProcess );

        // fetch the first message from the channel
        let messagePage = await channel.messages.fetch({ limit: 1 });
        let message = messagePage.size === 1 ? messagePage.at(0) : null;

        let tasks: Promise<T>[] = [];
        let results: T[] = [];

        // process the first message found
        if(!message) return [];
        tasks.push(task(message));
    
        // fetch 100 messages prior to the current message as long as there are still messages being retrieved
        let count = 1;
        while (message) {
            messagePage = await channel.messages.fetch({ limit: 100, before: message.id })
            for(const messageTuple of messagePage){
                // if maxNumToProcess is below 0 this will never hit
                if(count === maxNumToProcess) break;
                tasks.push(task(messageTuple[1]));
                count++;
            };

            // only await when we need to...
            if(this.getPercentOfMaxHeapInUse() > 0.8){
                const localResults = await Promise.all(tasks);
                results = returnResults ? results.concat(localResults) : [];
                // if we still have a problem then time to throw before we crash
                if(this.getPercentOfMaxHeapInUse() > 0.8){
                    throw new Error("Out of memory!!");
                }
            }

            // Update the message pointer to be the last message on the page of messages
            message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        }

        const finalResults = await Promise.all(tasks);
        return returnResults ? results.concat(finalResults) : [];
    }
    
    // get the percentage of the max heap currently in use
    private static getPercentOfMaxHeapInUse() {
        const maxHeap = v8.getHeapStatistics().heap_size_limit;
        return v8.getHeapStatistics().used_heap_size / maxHeap;
    }
}