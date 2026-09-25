require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans
    ] 
});

const warnings = {}; const afkProfile = new Map(); 
const snipes = new Map(); const editSnipes = new Map();
const bannedWords = ['badword1', 'badword2'];
let currentPrefix = '!';

client.once('ready', () => { console.log('🚀 3C_GPT Private Master Suite is online, fully audited, and stable!'); });

// ==========================================
// 🎯 CACHE RECOVERY MEMORY ENGINES (SNIPES)
// ==========================================
client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    snipes.set(m.channel.id, { content: m.content || '[File/Embed Attachment]', author: m.author, timestamp: Date.now() });
});

client.on('messageUpdate', (oldM, newM) => {
    if (!oldM.guild || oldM.author?.bot || oldM.content === newM.content) return;
    editSnipes.set(oldM.channel.id, { oldContent: oldM.content || '[File/Embed]', newContent: newM.content || '[File/Embed]', author: oldM.author, timestamp: Date.now() });
});

// ==========================================
// 🎫 DYNAMIC DEPARTMENT CATEGORY BUTTON ROUTER
// ==========================================
client.on('interactionCreate', async (i) => {
    if (!i.isButton() || !i.customId.startsWith('ticket_')) return;
    await i.deferReply({ ephemeral: true });

    const ticketDepartmentType = i.customId.split('_')[1]; // Extracts category label cleanly
    const roomName = 'ticket-' + ticketDepartmentType + '-' + i.user.username.toLowerCase();

    const existingRoom = i.guild.channels.cache.find(c => c.name === roomName);
    if (existingRoom) return i.editReply('⚠️ You already have an active help desk room operating here: ' + existingRoom.toString());

    const ch = await i.guild.channels.create({
        name: roomName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });

    const ticketHeaderEmbed = new EmbedBuilder()
        .setTitle('🎫 ' + ticketDepartmentType.toUpperCase() + ' Support Channel Opened')
        .setDescription('Welcome ' + i.user.toString() + ',\nOur specialized ' + ticketDepartmentType + ' staff agents have been notified.\n\nType `' + currentPrefix + 'closeticket\` or `' + currentPrefix + 'ct\` to close this support room.')
        .setColor('#5865F2').setTimestamp();

    await ch.send({ content: i.user.toString() + ' • Staff Pings Active', embeds: [ticketHeaderEmbed] });
    
    const logCh = i.guild.channels.cache.find(c => c.name === 'mod-logs');
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Help Ticket Spawned Log').setDescription('**Account Owner:** ' + i.user.tag + '\n**Department Category:** `' + ticketDepartmentType.toUpperCase() + '`\n**Channel link:** ' + ch.toString()).setColor('#57F287').setTimestamp()] });

    return i.editReply('✅ Your private assistance path channel has been opened: ' + ch.toString());
});

// ==========================================
// ⚙️ COMMAND ENGINE DISPATCH CORE
// ==========================================
client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    // AutoMod Security Layer
    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(msg.content) || bannedWords.some(w => msg.content.toLowerCase().includes(w))) && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await msg.delete(); } catch {}
        if (!warnings[msg.author.id]) warnings[msg.author.id] = []; warnings[msg.author.id].push({ reason: 'AutoMod Flag', mod: 'AutoMod', time: Date.now() });
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🚫 AutoMod Triggered').setDescription('**User Profile:** ' + msg.author.toString() + '\n**Active Strikes:** ' + warnings[msg.author.id].length + ' Infractions').setColor('#ED4245')] });
    }

    // AFK Wake Up Loop Logic
    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        const afkReasonText = d.reason ? '\n📝 **AFK Note:** *' + d.reason + '*' : '';
        msg.reply('👋 Welcome back ' + msg.author.toString() + ', your away status was cleared. You were away for: **' + ms(Date.now() - d.time, { long: true }) + '**.' + afkReasonText);
    }
    if (msg.mentions.users.size > 0) {
        msg.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is currently away (AFK): *' + afkProfile.get(u.id).reason + '*'); });
    }

    if (!msg.content.startsWith(currentPrefix)) return;
    const args = msg.content.slice(currentPrefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim();

    // Helper: Dynamic Private Branded Card Builder Mapping Engine
    const sendInfractionCard = async (tUser, titleLabel, fieldReason, borderHex) => {
        const guildIcon = msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com';
        const card = new EmbedBuilder()
            .setTitle(titleLabel)
            .setDescription('You have been ' + titleLabel.toLowerCase() + ' in\n**' + msg.guild.name + '**')
            .setColor(borderHex).setThumbnail(guildIcon)
            .addFields({ name: 'Moderator', value: msg.author.username, inline: false });
        if (fieldReason) card.addFields({ name: 'Reason', value: fieldReason, inline: false });
        card.setFooter({ text: 'Contact a staff member to discuss this administrative action entry file.' }).setTimestamp();
        await tUser.send({ embeds: [card] }).catch(() => null);
    };

    // ==========================================
    // 📊 CORE COMMAND OPERATIONS MODULE
    // ==========================================
    if (cmd === 'prefix') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Administrator clearance required.");
        const symbolInput = args[0]; if (!symbolInput || symbolInput.length > 3) return msg.reply("⚠️ Specify a valid symbol path (1-3 characters maximum).");
        currentPrefix = symbolInput;
        const pre = new EmbedBuilder().setTitle('⚙️ System Prefix Altered').setDescription('All commands must now use trigger syntax: `' + currentPrefix + '`').setColor('#57F287').setTimestamp();
        msg.channel.send({ embeds: [pre] }); return sendLog(pre);
    }

    if (cmd === 'commands' || cmd === 'help') {
        const sub = args[0]?.toLowerCase();
        if (sub && cmdHelp[sub]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Manual File: ' + currentPrefix + sub).setDescription(cmdHelp[sub]).setColor('#5865F2')] });
        const m = ['warn','unwarn','mute','unmute','kick','ban','unban','purge','pus','slowmode','nick','clearnick','r','cs','ces'].map(c => '`' + currentPrefix + c + '`').join(', ');
        const u = ['help','commands','afk','say','ticket','closeticket','serverinfo','snipe','es','prefix'].map(c => '`' + currentPrefix + c + '`').join(', ');
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Core System Manual').setDescription('Type `' + currentPrefix + 'help [command]` for analytics.\n\n📊 **Administrative Routines:**\n' + m + '\n\n⚙️ **General Utilities:**\n' + u).setColor('#5865F2')] });
    }

    if (cmd === 'ticket') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return; msg.delete().catch(() => null);
        const parts = args.join(' ').split('|'); const cat = parts[0] ? parts[0].trim().toLowerCase() : null;
        if (!cat) return msg.channel.send("⚠️ Usage: `" + currentPrefix + "ticket category_name | #hex_color | Title | Description text lines`");
        const embed = new EmbedBuilder().setTitle(parts[2] ? parts[2].trim() : 'Support Panel').setDescription(parts[3] ? parts[3].trim() : 'Click the button layout below to open a ticket room.').setColor(parts[1] && parts[1].trim().startsWith('#') ? parts[1].trim() : '#5865F2');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_' + cat).setLabel('Open Ticket 🎫').setStyle(ButtonStyle.Secondary));
        return msg.channel.send({ embeds: [embed], components: [row] });
    }

    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const txt = args.join(' ').trim(); if (!txt) return; await msg.delete().catch(() => null); return msg.channel.send(txt);
    }

    if (cmd === 'warn') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return msg.reply("⚠️ Specify a member to warn.");
        await msg.delete().catch(() => null);
        if (!warnings[target.id]) warnings[target.id] = []; 
        const warnTextStringReason = args.slice(1).join(' ').trim() || null;
        warnings[target.id].push({ reason: warnTextStringReason || 'Unspecified infraction log strike entry', mod: msg.author.username, time: Date.now() });
        
        const finalReasonMsg = warnTextStringReason ? '\n📝 **Reason:** ' + warnTextStringReason : '';
