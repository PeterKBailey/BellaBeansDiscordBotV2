require("dotenv").config();
import { BaseInteraction, Client, Events, Message } from 'discord.js';
import { CommandHelper } from './utilities/CommandHelper';
import { MongoConnection } from './services/MongoConnection';
import { StartupUtility } from './utilities/StartupUtility';
import { DiscordConnection } from './services/DiscordConnection';
import { EmojiTracker } from './services/EmojiTracker';
import v8 from "v8"

// deploy commands anew
CommandHelper.deployCommands();

DiscordConnection.getInstance().then((client: Client) => {
	// When the client is ready, run this code once (https://tinyurl.com/5cavyafu)
	client.once(Events.ClientReady, async client => {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		if(await MongoConnection.getInstance()){
			// update servers and the database if worth doing
			if(await StartupUtility.isNotableUpdate()){
				// there's no point on updating the db's data unless the major/minor has changed
				StartupUtility.updateVersion();
				StartupUtility.notifyServersOfBella();
			}

			// restart monitors
			StartupUtility.restartMonitors();
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

		// discord emojis have an id, unicode are stored by value
		const emojiIdentifier = reaction.emoji.id ?? reaction.emoji.name
		if(reaction.message.guildId && emojiIdentifier){
			EmojiTracker.updateEmojiCountFromReaction(reaction.message.guildId, user.id, emojiIdentifier);
		}
	});

	// Parse messages - ONLY WORKS SINCE UNVERIFIED BOT, at 100 servers it requires verification
	client.on(Events.MessageCreate, async (message: Message<boolean>) => {
		if(message.author.bot) return;
		
		EmojiTracker.updateEmojiCountFromMessage(message);
	});
})

