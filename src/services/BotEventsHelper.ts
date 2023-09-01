import { version, versionToArray } from "../commands/slashCommands/version";

import { MongoConnection } from "./MongoConnection";
import { Client, AttachmentBuilder, User, ColorResolvable } from 'discord.js';
import { PropertyDocument } from "../data/Property";
import { ImageMaker } from "../utilities/ImageMaker";
import { DiscordConnection } from "./DiscordConnection";
import { MonitorDocument } from "../data/Monitor";
import { startMonitor } from "../commands/slashCommands/monitor";
import { getAverageColor } from "fast-average-color-node";


export class BotEventsHelper {
    /**
     * caches all users of guilds Bella belongs to
     * @returns true if successful
     */
    public static async cacheUsers(): Promise<Boolean> {
        try{
            const discordClient = await DiscordConnection.getInstance();
            discordClient.guilds.cache.forEach(async guild => {
                await guild.members.fetch();
            });
        }
        catch(error){
            console.error(error);
            return false;
        }
        return true;
    }

    /**
     * Check if Bella's major/minor numbers have changed
     * @throws (Error) If mongo connection fails
     */
    public static async isNotableUpdate(): Promise<boolean | undefined> {
        const mongoClient = await MongoConnection.getInstance();
        if(!mongoClient) return undefined;

        const mongoDb = mongoClient.db(process.env.MONGO_DB_NAME);
        
        const versionDocument: any = await mongoDb.collection("properties").findOne({ key: "version" });
        // if there is no version then this must be notable, we'll want to update the db
        if(!versionDocument) return true;

        const versionItem: PropertyDocument = {
            key: versionDocument.key,
            value: versionDocument.value
        };

        const versionComponents = versionToArray(version);
        const cachedVersionComponents = versionToArray(versionItem.value);


        // only want to notify of major or feature changes
        const isBugFix: boolean = versionComponents[0] != cachedVersionComponents[0] || versionComponents[1] != cachedVersionComponents[1];
        return isBugFix;
    }

    /**
     * update the database to reflect bella's current
     * @returns true if the update was successful, false otherwise
     */
    public static async updateVersion(): Promise<boolean>{
        const mongoClient = await MongoConnection.getInstance();
        if(!mongoClient) return false;
        
        try{
            const mongoDb = mongoClient.db(process.env.MONGO_DB_NAME);
            await mongoDb.collection("properties").updateOne({key: "version"}, {$set:{value: version}}, {upsert: true});
        }
        catch(error){
            return false;
        }
        return true;
    }

    /**
     * Notify servers that bella is online with an image showing her version
     */
    public static async notifyServersOfBella(){
        const discordClient = await DiscordConnection.getInstance();
        discordClient.guilds.cache.forEach(guild => {
            ImageMaker.getVersionImage().then(imageBuffer => {
                let attachmentBuilder = new AttachmentBuilder(imageBuffer);
                guild.systemChannel?.send({files: [attachmentBuilder.attachment]});
            })
        })    
    }

    /**
     * restarts monitors based on persistent data saved to mongo db
     * @returns true if monitors restarted successfully, false otherwise
     */
    public static async restartMonitors(): Promise<boolean>{
        const mongoClient = await MongoConnection.getInstance();
        if(!mongoClient) return false;

        try{
            const mongoDb = mongoClient.db(process.env.MONGO_DB_NAME);
            const monitors = mongoDb.collection("monitors").find();
            for await (let monitor of monitors){
                monitor = monitor as MonitorDocument;
                startMonitor(monitor._id, monitor.cronSchedule, monitor.options);
            }
        }
        catch(error){
            return false;
        }
        return true;
    }

    public static async updateRoles(oldUser: User, newUser: User){
        if(oldUser.displayAvatarURL() === newUser.displayAvatarURL()) return;
        const discordClient = await DiscordConnection.getInstance();

		// look through guilds for this user and update their display role's colour
		for(let guild of discordClient.guilds.cache.values()){
			const userAsMember = (await guild.members.fetch()).find(user => newUser.id === user.id);
			if(!userAsMember) continue;

			// roles are listed top to bottom
			// find the first with a colour which only has this member in it
			const topRole = userAsMember.roles.cache.find(role => role.color !== 0 && role.members.size === 1);
			if(!topRole) continue;

			const color = (await getAverageColor(newUser.displayAvatarURL(), {algorithm: "simple"})).hex as ColorResolvable;

			try{
				topRole.setColor(color)
			}
			catch(error) {
				const msg = `Bella could not set the colour of role ${topRole.name} in server ${guild.name} for user`;
				console.error(msg);
				guild.systemChannel?.send(msg).catch(error => {
					console.error("Bella failed to warn server of role problem!");
				})
			};
		}
    }
}