const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf'); // 💡 FIXED: Kept package name string here

// ==========================================
// 1. CONFIGURATION KEYS (CONNECTED!)
// ==========================================
const BOT_TOKEN = '8838017546:AAH1N_ReEVXfkIFHKYEzf4i9pWdAXFzivdc'; // 💡 FIXED: Moved your token here
const SUPABASE_URL = 'https://kxavdfwadbwnjqvbcfws.supabase.co';      // 💡 FIXED: Linked your real DB URL
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

            try {
                // Send DM alert to User B
                await bot.telegram.sendMessage(
                    `@${targetUsername}`,
                    `🔔 *You have a new Date Invitation!*\n\n` +
                    `📝 *Why:* "${description}"\n` +
                    `⏳ *When:* ${dateTime}\n\n` +
                    `Open the app menu to view the exact location on Google Maps and accept!`,
                    { parse_mode: 'Markdown' }
                );
                console.log(`✅ Notification successfully sent to @${targetUsername}`);
            } catch (err) {
                console.error("❌ Failed to send Telegram message:", err.message);
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
                        // ⚠️ Remember to change 'your-username' to your exact GitHub user handle!
                        web_app: { url: "https://lucas-keyfields.github.io/lucas.github.io/" }
                    }
                ]
            ]
        }
    });
});

// Keep engine alive
bot.launch();
