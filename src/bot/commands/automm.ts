import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import { PAYMENT_EMOJIS } from "./automm-panel";
import { getWallet } from "./setwallet";

function paymentEmoji(value: string) {
  const p = PAYMENT_EMOJIS.find((e) => e.value === value);
  return p ? `<:${p.emojiName}:${p.emojiId}>` : "";
}

function paymentLabel(value: string) {
  return PAYMENT_EMOJIS.find((e) => e.value === value)?.label ?? value;
}

function safeChannelName(username: string) {
  return `automm-${username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;
}

export async function handleAutommPaymentSelect(
  interaction: StringSelectMenuInteraction,
  staffRoleId: string,
  categoryId: string
) {
  const guild = interaction.guild!;
  const user = interaction.user;
  const paymentValue = interaction.values[0]!;

  await interaction.deferReply({ ephemeral: true });

  const existing = guild.channels.cache.find(
    (ch) =>
      ch.name === safeChannelName(user.username) && ch.parentId === categoryId
  );

  if (existing) {
    await interaction.editReply({
      content: `You already have an open AutoMM ticket: <#${existing.id}>`,
    });
    return;
  }

  try {
    const ticketChannel = (await guild.channels.create({
      name: safeChannelName(user.username),
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    })) as TextChannel;

    const label = paymentLabel(paymentValue);
    const emoji = paymentEmoji(paymentValue);

    const embed = new EmbedBuilder()
      .setTitle("🤝 AutoMM Ticket Opened")
      .setColor(0xff0000)
      .setDescription(
        [
          `Welcome <@${user.id}>!`,
          "",
          `**Payment Method:** ${emoji} ${label}`,
          "",
          "Please click **Setup Trade** to enter your trade details.",
          "A staff member will be notified once payment is received.",
        ].join("\n")
      )
      .setFooter({ text: "AutoMM • Automated Middleman System" })
      .setTimestamp();

    const setupBtn = new ButtonBuilder()
      .setCustomId(`automm_su:${paymentValue}:${staffRoleId}`)
      .setLabel("Setup Trade")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(setupBtn);

    await ticketChannel.send({
      content: `<@${user.id}> <@&${staffRoleId}>`,
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: `✅ Your AutoMM ticket has been created: <#${ticketChannel.id}>`,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create automm ticket channel");
    await interaction.editReply({
      content: "❌ Failed to create ticket. Please contact a staff member.",
    });
  }
}

export async function handleAutommSetup(
  interaction: ButtonInteraction,
  paymentValue: string,
  staffRoleId: string
) {
  const modal = new ModalBuilder()
    .setCustomId(`automm_tm:${paymentValue}:${staffRoleId}`)
    .setTitle("Trade Details");

  const amountInput = new TextInputBuilder()
    .setCustomId("trade_amount")
    .setLabel("Trade Amount (e.g. 50 USDT)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. 50 USDT")
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId("trade_desc")
    .setLabel("What are you trading?")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Describe the item, account, currency, etc.")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
  );

  await interaction.showModal(modal);
}

export async function handleAutommTradeModal(
  interaction: ModalSubmitInteraction,
  paymentValue: string,
  staffRoleId: string
) {
  const amount = interaction.fields.getTextInputValue("trade_amount");
  const desc = interaction.fields.getTextInputValue("trade_desc");
  const guildId = interaction.guildId!;

  await interaction.deferReply({ ephemeral: false });

  const walletAddress = await getWallet(guildId, paymentValue);
  const label = paymentLabel(paymentValue);
  const emoji = paymentEmoji(paymentValue);

  if (!walletAddress) {
    await interaction.editReply({
      content:
        "❌ No wallet address is configured for this payment method yet. Please ask a staff member to use `/setwallet`.",
    });
    return;
  }

  const walletEmbed = new EmbedBuilder()
    .setTitle(`${emoji} Payment Details`)
    .setColor(0xff0000)
    .addFields(
      { name: "Payment Method", value: `${emoji} ${label}`, inline: true },
      { name: "Amount to Send", value: `\`${amount}\``, inline: true },
      { name: "Trade Description", value: desc, inline: false },
      {
        name: "Wallet Address",
        value: `\`\`\`${walletAddress}\`\`\``,
        inline: false,
      }
    )
    .setDescription(
      [
        "⚠️ **Send the exact amount listed above.**",
        "⚠️ **Funds cannot be released until payment is verified.**",
        "",
        "Once you have sent the payment, click **I've Sent Payment** and provide your transaction ID or screenshot proof.",
      ].join("\n")
    )
    .setFooter({ text: "AutoMM • Do not send any other amount" })
    .setTimestamp();

  const sentBtn = new ButtonBuilder()
    .setCustomId(`automm_ps:${paymentValue}:${staffRoleId}`)
    .setLabel("I've Sent Payment")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(sentBtn);

  await interaction.editReply({ embeds: [walletEmbed], components: [row] });
}

export async function handleAutommPaymentSent(
  interaction: ButtonInteraction,
  paymentValue: string,
  staffRoleId: string
) {
  const modal = new ModalBuilder()
    .setCustomId(`automm_pm:${paymentValue}:${staffRoleId}`)
    .setTitle("Payment Proof");

  const txInput = new TextInputBuilder()
    .setCustomId("tx_proof")
    .setLabel("Transaction ID or Proof URL")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Paste your TxID or image URL here")
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId("tx_note")
    .setLabel("Additional Notes (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(txInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(noteInput)
  );

  await interaction.showModal(modal);
}

export async function handleAutommProofModal(
  interaction: ModalSubmitInteraction,
  paymentValue: string,
  staffRoleId: string
) {
  const proof = interaction.fields.getTextInputValue("tx_proof");
  const note = interaction.fields.getTextInputValue("tx_note").trim();
  const emoji = paymentEmoji(paymentValue);
  const label = paymentLabel(paymentValue);

  await interaction.deferReply({ ephemeral: false });

  const proofEmbed = new EmbedBuilder()
    .setTitle("💳 Payment Proof Submitted")
    .setColor(0xff0000)
    .addFields(
      { name: "Payment Method", value: `${emoji} ${label}`, inline: true },
      { name: "Submitted by", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Proof / TxID", value: `\`${proof}\``, inline: false }
    )
    .setFooter({ text: "AutoMM • Awaiting staff verification" })
    .setTimestamp();

  if (note) {
    proofEmbed.addFields({ name: "Notes", value: note, inline: false });
  }

  const verifyBtn = new ButtonBuilder()
    .setCustomId(`automm_v:${interaction.user.id}:${staffRoleId}`)
    .setLabel("✅ Verify Payment")
    .setStyle(ButtonStyle.Secondary);

  const rejectBtn = new ButtonBuilder()
    .setCustomId(`automm_r:${interaction.user.id}`)
    .setLabel("❌ Reject Payment")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    verifyBtn,
    rejectBtn
  );

  await interaction.editReply({
    content: `<@&${staffRoleId}> — Payment proof submitted, please verify.`,
    embeds: [proofEmbed],
    components: [row],
  });
}

export async function handleAutommVerify(
  interaction: ButtonInteraction,
  buyerUserId: string,
  staffRoleId: string
) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ Only staff can verify payments.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  const verifiedEmbed = new EmbedBuilder()
    .setTitle("✅ Payment Verified")
    .setColor(0xff0000)
    .setDescription(
      [
        `Payment has been verified by <@${interaction.user.id}>.`,
        "",
        `<@${buyerUserId}> — Your payment is confirmed! The seller will now deliver the item/account/currency.`,
        "",
        "Once the trade is complete, click **Mark as Completed** below.",
      ].join("\n")
    )
    .setFooter({ text: "AutoMM • Payment Verified" })
    .setTimestamp();

  const completeBtn = new ButtonBuilder()
    .setCustomId("automm_c")
    .setLabel("Mark as Completed")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(completeBtn);

  await interaction.editReply({ embeds: [verifiedEmbed], components: [row] });
}

export async function handleAutommReject(
  interaction: ButtonInteraction,
  buyerUserId: string
) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ Only staff can reject payments.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  const rejectedEmbed = new EmbedBuilder()
    .setTitle("❌ Payment Rejected")
    .setColor(0xff0000)
    .setDescription(
      [
        `Payment was rejected by <@${interaction.user.id}>.`,
        "",
        `<@${buyerUserId}> — Your payment proof was not accepted. Please provide valid proof or contact staff.`,
      ].join("\n")
    )
    .setFooter({ text: "AutoMM • Payment Rejected" })
    .setTimestamp();

  await interaction.editReply({ embeds: [rejectedEmbed], components: [] });
}

export async function handleAutommComplete(interaction: ButtonInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ Only staff can mark trades as completed.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  const doneEmbed = new EmbedBuilder()
    .setTitle("🏁 Trade Completed")
    .setColor(0xff0000)
    .setDescription(
      [
        `Trade marked as complete by <@${interaction.user.id}>.`,
        "",
        "Thank you for using AutoMM! This ticket will close in **10 seconds**.",
      ].join("\n")
    )
    .setFooter({ text: "AutoMM • Trade Complete" })
    .setTimestamp();

  await interaction.editReply({ embeds: [doneEmbed], components: [] });

  setTimeout(async () => {
    await (interaction.channel as TextChannel)
      ?.delete("AutoMM trade completed")
      .catch(() => null);
  }, 10_000);
}
