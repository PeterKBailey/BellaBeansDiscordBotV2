require("dotenv").config();
import { BaseInteraction, Client, Events} from 'discord.js';
import { CommandHelper } from './utilities/CommandHelper';
import { MongoConnection } from './services/MongoConnection';
import { StartupUtility } from './utilities/StartupUtility';
import { DiscordConnection } from './services/DiscordConnection';
// deploy commands anew
CommandHelper.deployCommands();

DiscordConnection.getInstance().then((client: Client) => {
	// When the client is ready, run this code (once https://tinyurl.com/5cavyafu)
	client.once(Events.ClientReady, async client => {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		// instantiate mongo connection
		await MongoConnection.getInstance();

		// update servers and the database if worth doing
		if(await StartupUtility.isNotableUpdate()){
			// there's no point on updating the db's data unless the major/minor has changed
			StartupUtility.updateVersion();
			StartupUtility.notifyServersOfBella();
		}

		// restart monitors
		StartupUtility.restartMonitors();
	});

	// Parse interactions
	client.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
		if(interaction.isCommand()){
			CommandHelper.handleCommand(interaction);
		}
	});
})

