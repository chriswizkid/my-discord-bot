require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];
let currentPrefix = '!';

client.once('ready', () => { console.log('🚀 3C_GPT Private Orchestrator is online and stable!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment]', author: m.author, timestamp: Date.now() });
});

client.on('interactionCreate', async (i) => {
    if (!i.isButton() || !i.customId.startsWith('ticket_')) return;
    await i.deferReply({ ephemeral: true });
    const ticketType = i.customId.split('_')[1];
    const roomName = ticketType + '-' + i.user.username.toLowerCase();
    if (i.guild.channels.cache.find(c => c.name === roomName)) return i.editReply('⚠️ You already have an open ticket.');

    const ch = await i.guild.channels.create({ name: roomName, type: ChannelType.GuildText, permissionOverwrites: [{ id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] });
    await ch.send({ content: i.user.toString() + ' • Staff Team', embeds: [new EmbedBuilder().setTitle('🎫 Help Ticket Opened').setDescription('Support will be with you shortly. Type `' + currentPrefix + 'close\` to delete room.').setColor('#5865F2')] });
    
    const logCh = i.guild.channels.cache.find(c => c.name === 'mod-logs');
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Ticket Created').setDescription('**User:** ' + i.user.tag + '\n**Department:** `' + ticketType.toUpperCase() + '`').setColor('#57F287').setTimestamp()] });
    return i.editReply('✅ Ticket created: ' + ch.toString());
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
        msg.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is AFK: *' + afkProfile.get(u.id).reason + '*'); });
    }

    if (!msg.content.startsWith(currentPrefix)) return;
    const args = msg.content.slice(currentPrefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim();

    if (cmd === 'prefix') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Administrator clearance required.");
        if (!args[0] || args[0].length > 3) return msg.reply("⚠️ Specify a valid prefix (1-3 characters).");
        currentPrefix = args[0]; const pre = new EmbedBuilder().setTitle('⚙️ Prefix Updated').setDescription('Prefix changed to: `' + currentPrefix + '`').setColor('#57F287').setTimestamp();
        msg.channel.send({ embeds: [pre] }); return sendLog(pre);
    }

    if (cmd === 'commands' || cmd === 'help') {
        if (args[0] && cmdHelp[args[0].toLowerCase()]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Help: ' + currentPrefix + args[0].toLowerCase()).setDescription(cmdHelp[args[0].toLowerCase()]).setColor('#5865F2')] });
        const list = Object.values(cmdHelp).join('\n');
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Commands').setDescription(list).setColor('#5865F2')] });
    }

    if (cmd === 'ticketsetup') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return; msg.delete().catch(() => null);
        const parts = args.join(' ').split('|'); const cat = parts[0] ? parts[0].trim().toLowerCase() : null;
        if (!cat) return msg.channel.send("⚠️ Use format: `" + currentPrefix + "ticketsetup name | #hex | Title | Description`");
        const customEmbed = new EmbedBuilder().setTitle(parts[2] ? parts[2].trim() : 'Support').setDescription(parts[3] ? parts[3].trim() : 'Click below to open a ticket.').setColor(parts[1] && parts[1].trim().startsWith('#') ? parts[1].trim() : '#5865F2');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_' + cat).setLabel('Open Ticket 🎫').setStyle(ButtonStyle.Secondary));
        return msg.channel.send({ embeds: [customEmbed], components: [row] });
    }

    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const ch = msg.mentions.channels.first(); const txt = ch ? args.slice(1).join(' ') : args.join(' ');
        if (!txt) return; await msg.delete().catch(() => null); return (ch || msg.channel).send(txt);
    }

    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amt = parseInt(args[0]); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99.");
        await msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true).catch(() => null);
        if (del) return msg.channel.send('🧹 **' + (del.size + 1) + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        await msg.delete().catch(() => null); const fetched = await msg.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, parseInt(args[1]) || 10);
        if (filtered.length === 0) return; const del = await msg.channel.bulkDelete(filtered, true).catch(() => null);
        if (del) return msg.channel.send('🧹 **' + del.size + '** messages cleared.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args[0] ? args[0].toLowerCase() : null; const search = args.slice(2).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target || (act !== 'add' && act !== 'remove')) return msg.reply("❌ Use: `" + currentPrefix + "r add/remove @user [role name]`");
        try { if (act === 'add') await target.roles.add(role); else await target.roles.remove(role); return msg.channel.send('✅ Role updated.'); } catch { return msg.reply("❌ Permission error."); }
    }

    if (cmd === 'close') { if (!msg.channel.name.includes('-')) return; await msg.channel.send('🧹 *Closing room in 5 seconds...*'); return setTimeout(() => msg.channel.delete().catch(() => null), 5000); }
    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() }); return msg.reply('💤 AFK status set!'); }
    if (cmd === 'cs') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; snipes.set(msg.channel.id, []); return msg.react('✔️').catch(() => null); }
    if (cmd === 'clearwarns') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; warnings[target.id] = []; return msg.channel.send('🧹 Wiped infractions.'); }
    if (cmd === 'clearnick' || cmd === 'cn') { const t = target || msg.member; await t.setNickname(null).catch(() => null); return msg.channel.send('🧹 Nickname cleared.'); }

    if (cmd === 'snipe' || cmd === 's') {
        const list = snipes.get(msg.channel.id) || []; if (list.length === 0) return msg.channel.send("❌ No snipes.");
        const snip = list[0]; return msg.channel.send({ embeds: [new EmbedBuilder().setDescription(snip.content).setAuthor({ name: snip.author.username, iconURL: snip.author.displayAvatarURL() }).setColor('#5865F2')] });
    }
    if (cmd === 'nick' || cmd === 'n') {
        const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return;
        const name = target ? args.slice(1).join(' ') : args.join(' '); await t.setNickname(name || null).catch(() => null); return msg.channel.send('✅ Nickname updated.');
    }
