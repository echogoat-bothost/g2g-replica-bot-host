import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { logger } from "../lib/logger";
import { handleInteraction } from "./interactions";
import { PAYMENT_EMOJIS } from "./commands/automm-panel";

const commands = [
  new SlashCommandBuilder()
    .setName("automm-panel")
    .setDescription("Create an AutoMM panel with payment method selection")
    .addRoleOption((opt) =>
      opt
        .setName("staff_role")
        .setDescription("Role pinged when tickets are opened and for verification")
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName("ticket_category")
        .setDescription("Category where AutoMM ticket channels are created")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setwallet")
    .setDescription("Set the wallet address for a payment method")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("payment_method")
        .setDescription("The payment method to configure")
        .setRequired(true)
        .addChoices(
          ...PAYMENT_EMOJIS.map((p) => ({ name: p.label, value: p.value }))
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("address")
        .setDescription("The wallet address or payment ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Panel management commands")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a support panel with a ticket button")
        .addRoleOption((opt) =>
          opt
            .setName("staff_role")
            .setDescription("The role that can see and manage tickets")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("ticket_category")
            .setDescription("The category channel where tickets will be created")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("image")
            .setDescription("Image URL to display on the panel embed (optional)")
            .setRequired(false)
        )
    ),

  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a user to the current ticket")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user to add to this ticket")
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

async function registerCommands(clientId: string, token: string) {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    logger.info("Registering slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info("Slash commands registered globally");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}

export function startBot() {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];

  if (!token || !clientId) {
    logger.warn("DISCORD_TOKEN or DISCORD_CLIENT_ID not set — bot will not start");
    return;
  }

  registerCommands(clientId, token);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot ready");
  });

  client.on(Events.InteractionCreate, handleInteraction);

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
  });
}
