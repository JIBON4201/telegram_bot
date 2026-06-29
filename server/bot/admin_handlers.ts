import { bot, type MyContext, BOT_START_TIME } from './index.ts';
import { db } from '../../src/db/index.ts';
import { users, referrals, tasks, userTasks, transactions, settings, bonusHistory, wallets, withdraws, deposits, channels, achievements, userAchievements, admins, adminLogs } from '../../src/db/schema.ts';
import { eq, and, sql, desc, count, sum, or, gte, lte } from 'drizzle-orm';
import { InlineKeyboard } from 'grammy';

const ADMIN_IDS = [584404609395]; // Hardcoded Super Admins

function getUptime() {
    const diff = Date.now() - BOT_START_TIME.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    return `${days}d ${hours}h ${mins}m`;
}

async function isAdmin(tgId: bigint) {
  if (ADMIN_IDS.includes(Number(tgId))) return true;
  const admin = (await db.select().from(admins).where(eq(admins.tgId, tgId)))[0];
  return !!admin;
}

async function logAction(ctx: MyContext, action: string, details?: string) {
    const tgId = BigInt(ctx.from?.id || 0);
    const admin = (await db.select().from(admins).where(eq(admins.tgId, tgId)))[0];
    if (admin) {
        await db.insert(adminLogs).values({
            adminId: admin.id,
            action,
            details: details || null,
        });
    }
}

// Helper for Dashboard Stats
async function getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [
        totalUsers,
        todayUsers,
        activeToday,
        totalRefs,
        totalTasks,
        totalChannels,
        totalPaid,
        pendingWithdraws,
        approvedWithdraws,
        pendingDeposits
    ] = await Promise.all([
        db.select({ count: count() }).from(users).then(res => res[0].count),
        db.select({ count: count() }).from(users).where(gte(users.joinDate, today)).then(res => res[0].count),
        db.select({ count: count() }).from(users).where(gte(users.lastVerifyTime, today)).then(res => res[0].count),
        db.select({ count: count() }).from(referrals).then(res => res[0].count),
        db.select({ count: count() }).from(tasks).then(res => res[0].count),
        db.select({ count: count() }).from(channels).then(res => res[0].count),
        db.select({ total: sum(withdraws.amount) }).from(withdraws).where(eq(withdraws.status, 'completed')).then(res => Number(res[0].total || 0)),
        db.select({ count: count() }).from(withdraws).where(eq(withdraws.status, 'pending')).then(res => res[0].count),
        db.select({ count: count() }).from(withdraws).where(eq(withdraws.status, 'completed')).then(res => res[0].count),
        db.select({ count: count() }).from(deposits).where(eq(deposits.status, 'pending')).then(res => res[0].count)
    ]);

    return {
        totalUsers, todayUsers, activeToday, totalRefs, totalTasks, 
        totalChannels, totalPaid, pendingWithdraws, approvedWithdraws, pendingDeposits
    };
}

if (bot) {
    // Admin Dashboard Entry
    bot.command('admin', async (ctx) => {
        const tgId = BigInt(ctx.from?.id || 0);
        if (!(await isAdmin(tgId))) return;

        const stats = await getDashboardStats();
        
        let msg = `📊 *ADMIN DASHBOARD*\n\n`;
        msg += `👥 Total Users: ${stats.totalUsers}\n`;
        msg += `🆕 New Today: ${stats.todayUsers}\n`;
        msg += `🟢 Active Today: ${stats.activeToday}\n`;
        msg += `👥 Total Refs: ${stats.totalRefs}\n`;
        msg += `📋 Total Tasks: ${stats.totalTasks}\n`;
        msg += `📢 Required Ch: ${stats.totalChannels}\n`;
        msg += `💰 Total Paid: $${stats.totalPaid.toFixed(2)}\n`;
        msg += `💸 Pending WDR: ${stats.pendingWithdraws}\n`;
        msg += `✅ Approved WDR: ${stats.approvedWithdraws}\n`;
        msg += `💵 Pending DEP: ${stats.pendingDeposits}\n`;
        msg += `📈 Bot Uptime: ${getUptime()}\n\n`;
        msg += `Select a management section below:`;

        const menu = new InlineKeyboard()
            .text('📢 Channels', 'adm_channels').text('📋 Tasks', 'adm_tasks').row()
            .text('👥 Users', 'adm_users').text('💰 Rewards', 'adm_rewards').row()
            .text('💸 Withdraws', 'adm_withdraws').text('💵 Deposits', 'adm_deposits').row()
            .text('📢 Broadcast', 'adm_broadcast').text('📊 Statistics', 'adm_stats').row()
            .text('⚙️ Settings', 'adm_settings').text('🔐 Admins', 'adm_manage_admins').row()
            .text('📁 Export', 'adm_export').text('📝 Logs', 'adm_logs').row()
            .text('🔄 Refresh', 'adm_dashboard_refresh').text('❌ Close', 'adm_close');

        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: menu });
    });

    // Callback Handlers for Admin Sections
    bot.on('callback_query:data', async (ctx) => {
        const data = ctx.callbackQuery.data;
        const tgId = BigInt(ctx.from?.id || 0);
        if (!(await isAdmin(tgId))) return ctx.answerCallbackQuery('⛔ Access Denied.');

        // Dashboard Refresh
        if (data === 'adm_dashboard_refresh') {
            const stats = await getDashboardStats();
            let msg = `📊 *ADMIN DASHBOARD*\n\n`;
            msg += `👥 Total Users: ${stats.totalUsers}\n`;
            msg += `🆕 New Today: ${stats.todayUsers}\n`;
            msg += `🟢 Active Today: ${stats.activeToday}\n`;
            msg += `👥 Total Refs: ${stats.totalRefs}\n`;
            msg += `📋 Total Tasks: ${stats.totalTasks}\n`;
            msg += `📢 Required Ch: ${stats.totalChannels}\n`;
            msg += `💰 Total Paid: $${stats.totalPaid.toFixed(2)}\n`;
            msg += `💸 Pending WDR: ${stats.pendingWithdraws}\n`;
            msg += `✅ Approved WDR: ${stats.approvedWithdraws}\n`;
            msg += `💵 Pending DEP: ${stats.pendingDeposits}\n`;
            msg += `📈 Bot Uptime: ${getUptime()}\n\n`;
            msg += `Select a management section below:`;

            const menu = new InlineKeyboard()
                .text('📢 Channels', 'adm_channels').text('📋 Tasks', 'adm_tasks').row()
                .text('👥 Users', 'adm_users').text('💰 Rewards', 'adm_rewards').row()
                .text('💸 Withdraws', 'adm_withdraws').text('💵 Deposits', 'adm_deposits').row()
                .text('📢 Broadcast', 'adm_broadcast').text('📊 Statistics', 'adm_stats').row()
                .text('⚙️ Settings', 'adm_settings').text('🔐 Admins', 'adm_manage_admins').row()
                .text('📁 Export', 'adm_export').text('📝 Logs', 'adm_logs').row()
                .text('🔄 Refresh', 'adm_dashboard_refresh').text('❌ Close', 'adm_close');

            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: menu }).catch(() => {});
            return ctx.answerCallbackQuery('Dashboard Refreshed');
        }

        if (data === 'adm_close') {
            await ctx.deleteMessage();
            return ctx.answerCallbackQuery();
        }

        // --- Channels Section ---
        if (data === 'adm_channels') {
            const allChannels = await db.select().from(channels).orderBy(channels.sortOrder);
            let msg = `📢 *CHANNEL MANAGEMENT*\n\n`;
            const kb = new InlineKeyboard();
            for (const ch of allChannels) {
                msg += `${ch.status === 'active' ? '✅' : '❌'} *${ch.title}* (${ch.channelId})\n`;
                kb.text(`${ch.status === 'active' ? 'Disable' : 'Enable'} ${ch.title.substring(0, 10)}`, `adm_ch_toggle_${ch.id}`).row();
            }
            kb.text('➕ Add Channel', 'admin_add_channel').row();
            kb.text('🏠 Home', 'adm_dashboard_refresh').text('❌ Close', 'adm_close');
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }

        if (data.startsWith('adm_ch_toggle_')) {
            const id = parseInt(data.replace('adm_ch_toggle_', ''));
            const ch = (await db.select().from(channels).where(eq(channels.id, id)))[0];
            if (ch) {
                const newStatus = ch.status === 'active' ? 'inactive' : 'active';
                await db.update(channels).set({ status: newStatus }).where(eq(channels.id, id));
                await logAction(ctx, 'Toggle Channel', `ID: ${id}, Status: ${newStatus}`);
                await ctx.answerCallbackQuery(`Channel ${newStatus}`);
                return bot.api.editMessageReplyMarkup(ctx.chat!.id, ctx.callbackQuery.message!.message_id, {
                    reply_markup: await (async () => {
                        const all = await db.select().from(channels).orderBy(channels.sortOrder);
                        const kb = new InlineKeyboard();
                        for (const c of all) kb.text(`${c.status === 'active' ? 'Disable' : 'Enable'} ${c.title.substring(0, 10)}`, `adm_ch_toggle_${c.id}`).row();
                        kb.text('➕ Add Channel', 'admin_add_channel').row();
                        kb.text('🏠 Home', 'adm_dashboard_refresh').text('❌ Close', 'adm_close');
                        return kb;
                    })()
                });
            }
        }

        // --- Withdraws Section ---
        if (data === 'adm_withdraws') {
            const pending = await db.select().from(withdraws).where(eq(withdraws.status, 'pending')).orderBy(desc(withdraws.createdAt)).limit(10);
            let msg = `💸 *PENDING WITHDRAWALS*\n\n`;
            if (pending.length === 0) msg += "_No pending withdrawals._";
            const kb = new InlineKeyboard();
            for (const w of pending) {
                msg += `👤 User: ${w.userId} | Amount: $${w.amount}\n`;
                kb.text(`Approve $${w.amount}`, `adm_wdr_approve_${w.id}`).text(`Reject`, `adm_wdr_reject_${w.id}`).row();
            }
            kb.text('🏠 Home', 'adm_dashboard_refresh');
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }

        if (data.startsWith('adm_wdr_approve_')) {
            const id = parseInt(data.replace('adm_wdr_approve_', ''));
            const wdr = (await db.select().from(withdraws).where(eq(withdraws.id, id)))[0];
            if (wdr && wdr.status === 'pending') {
                await db.update(withdraws).set({ status: 'completed' }).where(eq(withdraws.id, id));
                await logAction(ctx, 'Approve Withdrawal', `ID: ${id}, User: ${wdr.userId}, Amt: ${wdr.amount}`);
                await ctx.answerCallbackQuery('✅ Withdrawal Approved');
                // Notify user
                const user = (await db.select().from(users).where(eq(users.id, wdr.userId)))[0];
                if (user) bot.api.sendMessage(Number(user.tgId), `✅ *Withdrawal Approved!*\n\nYour withdrawal request for *$${wdr.amount} Ton* has been processed and sent to your wallet.`, { parse_mode: 'Markdown' }).catch(() => {});
                return ctx.editMessageText('✅ Approved. Refreshing...', { reply_markup: new InlineKeyboard().text('🔄 Refresh', 'adm_withdraws') });
            }
        }

        // --- Broadcast Section ---
        if (data === 'adm_broadcast') {
            await ctx.answerCallbackQuery();
            await ctx.reply("📢 *BROADCAST MESSAGE*\n\nPlease send the message you want to broadcast to ALL users. You can include buttons and Markdown formatting.", {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard().text('❌ Cancel', 'adm_dashboard_refresh')
            });
            // Setting step for text handler
            (ctx.session as any).step = 'adm_broadcast_msg';
            return;
        }
        
        // Settings Section
        if (data === 'adm_settings') {
             const kb = new InlineKeyboard()
                .text('Maintenance: OFF', 'set_maintenance').row()
                .text('Min Withdraw: 0.1$', 'set_min_wdr').row()
                .text('🏠 Home', 'adm_dashboard_refresh');
             await ctx.editMessageText('⚙️ *BOT SETTINGS*', { parse_mode: 'Markdown', reply_markup: kb });
             return ctx.answerCallbackQuery();
        }

        // --- User Management Section ---
        if (data === 'adm_users') {
            const kb = new InlineKeyboard()
                .text('🔍 Search User', 'adm_user_search').row()
                .text('🚫 Banned Users', 'adm_user_banned').row()
                .text('🏠 Home', 'adm_dashboard_refresh');
            await ctx.editMessageText('👥 *USER MANAGEMENT*', { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }

        if (data === 'adm_user_search') {
            (ctx.session as any).step = 'adm_user_search_id';
            await ctx.answerCallbackQuery();
            return ctx.reply('🔍 Please send the Telegram ID or Username of the user you want to search:', {
                reply_markup: new InlineKeyboard().text('❌ Cancel', 'adm_users')
            });
        }

        if (data.startsWith('adm_usr_ban_')) {
            const id = parseInt(data.replace('adm_usr_ban_', ''));
            await db.update(users).set({ isBanned: true }).where(eq(users.id, id));
            await logAction(ctx, 'Ban User', `ID: ${id}`);
            await ctx.answerCallbackQuery('🚫 User Banned');
            return ctx.editMessageText('🚫 User has been banned.', { reply_markup: new InlineKeyboard().text('🔙 Back', 'adm_users') });
        }

        if (data.startsWith('adm_usr_unban_')) {
            const id = parseInt(data.replace('adm_usr_unban_', ''));
            await db.update(users).set({ isBanned: false }).where(eq(users.id, id));
            await logAction(ctx, 'Unban User', `ID: ${id}`);
            await ctx.answerCallbackQuery('✅ User Unbanned');
            return ctx.editMessageText('✅ User has been unbanned.', { reply_markup: new InlineKeyboard().text('🔙 Back', 'adm_users') });
        }

        // --- Statistics Section ---
        if (data === 'adm_stats') {
            const stats = await getDashboardStats();
            let msg = `📊 *DETAILED STATISTICS*\n\n`;
            msg += `📅 *Today:* +${stats.todayUsers} New Users\n`;
            msg += `👥 *Total:* ${stats.totalUsers} Users\n`;
            msg += `💸 *Withdrawals:* $${stats.totalPaid.toFixed(2)} Paid\n`;
            msg += `📋 *Tasks:* ${stats.totalTasks} Active\n`;
            
            const kb = new InlineKeyboard()
                .text('📈 Growth Chart', 'adm_stats_growth').row()
                .text('🏠 Home', 'adm_dashboard_refresh');
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }

        // --- Export Section ---
        if (data === 'adm_export') {
            const kb = new InlineKeyboard()
                .text('📄 Export Users (CSV)', 'adm_export_users').row()
                .text('📄 Export Withdraws (CSV)', 'adm_export_withdraws').row()
                .text('🏠 Home', 'adm_dashboard_refresh');
            await ctx.editMessageText('📁 *DATA EXPORT*\n\nGenerate CSV files for your data.', { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }

        if (data === 'adm_export_users') {
            await ctx.answerCallbackQuery('Generating CSV...');
            const allUsers = await db.select().from(users);
            let csv = 'ID,Telegram ID,Username,Full Name,Join Date,Balance,TON Balance,Referrals,Banned\n';
            for (const u of allUsers) {
                csv += `${u.id},${u.tgId},${u.username || ''},"${u.fullName || ''}",${u.joinDate.toISOString()},${u.balanceReward},${u.balanceWithdrawable},${u.referralCount},${u.isBanned}\n`;
            }
            const buffer = Buffer.from(csv, 'utf-8');
            // @ts-ignore
            await ctx.replyWithDocument({ source: buffer, filename: 'users_export.csv' });
            return;
        }

        // --- Admins Section ---
        if (data === 'adm_manage_admins') {
            const currentAdmins = await db.select().from(admins);
            let msg = `🔐 *ADMIN MANAGEMENT*\n\n`;
            const kb = new InlineKeyboard();
            for (const a of currentAdmins) {
                msg += `👤 @${a.username || 'N/A'} (ID: \`${a.tgId}\`) - Role: *${a.role}*\n`;
            }
            kb.text('➕ Add Admin', 'adm_admin_add').row();
            kb.text('🏠 Home', 'adm_dashboard_refresh');
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }

        // --- Logs Section ---
        if (data === 'adm_logs') {
            const logs = await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(15);
            let msg = `📝 *RECENT ADMIN LOGS*\n\n`;
            if (logs.length === 0) msg += "_No logs found._";
            for (const l of logs) {
                const date = l.createdAt.toLocaleTimeString();
                msg += `• [${date}] *${l.action}*: ${l.details || ''}\n`;
            }
            const kb = new InlineKeyboard().text('🔄 Refresh', 'adm_logs').text('🏠 Home', 'adm_dashboard_refresh');
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb });
            return ctx.answerCallbackQuery();
        }
    });

    // Handle Text for Admin Steps
    bot.on('message:text', async (ctx) => {
        const tgId = BigInt(ctx.from?.id || 0);
        if (!(await isAdmin(tgId))) return;

        const session = ctx.session as any;
        
        if (session.step === 'adm_user_search_id') {
            const query = ctx.message.text;
            session.step = undefined;
            
            const user = (await db.select().from(users).where(
                or(
                    eq(users.username, query.replace('@', '')),
                    sql`CAST(${users.tgId} AS TEXT) = ${query}`
                )
            ))[0];

            if (!user) return ctx.reply('❌ User not found.');

            let msg = `👤 *USER PROFILE*\n\n`;
            msg += `ID: \`${user.id}\`\n`;
            msg += `TG ID: \`${user.tgId}\`\n`;
            msg += `Name: ${user.fullName || 'N/A'}\n`;
            msg += `Username: @${user.username || 'N/A'}\n`;
            msg += `Balance: ${user.balanceReward} FWC\n`;
            msg += `TON Balance: $${user.balanceWithdrawable.toFixed(4)}\n`;
            msg += `Referrals: ${user.referralCount}\n`;
            msg += `Status: ${user.isBanned ? '🚫 Banned' : '✅ Active'}\n`;

            const kb = new InlineKeyboard();
            if (user.isBanned) {
                kb.text('✅ Unban', `adm_usr_unban_${user.id}`);
            } else {
                kb.text('🚫 Ban', `adm_usr_ban_${user.id}`);
            }
            kb.text('💰 Reset Bal', `adm_usr_reset_${user.id}`).row();
            kb.text('🏠 Home', 'adm_dashboard_refresh');

            return ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
        }
        if (session.step === 'adm_broadcast_msg') {
            const msg = ctx.message.text;
            session.step = undefined;
            const allUsers = await db.select().from(users);
            await ctx.reply(`🚀 *Broadcast Started*\n\nSending message to ${allUsers.length} users...`, { parse_mode: 'Markdown' });
            
            // Non-blocking broadcast
            (async () => {
                let success = 0;
                let failed = 0;
                for (const u of allUsers) {
                    try {
                        await bot.api.sendMessage(Number(u.tgId), msg, { parse_mode: 'Markdown' });
                        success++;
                    } catch (e) {
                        failed++;
                    }
                    if ((success + failed) % 50 === 0) await new Promise(r => setTimeout(r, 1000));
                }
                await ctx.reply(`✅ *Broadcast Completed*\n\nSuccess: ${success}\nFailed: ${failed}`, { parse_mode: 'Markdown' });
                await logAction(ctx, 'Broadcast', `Success: ${success}, Failed: ${failed}`);
            })();
        }
    });
}
