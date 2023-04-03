import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { Configuration, OpenAIApi } from "openai";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

async function getConversation (message) {
  const formatted = {
    role: message.author.bot ? 'assistant' : 'user',
    content: message.content.replace(`<@${process.env.DISCORD_CLIENT_ID}> `, ''),
  }

  if (!(message.reference && message.reference.messageId)) {
    return [formatted]
  }

  const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
  const restOfTheConversation = await getConversation(repliedMessage)
  return [...restOfTheConversation, formatted]
}

client.on("messageCreate", async function (message) {
  if (message.author.bot) return;
  if (!message.mentions.users.has(process.env.DISCORD_CLIENT_ID)) return;
  const conversation = await getConversation(message)

  try {
    const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
            {role: "system", content: "You are a helpful assistant who responds succinctly"},
            ...conversation,
        ],
      });

    const content = response.data.choices[0].message;
    return message.reply(content);

  } catch (err) {
    return message.reply(`As an AI robot, I errored out.\n${err}`);
  }
});

client.login(process.env.BOT_TOKEN);
