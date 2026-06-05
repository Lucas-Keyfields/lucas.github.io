const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf');

// ==========================================
// 1. CONFIGURATION KEYS (CONNECTED!)
// ==========================================
const BOT_TOKEN = '8838017546:AAH1N_ReEVXfkIFHKYEzf4i9pWdAXFzivdc';
const SUPABASE_URL = 'https://kxavdfwadbwnjqvbcfws.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXZkZndhZGJ3bmpxdmJjZndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3NTc2OCwiZXhwIjoyMDk1OTUxNzY4fQ.h6sIPSywpwa7WyOyO7XBuqFSbYlM2H3ITQQ4ufy3ntI';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("🤖 Notification bot server is running and watching for date requests...");

// ==========================================
// 2. LISTEN FOR NEW ENTRIES IN DATABASE
// ==========================================
supabase
    .channel('table-db-changes')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meetings' },
        async (payload) => {
            const newMeeting = payload.new;
            console.log("📅 New meeting detected in DB! Preparing notification...");

            const targetUsername = newMeeting.receiver_username.replace('@', '');
            const description = newMeeting.description;
            const dateTime = new Date(newMeeting.date_time).toLocaleString();
            const senderId = newMeeting.sender_id;

            try {
                // IMPORTANT NOTE: Since bots cannot DM users by @username directly without a prior chat history,
                // we send a clean confirmation fallback link inside your server logger console.
                // If you have the receiver's chat_id stored, replace `@${targetUsername}` with the variable.

                await bot.telegram.sendMessage(
                    `@${targetUsername}`,
                    `🔔 *You have a new Date Invitation!*\n\n` +
                    `📝 *Why:* "${description}"\n` +
                    `⏳ *When:* ${dateTime}\n\n` +
                    `Open the app layout via your bot to view the location details!`,
                    { parse_mode: 'Markdown' }
                );
                console.log(`✅ Notification successfully sent to @${targetUsername}`);
            } catch (err) {
                console.error(`⚠️ Could not send direct message to @${targetUsername} automatically.`);
                console.error(`💡 Reason: Telegram bots cannot message usernames directly due to privacy laws unless the user clicks /start first.`);
                console.error(`👉 Data row is safely saved in Supabase! Sender: ${senderId}, Target: @${targetUsername}`);
            }
        }
    )
    .subscribe();

// ==========================================
// 3. HANDLER FOR NEW USERS TYPE /START
// ==========================================
bot.start((ctx) => {
    ctx.reply('Welcome to the Date Me App! Click the button below to schedule your event on Google Maps.', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🗓️ Create Meeting Invite",
                        web_app: { url: "https://lucas-keyfields.github.io/lucas.github.io/" }
                    }
                ]
            ]
        }
    });
});

// Keep engine alive and handle errors gracefully
bot.launch().then(() => {
    console.log("🚀 Telegram Bot engine successfully launched!");
}).catch((err) => {
    console.error("❌ Failed to launch Telegram Bot engine:", err);
});

// Enable graceful stop conditions
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
