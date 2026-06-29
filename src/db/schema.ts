import { pgTable, serial, text, integer, boolean, timestamp, doublePrecision, bigint, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const taskTypeEnum = pgEnum('task_type', ['tg_channel', 'tg_group', 'website', 'twitter', 'youtube', 'discord', 'facebook', 'custom']);
export const withdrawStatusEnum = pgEnum('withdraw_status', ['pending', 'processing', 'completed', 'rejected']);
export const depositStatusEnum = pgEnum('deposit_status', ['pending', 'approved']);
export const txTypeEnum = pgEnum('tx_type', ['referral', 'task', 'bonus', 'withdraw', 'deposit', 'swap']);
export const adminRoleEnum = pgEnum('admin_role', ['owner', 'admin', 'moderator']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tgId: bigint('tg_id', { mode: 'bigint' }).unique().notNull(),
  username: text('username'),
  fullName: text('full_name'),
  joinDate: timestamp('join_date').defaultNow().notNull(),
  referrerId: integer('referrer_id'), // Internal ID of the referrer
  referralCount: integer('referral_count').default(0).notNull(),
  balanceReward: doublePrecision('balance_reward').default(0).notNull(),
  balanceWithdrawable: doublePrecision('balance_withdrawable').default(0).notNull(),
  balanceReferral: doublePrecision('balance_referral').default(0).notNull(),
  balanceTask: doublePrecision('balance_task').default(0).notNull(),
  balanceBonus: doublePrecision('balance_bonus').default(0).notNull(),
  lastClaimDate: timestamp('last_claim_date'),
  isBanned: boolean('is_banned').default(false).notNull(),
  webUid: text('web_uid').unique(), // For Firebase Auth (Admin access)
  channelVerified: boolean('channel_verified').default(false).notNull(),
  referralRewarded: boolean('referral_rewarded').default(false).notNull(),
  lastVerifyTime: timestamp('last_verify_time'),
}, (table) => ({
  tgIdIdx: index('tg_id_idx').on(table.tgId),
  referrerIdIdx: index('referrer_id_idx').on(table.referrerId),
}));

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: integer('referrer_id').references(() => users.id).notNull(),
  referredId: integer('referred_id').references(() => users.id).notNull(),
  rewarded: boolean('rewarded').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  referrerIdx: index('referral_referrer_idx').on(table.referrerId),
  referredIdx: index('referral_referred_idx').on(table.referredId),
}));

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  reward: doublePrecision('reward').notNull(),
  required: boolean('required').default(false).notNull(),
  status: text('status').default('active').notNull(), // active, inactive
  buttonUrl: text('button_url'),
  type: taskTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userTasks = pgTable('user_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  taskId: integer('task_id').references(() => tasks.id).notNull(),
  status: text('status').default('pending').notNull(), // pending, verified
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userTaskUnique: uniqueIndex('user_task_unq_idx').on(table.userId, table.taskId),
  userIdIdx: index('user_task_user_idx').on(table.userId),
}));

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique().notNull(),
  network: text('network').notNull(), // TRC20, BEP20, Polygon, Solana, TON
  address: text('address').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wallet_user_idx').on(table.userId),
}));

export const withdrawals = pgTable('withdrawals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  network: text('network').notNull(),
  status: withdrawStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('withdrawal_user_idx').on(table.userId),
}));

export const deposits = pgTable('deposits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  status: depositStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('deposit_user_idx').on(table.userId),
}));

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  type: txTypeEnum('type').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('tx_user_idx').on(table.userId),
}));

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  goalType: text('goal_type').notNull(), // referrals, earnings
  goalValue: integer('goal_value').notNull(),
  reward: doublePrecision('reward').notNull(),
});

export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  achievementId: integer('achievement_id').references(() => achievements.id).notNull(),
  rewardedAt: timestamp('rewarded_at').defaultNow().notNull(),
});

export const bonusHistory = pgTable('bonus_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  tgId: bigint('tg_id', { mode: 'bigint' }).unique(),
  username: text('username'),
  webUid: text('web_uid').unique(), // For Firebase Auth
  role: adminRoleEnum('role').default('admin').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminLogs = pgTable('admin_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').references(() => admins.id).notNull(),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channels = pgTable('channels', {
  id: serial('id').primaryKey(),
  channelId: text('channel_id').unique().notNull(),
  title: text('title').notNull(),
  status: text('status').default('active').notNull(), // active, inactive
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  referrer: one(users, {
    fields: [users.referrerId],
    references: [users.id],
    relationName: 'referral_chain',
  }),
  referrals: many(users, { relationName: 'referral_chain' }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  withdrawals: many(withdrawals),
  deposits: many(deposits),
  transactions: many(transactions),
  tasks: many(userTasks),
  achievements: many(userAchievements),
  bonusHistory: many(bonusHistory),
}));

export const tasksRelations = relations(tasks, ({ many }) => ({
  userTasks: many(userTasks),
}));

export const userTasksRelations = relations(userTasks, ({ one }) => ({
  user: one(users, {
    fields: [userTasks.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [userTasks.taskId],
    references: [tasks.id],
  }),
}));
