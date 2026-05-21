import { pgTable, text } from "drizzle-orm/pg-core";

export const panelsTable = pgTable("panels", {
  panelId: text("panel_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  staffRoleId: text("staff_role_id").notNull(),
  categoryId: text("category_id").notNull(),
  buttonLabel: text("button_label").notNull(),
  buttonEmoji: text("button_emoji").notNull().default(""),
  questions: text("questions").notNull(),
});

export type Panel = typeof panelsTable.$inferSelect;
