import { ChatInputCommandInteraction, SlashCommandBuilder, GuildTextBasedChannel, Message } from "discord.js";
import { Document } from "mongodb";
import { Command } from "../../utilities/Command";
import { MongoConnection } from "../../services/MongoConnection";
import { BellaError } from "../../utilities/BellaError";
import { EmojiTracker } from "../../services/EmojiTracker";
import { DiscordConnection } from "../../services/DiscordConnection";
import v8 from "v8"

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
                .setDescription("How many results to retrieve. 10 by default. Use -1 for as many as possible.")
                .setRequired(false)
        )
        .addBooleanOption(builder => 
            builder
                .setName("least-popular")
                .setDescription("True if Bella should sort by least popular.")
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
    const ascendingOrder = interaction.options.getBoolean("least-popular");

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
            $sort: {
                totalUsages: ascendingOrder ? 1 : -1
            }
        }
    ];

    // use the limit if provided
    if(limit > -1){
        pipeline.push({$limit: limit})
    }

    const totalEmojiUsage = mongoDb.collection("emojiUsages").aggregate<{_id: string, totalUsages: number}>(pipeline);

    // respond!
    let response: string = `The <count> ${ascendingOrder ? "least" : "most"} used emojis ${user ?`by ${user.displayName} `:""}are:\n`;
    let index = 1;
    for await(const usageDoc of totalEmojiUsage){
        const nextLine = `${index++}. ${interaction.guild?.emojis.cache.get(usageDoc._id) ?? usageDoc._id} used ${usageDoc.totalUsages} times\n`;
        if(response.length + nextLine.length >= 2000){
            break;
        }
        response += nextLine;
    }
    await interaction.reply(response.replace("<count>", (index-1).toString()));
}

async function handleIndexCommand(interaction: ChatInputCommandInteraction){
    const verification = interaction.options.getBoolean("are-you-sure");
    if(!verification || !interaction.guild) return;

    const startTime = Date.now();
    await interaction.reply("I have received your request and will indicate once I have finished. ");

    try{
        // this needs to be idempotent, delete previous indexing
        const mongoDb = (await MongoConnection.getInstance())?.db(process.env.MONGO_DB_NAME);
        if(mongoDb){
            await mongoDb.collection("emojiUsages").deleteMany({ guildId: interaction.guildId });
        }

        let indexChannelTasks: Promise<void>[] = [];

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
        }

        await Promise.all(indexChannelTasks);
    }
    catch(error){
        console.error(error);
        throw new BellaError("Something went wrong while indexing! Please try again in a little while.", true);
    }

    // discord interaction tokens expire in 15 mins, so can't simply follow up
    await interaction.channel?.send("I have finished indexing your server! It took " + (Date.now() - startTime)/1000 + " seconds");
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