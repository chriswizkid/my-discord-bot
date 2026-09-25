require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map(); const editSnipes = new Map();
const bannedWords = ['badword1', 'badword2']; let currentPrefix = '!';

client.once('ready', () => { console.log('🚀 3C_GPT Private Orchestrator is online and stable!'); });

client.on('messageDelete', (m) => { if (m.guild && !m.author?.bot) snipes.set(m.channel.id, { content: m.content || '[File/Embed]', author: m.author }); });
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
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim() || null;

    const buildDmEmbed = (title, color) => new EmbedBuilder().setTitle(title).setDescription('You have been ' + title.toLowerCase() + ' in\n**' + msg.guild.name + '**').setColor(color).setThumbnail(msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com').addFields({ name: 'Moderator', value: msg.author.username, inline: false }).setTimestamp();

    if (cmd === 'prefix') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        if (!args[0] || args[0].length > 3) return msg.reply("⚠️ Specify a valid prefix symbol (1-3 characters).");
        currentPrefix = args[0]; return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('⚙️ Prefix Updated').setDescription('Prefix changed to: `' + currentPrefix + '`').setColor('#57F287')] });
    }
    if (cmd === 'commands' || cmd === 'help') {
        const sub = args[0]?.toLowerCase(); if (sub && cmdHelp[sub]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Help: ' + currentPrefix + sub).setDescription(cmdHelp[sub]).setColor('#5865F2')] });
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Commands').setDescription(Object.values(cmdHelp).join('\n')).setColor('#5865F2')] });
    }
    if (cmd === 'ticket') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return; msg.delete().catch(() => null);
        const parts = args.join(' ').split('|'); const cat = parts[0] ? parts[0].trim().toLowerCase() : null; if (!cat) return msg.channel.send("⚠️ Format: `!ticket name | #hex | Title | Desc`");
        const customEmbed = new EmbedBuilder().setTitle(parts[2] ? parts[2].trim() : 'Support').setDescription(parts[3] ? parts[3].trim() : 'Click below to open a ticket.').setColor(parts[1] && parts[1].trim().startsWith('#') ? parts[1].trim() : '#5865F2');
        return msg.channel.send({ embeds: [customEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_' + cat).setLabel('Open Ticket 🎫').setStyle(ButtonStyle.Secondary))] });
    }
    if (cmd === 'say') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; const txt = args.join(' ').trim(); if (!txt) return; await msg.delete().catch(() => null); return msg.channel.send(txt); }
    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; const amt = parseInt(args[0]); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99."); await msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true).catch(() => null); if (del) return msg.channel.send('🧹 **' + del.size + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000)); }
    if (cmd === 'purgeuser' || cmd === 'pus') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; const amt = parseInt(args[1]) || 10; await msg.delete().catch(() => null); msg.channel.messages.fetch({ limit: 100 }).then(async f => { const filtered = f.filter(m => m.author.id === target.id).toJSON().slice(0, amt); const del = await msg.channel.bulkDelete(filtered, true).catch(() => null); if (del) return msg.channel.send('🧹 **' + del.size + '** messages cleared.').then(m => setTimeout(() => m.delete().catch(() => null), 4000)); }); return; }
    if (cmd === 'slowmode') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return; const time = args[0]?.toLowerCase(); if (!time) return; const secs = time === 'off' ? 0 : Math.floor(ms(time) / 1000); await msg.channel.setRateLimitPerUser(secs).catch(() => null); return msg.channel.send('⏱️ Slowmode set to **' + time + '**.'); }
    if (cmd === 'nick' || cmd === 'n') { const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return; const name = target ? args.slice(1).join(' ') : args.join(' '); await t.setNickname(name || null).catch(() => null); return msg.channel.send('✅ Nickname updated.'); }
    if (cmd === 'clearnick' || cmd === 'cn') { const t = target || msg.member; await t.setNickname(null).catch(() => null); return msg.channel.send('🧹 Nickname cleared.'); }
    if (cmd === 'serverinfo') { return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📊 ' + msg.guild.name).setThumbnail(msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com').setColor('#5865F2').addFields({ name: 'Members', value: msg.guild.memberCount.toString(), inline: true }).setTimestamp()] }); }
    if (cmd === 'r' || cmd === 'role') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return; const act = args[0]?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase(); const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search)); if (!role || !target || (act !== 'add' && act !== 'give' && act !== 'remove')) return msg.reply("❌ Use: `!role add/remove @user [role search]`"); try { if (act === 'remove') await target.roles.remove(role); else await target.roles.add(role); return msg.channel.send('✅ Role updated: **' + role.name + '**.'); } catch { return msg.reply("❌ Permission error."); } }
    if (cmd === 'snipe' || cmd === 's') { const snip = snipes.get(msg.channel.id); if (!snip) return msg.channel.send("❌ No snipes."); return msg.channel.send({ embeds: [new EmbedBuilder().setDescription(snip.content).setAuthor({ name: snip.author.username, iconURL: snip.author.displayAvatarURL() }).setColor('#5865F2')] }); }
    if (cmd === 'cs') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; snipes.delete(msg.channel.id); return msg.react('✔️').catch(() => null); }
    if (cmd === 'es') { const esnip = editSnipes.get(msg.channel.id); if (!esnip) return msg.channel.send("❌ No edit snipes."); return msg.channel.send({ embeds: [new EmbedBuilder().setAuthor({ name: esnip.author.username, iconURL: esnip.author.displayAvatarURL() }).setColor('#F1C40F').setTitle('📝 Edited Message').addFields({ name: 'Before', value: esnip.old }, { name: 'After', value: esnip.new })] }); }
    if (cmd === 'ces') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; editSnipes.delete(msg.channel.id); return msg.react('✔️').catch(() => null); }
