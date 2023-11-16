import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../../utilities/Command";
import axios from 'axios';


const textVersion = require("textversionjs");
const { ChatGPTClient } = require('discordjs-chatgpt');

const chatgpt = new ChatGPTClient(process.env.OPENAI_API_KEY, {
    contextRemembering: false,
    responseType: 'string' // or 'embed'
})

// Creates bellaGPT command
let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('tldr')
        .setDescription('Have Bella summarize an article for you')

        data.addStringOption(builder => 
            builder
                .setName("url")
                .setDescription("article to summarize")
        )

const removeTextBetweenParentheses = (text: string): string => {
        return text.replace(/ *\([^)]*\) */g, "");
};
          
let execute = async (interaction: ChatInputCommandInteraction) => {
    const url = interaction.options.getString('url', true);
    const prompt = "Your name is Bella. Refer to yourself as Bella from now on. I will provide an article. I want you to summarize this article inbetween 5 and 8 bullet points. Each bullet point should start with an emoji that relates to the sentence. Each bullet point should only have 1 sentence. Make sure it is concise and short. The article is as follows: "
    //Create an Axios Instance
    const AxiosInstance = axios.create();
    AxiosInstance.get(url)
         .then( // Once we have data returned ...
            async response => {
                const html = response.data; // Get the HTML from the HTTP request
                const cleanedHtml = removeTextBetweenParentheses(textVersion(html))
                console.log("start of article")
                console.log(cleanedHtml)
                console.log("end of article")
                await chatgpt.chatInteraction(interaction, prompt + "\n" + cleanedHtml.slice(0, 3680))
            }
    )
    .catch(console.error); // Error handling
    
}

let tldr = Command.SlashCommand(data, execute, async () => true);
export {tldr};
