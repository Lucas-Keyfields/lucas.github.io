const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('8838017546:AAH1N_ReEVXfkIFHKYEzf4i9pWdAXFzivdc');

// 1. Initialize your Bot and your Supabase connection
const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // From @BotFather
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YXZkZndhZGJ3bmpxdmJjZndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM3NTc2OCwiZXhwIjoyMDk1OTUxNzY4fQ.h6sIPSywpwa7WyOyO7XBuqFSbYlM2H3ITQQ4ufy3ntI'; // Found in Settings -> API (Scroll down to Service Role)

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("🤖 Notification bot server is running and watching for date requests...");

// 2. Start Listening to Changes in the Supabase Database
supabase
    .channel('table-db-changes')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meetings' },
        async (payload) => {
            const newMeeting = payload.new;
            console.log("📅 New meeting detected in DB! Preparing notification...");

            // Extract meeting details safely
            const targetUsername = newMeeting.receiver_username.replace('@', ''); // Clean the @ symbol
            const description = newMeeting.description;
            const dateTime = new Date(newMeeting.date_time).toLocaleString();

            try {
                // Send the alert message directly to User B via Telegram!
                // Note: User B must have interacted with your bot at least once for this to work.
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
                console.error("❌ Failed to send Telegram message. Make sure the user has started the bot:", err.message);
            }
        }
    )
    .subscribe();

// Keep the server alive
bot.launch();
