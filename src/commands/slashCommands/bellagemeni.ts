import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../../utilities/Command";

import { GoogleGenerativeAI } from "@google/generative-ai";

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
    await interaction.deferReply();
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Your name is Bella. Refer to yourself as Bella from now on, but you do not need to mention it in every message, only if relevant. You are a assistant on my discord server. " + msg);
        const response = result.response;
        const text = response.text();
        await interaction.editReply(text);
    } catch (error) {
        console.error(error);
        await interaction.editReply("Sorry, I encountered an error while processing your request.");
    }
}

let bellagpt = Command.SlashCommand(data, execute, async () => true);
export { bellagpt };


