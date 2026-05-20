import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { db, walletsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { PAYMENT_EMOJIS } from "./automm-panel";

export async function handleSetWalletCommand(
  interaction: ChatInputCommandInteraction
) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "❌ You need **Manage Server** permission to use this command.",
      ephemeral: true,
    });
    return;
  }

  const paymentMethod = interaction.options.getString("payment_method", true);
  const address = interaction.options.getString("address", true);
  const guildId = interaction.guildId!;

  const emoji = PAYMENT_EMOJIS.find((p) => p.value === paymentMethod);

  await db
    .insert(walletsTable)
    .values({ guildId, paymentMethod, address })
    .onConflictDoUpdate({
      target: [walletsTable.guildId, walletsTable.paymentMethod],
      set: { address },
    });

  await interaction.reply({
    content: `✅ Wallet for **${emoji?.label ?? paymentMethod}** set to:\n\`\`\`${address}\`\`\``,
    ephemeral: true,
  });
}

export async function getWallet(
  guildId: string,
  paymentMethod: string
): Promise<string | null> {
  const rows = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.guildId, guildId),
        eq(walletsTable.paymentMethod, paymentMethod)
      )
    )
    .limit(1);

  return rows[0]?.address ?? null;
}
