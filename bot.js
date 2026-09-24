require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const runModules = require('./modules.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

// Master memory database states outside of file storage constraints
let currentPrefix = '!';

client.once('ready', () => { console.log('🚀 3C_GPT Private Master Orchestrator is online, safe, and stable!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment/Embed File]', author: m.author, timestamp: Date.now() });
    if (snipes.get(m.channel.id).length > 20) snipes.get(m.channel.id).pop();
});

// Dynamic Tickety-Style Category Routing Interaction Loop
client.on('interactionCreate', async (i) => {
    if (!i.isButton() || !i.customId.startsWith('ticket_')) return;
    await i.deferReply({ ephemeral: true });

    const ticketCategoryType = i.customId.split('_')[1]; // Extracts 'clanwar', 'partnership', 'general', etc.
    const roomName = ticketCategoryType + '-' + i.user.username.toLowerCase();

    const existingRoom = i.guild.channels.cache.find(c => c.name === roomName);
    if (existingRoom) return i.editReply('⚠️ You already have an active help desk support line operating open right here: ' + existingRoom.toString());

    const ch = await i.guild.channels.create({
        name: roomName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });

    const ticketHeaderEmbed = new EmbedBuilder()
        .setTitle('🎫 ' + ticketCategoryType.toUpperCase() + ' Support Desks File Opened')
        .setDescription('Greetings ' + i.user.toString() + ',\nOur specialized ' + ticketCategoryType + ' management staff team has been alerted.\n\nType `' + currentPrefix + 'close\` inside this room to terminate and delete this help desk session.')
        .setColor('#5865F2').setTimestamp();

    await ch.send({ content: i.user.toString() + ' • Staff Room Notifications Locked', embeds: [ticketHeaderEmbed] });
    
    const logCh = i.guild.channels.cache.find(c => c.name === 'mod-logs');
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Help Ticket Created File').setDescription('**User:** ' + i.user.tag + '\n**Department Category:** `' + ticketCategoryType.toUpperCase() + '`\n**Channel:** ' + ch.toString()).setColor('#57F287').setTimestamp()] });

    return i.editReply('✅ Your custom private ' + ticketCategoryType + ' room has been unlocked over here: ' + ch.toString());
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(msg.content) || bannedWords.some(w => msg.content.toLowerCase().includes(w))) && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await msg.delete(); } catch {}
        if (!warnings[msg.author.id]) warnings[msg.author.id] = []; warnings[msg.author.id].push({ reason: 'AutoMod', mod: 'AutoMod', time: Date.now() });
        const am = new EmbedBuilder().setTitle('🚫 AutoMod Violation').setDescription('**Member Account:** ' + msg.author.toString() + '\n**Infraction Strikes:** ' + warnings[msg.author.id].length + '/3 Warnings').setColor('#ED4245');
        msg.channel.send({ embeds: [am] }); return sendLog(am);
    }

    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        msg.reply('👋 Welcome back ' + msg.author.toString() + ', your away status was cleared. Marked away for: **' + ms(Date.now() - d.time, { long: true }) + '**.\n📝 **AFK Note:** *' + d.reason + '*');
    }
    if (msg.mentions.users.size > 0) {
        msg.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is currently AFK away: *' + afkProfile.get(u.id).reason + '*'); });
    }

    // Dynamic Prefix Matrix Checker
    if (!msg.content.startsWith(currentPrefix)) return;
    const args = msg.content.slice(currentPrefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim();

    // Custom Triggers Configuration Variable Override Callback
    if (cmd === 'prefix') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Administrator security path clearance required.");
        const symbolInput = args[0]; if (!symbolInput || symbolInput.length > 3) return msg.reply("⚠️ Specify a valid symbol prefix matrix (1-3 characters maximum, e.g. `!`, `?`, `3c`).");
        currentPrefix = symbolInput;
        const preEmbed = new EmbedBuilder().setTitle('⚙️ Prefix Configuration Altered').setDescription('System trigger mapping changed successfully.\n\nAll commands must now use prefix: `' + currentPrefix + '`').setColor('#57F287').setTimestamp();
        msg.channel.send({ embeds: [preEmbed] }); return sendLog(preEmbed);
    }

    runModules(msg, cmd, args, target, reason, warnings, afkProfile, snipes, bannedWords, sendLog, currentPrefix);
});

client.login(process.env.DISCORD_TOKEN);
