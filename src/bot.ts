require("dotenv").config();
import { BaseInteraction, Client, ColorResolvable, Events, Guild, GuildMember, Message, Role } from 'discord.js';
import { CommandHelper } from './utilities/CommandHelper';
import { MongoConnection } from './services/MongoConnection';
import { BotEventsHelper } from './services/BotEventsHelper';
import { DiscordConnection } from './services/DiscordConnection';
import { EmojiTracker } from './services/EmojiTracker';


// deploy commands anew
CommandHelper.deployCommands();

DiscordConnection.getInstance().then((client: Client) => {
	// When the client is ready, run this code once (https://tinyurl.com/5cavyafu)

	client.once(Events.ClientReady, async client => {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		// required for auto role update
		BotEventsHelper.cacheUsers();
		if(await MongoConnection.getInstance()){
			// update servers and the database if worth doing
			if(await BotEventsHelper.isNotableUpdate()){
				// there's no point on updating the db's data unless the major/minor has changed
				BotEventsHelper.updateVersion();
				BotEventsHelper.notifyServersOfBella();
			}

			// restart monitors
			BotEventsHelper.restartMonitors();
		}
	});

	// Parse interactions
	client.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
		if(interaction.isCommand()){
			CommandHelper.handleCommand(interaction);
		}
	});

		
	// Parse reactions
	client.on(Events.MessageReactionAdd, async (reaction, user) => {
		if(user.bot) return;

		// need to load reactions and users when the message is old
		if (reaction.partial) {
			try {
				reaction = await reaction.fetch();
			} catch (error) {
				console.error('Something went wrong when fetching the message:', error);
				return;
			}
		}
		if(user.partial){
			try {
				user = await user.fetch();
			} catch (error) {
				console.error('Something went wrong when fetching the message:', error);
				return;
			}
		}

		if(reaction.message.guildId){
			EmojiTracker.updateEmojiCountFromReaction(reaction.message.guildId, user.id, reaction.emoji.toString());
		}
	});

	// Parse messages - ONLY WORKS SINCE UNVERIFIED BOT, at 100 servers it requires verification
	client.on(Events.MessageCreate, async (message: Message<boolean>) => {
		if(!message.author.bot)	
			EmojiTracker.updateEmojiCountFromMessage(message);
	});
	
	// Parse user updates - ONLY WORKS SINCE UNVERIFIED BOT, additionally it only works on cached users...
	client.on(Events.UserUpdate, async (oldUser, newUser) => {
		if(oldUser.partial)
			oldUser = await oldUser.fetch();
		BotEventsHelper.updateRoles(oldUser, newUser);
	})
});

