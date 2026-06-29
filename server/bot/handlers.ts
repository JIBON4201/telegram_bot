import { bot, type MyContext, type SessionData } from './index.ts';
import { mainMenu, inviteMenu, cancelMenu } from './keyboards.ts';
import { db } from '../../src/db/index.ts';
import { users, referrals, tasks, userTasks, transactions, settings, bonusHistory, wallets, withdraws, deposits, channels, achievements, userAchievements, admins } from '../../src/db/schema.ts';
import { eq, and, sql, desc, count, sum, or, gte } from 'drizzle-orm';
import { InlineKeyboard, session, Context, SessionFlavor } from 'grammy';
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";

// Load advanced admin features
import './admin_handlers.ts';

type MyConversation = Conversation<MyContext>;

const ADMIN_IDS = [584404609395]; // Replace with actual admin TG IDs

async function isAdmin(tgId: bigint) {
  if (ADMIN_IDS.includes(Number(tgId))) return true;
  const admin = (await db.select().from(admins).where(eq(admins.tgId, tgId)))[0];
  return !!admin;
}

async function addChannelConversation(conversation: MyConversation, ctx: MyContext) {
  const adminId = BigInt(ctx.from?.id || 0);
  if (!(await conversation.external(() => isAdmin(adminId)))) return;

  await ctx.reply("➕ *Adding New Channel*\n\nPlease send the Channel ID (e.g., `@channelusername` or `-100123456789`)", { parse_mode: 'Markdown' });
  const { message: idMsg } = await conversation.waitFor("message:text");
  const channelId = idMsg.text;

  await ctx.reply("📝 *Set Title*\n\nPlease send the Title for this channel:", { parse_mode: 'Markdown' });
  const { message: titleMsg } = await conversation.waitFor("message:text");
  const title = titleMsg.text;

  try {
    await conversation.external(() => db.insert(channels).values({
      channelId,
      title,
    }));
    await ctx.reply(`✅ *Channel Added Successfully!*\n\nTitle: ${title}\nID: ${channelId}`, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply("❌ *Error:* Duplicate Channel ID or database failure.", { parse_mode: 'Markdown' });
  }
}

if (bot) {
  bot.use(conversations());
  bot.use(createConversation(addChannelConversation));

  // /start handler
  bot.command('start', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const username = ctx.from?.username || null;
    const fullName = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim();
    const startPayload = ctx.match; // referral ID

    const [user, requiredTasks, requiredChannels] = await Promise.all([
      db.select().from(users).where(eq(users.tgId, tgId)).then(res => res[0]),
      db.select().from(tasks).where(and(eq(tasks.status, 'active'), eq(tasks.required, true))),
      db.select().from(channels)
    ]);

    if (!user) {
      let referrerId: number | null = null;
      if (startPayload && !isNaN(Number(startPayload))) {
        const refTgId = BigInt(startPayload);
        const referrer = (await db.select().from(users).where(eq(users.tgId, refTgId)))[0];
        if (referrer && referrer.tgId !== tgId) {
          referrerId = referrer.id;
        }
      }

      const [newUser] = await db.insert(users).values({
        tgId,
        username,
        fullName,
        referrerId,
      }).returning();
      
      if (referrerId) {
        await db.insert(referrals).values({
          referrerId,
          referredId: newUser.id,
          rewarded: false,
        });
      }
      
      // Since it's a new user, we can directly use newUser
      const totalRequired = requiredTasks.length + requiredChannels.length;
      if (totalRequired === 0) {
          await db.update(users).set({ channelVerified: true }).where(eq(users.id, newUser.id));
          await checkReferralReward(newUser.id);
          return ctx.reply(`Welcome ${fullName}! 🚀\n\nEarn FWC coins by completing tasks and inviting friends. Swap your FWC coins for TON tokens and withdraw them to your wallet!`, {
            reply_markup: mainMenu,
          });
      }

      const welcomeMsg = `Welcome ${fullName}! 🚀\n\nEarn FWC coins by completing tasks and inviting friends. Swap your FWC coins for TON tokens and withdraw them to your wallet!\n\n⚠️ *Mandatory Action Required*\nTo activate your account and earn referral rewards, you MUST join our ${totalRequired} required channels and groups below.\n\nAfter joining all of them, click the **Verify All Channels** button.`;
      const keyboard = new InlineKeyboard();
      for (const task of requiredTasks) {
          keyboard.url(`Join: ${task.title}`, task.buttonUrl || '').row();
      }
      for (const ch of requiredChannels) {
          const link = ch.channelId.startsWith('@') ? `https://t.me/${ch.channelId.substring(1)}` : `https://t.me/${ch.channelId}`;
          keyboard.url(`Join: ${ch.title}`, link).row();
      }
      keyboard.text('🔄 Verify All Channels', 'verify_all_channels').row();
      return ctx.reply(welcomeMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    if (user.isBanned) {
        return ctx.reply('⚠️ Your account has been suspended.');
    }

    let welcomeMsg = `Welcome ${fullName}! 🚀\n\nEarn FWC coins by completing tasks and inviting friends. Swap your FWC coins for TON tokens and withdraw them to your wallet!`;
    
    const totalRequired = requiredTasks.length + requiredChannels.length;
    
    if (totalRequired === 0 && !user.channelVerified) {
        await db.update(users).set({ channelVerified: true }).where(eq(users.id, user.id));
        user.channelVerified = true;
        await checkReferralReward(user.id);
    }

    if (totalRequired > 0 && !user.channelVerified) {
        welcomeMsg += `\n\n⚠️ *Mandatory Action Required*\nTo activate your account and earn referral rewards, you MUST join our ${totalRequired} required channels and groups below.\n\nAfter joining all of them, click the **Verify All Channels** button.`;
        const keyboard = new InlineKeyboard();
        for (const task of requiredTasks) {
            keyboard.url(`Join: ${task.title}`, task.buttonUrl || '').row();
        }
        for (const ch of requiredChannels) {
            const link = ch.channelId.startsWith('@') ? `https://t.me/${ch.channelId.substring(1)}` : `https://t.me/${ch.channelId}`;
            keyboard.url(`Join: ${ch.title}`, link).row();
        }
        keyboard.text('🔄 Verify All Channels', 'verify_all_channels').row();
        return ctx.reply(welcomeMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    await ctx.reply(welcomeMsg, {
      reply_markup: mainMenu,
    });
  });

  // Handle Menu Buttons
  bot.hears('👥 Invite Friends', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const [user, botInfo, requiredTasks, requiredChannels] = await Promise.all([
      db.select().from(users).where(eq(users.tgId, tgId)).then(res => res[0]),
      ctx.api.getMe(),
      db.select().from(tasks).where(and(eq(tasks.status, 'active'), eq(tasks.required, true))),
      db.select().from(channels)
    ]);
    
    if (!user) return;

    const refLink = `https://t.me/${botInfo.username}?start=${user.tgId}`;
    const totalRequired = requiredTasks.length + requiredChannels.length;

    let completedCount = 0;
    if (totalRequired > 0 && !user.channelVerified) {
      const completedRequired = await db.select()
        .from(userTasks)
        .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
        .where(and(
          eq(userTasks.userId, user.id),
          eq(userTasks.status, 'verified'),
          eq(tasks.required, true)
        ));
      completedCount = completedRequired.length;
    }

    let message = `👥 *Referral System*\n\nInvite your friends and earn *10 FWC* per active referral!\n\nYour Referral Link:\n\`${refLink}\`\n\nRewards are added after your friend completes all required tasks.\n\n`;
    
    if (totalRequired > 0) {
      message += `📊 *Your Own Progress*\n` +
        `Required Actions: ${user.channelVerified ? totalRequired : completedCount}/${totalRequired}\n` +
        `${user.channelVerified ? '✅ You are eligible for rewards!' : '⚠️ You must join all mandatory channels and complete tasks to earn from referrals.'}`;
    }

    const keyboard = user.channelVerified ? inviteMenu : new InlineKeyboard().text('🔄 Verify All Channels', 'verify_all_channels').row().text('👥 Invite Friends', 'invite');

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  bot.hears('📋 Tasks', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const [user, activeTasks, allAchievements] = await Promise.all([
        db.select().from(users).where(eq(users.tgId, tgId)).then(res => res[0]),
        db.select().from(tasks).where(eq(tasks.status, 'active')),
        db.select().from(achievements).orderBy(achievements.goalValue)
    ]);
    
    if (!user) return;

    const userAchieved = await db.select().from(userAchievements).where(eq(userAchievements.userId, user.id));
    const claimedIds = userAchieved.map(a => a.achievementId);

    let message = '📋 *Available Tasks*\n\nComplete these tasks to earn rewards and unlock withdrawals!\n\n';
    const keyboard = new InlineKeyboard();

    const requiredTasks = activeTasks.filter(t => t.required);
    const optionalTasks = activeTasks.filter(t => !t.required);

    if (requiredTasks.length > 0) {
        message += '⚠️ *Mandatory Tasks (Must complete for Referral Rewards)*\n';
        for (const task of requiredTasks) {
            message += `🔹 *${task.title}* (+${task.reward} FWC)\n`;
            keyboard.text(`Mandatory: ${task.title}`, `view_task_${task.id}`).row();
        }
        message += '\n';
    }

    if (optionalTasks.length > 0) {
        message += '✨ *Optional Tasks*\n';
        for (const task of optionalTasks) {
            message += `🔸 *${task.title}* (+${task.reward} FWC)\n`;
            keyboard.text(`View: ${task.title}`, `view_task_${task.id}`).row();
        }
        message += '\n';
    }

    if (allAchievements.length > 0) {
        message += '🏆 *Referral Milestones*\nReach these goals to earn extra bonus!\n';
        for (const ach of allAchievements) {
            const isClaimed = claimedIds.includes(ach.id);
            const canClaim = user.referralCount >= ach.goalValue && !isClaimed;
            
            message += `${isClaimed ? '✅' : (user.referralCount >= ach.goalValue ? '🎁' : '🔒')} *${ach.name}* (${user.referralCount}/${ach.goalValue})\n`;
            message += `└ Reward: +${ach.reward} FWC\n`;
            
            if (canClaim) {
                keyboard.text(`🎁 Claim ${ach.reward} FWC`, `claim_achievement_${ach.id}`).row();
            } else if (!isClaimed) {
                keyboard.text(`🔒 Milestone: ${ach.goalValue} Ref`, `ach_info_${ach.id}`).row();
            }
        }
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  bot.hears('💰 Balance', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const [user, requiredTasks, requiredChannels] = await Promise.all([
      db.select().from(users).where(eq(users.tgId, tgId)).then(res => res[0]),
      db.select().from(tasks).where(and(eq(tasks.status, 'active'), eq(tasks.required, true))),
      db.select().from(channels)
    ]);
    
    if (!user) return;

    const totalRequired = requiredTasks.length + requiredChannels.length;
    let completedCount = 0;
    
    if (totalRequired > 0 && !user.channelVerified) {
      const completedRequired = await db.select()
        .from(userTasks)
        .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
        .where(and(
          eq(userTasks.userId, user.id),
          eq(userTasks.status, 'verified'),
          eq(tasks.required, true)
        ));
      completedCount = completedRequired.length;
    }

    let message = `💰 *Your Balance*\n\n` +
      `🪙 FWC Coins: *${user.balanceReward} FWC*\n` +
      `💎 TON Token: *$${user.balanceWithdrawable} (Ton)*\n\n` +
      `📈 *Earnings Breakdown*\n` +
      `👥 Referrals: ${user.balanceReferral} FWC\n` +
      `📋 Tasks: ${user.balanceTask} FWC\n` +
      `✨ Bonus: ${user.balanceBonus} FWC\n\n`;

    if (totalRequired > 0) {
      message += `📌 *Required Actions Progress*\n` +
        `Verified Status: ${user.channelVerified ? '✅ Completed' : `⏳ Incomplete (${completedCount} tasks join)`}\n` +
        `${user.channelVerified ? '✅ All mandatory actions completed!' : '⚠️ Join all mandatory channels and tasks to activate your account for referrals.'}`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  bot.hears('🎁 Daily Bonus', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
    if (!user) return;

    const now = new Date();
    const lastClaim = user.lastClaimDate;

    if (lastClaim && (now.getTime() - lastClaim.getTime()) < 24 * 60 * 60 * 1000) {
      const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
      const diff = nextClaim.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return ctx.reply(`🎁 You already claimed your bonus today!\n\nNext claim in: ${hours}h ${mins}m`);
    }

    const bonusAmount = 10; // 10 FWC
    await db.update(users)
      .set({
        balanceReward: sql`${users.balanceReward} + ${bonusAmount}`,
        balanceBonus: sql`${users.balanceBonus} + ${bonusAmount}`,
        lastClaimDate: now,
      })
      .where(eq(users.id, user.id));

    await db.insert(bonusHistory).values({
      userId: user.id,
      amount: bonusAmount,
    });

    await db.insert(transactions).values({
      userId: user.id,
      amount: bonusAmount,
      type: 'bonus',
      description: 'Daily Bonus',
    });

    await ctx.reply(`🎁 Congratulations! You received ${bonusAmount} FWC daily bonus!`);
  });

  bot.hears('🔄 Swap FWC', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
    if (!user) return;

    const minSwap = 10; // Swap 10 FWC at a time or in multiples
    const rate = 0.015 / 10; // 10 FWC = 0.015$ Ton

    if (user.balanceReward < minSwap) {
      return ctx.reply(`⚠️ Minimum swap amount is ${minSwap} FWC. You have ${user.balanceReward} FWC.`);
    }

    const fwcToSwap = Math.floor(user.balanceReward);
    const tonValue = fwcToSwap * rate;

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          balanceReward: sql`${users.balanceReward} - ${fwcToSwap}`,
          balanceWithdrawable: sql`${users.balanceWithdrawable} + ${tonValue}`,
        })
        .where(eq(users.id, user.id));

      await tx.insert(transactions).values({
        userId: user.id,
        amount: tonValue,
        type: 'swap',
        description: `Swapped ${fwcToSwap} FWC for $${tonValue.toFixed(4)} Ton`,
      });
    });

    await ctx.reply(`🔄 *Swap Successful!*\n\nYou swapped *${fwcToSwap} FWC* for *$${tonValue.toFixed(4)} worth of Ton tokens*.\n\nYour TON balance: *$${(user.balanceWithdrawable + tonValue).toFixed(4)}*`, { parse_mode: 'Markdown' });
  });

  bot.hears('👛 Setup Wallet', async (ctx) => {
    ctx.session.step = 'enter_wallet';
    ctx.session.walletNetwork = 'TON';
    await ctx.reply('👛 Please enter your *TON* wallet address:', {
      parse_mode: 'Markdown',
      reply_markup: cancelMenu,
    });
  });

  bot.hears('💸 Withdraw', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
    if (!user) return;

    const wallet = (await db.select().from(wallets).where(eq(wallets.userId, user.id)))[0];
    if (!wallet) {
      return ctx.reply('⚠️ Please setup your wallet first using the "👛 Setup Wallet" button.');
    }

    const minWithdraw = 0.1; // Minimum withdrawal 0.1$ ton
    if (user.balanceWithdrawable < minWithdraw) {
      return ctx.reply(`⚠️ Minimum withdrawal amount is *$${minWithdraw} Ton*. Your current Ton balance is *$${user.balanceWithdrawable.toFixed(4)}*.`, { parse_mode: 'Markdown' });
    }

    ctx.session.step = 'withdraw_amount';
    await ctx.reply(`💸 *Withdraw Funds*\n\nWithdrawable Ton Balance: *$${user.balanceWithdrawable.toFixed(4)}*\nMinimum: *$${minWithdraw}*\n\nWallet: \`${wallet.address}\` (${wallet.network})\n\n*Please enter the amount you want to withdraw ($):*`, {
      parse_mode: 'Markdown',
      reply_markup: cancelMenu,
    });
  });

  // Handle Callbacks
  bot.on('callback_query:data', async (ctx: MyContext) => {
    const data = ctx.callbackQuery.data;
    const tgId = BigInt(ctx.from?.id || 0);
    const adminTgId = Number(ctx.from?.id || 0);

    // Admin Handlers (Now managed in admin_handlers.ts)

    if (data === 'verify_all_channels') {
      const [user, requiredTasks, requiredChannels] = await Promise.all([
        db.select().from(users).where(eq(users.tgId, tgId)).then(res => res[0]),
        db.select().from(tasks).where(and(eq(tasks.status, 'active'), eq(tasks.required, true))),
        db.select().from(channels)
      ]);
      
      if (!user) return;

      const now = new Date();
      if (user.lastVerifyTime && (now.getTime() - user.lastVerifyTime.getTime()) < 15000) {
        return ctx.answerCallbackQuery('⏳ Verification cooldown active. Please wait 15 seconds.').catch(() => {});
      }

      await ctx.answerCallbackQuery('🔍 Verifying memberships...').catch(() => {});
      
      let joinedCount = 0;
      const totalToJoin = requiredTasks.length + requiredChannels.length;
      
      // Batch membership checks
      const checks = [
        ...requiredTasks.filter(t => t.type === 'tg_channel' || t.type === 'tg_group').map(async (task) => {
          try {
            const chatUsername = task.buttonUrl?.split('/').pop()?.replace('@', '') || '';
            const chatMember = await ctx.api.getChatMember(`@${chatUsername}`, ctx.from.id);
            if (['member', 'administrator', 'creator'].includes(chatMember.status)) {
              await db.insert(userTasks).values({
                userId: user.id,
                taskId: task.id,
                status: 'verified',
              }).onConflictDoUpdate({
                target: [userTasks.userId, userTasks.taskId],
                set: { status: 'verified' }
              });
              return true;
            }
          } catch (e) {}
          return false;
        }),
        ...requiredTasks.filter(t => t.type !== 'tg_channel' && t.type !== 'tg_group').map(async (task) => {
          const ut = (await db.select().from(userTasks).where(and(eq(userTasks.userId, user.id), eq(userTasks.taskId, task.id))))[0];
          return !!(ut && ut.status === 'verified');
        }),
        ...requiredChannels.map(async (ch) => {
          try {
            const chatMember = await ctx.api.getChatMember(ch.channelId.startsWith('-100') ? Number(ch.channelId) : ch.channelId, ctx.from.id);
            return ['member', 'administrator', 'creator'].includes(chatMember.status);
          } catch (e) {}
          return false;
        })
      ];

      const results = await Promise.all(checks);
      joinedCount = results.filter(Boolean).length;

      await db.update(users).set({ lastVerifyTime: now }).where(eq(users.id, user.id));

      if (joinedCount >= totalToJoin && totalToJoin > 0) {
        await db.update(users).set({ channelVerified: true }).where(eq(users.id, user.id));
        await checkReferralReward(user.id);
        await ctx.reply(`✅ *Verification Success!*\n\nYou joined all ${totalToJoin} required sources.\n\nYour account is now fully active!`, { parse_mode: 'Markdown', reply_markup: mainMenu });
      } else {
        await ctx.reply(`❌ *Verification Incomplete*\n\nYou have joined ${joinedCount} out of ${totalToJoin} required sources. Please join ALL channels and try again.`, { parse_mode: 'Markdown' });
      }
      return;
    }

    if (data.startsWith('view_task_')) {
      const taskId = parseInt(data.replace('view_task_', ''));
      const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
      if (!task) return ctx.answerCallbackQuery('Task not found.');

      const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
      if (!user) return;

      const userTask = (await db.select().from(userTasks).where(and(eq(userTasks.userId, user.id), eq(userTasks.taskId, taskId))))[0];

      let statusText = '❌ Not Completed';
      if (userTask) {
        statusText = userTask.status === 'verified' ? '✅ Verified' : '⏳ Pending Verification';
      }

      const keyboard = new InlineKeyboard();
      if (task.buttonUrl) {
        keyboard.url('Open Task Link', task.buttonUrl).row();
      }
      if (!userTask || userTask.status === 'pending') {
        keyboard.text('✅ Verify Completion', `verify_task_${task.id}`);
      }

      await ctx.answerCallbackQuery().catch(() => {});
      await ctx.editMessageText(`📋 *${task.title}*\n\n${task.description}\n\nReward: ${task.reward}\nRequired: ${task.required ? 'Yes' : 'No'}\nStatus: ${statusText}`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

    if (data.startsWith('verify_task_')) {
      const taskId = parseInt(data.replace('verify_task_', ''));
      const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
      if (!task) return ctx.answerCallbackQuery('Task not found.');

      const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
      if (!user) return;

      // Duplicate verification prevention
      const existing = (await db.select().from(userTasks).where(and(eq(userTasks.userId, user.id), eq(userTasks.taskId, taskId))))[0];
      if (existing && existing.status === 'verified') {
        return ctx.answerCallbackQuery('Task already verified!');
      }

      let verified = true;
      if (task.type === 'tg_channel' || task.type === 'tg_group') {
          try {
              // Extract chat ID from link (handles t.me/name or @name)
              const chatUsername = task.buttonUrl?.split('/').pop()?.replace('@', '') || '';
              const chatMember = await ctx.api.getChatMember(`@${chatUsername}`, ctx.from.id);
              if (['member', 'administrator', 'creator'].indexOf(chatMember.status) === -1) {
                  verified = false;
              }
          } catch (e) {
              verified = false;
          }
      }

      if (!verified) {
          return ctx.answerCallbackQuery('⚠️ Please complete the task before verifying!');
      }

      await db.insert(userTasks).values({
        userId: user.id,
        taskId: task.id,
        status: 'verified',
      }).onConflictDoUpdate({
        target: [userTasks.userId, userTasks.taskId],
        set: { status: 'verified' }
      });

      // Update user balance
      await db.update(users)
        .set({
          balanceReward: sql`${users.balanceReward} + ${task.reward}`,
          balanceTask: sql`${users.balanceTask} + ${task.reward}`,
        })
        .where(eq(users.id, user.id));

      await db.insert(transactions).values({
        userId: user.id,
        amount: task.reward,
        type: 'task',
        description: `Completed task: ${task.title}`,
      });

      // Check if all required tasks are completed to reward referrer
      await checkReferralReward(user.id);

      await ctx.answerCallbackQuery('✅ Task verified and reward added!');
      await ctx.editMessageText(`✅ *${task.title}* has been verified!\n\nReward of ${task.reward} added to your balance.`, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('claim_achievement_')) {
      const achId = parseInt(data.replace('claim_achievement_', ''));
      const ach = (await db.select().from(achievements).where(eq(achievements.id, achId)))[0];
      if (!ach) return ctx.answerCallbackQuery('Achievement not found.');

      const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
      if (!user) return;

      if (user.referralCount < ach.goalValue) {
        return ctx.answerCallbackQuery(`⚠️ You need ${ach.goalValue} referrals to claim this!`);
      }

      const existing = (await db.select().from(userAchievements).where(and(eq(userAchievements.userId, user.id), eq(userAchievements.achievementId, achId))))[0];
      if (existing) {
        return ctx.answerCallbackQuery('Achievement already claimed!');
      }

      await db.transaction(async (tx) => {
        await tx.insert(userAchievements).values({
          userId: user.id,
          achievementId: achId,
        });

        await tx.update(users)
          .set({
            balanceReward: sql`${users.balanceReward} + ${ach.reward}`,
            balanceBonus: sql`${users.balanceBonus} + ${ach.reward}`,
          })
          .where(eq(users.id, user.id));

        await tx.insert(transactions).values({
          userId: user.id,
          amount: ach.reward,
          type: 'bonus',
          description: `Milestone Claimed: ${ach.name}`,
        });
      });

      await ctx.answerCallbackQuery(`🎉 Claimed ${ach.reward} FWC bonus!`);
      await ctx.editMessageText(`🎉 *Achievement Unlocked!*\n\nYou've successfully claimed the bonus for reaching *${ach.goalValue} referrals*.\n\nReward: +${ach.reward} FWC`, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('ach_info_')) {
        const achId = parseInt(data.replace('ach_info_', ''));
        const ach = (await db.select().from(achievements).where(eq(achievements.id, achId)))[0];
        if (!ach) return ctx.answerCallbackQuery();
        
        await ctx.answerCallbackQuery({
            text: `🔒 Milestone: Reach ${ach.goalValue} referrals to unlock this reward!`,
            show_alert: true
        });
    }
  });

  // Handle Text for FSM steps
  bot.hears('📜 History', async (ctx) => {
    const tgId = BigInt(ctx.from?.id || 0);
    const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
    if (!user) return;

    const history = await db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.createdAt)).limit(10);
    if (history.length === 0) {
      return ctx.reply('No transaction history found.');
    }

    let message = '📜 *Recent History*\n\n';
    for (const tx of history) {
      const date = tx.createdAt.toLocaleDateString();
      const typeLabel = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
      message += `📅 ${date} | *${typeLabel}*\n` +
        `💰 Amount: ${tx.amount} ${tx.type === 'withdraw' || tx.type === 'swap' ? '$' : 'FWC'}\n` +
        `📝 ${tx.description}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const tgId = BigInt(ctx.from?.id || 0);

    if (text === '❌ Cancel') {
      ctx.session.step = undefined;
      return ctx.reply('Action cancelled.', { reply_markup: mainMenu });
    }

    if (ctx.session.step === 'enter_wallet') {
      const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
      if (!user) return;

      const network = ctx.session.walletNetwork || 'TON';
      
      // Basic TON Address Validation (User-friendly format: 48 chars, starts with E or U)
      const tonRegex = /^[EU]Q[a-zA-Z0-9_-]{46}$/;
      const isTon = network === 'TON';
      
      if (isTon && !tonRegex.test(text)) {
        return ctx.reply('⚠️ *Invalid TON Address*\n\nPlease provide a valid TON wallet address (48 characters starting with EQ or UQ).', {
          parse_mode: 'Markdown',
          reply_markup: cancelMenu,
        });
      }
      
      await db.insert(wallets).values({
        userId: user.id,
        network,
        address: text,
      }).onConflictDoUpdate({
        target: [wallets.userId],
        set: { network, address: text }
      });

      ctx.session.step = undefined;
      await ctx.reply(`✅ Wallet setup successful!\n\nNetwork: ${network}\nAddress: \`${text}\``, {
        parse_mode: 'Markdown',
        reply_markup: mainMenu,
      });
    }

    if (ctx.session.step === 'withdraw_amount') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('⚠️ Please enter a valid positive number for the amount.');
      }

      const user = (await db.select().from(users).where(eq(users.tgId, tgId)))[0];
      if (!user) return;

      if (amount > user.balanceWithdrawable) {
        return ctx.reply(`⚠️ Insufficient withdrawable balance. Maximum you can withdraw is ${user.balanceWithdrawable}`);
      }

      const wallet = (await db.select().from(wallets).where(eq(wallets.userId, user.id)))[0];
      if (!wallet) return ctx.reply('Wallet not found.');

      await db.update(users)
        .set({ balanceWithdrawable: sql`${users.balanceWithdrawable} - ${amount}` })
        .where(eq(users.id, user.id));

      await db.insert(withdraws).values({
        userId: user.id,
        amount,
        walletId: wallet.id,
        network: wallet.network,
        status: 'pending',
      });

      ctx.session.step = undefined;
      await ctx.reply(`✅ Withdrawal request submitted successfully!\n\nAmount: ${amount}\nWallet: ${wallet.address}\n\nOur team will review and approve it shortly.`, {
        reply_markup: mainMenu,
      });
    }
  });
}

async function checkReferralReward(userId: number) {
  const user = (await db.select().from(users).where(eq(users.id, userId)))[0];
  if (!user || !user.referrerId || user.referralRewarded || !user.channelVerified) return;

  // Parallelize checking requirements
  const [requiredTasks, completedRequiredTasks, referral] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.status, 'active'), eq(tasks.required, true))),
    db.select()
      .from(userTasks)
      .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
      .where(and(
        eq(userTasks.userId, userId),
        eq(userTasks.status, 'verified'),
        eq(tasks.required, true)
      )),
    db.select().from(referrals).where(and(eq(referrals.referredId, userId), eq(referrals.rewarded, false))).then(res => res[0])
  ]);

  if (completedRequiredTasks.length >= requiredTasks.length && referral) {
    const rewardAmount = 10; // 10 FWC
    
    await db.transaction(async (tx) => {
      // Prevent duplicate rewards
      await tx.update(referrals).set({ rewarded: true }).where(eq(referrals.id, referral.id));
      await tx.update(users).set({ 
          referralRewarded: true,
          channelVerified: true 
      }).where(eq(users.id, userId));
      
      await tx.update(users)
        .set({
          balanceReward: sql`${users.balanceReward} + ${rewardAmount}`,
          balanceReferral: sql`${users.balanceReferral} + ${rewardAmount}`,
          referralCount: sql`${users.referralCount} + 1`,
        })
        .where(eq(users.id, user.referrerId as number));

      await tx.insert(transactions).values({
        userId: user.referrerId as number,
        amount: rewardAmount,
        type: 'referral',
        description: `Referral reward for ${user.fullName || user.username}`,
      });
    });

    // Notify referrer asynchronously (don't await for speed)
    db.select().from(users).where(eq(users.id, user.referrerId as number)).then(res => {
      const referrer = res[0];
      if (referrer && bot) {
        bot.api.sendMessage(Number(referrer.tgId), `🎉 *New Active Referral!*\n\nYour friend ${user.fullName || user.username} joined all required channels. You've been rewarded *${rewardAmount} FWC*!`, { parse_mode: 'Markdown' }).catch(() => {});
      }
    });
  }
}
