const http = require('http');

// 💡 FIX: This reads Render's hidden environment port and exposes it to the public internet ('0.0.0.0')
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Engine is Awake and Running Perfectly!\n');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Render health-check port successfully activated on port ${PORT}`);
});

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

// 💡 Memory object to map active Telegram @usernames to their numeric Chat IDs
const userCache = {};

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

            const targetUsername = newMeeting.receiver_username.replace('@', '').trim().toLowerCase();
            const description = newMeeting.description;
            const dateTime = new Date(newMeeting.date_time).toLocaleString();
            const senderId = newMeeting.sender_id; // Your numeric Telegram ID string (e.g., "5302699060")

            // 🎯 DECIDE WHERE TO SEND THE MESSAGE:
            let targetChatId = null;

            // Look up the cached username first
            if (userCache[targetUsername]) {
                targetChatId = userCache[targetUsername];
            } 
            // 💡 SELF-TEST FALLBACK: If you send an invite to yourself, route it right back to your sender_id number!
            else if (targetUsername === "soewaiyanoo") {
                targetChatId = senderId;
            }

            if (!targetChatId) {
                console.error(`⚠️ Could not send direct message to @${targetUsername} automatically.`);
                console.error(`💡 Reason: The bot hasn't recorded a numeric Chat ID for this user yet. They need to send /start to the bot first.`);
                console.error(`👉 Data row is safely saved in Supabase! Sender: ${senderId}, Target: @${targetUsername}`);
                return;
            }

            try {
                // 🚀 DELIVER VIA NUMERIC CHAT ID with an embedded Web App button!
                await bot.telegram.sendMessage(
                    targetChatId,
                    `🔔 *You have a new Date Invitation!*\n\n` +
                    `📝 *Why:* "${description}"\n` +
                    `⏳ *When:* ${dateTime}\n\n` +
                    `👉 Tap the button below to open the map layout and view the location details!`,
                    { 
                        parse_mode: 'Markdown',
                        // 💡 ADDED: This embeds a custom interactive button underneath the text notification
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "🗺️ View Meeting Location Map",
                                        web_app: { url: "https://lucas-keyfields.github.io/lucas.github.io/" }
                                    }
                                ]
                            ]
                        }
                    }
                );
                console.log(`✅ Notification with Map link successfully delivered to Chat ID: ${targetChatId} (@${targetUsername})`);
            } catch (err) {
                console.error(`❌ Telegram API delivery failed for Chat ID ${targetChatId}:`, err.message);
            }
        }
    )
    .subscribe();

// ==========================================
// 3. HANDLER FOR NEW USERS TYPE /START
// ==========================================
bot.start((ctx) => {
    const chatId = ctx.chat.id;
    const username = ctx.from.username;

    // Save their details into the system memory cache when they hit start
    if (username) {
        const cleanUsername = username.trim().toLowerCase();
        userCache[cleanUsername] = chatId;
        console.log(`💾 Map Cached: @${username} ➔ ${chatId}`);
    }

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
