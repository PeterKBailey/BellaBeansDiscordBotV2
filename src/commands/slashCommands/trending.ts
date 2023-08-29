import { ChatInputCommandInteraction, SlashCommandBuilder, GuildTextBasedChannel, Message } from "discord.js";
import { Document } from "mongodb";
import { Command } from "../../utilities/Command";
import { MongoConnection } from "../../services/MongoConnection";
import { BellaError } from "../../utilities/BellaError";
import { EmojiTracker } from "../../services/EmojiTracker";
import { DiscordConnection } from "../../services/DiscordConnection";
import v8 from 'node:v8';


let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('trending')
        .setDescription("Ask Bella what's trending in your server!");
        

// trending emojis
data.addSubcommand(builder => 
    builder
        .setName("emoji")
        .setDescription("See which emojis are trending.")
        // A user can be specified as a filter
        .addUserOption(builder => 
            builder
                .setName("user")
                .setDescription("Check a user's most used emojis in this server.")
                .setRequired(false)
        )
        // User can define how many results they want
        .addIntegerOption(builder => 
            builder
                .setName("num-items")
                .setDescription("How many results should be retrieved. 10 by default. Use -1 for all.")
                .setRequired(false)
        )        
);

data.addSubcommand(builder =>
    builder
        .setName("index")
        .setDescription("Bella will scrape the entire server to build out her databanks.")
        .addBooleanOption(builder => 
            builder
                .setName("are-you-sure")
                .setDescription("This is an expensive operation, do you know what you're doing?")
                .setRequired(true)
        )
);


let execute = async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    // checking emojis
    if(subcommand === "emoji"){
        await handleEmojiCommand(interaction);
    }

    if(subcommand === "index"){
        await handleIndexCommand(interaction);
    }
}

async function handleEmojiCommand(interaction: ChatInputCommandInteraction){
    // get options and mongo db
    const user = interaction.options.getUser("user");
    const limit = interaction.options.getInteger("num-items") ?? 10;

    const mongoClient = await MongoConnection.getInstance();
    if(!mongoClient) throw new BellaError("Sorry I can't access the database at this time, try again later!.", true);
    const mongoDb = mongoClient.db(process.env.MONGO_DB_NAME);

    // build the filter
    const filter: any = {
        guildId: interaction.guildId
    }
    if(user){
        filter.userId = user.id;
    }

    // get all emoji usages for this guild (and optionally for a user)
    const pipeline: Document[] = [
        { $match: filter },
        {
            // group by emoji id, sum usages
            $group: {
                _id: "$emojiId",
                totalUsages: {$sum: "$count"}
            }
        },
        {
            // sort by most used
            $sort: {
                totalUsages: -1
            }
        }
    ];

    // use the limit if provided
    if(limit > -1){
        pipeline.push({$limit: limit})
    }

    const totalEmojiUsage = mongoDb.collection("emojiUsages").aggregate<{_id: string, totalUsages: number}>(pipeline);

    // respond!
    let response: string = `The top <count> most used emojis ${user ?`by ${user.displayName} `:""}are:\n`;
    let index = 1;
    for await(const usageDoc of totalEmojiUsage){
        response += `${index++}. ${interaction.guild?.emojis.cache.get(usageDoc._id) ?? usageDoc._id} used ${usageDoc.totalUsages} times\n`;
    }
    interaction.reply(response.replace("<count>", (index-1).toString()));
}

async function handleIndexCommand(interaction: ChatInputCommandInteraction){
    const verification = interaction.options.getBoolean("are-you-sure");
    if(!verification || !interaction.guild) return;

    const startTime = Date.now();
    interaction.reply("I have received your request and will indicate once I have finished. ");

    // this needs to be idempotent, delete previous indexing
    const mongoDb = (await MongoConnection.getInstance())?.db(process.env.MONGO_DB_NAME);
    if(mongoDb){
        await mongoDb.collection("emojiUsages").deleteMany({ guildId: interaction.guildId });
    }

    let indexChannelTasks: Promise<void>[] = [];

    try{
        for (const channelTuple of await interaction.guild.channels.fetch()){
            const channel = channelTuple[1];
            if(!channel?.isTextBased){
                continue;
            }
            indexChannelTasks.push(DiscordConnection.processChannelMessages<boolean>(
                channel as GuildTextBasedChannel, 
                -1, 
                async (message: Message) => {
                    return await EmojiTracker.updateEmojiCountFromMessage(message, true);
                }
            ));
            if(getPercentOfMaxHeapInUse() > 0.7){
                console.log("Very high memory usage!");
                await Promise.all(indexChannelTasks);
                indexChannelTasks = [];
                await delay(2000);
                console.log("delayed 2s...");                
            }
        }
        await Promise.all(indexChannelTasks);
    }
    catch(error){
        console.error(error);
        throw new BellaError("Something went wrong while indexing! Please try again in a little while.", true);
    }
    
    interaction.followUp("I have finished indexing your server! It took " + (Date.now() - startTime)/1000 + " seconds");
}

// get the percentage of the max heap currently in use
function getPercentOfMaxHeapInUse(): number {
    return v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().heap_size_limit;
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * @returns true if mongo is accessible
 */
async function dependenciesSatisfiedLogic(): Promise<boolean>{
    try {
        await MongoConnection.getInstance();
    }
    catch(error){
        return false;
    }
    return true;
}

let trendingCommand = Command.SlashCommand(data, execute, dependenciesSatisfiedLogic);
export { trendingCommand };