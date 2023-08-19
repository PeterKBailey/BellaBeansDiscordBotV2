require("dotenv").config();
import { BaseInteraction, Client, Events, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { CommandHelper } from './utilities/CommandHelper';
import { ImageMaker } from './utilities/ImageMaker';
// deploy commands anew
CommandHelper.deployCommands();

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (once https://tinyurl.com/5cavyafu)
client.once(Events.ClientReady, client => {
	console.log(`Ready! Logged in as ${client.user.tag}`);
	// tell everyone that bella has been updated :)))
	// TODO: only do this for major and minor updates instead of bug fixes
	// client.guilds.cache.forEach(guild => {
	// 	ImageMaker.getVersionImage().then(imageBuffer => {
	// 		let attachmentBuilder = new AttachmentBuilder(imageBuffer);
	// 		guild.systemChannel?.send({files: [attachmentBuilder.attachment]});
	// 	})
	//   })
});

// Log in to Discord with bot's client token
client.login(process.env.BOT_TOKEN);

// Parse interactions
client.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
	if(interaction.isCommand()){
		CommandHelper.handleCommand(interaction);
	}
});

