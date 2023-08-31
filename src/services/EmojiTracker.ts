import emojiRegex from 'emoji-regex';
import { MongoConnection } from './MongoConnection';
import { Message } from "discord.js";
import { AnyBulkWriteOperation } from 'mongodb';


export class EmojiTracker{
    /**
     * updates the server's emoji usage based on a message's content
     * @param guildId the discord server id
     * @param authorId the discord message author's id
     * @param messageContent the message's string content
     * @returns true if the count was updated, false otherwise
     */
    public static async updateEmojiCountFromMessage(message: Message, parseReactions: boolean = false): Promise<boolean>{
        const guildId = message.guildId;
        if(!guildId) return false;

        const authorId = message.author.id;
        // don't read bot emojis
        const emojis = message.author.bot ? [] : this.parseEmojis(message.content);
        
        // operation to update count for message author
        const bulkWriteOperations: AnyBulkWriteOperation[] = emojis.map((emojiId) => {
            return {
                updateOne: {
                    filter: { 
                        guildId: guildId,
                        emojiId: emojiId,
                        userId: authorId
                    }, // filter
                    update: { $inc: { count: 1 }}, // update
                    upsert: true
                }
            }
        });


        // operations to update count for message reactors
        if(parseReactions){
            for(const reaction of message.reactions.cache.values()){
                const id = reaction.emoji.toString()
                if(!id) continue;

                // increment the count for this emoji in this server for all users who reacted with it
                for(const userTuple of await reaction.users.fetch()){
                    const user = userTuple[1];
                    if(user.bot) continue;

                    bulkWriteOperations.push({
                        updateOne: {
                            filter: { 
                                guildId: guildId,
                                emojiId: id,
                                userId: user.id
                            },
                            update: { $inc: { count: 1 }}, // update
                            upsert: true
                        }
                    });
                }
            }
        }

        const mongoClient = await MongoConnection.getInstance();
        if(!mongoClient || bulkWriteOperations.length == 0) return false;
        const mongoDb = mongoClient.db(process.env.MONGO_DB_NAME);

        try{
            const result = await mongoDb.collection("emojiUsages").bulkWrite(bulkWriteOperations);
        }
        catch(error){
            console.error(error);
            return false;
        }
        return true;
    }


    /**
     * updates the server's emoji usage based on a message's content
     * @param guildId the discord server id
     * @param reactorId the discord message author's id
     * @param emoji the emoji in unicode or the string representation of a discord emoji
     * @returns true if the count was updated, false otherwise
     */
    public static async updateEmojiCountFromReaction(guildId: string, reactorId: string, emoji: string): Promise<boolean>{
        const mongoClient = await MongoConnection.getInstance();
        if(!mongoClient) return false;
        const mongoDb = mongoClient.db(process.env.MONGO_DB_NAME);

        try{
            // update the guild's emojiUsage map
            await mongoDb.collection("emojiUsages").updateOne(
                { 
                    guildId: guildId,
                    emojiId: emoji,
                    userId: reactorId
                }, // filter
                { $inc: { count: 1 }}, // update
                { upsert: true } // options
            );
        }
        catch(error){
            return false;
        }
        return true;
    }



    /**
     * Parses emoji text content from a string
     * @param content the string with emojis
     * @returns a string array with the unicode emojis and the discord emoji ids. Duplicates are removed.
    */
    public static parseEmojis(content: string): string[] {
       // /((?<!<:\\)[^:]+)(?=:(\d+)>)/ /(?<=(<:[^:]+:))(\d+)(?=>)/
        const unicodeMatch = content.match(emojiRegex()) ?? new Array();
        const discordMatch = content.match(/((?<!\\)<:[^:]+:(\d+)>)/gmu) ?? new Array();

        // remove duplicates, an emoji is only incremented once for a message.
        return [...new Set(unicodeMatch.concat(discordMatch))];
    }
}