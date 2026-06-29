import express from 'express';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Fix BigInt serialization for Express
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { createServer as createViteServer } from 'vite';
import { webhookCallback } from 'grammy';
import { bot, startBot } from './server/bot/index.ts';
import './server/bot/handlers.ts'; // Initialize handlers
import { requireAuth, requireAdmin, AuthRequest } from './server/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, tasks, withdraws, deposits, admins, settings, transactions, wallets } from './src/db/schema.ts';
import { eq, and, sql, desc, count, sum, gte, or } from 'drizzle-orm';

const app = express();
const PORT = 3000;

app.use(express.json());

// Telegram Bot Setup
if (bot) {
  const isDev = process.env.NODE_ENV !== 'production';
  const appUrl = process.env.APP_URL;
  const useWebhook = !isDev && appUrl && appUrl !== 'MY_APP_URL' && appUrl.startsWith('http');
  
  if (useWebhook) {
    app.use('/api/bot-webhook', webhookCallback(bot, 'express'));
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    botInitialized: !!bot,
    env: process.env.NODE_ENV || 'development'
  });
});

// Admin API Routes
app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = (await db.select({ count: count() }).from(users))[0].count;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = (await db.select({ count: count() }).from(users).where(gte(users.joinDate, today)))[0].count;
    const pendingWithdraws = (await db.select({ count: count() }).from(withdraws).where(eq(withdraws.status, 'pending')))[0].count;

    res.json({
      totalUsers,
      todayUsers,
      pendingWithdraws,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/users', requireAdmin, async (req, res) => {
  const { search } = req.query;
  try {
    let query = db.select().from(users).orderBy(desc(users.joinDate));
    if (search) {
      const searchStr = `%${search}%`;
      // @ts-ignore - drizzle orm types can be tricky with ILIKE
      query = db.select().from(users).where(
        or(
          sql`${users.username} ILIKE ${searchStr}`,
          sql`${users.fullName} ILIKE ${searchStr}`,
          sql`CAST(${users.tgId} AS TEXT) ILIKE ${searchStr}`
        )
      ).orderBy(desc(users.joinDate));
    }
    const allUsers = await query;
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users/:id/ban', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { ban } = req.body;
  try {
    await db.update(users).set({ isBanned: ban }).where(eq(users.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ban status' });
  }
});

app.get('/api/tasks', requireAdmin, async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    res.json(allTasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', requireAdmin, async (req, res) => {
  try {
    const newTask = await db.insert(tasks).values(req.body).returning();
    res.json(newTask[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.get('/api/withdraws', requireAdmin, async (req, res) => {
  try {
    const data = await db.select({
      id: withdraws.id,
      userId: withdraws.id,
      amount: withdraws.amount,
      status: withdraws.status,
      createdAt: withdraws.createdAt,
      walletAddress: wallets.address,
      network: wallets.network,
      userFullName: users.fullName,
      userUsername: users.username
    })
    .from(withdraws)
    .innerJoin(wallets, eq(withdraws.walletId, wallets.id))
    .innerJoin(users, eq(withdraws.userId, users.id))
    .orderBy(desc(withdraws.createdAt));
    res.json(data);
  } catch (error) {
    console.error('Fetch withdraws error:', error);
    res.status(500).json({ error: 'Failed to fetch withdraws' });
  }
});

app.get('/api/withdraws/pending', requireAdmin, async (req, res) => {
  try {
    const pending = await db.select().from(withdraws).where(eq(withdraws.status, 'pending')).orderBy(desc(withdraws.createdAt));
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch withdraws' });
  }
});

app.post('/api/withdraws/:id/status', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  try {
    await db.update(withdraws).set({ status }).where(eq(withdraws.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update withdraw status' });
  }
});

app.get('/api/deposits', requireAdmin, async (req, res) => {
  try {
    const allDeposits = await db.select({
      id: deposits.id,
      userId: deposits.userId,
      amount: deposits.amount,
      status: deposits.status,
      createdAt: deposits.createdAt,
      userFullName: users.fullName,
      userUsername: users.username
    })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .orderBy(desc(deposits.createdAt));
    res.json(allDeposits);
  } catch (error) {
    console.error('Fetch deposits error:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

app.post('/api/deposits/:id/approve', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const deposit = (await db.select().from(deposits).where(eq(deposits.id, id)))[0];
    if (!deposit || deposit.status !== 'pending') return res.status(400).json({ error: 'Invalid deposit' });

    await db.transaction(async (tx) => {
      await tx.update(deposits).set({ status: 'approved' }).where(eq(deposits.id, id));
      await tx.update(users).set({ balanceWithdrawable: sql`${users.balanceWithdrawable} + ${deposit.amount}` }).where(eq(users.id, deposit.userId));
      await tx.insert(transactions).values({
        userId: deposit.userId,
        amount: deposit.amount,
        type: 'deposit',
        description: 'Manual Deposit Approved',
      });
    });

    // Notify user via bot
    if (bot) {
        const user = (await db.select().from(users).where(eq(users.id, deposit.userId)))[0];
        if (user) {
            bot.api.sendMessage(Number(user.tgId), `✅ *Deposit Approved!*\n\nYour deposit of *$${deposit.amount}* has been verified and added to your balance.`, { parse_mode: 'Markdown' }).catch(console.error);
        }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

app.post('/api/broadcast', requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (!bot) return res.status(500).json({ error: 'Bot not initialized' });

  try {
    const allUsers = await db.select().from(users);
    
    // Process in batches of 30 per second (Telegram rate limit is ~30 msg/sec for global)
    const BATCH_SIZE = 30;
    const DELAY_MS = 1100;
    
    let successCount = 0;
    
    // Running this as a background task to avoid timeout
    (async () => {
        for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
            const batch = allUsers.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (user) => {
                try {
                    await bot.api.sendMessage(Number(user.tgId), message);
                    successCount++;
                } catch (e) {
                    // console.error(`Failed to send message to ${user.tgId}`);
                }
            }));
            if (i + BATCH_SIZE < allUsers.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }
        console.log(`Broadcast completed. Success: ${successCount}/${allUsers.length}`);
    })();

    res.json({ success: true, message: 'Broadcast started in background.' });
  } catch (error) {
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

// Auth Route to Register/Link Admin
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // If no admins exist, make the first one an admin automatically
    const adminCount = (await db.select({ count: count() }).from(admins))[0].count;
    if (adminCount === 0) {
      await db.insert(admins).values({ webUid: req.user.uid, username: req.user.email });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

async function startServer() {
  // Vite/Static Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    if (bot) {
      const isDev = process.env.NODE_ENV !== 'production';
      const appUrl = process.env.APP_URL;
      const useWebhook = !isDev && appUrl && appUrl !== 'MY_APP_URL' && appUrl.startsWith('http');
      
      if (useWebhook) {
        const webhookUrl = `${appUrl}/api/bot-webhook`;
        console.log(`📡 Configuring bot with Webhook: ${webhookUrl}`);
        try {
          await bot.api.setWebhook(webhookUrl);
          console.log('✅ Webhook set successfully');
        } catch (e) {
          console.error('❌ Failed to set Telegram webhook. Falling back to Polling...', e);
          startBot();
        }
      } else {
        console.log(`🔄 ${isDev ? 'Development mode' : 'No valid APP_URL'}: starting bot with Long Polling...`);
        startBot();
      }
    }
  });
}

startServer().catch(console.error);
