require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const runModules = require('./modules.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log('🚀 3C_GPT Engine Orchestrator is online and stable!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment/Embed]', author: m.author, timestamp: Date.now() });
    if (snipes.get(m.channel.id).length > 20) snipes.get(m.channel.id).pop();
});

client.on('interactionCreate', async (i) => {
    if (!i.isButton() || !i.customId.startsWith('create_ticket_')) return;
    await i.deferReply({ ephemeral: true });

    // Multi-Ticket Counter Logic Generator Loop
    const ticketCount = i.guild.channels.cache.filter(c => c.name.startsWith('ticket-' + i.user.username.toLowerCase())).size + 1;
    const roomName = 'ticket-' + i.user.username.toLowerCase() + '-' + ticketCount;

    const ch = await i.guild.channels.create({
        name: roomName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });

    const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket Support Room File Created')
        .setDescription('Greetings ' + i.user.toString() + ',\nOur server management staff will be with you shortly.\n\nType `!close` to terminate and delete this help desk channel channel room.')
        .setColor('#5865F2').setTimestamp();

    await ch.send({ content: i.user.toString() + ' • Staff Pings', embeds: [welcomeEmbed] });
    return i.editReply('✅ Your new private assistance channel room has been opened: ' + ch.toString());
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(msg.content) || bannedWords.some(w => msg.content.toLowerCase().includes(w))) && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await msg.delete(); } catch {}
        if (!warnings[msg.author.id]) warnings[msg.author.id] = []; warnings[msg.author.id].push({ reason: 'AutoMod Flag', mod: 'AutoMod System', time: Date.now() });
        const am = new EmbedBuilder().setTitle('🚫 AutoMod Violation').setDescription('**Member Profile User:** ' + msg.author.toString() + '\n**Infraction Counter Strikes:** ' + warnings[msg.author.id].length + ' Active Warnings').setColor('#ED4245');
        msg.channel.send({ embeds: [am] }); return sendLog(am);
    }

    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        msg.reply('👋 Welcome back ' + msg.author.toString() + ', your away status profile has been cleared. You were marked away for: **' + ms(Date.now() - d.time, { long: true }) + '**.\n📝 **AFK Note:** *' + d.reason + '*');
    }
    if (msg.mentions.users.size > 0) {
        msg.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is currently away (AFK): *' + afkProfile.get(u.id).reason + '*'); });
    }

    if (!msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim();

    runModules(msg, cmd, args, target, reason, warnings, afkProfile, snipes, bannedWords, sendLog);
});

client.login(process.env.DISCORD_TOKEN);
