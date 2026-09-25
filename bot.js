require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms'); const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('Online'); }).listen(process.env.PORT || 10000);
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map(); const editSnipes = new Map();
const bannedWords = ['badword1', 'badword2']; let currentPrefix = '!';

client.once('ready', () => { console.log('🚀 3C Master Engine Active!'); });
client.on('messageDelete', (m) => { if (m.guild && !m.author?.bot) snipes.set(m.channel.id, { content: m.content || '[File]', author: m.author }); });
client.on('messageUpdate', (o, n) => { if (o.guild && !o.author?.bot && o.content !== n.content) editSnipes.set(o.channel.id, { old: o.content || '[File]', new: n.content || '[File]', author: o.author }); });

client.on('interactionCreate', async (i) => {
    if (!i.isButton() || !i.customId.startsWith('ticket_')) return;
    await i.deferReply({ ephemeral: true }); const cat = i.customId.split('_'); const room = 'ticket-' + cat + '-' + i.user.username.toLowerCase();
    if (i.guild.channels.cache.find(c => c.name === room)) return i.editReply('⚠️ Active ticket found.');
    const ch = await i.guild.channels.create({ name: room, type: ChannelType.GuildText, permissionOverwrites: [{ id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] });
    await ch.send({ content: i.user.toString() + ' • Team', embeds: [new EmbedBuilder().setTitle('🎫 ' + cat.toUpperCase() + ' Ticket Opened').setDescription('Support will be here shortly. Type `' + currentPrefix + 'ct\` to delete.').setColor('#5865F2')] });
    const logCh = i.guild.channels.cache.find(c => c.name === 'mod-logs'); if (logCh) logCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Ticket Created').setDescription('**User:** ' + i.user.tag + '\n**Category:** `' + cat.toUpperCase() + '`').setColor('#57F287')] });
    return i.editReply('✅ Ticket opened: ' + ch.toString());
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs'); const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    if (afkProfile.has(msg.author.id)) { const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id); msg.reply('👋 Welcome back ' + msg.author.toString() + ', away status cleared (Away for: **' + ms(Date.now() - d.time, { long: true }) + '**).' + (d.reason ? '\n📝 **AFK Note:** *' + d.reason + '*' : '')); }
    if (msg.mentions.users.size > 0) msg.mentions.users.forEach(u => { if (afkProfile.has(u.id)) msg.reply('💤 **' + u.username + '** is AFK: *' + afkProfile.get(u.id).reason + '*'); });

    if (!msg.content.startsWith(currentPrefix)) return;
    const args = msg.content.slice(currentPrefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first() || msg.guild.members.cache.get(args?.replace(/[<@!>]/g, '')); const reason = args.slice(1).join(' ').trim() || null;
    const dmCard = (title, color) => new EmbedBuilder().setTitle(title).setDescription('You have been ' + title.toLowerCase() + ' in\n**' + msg.guild.name + '**').setColor(color).setThumbnail(msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com').addFields({ name: 'Moderator', value: msg.author.username }).setTimestamp();

    if (cmd === 'prefix') { if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return; if (!args || args.length > 3) return msg.reply("⚠️ Specify prefix (1-3 chars)."); currentPrefix = args; return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('⚙️ Prefix Updated').setDescription('Prefix changed to: `' + currentPrefix + '`').setColor('#57F287')] }); }
    if (cmd === 'commands' || cmd === 'help') {
        const cmdHelp = "• `!warn @user [reason]` - Warns a user & sends DM card.\n• `!unwarn @user [num]` - Removes warnings.\n• `!warnings @user` - View warnings history.\n• `!clearwarns @user` - Clears warning strikes back to zero.\n• `!mute @user [time] [reason]` - Temporarily mutes a user.\n• `!unmute @user` - Restores access configurations.\n• `!kick @user [reason]` - Kicks a target member account.\n• `!ban @user [reason]` - Bans a member permanently.\n• `!unban [id]` - Unbans a member using their unique user ID.\n• `!afk [reason]` - Flags your account status as away.\n• `!nick @user [name]` / `!n` - Overrides server profile nickname.\n• `!clearnick @user` / `!cn` - Wipes custom nickname mapping.\n• `!serverinfo` - Displays clean server statistics & icon.\n• `!role add/remove @user [role]` / `!r` - Fuzzy matches roles.\n• `!slowmode [time]` - Set slowmode in specific channel.\n• `!purge [amount]` / `!c` / `!p` - Bulk deletes chat rows.\n• `!pus @user [amount]` - Purges messages from one user only.\n• `!say [message]` - Sends anonymous message through bot.\n• `!snipe` / `!s` - Recovers last deleted message content.\n• `!cs` - Flushes sniper cache logs.\n• `!es` - Recovers original state of edited message.\n• `!ces` - Flushes edit snipes database completely.\n• `!ticket name | #hex | Title | Desc` - Spawns custom panels.\n• `!closeticket` / `!ct` - Deletes active ticket channel room.";
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Master Core Commands Registry').setDescription(cmdHelp).setColor('#5865F2').setTimestamp()] });
    }
    if (cmd === 'ticket') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return; msg.delete().catch(() => null);
        const parts = args.join(' ').split('|'); const cat = parts ? parts.trim().toLowerCase() : null; if (!cat) return msg.channel.send("⚠️ Use: `" + currentPrefix + "ticket name | #hex | Title | Desc`");
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle(parts ? parts.trim() : 'Support').setDescription(parts ? parts.trim() : 'Click below to open a ticket.').setColor(parts && parts.trim().startsWith('#') ? parts.trim() : '#5865F2')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_' + cat).setLabel('Open Ticket 🎫').setStyle(ButtonStyle.Secondary))] });
    }
    if (cmd === 'say') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; const txt = args.join(' ').trim(); if (!txt) return; await msg.delete().catch(() => null); return msg.channel.send(txt); }
    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; const amt = parseInt(args); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99."); await msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true).catch(() => null); if (del) return msg.channel.send('🧹 **' + del.size + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000)); }
    if (cmd === 'purgeuser' || cmd === 'pus') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; const amt = parseInt(args) || 10; await msg.delete().catch(() => null); msg.channel.messages.fetch({ limit: 100 }).then(async f => { const filtered = f.filter(m => m.author.id === target.id).toJSON().slice(0, amt); const del = await msg.channel.bulkDelete(filtered, true).catch(() => null); if (del) return msg.channel.send('🧹 **' + del.size + '** messages cleared.').then(m => setTimeout(() => m.delete().catch(() => null), 4000)); }); return; }
    if (cmd === 'slowmode') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return; const time = args?.toLowerCase(); if (!time) return; const secs = time === 'off' ? 0 : Math.floor(ms(time) / 1000); await msg.channel.setRateLimitPerUser(secs).catch(() => null); return msg.channel.send('⏱️ Slowmode set to **' + time + '**.'); }
    if (cmd === 'nick' || cmd === 'n') { const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return; const name = target ? args.slice(1).join(' ') : args.join(' '); await t.setNickname(name || null).catch(() => null); return msg.channel.send('✅ Nickname updated.'); }
    if (cmd === 'clearnick' || cmd === 'cn') { const t = target || msg.member; await t.setNickname(null).catch(() => null); return msg.channel.send('🧹 Nickname cleared.'); }
    if (cmd === 'serverinfo') { return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📊 ' + msg.guild.name).setThumbnail(msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com').setColor('#5865F2').addFields({ name: 'Members', value: msg.guild.memberCount.toString(), inline: true }).setTimestamp()] }); }
    if (cmd === 'r' || cmd === 'role') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return; const act = args?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase(); const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search)); if (!role || !target || (act !== 'add' && act !== 'give' && act !== 'remove')) return msg.reply("❌ Use: `!role add/remove @user [role search]`"); try { if (act === 'remove') await target.roles.remove(role); else await target.roles.add(role); return msg.channel.send('✅ Role updated: **' + role.name + '**.'); } catch { return msg.reply("❌ Permission error."); } }
