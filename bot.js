require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const ms = require('ms');
const runModules = require('./modules.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log('🚀 3C_GPT Enterprise Orchestrator is online and active!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment]', author: m.author, timestamp: Date.now() });
});

client.on('interactionCreate', async (i) => {
    if (!i.isButton() || i.customId !== 'create_ticket_btn') return;
    await i.deferReply({ ephemeral: true }); const name = 'ticket-' + i.user.username.toLowerCase();
    if (i.guild.channels.cache.find(c => c.name === name)) return i.editReply('⚠️ You already have an open ticket room.');
    const ch = await i.guild.channels.create({ name, type: ChannelType.GuildText, permissionOverwrites: [{ id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] });
    await ch.send({ content: i.user.toString() + ' • Support Team', embeds: [new EmbedBuilder().setTitle('🎫 Ticket Opened').setDescription('Support will be with you shortly. Type `!close` to delete room.').setColor('#5865F2')] });
    return i.editReply('✅ Ticket path created: ' + ch.toString());
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(msg.content) || bannedWords.some(w => msg.content.toLowerCase().includes(w))) && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await msg.delete(); } catch {}
        if (!warnings[msg.author.id]) warnings[msg.author.id] = []; warnings[msg.author.id].push({ reason: 'AutoMod', mod: 'AutoMod', time: Date.now() });
        const am = new EmbedBuilder().setTitle('🚫 AutoMod').setDescription('**User:** ' + msg.author.toString() + '\n**Strikes:** ' + warnings[msg.author.id].length + ' Warnings').setColor('#ED4245');
        msg.channel.send({ embeds: [am] }); return sendLog(am);
    }

    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        msg.reply('👋 Welcome back ' + msg.author.toString() + ', you were away for **' + ms(Date.now() - d.time, { long: true }) + '**. Reason: *' + d.reason + '*');
    }

    if (msg.mentions.users.size > 0) {
        msg.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is currently AFK: *' + afkProfile.get(u.id).reason + '*'); });
    }

    if (!msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim();

    // Fire the core module command processor engine cleanly
    runModules(msg, cmd, args, target, reason, warnings, afkProfile, snipes, bannedWords, sendLog);
});

client.login(process.env.DISCORD_TOKEN);
