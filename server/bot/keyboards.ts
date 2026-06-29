import { Keyboard, InlineKeyboard } from 'grammy';

export const mainMenu = new Keyboard()
  .text('👥 Invite Friends').text('📋 Tasks').row()
  .text('💰 Balance').text('🎁 Daily Bonus').row()
  .text('🔄 Swap FWC').text('💸 Withdraw').row()
  .text('👛 Setup Wallet').text('📜 History')
  .resized();

export const inviteMenu = new InlineKeyboard()
  .text('🔗 Copy Referral Link', 'copy_link')
  .row()
  .text('📊 Referral Stats', 'ref_stats');

export const cancelMenu = new Keyboard().text('❌ Cancel').resized();
