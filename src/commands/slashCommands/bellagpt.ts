import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../../utilities/Command";

const { ChatGPTClient } = require('discordjs-chatgpt');

const chatgpt = new ChatGPTClient(process.env.OPENAI_API_KEY, {
    contextRemembering: false,
    responseType: 'string' // or 'embed'
})
// Creates bellaGPT command
let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('bellagpt')
        .setDescription('Chat with Bella')

        data.addStringOption(builder => 
            builder
                .setName("message")
                .setDescription("Your message")
        )

let execute = async (interaction: ChatInputCommandInteraction) => {
    const msg = interaction.options.getString('message', true);
    await chatgpt.chatInteraction(interaction, "Your name is Bella. Refer to yourself as Bella from now on. You are a assistant on my discord server. " + msg)
}

let bellagpt = Command.SlashCommand(data, execute, async () => true);
export {bellagpt};


