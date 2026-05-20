import {
  Interaction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../lib/logger";
import {
  handleAutommPanelCommand,
  handleAutommPanelModal,
} from "./commands/automm-panel";
import {
  handlePanelCreateCommand,
  handlePanelCreateModal,
  handlePanelTicketButton,
  handlePanelTicketModal,
  handleCloseTicket,
  handleAddCommand,
  panelConfigs,
} from "./commands/panel";
import { handleSetWalletCommand } from "./commands/setwallet";
import {
  handleAutommPaymentSelect,
  handleAutommSetup,
  handleAutommTradeModal,
  handleAutommPaymentSent,
  handleAutommProofModal,
  handleAutommVerify,
  handleAutommReject,
  handleAutommComplete,
} from "./commands/automm";

export async function handleInteraction(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    logger.error({ err, interactionId: interaction.id }, "Unhandled interaction error");
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => null);
    }
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction) {
  const { commandName } = interaction;

  if (commandName === "automm-panel") {
    await handleAutommPanelCommand(interaction);
    return;
  }

  if (commandName === "setwallet") {
    await handleSetWalletCommand(interaction);
    return;
  }

  if (commandName === "add") {
    await handleAddCommand(interaction);
    return;
  }

  if (commandName === "panel") {
    const sub = interaction.options.getSubcommand();
    if (sub === "create") await handlePanelCreateCommand(interaction);
    return;
  }

  await interaction.reply({ content: "Unknown command.", ephemeral: true });
}

async function handleModal(interaction: ModalSubmitInteraction) {
  const { customId } = interaction;

  // automm_panel_modal:staffRoleId:categoryId
  if (customId.startsWith("automm_panel_modal:")) {
    const [, staffRoleId, categoryId] = customId.split(":");
    if (staffRoleId && categoryId) {
      await handleAutommPanelModal(interaction, staffRoleId, categoryId);
    }
    return;
  }

  // automm_tm:paymentValue:staffRoleId
  if (customId.startsWith("automm_tm:")) {
    const parts = customId.split(":");
    await handleAutommTradeModal(interaction, parts[1]!, parts[2]!);
    return;
  }

  // automm_pm:paymentValue:staffRoleId
  if (customId.startsWith("automm_pm:")) {
    const parts = customId.split(":");
    await handleAutommProofModal(interaction, parts[1]!, parts[2]!);
    return;
  }

  // panel_create_modal:staffRoleId:categoryId
  if (customId.startsWith("panel_create_modal:")) {
    const [, staffRoleId, categoryId] = customId.split(":");
    if (staffRoleId && categoryId) {
      await handlePanelCreateModal(interaction, staffRoleId, categoryId);
    }
    return;
  }

  // ptm:panelId — panel ticket modal (trader + trade details)
  if (customId.startsWith("ptm:")) {
    const panelId = customId.slice(4);
    await handlePanelTicketModal(interaction, panelId);
    return;
  }

  await interaction.reply({ content: "Unknown modal submission.", ephemeral: true });
}

async function handleButton(interaction: ButtonInteraction) {
  const { customId } = interaction;

  // automm_su:paymentValue:staffRoleId
  if (customId.startsWith("automm_su:")) {
    const parts = customId.split(":");
    await handleAutommSetup(interaction, parts[1]!, parts[2]!);
    return;
  }

  // automm_ps:paymentValue:staffRoleId
  if (customId.startsWith("automm_ps:")) {
    const parts = customId.split(":");
    await handleAutommPaymentSent(interaction, parts[1]!, parts[2]!);
    return;
  }

  // automm_v:buyerUserId:staffRoleId
  if (customId.startsWith("automm_v:")) {
    const parts = customId.split(":");
    await handleAutommVerify(interaction, parts[1]!, parts[2]!);
    return;
  }

  // automm_r:buyerUserId
  if (customId.startsWith("automm_r:")) {
    const parts = customId.split(":");
    await handleAutommReject(interaction, parts[1]!);
    return;
  }

  if (customId === "automm_c") {
    await handleAutommComplete(interaction);
    return;
  }

  // close_ticket:channelId
  if (customId.startsWith("close_ticket:")) {
    await handleCloseTicket(interaction);
    return;
  }

  // pt_TIMESTAMP — panel ticket button (opens modal)
  if (panelConfigs.has(customId)) {
    await handlePanelTicketButton(interaction, panelConfigs.get(customId)!);
    return;
  }

  await interaction.reply({ content: "Unknown button.", ephemeral: true });
}

async function handleSelect(interaction: StringSelectMenuInteraction) {
  const { customId } = interaction;

  // automm_s:staffRoleId:categoryId
  if (customId.startsWith("automm_s:")) {
    const parts = customId.split(":");
    await handleAutommPaymentSelect(interaction, parts[1]!, parts[2]!);
    return;
  }

  await interaction.reply({ content: "Unknown selection.", ephemeral: true });
}
