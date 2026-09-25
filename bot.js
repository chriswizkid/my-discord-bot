require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const runModules = require('./modules.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map(); const editSnipes = new Map();
const bannedWords = ['badword1', 'badword2']; let currentPrefix = '!';

client.once('ready', () => { console.log('🚀 3C_GPT Private Orchestrator is online and stable!'); });

client.on('messageDelete', (m) => { if (m.guild && !m.author?.bot) snipes.set(m.channel.id, { content: m.content || '[File Attachment]', author: m.author }); });
client.on('messageUpdate', (o, n) => { if (o.guild && !o.author?.bot && o.content !== n.content) editSnipes.set(o.channel.id, { old: o.content || '[File]', new: n.content || '[File]', author: o.author }); });

client.on('interactionCreate', async (i) => {
    if (!i.isButton() || !i.customId.startsWith('ticket_')) return;
    await i.deferReply({ ephemeral: true }); const cat = i.customId.split('_')[1]; const room = 'ticket-' + cat + '-' + i.user.username.toLowerCase();
    if (i.guild.channels.cache.find(c => c.name === room)) return i.editReply('⚠️ You already have an open ticket room here.');
    const ch = await i.guild.channels.create({ name: room, type: ChannelType.GuildText, permissionOverwrites: [{ id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] });
    await ch.send({ content: i.user.toString() + ' • Support Team', embeds: [new EmbedBuilder().setTitle('🎫 ' + cat.toUpperCase() + ' Ticket Opened').setDescription('Support will be with you shortly. Type `' + currentPrefix + 'ct\` to close.').setColor('#5865F2')] });
    const logCh = i.guild.channels.cache.find(c => c.name === 'mod-logs'); if (logCh) logCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Ticket Created').setDescription('**User:** ' + i.user.tag + '\n**Department:** `' + cat.toUpperCase() + '`').setColor('#57F287').setTimestamp()] });
    return i.editReply('✅ Ticket opened: ' + ch.toString());
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs'); const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        msg.reply('👋 Welcome back ' + msg.author.toString() + ', away status cleared (Away for: **' + ms(Date.now() - d.time, { long: true }) + '**).' + (d.reason ? '\n📝 **AFK Note:** *' + d.reason + '*' : ''));
    }
    if (msg.mentions.users.size > 0) msg.mentions.users.forEach(u => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is AFK: *' + afkProfile.get(u.id).reason + '*'); });

    if (!msg.content.startsWith(currentPrefix)) return;
    const args = msg.content.slice(currentPrefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]?.replace(/[<@!>]/g, '')); 
    const reason = args.slice(1).join(' ').trim() || null;

    runModules(msg, cmd, args, target, reason, warnings, afkProfile, snipes, editSnipes, sendLog, currentPrefix, (newPrefix) => { currentPrefix = newPrefix; });
});

client.login(process.env.DISCORD_TOKEN);
