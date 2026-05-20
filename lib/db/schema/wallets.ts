import { pgTable, text, primaryKey } from "drizzle-orm/pg-core";

export const walletsTable = pgTable(
  "wallets",
  {
    guildId: text("guild_id").notNull(),
    paymentMethod: text("payment_method").notNull(),
    address: text("address").notNull(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.paymentMethod] })]
);

export type Wallet = typeof walletsTable.$inferSelect;
