import { Bot, Context, session, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';
import * as dotenv from 'dotenv';

dotenv.config();

import { db } from '../../src/db/index.ts';
import { users, referrals, tasks, userTasks, transactions, settings, bonusHistory, wallets, withdrawals, deposits, channels, achievements, userAchievements } from '../../src/db/schema.ts';
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

let activeRunner: any = null;
let isStarting = false;

export async function stopBot() {
  if (activeRunner) {
    try {
      console.log('🛑 Stopping bot runner...');
      await activeRunner.stop();
      activeRunner = null;
      console.log('✅ Bot runner stopped');
    } catch (e) {
      console.error('⚠️ Error while stopping bot:', e);
    }
  }
}

export async function startBot() {
  if (!bot) {
    console.warn('⚠️ Cannot start bot: Bot instance is null. Check your TELEGRAM_BOT_TOKEN.');
    return;
  }

  if (isStarting) {
    console.log('⏳ Bot startup already in progress, skipping...');
    return;
  }

  isStarting = true;

  try {
    if (activeRunner && activeRunner.isRunning()) {
      console.log('🔄 Bot runner already active, stopping old instance first...');
      await stopBot();
    }
    
    // Check if token is valid
    try {
      const me = await bot.api.getMe();
      console.log(`🤖 Logged in as @${me.username}`);
    } catch (e: any) {
      console.error('❌ Failed to connect to Telegram API. Check your token:', e.message);
      isStarting = false;
      return;
    }

    try {
      console.log('🧹 Cleaning up any existing webhooks...');
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      // Extra wait to let Telegram servers propagate the change
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Webhook cleaned up');
    } catch (e) {
      console.warn('⚠️ Non-critical error while cleaning up webhook:', e);
    }

    console.log('🚀 Starting Telegram bot with Concurrent Runner...');
    activeRunner = run(bot);
    
    activeRunner.task.catch((err: any) => {
      if (err.message && err.message.includes('409')) {
        console.error('❌ Bot Conflict Error (409) detected in runner task. Another instance might be running.');
      } else {
        console.error('❌ Runner task failed:', err);
      }
    });

    if (activeRunner.isRunning()) {
      console.log(`✅ Bot is online (Concurrent)`);
      
      // Stop the runner when the process is about to exit
      const cleanup = async () => {
        await stopBot();
        process.exit(0);
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('409')) {
      const delay = 5000 + Math.random() * 10000;
      console.error(`❌ Bot Conflict Error (409). Retrying in ${Math.round(delay/1000)}s...`);
      setTimeout(() => {
        isStarting = false;
        startBot();
      }, delay);
    } else {
      console.error('❌ Failed to start bot:', err);
    }
  } finally {
    isStarting = false;
  }
}
