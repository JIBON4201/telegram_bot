import { Bot, Context, session, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';
import * as dotenv from 'dotenv';

dotenv.config();

import { db } from '../../src/db/index.ts';
import { users, referrals, tasks, userTasks, transactions, settings, bonusHistory, wallets, withdraws, deposits, channels, achievements, userAchievements } from '../../src/db/schema.ts';
import { eq, and, sql, desc, count, sum } from 'drizzle-orm';

export interface SessionData {
  step?: string;
  walletNetwork?: string;
}
export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor<Context>;

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const isPlaceholder = !botToken || botToken === 'MY_TELEGRAM_BOT_TOKEN' || botToken === '';

if (isPlaceholder) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set or is still a placeholder. The bot will NOT be initialized.');
  console.warn('👉 Go to Settings > Secrets and add TELEGRAM_BOT_TOKEN with your bot token from @BotFather.');
}

export const bot = !isPlaceholder ? new Bot<MyContext>(botToken!) : null;

export const BOT_START_TIME = new Date();

if (bot) {
  bot.use(session({ initial: () => ({}) }));

  // Middleware to log errors
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`❌ Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
  });
}

import { run } from '@grammyjs/runner';

export async function startBot() {
  if (!bot) {
    console.warn('⚠️ Cannot start bot: Bot instance is null. Check your TELEGRAM_BOT_TOKEN.');
    return;
  }
  
  console.log('🚀 Starting Telegram bot with Concurrent Runner...');
  const runner = run(bot);
  
  if (runner.isRunning()) {
    console.log(`✅ Bot is online (Concurrent)`);
  }
}
