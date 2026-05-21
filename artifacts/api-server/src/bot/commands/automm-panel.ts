import {
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalSubmitInteraction,
  TextChannel,
} from "discord.js";

export const PAYMENT_EMOJIS = [
  { label: "PayPal",      value: "paypal",   emojiName: "paypal",   emojiId: "1506339857486708747" },
  { label: "Ethereum",    value: "ethemoji", emojiName: "ethemoji", emojiId: "1506339815937933347" },
  { label: "Bitcoin",     value: "btcemoji", emojiName: "btcemoji", emojiId: "1506339770458968265" },
  { label: "Solana",      value: "Solana",   emojiName: "Solana",   emojiId: "1506339640473288885" },
  { label: "USDT (ETH)",  value: "usdteth",  emojiName: "usdteth",  emojiId: "1506339547074789497" },
  { label: "USDC (Sol)",  value: "USDCSol",  emojiName: "USDCSol",  emojiId: "1506339480678957219" },
  { label: "USDT (Sol)",  value: "USDTSol",  emojiName: "USDTSol",  emojiId: "1506339430196183131" },
  { label: "USDC (ETH)",  value: "USDCEth",  emojiName: "USDCEth",  emojiId: "1506339308813025331" },
  { label: "USDT (ETH2)", value: "USDTEth",  emojiName: "USDTEth",  emojiId: "1506339246989119568" },
  { label: "Litecoin",    value: "Ltc",      emojiName: "Ltc",      emojiId: "1506339034157285659" },
];

export async function handleAutommPanelCommand(
  interaction: ChatInputCommandInteraction
) {
  const staffRole = interaction.options.getRole("staff_role", true);
  const category = interaction.options.getChannel("ticket_category", true);

  const modal = new ModalBuilder()
    .setCustomId(`automm_panel_modal:${staffRole.id}:${category.id}`)
    .setTitle("AutoMM Panel Setup");

  const descriptionInput = new TextInputBuilder()
    .setCustomId("automm_description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter the panel description...")
    .setRequired(true);

  const imageInput = new TextInputBuilder()
    .setCustomId("automm_image")
    .setLabel("Image URL (optional)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://example.com/image.png")
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput)
  );

  await interaction.showModal(modal);
}

export async function handleAutommPanelModal(
  interaction: ModalSubmitInteraction,
  staffRoleId: string,
  categoryId: string
) {
  const description = interaction.fields.getTextInputValue("automm_description");
  const imageUrl = interaction.fields.getTextInputValue("automm_image").trim();

  const embed = new EmbedBuilder()
    .setDescription(description)
    .setColor(0xff0000)
    .setFooter({ text: "Select a payment method to open an AutoMM ticket" });

  if (imageUrl) embed.setImage(imageUrl);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`automm_s:${staffRoleId}:${categoryId}`)
    .setPlaceholder("Select payment method...")
    .addOptions(
      PAYMENT_EMOJIS.map((p) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(p.label)
          .setValue(p.value)
          .setEmoji({ name: p.emojiName, id: p.emojiId })
      )
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.deferReply({ ephemeral: true });
  await (interaction.channel as TextChannel | null)?.send({ embeds: [embed], components: [row] });
  await interaction.editReply({ content: "✅ AutoMM panel sent!" });
}
