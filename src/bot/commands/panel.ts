import {
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";

interface PanelConfig {
  staffRoleId: string;
  categoryId: string;
  buttonLabel: string;
  buttonEmoji: string;
  questions: string[];
}

const panelConfigs = new Map<string, PanelConfig>();

export async function handlePanelCreateCommand(
  interaction: ChatInputCommandInteraction
) {
  const staffRole = interaction.options.getRole("staff_role");
  const category = interaction.options.getChannel("ticket_category");

  if (!staffRole || !category) {
    await interaction.reply({
      content: "Please provide both a **staff role** and a **ticket category**.",
      ephemeral: true,
    });
    return;
  }

  if (category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: "The ticket category must be a **channel category** (not a text/voice channel).",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`panel_create_modal:${staffRole.id}:${category.id}`)
    .setTitle("Create Panel");

  const titleInput = new TextInputBuilder()
    .setCustomId("panel_title")
    .setLabel("Panel Title")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Middleman Services")
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("panel_description")
    .setLabel("Panel Description")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Describe this panel...")
    .setRequired(true);

  const buttonLabelInput = new TextInputBuilder()
    .setCustomId("panel_button_label")
    .setLabel("Button Name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Request MM  /  Open Support Ticket")
    .setRequired(true);

  const buttonEmojiInput = new TextInputBuilder()
    .setCustomId("panel_button_emoji")
    .setLabel("Button Emoji (name:id or leave blank)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. paypal:1506339857486708747")
    .setRequired(false);

  const questionsInput = new TextInputBuilder()
    .setCustomId("panel_questions")
    .setLabel("Ticket Form Questions (separate with |)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      "e.g. What is your issue? | Order ID | Discord username\n\nFor MM: Who is the trader? | What is the trade? | Agreed amount\n\nMax 5 questions."
    )
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(buttonLabelInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(buttonEmojiInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(questionsInput)
  );

  await interaction.showModal(modal);
}

export async function handlePanelCreateModal(
  interaction: ModalSubmitInteraction,
  staffRoleId: string,
  categoryId: string
) {
  const title = interaction.fields.getTextInputValue("panel_title");
  const description = interaction.fields.getTextInputValue("panel_description");
  const buttonLabel = interaction.fields.getTextInputValue("panel_button_label");
  const buttonEmojiRaw = interaction.fields.getTextInputValue("panel_button_emoji").trim();
  const questionsRaw = interaction.fields.getTextInputValue("panel_questions");

  const questions = questionsRaw
    .split("|")
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 5);

  if (questions.length === 0) {
    await interaction.reply({
      content: "❌ Please provide at least one ticket form question.",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0xff0000)
    .setFooter({ text: `Ticket Form: ${questions.join(" · ")}` });


  const button = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel(buttonLabel);

  if (buttonEmojiRaw) {
    const parts = buttonEmojiRaw.split(":");
    if (parts.length === 2 && parts[0] && parts[1]) {
      button.setEmoji({ name: parts[0], id: parts[1] });
    } else if (parts.length === 1 && parts[0]) {
      button.setEmoji(parts[0]);
    }
  }

  const panelId = `pt_${Date.now()}`;
  button.setCustomId(panelId);

  panelConfigs.set(panelId, {
    staffRoleId,
    categoryId,
    buttonLabel,
    buttonEmoji: buttonEmojiRaw,
    questions,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.deferReply({ ephemeral: true });
  await (interaction.channel as TextChannel | null)?.send({ embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Panel sent! Ticket form has **${questions.length}** question(s): ${questions.map((q) => `\`${q}\``).join(", ")}` });
}

export async function handlePanelTicketButton(
  interaction: ButtonInteraction,
  config: PanelConfig
) {
  const guild = interaction.guild;
  if (!guild) return;

  const existing = guild.channels.cache.find(
    (ch) =>
      ch.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}` &&
      ch.parentId === config.categoryId
  );

  if (existing) {
    await interaction.reply({
      content: `You already have an open ticket: <#${existing.id}>`,
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`ptm:${interaction.customId}`)
    .setTitle(config.buttonLabel.slice(0, 45));

  for (let i = 0; i < config.questions.length; i++) {
    const q = config.questions[i]!;
    const input = new TextInputBuilder()
      .setCustomId(`q${i}`)
      .setLabel(q.slice(0, 45))
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  await interaction.showModal(modal);
}

export async function handlePanelTicketModal(
  interaction: ModalSubmitInteraction,
  panelId: string
) {
  const config = panelConfigs.get(panelId);
  if (!config) {
    await interaction.reply({
      content: "❌ Panel config not found. Please ask staff to re-create the panel.",
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  await interaction.deferReply({ ephemeral: true });

  const answers = config.questions.map((q, i) => ({
    question: q,
    answer: interaction.fields.getTextInputValue(`q${i}`),
  }));

  try {
    const ticketChannel = await guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: config.staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    }) as TextChannel;

    const closeButton = new ButtonBuilder()
      .setCustomId(`close_ticket:${ticketChannel.id}`)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔒");

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

    const ticketEmbed = new EmbedBuilder()
      .setTitle("🎫 Ticket Opened")
      .setColor(0xff0000)
      .addFields(
        { name: "Opened by", value: `<@${interaction.user.id}>`, inline: true },
        ...answers.map(({ question, answer }) => ({
          name: question,
          value: answer,
          inline: false,
        }))
      )
      .setFooter({ text: "A staff member will be with you shortly • Click 🔒 to close" })
      .setTimestamp();

    await ticketChannel.send({
      content: `<@${interaction.user.id}> <@&${config.staffRoleId}>`,
      embeds: [ticketEmbed],
      components: [closeRow],
    });

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` });
  } catch (err) {
    logger.error({ err }, "Failed to create ticket channel");
    await interaction.editReply({ content: "❌ Failed to create your ticket. Please contact a staff member." });
  }
}

export async function handleCloseTicket(interaction: ButtonInteraction) {
  const guild = interaction.guild;
  if (!guild) return;

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle("🔒 Ticket Closed")
    .setDescription(`This ticket was closed by <@${interaction.user.id}>.`)
    .setColor(0xff0000)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.editReply({ content: "Closing ticket in 5 seconds..." });

  setTimeout(async () => {
    await channel.delete("Ticket closed").catch(() => null);
  }, 5000);
}

export async function handleAddCommand(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel as TextChannel | null;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "❌ This command can only be used inside a ticket channel.", ephemeral: true });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "❌ You need **Manage Channels** permission to add users to tickets.", ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);

  await channel.permissionOverwrites.edit(targetUser.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });

  const embed = new EmbedBuilder()
    .setDescription(`<@${targetUser.id}> has been added to this ticket by <@${interaction.user.id}>.`)
    .setColor(0xff0000)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export { panelConfigs };
