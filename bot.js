require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans]
});

const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log('🚀 3C_GPT Engine is online and running stable!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment]', author: m.author, timestamp: Date.now() });
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(msg.content) || bannedWords.some(w => msg.content.toLowerCase().includes(w))) && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await msg.delete(); } catch {}
        if (!warnings[msg.author.id]) warnings[msg.author.id] = [];
        warnings[msg.author.id].push({ reason: 'AutoMod', mod: 'AutoMod', time: Date.now() });
        const am = new EmbedBuilder().setTitle('🚫 AutoMod').setDescription(`**User:** \${msg.author}\n**Strikes:** \`${warnings[msg.author.id].length} Warnings\``).setColor('#ED4245');
        msg.channel.send({ embeds: [am] }); return sendLog(am);
    }

    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        msg.reply(`👋 Welcome back, you were afk for **\${ms(Date.now() - d.time, { long: true })}**.`);
    }

    if (!msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first();
    const reason = args.slice(1).join(' ').trim();

    if (cmd === 'commands' || cmd === 'help') {
        if (args[0] && cmdHelp[args[0].toLowerCase()]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle(`📖 Help: !\${args[0].toLowerCase()}`).setDescription(cmdHelp[args[0].toLowerCase()]).setColor('#5865F2')] });
        const list = Object.values(cmdHelp).join('\n');
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Commands').setDescription(list).setColor('#5865F2')] });
    }

    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const ch = msg.mentions.channels.first();
        const txt = ch ? args.slice(1).join(' ') : args.join(' ');
        if (!txt) return msg.reply("⚠️ Specify text."); await msg.delete().catch(() => null);
        return (ch || msg.channel).send(txt);
    }

    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amt = parseInt(args[0]); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99.");
        await msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true);
        sendLog(new EmbedBuilder().setTitle('🧹 Purged').setDescription(`**Channel:** \${msg.channel}\n**Count:** \`${del.size + 1}\``).setColor('#5865F2'));
        return msg.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        if (!target) return msg.reply("⚠️ Specify user."); const amt = parseInt(args[1]);
        await msg.delete().catch(() => null); const fetched = await msg.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, amt || 10);
        if (filtered.length === 0) return msg.channel.send("❌ None found."); const del = await msg.channel.bulkDelete(filtered, true);
        return msg.channel.send(`🧹 **${del.size}** messages cleared.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args[0]?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target) return msg.reply("❌ Error parameters.");
        if (act === 'add') await target.roles.add(role); else await target.roles.remove(role);
        return msg.channel.send(`✅ Role **${role.name}** updated.`);
    }

    if (cmd === 'ticket') {
        const name = `ticket-${msg.author.username.toLowerCase()}`;
        if (msg.guild.channels.cache.find(c => c.name === name)) return msg.reply("⚠️ Room open.");
        const ch = await msg.guild.channels.create({ name, type: ChannelType.GuildText, permissionOverwrites: [{ id: msg.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: msg.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] });
        return ch.send({ embeds: [new EmbedBuilder().setTitle('🎫 Ticket').setDescription(`Welcome ${msg.author}. Type !close to delete room.`).setColor('#57F287')] });
    }

    if (cmd === 'close') {
        if (!msg.channel.name.startsWith('ticket-')) return;
        await msg.channel.send('🧹 *Closing in 5 seconds...*');
        return setTimeout(() => msg.channel.delete().catch(() => null), 5000);
    }

    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() }); return msg.reply(`💤 AFK set!`); }
    if (cmd === 'snipe' || cmd === 's') { const list = snipes.get(msg.channel.id) || []; if (list.length === 0) return msg.channel.send("❌ Empty."); const snip = list[0]; return msg.channel.send({ embeds: [new EmbedBuilder().setDescription(snip.content).setAuthor({ name: snip.author.username }).setColor('#5865F2')] }); }
    if (cmd === 'warn') { if (!target) return; if (!warnings[target.id]) warnings[target.id] = []; warnings[target.id].push({ reason: reason || 'Warned', mod: msg.author.username, time: Date.now() }); return msg.channel.send(`⚠️ **${target.user.username}** warned. Total: **${warnings[target.id].length}**`); }
    if (cmd === 'warns' || cmd === 'warnings') { const list = warnings[target?.id] || []; const desc = list.map((r, i) => `**${i + 1}.** *${r.reason}* (By: \`\${r.mod}\`)`).join('\n'); return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🗃️ Warnings').setDescription(desc || '0 Warnings')] }); }
    if (cmd === 'mute') { if (!target) return; let role = msg.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted'); if (!role) role = await msg.guild.roles.create({ name: 'Muted', color: '#818386' }); await msg.channel.permissionOverwrites.edit(role, { SendMessages: false }); await target.roles.add(role); return msg.channel.send(`⏱️ Muted.`); }
    if (cmd === 'unmute') { const role = msg.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted'); if (role) await target?.roles.remove(role); return msg.channel.send(`🔊 Unmuted.`); }
    if (cmd === 'kick') { await target?.kick().catch(() => null); return msg.channel.send(`🥾 Kicked.`); }
    if (cmd === 'ban') { await target?.ban().catch(() => null); return msg.channel.send(`🔨 Banned.`); }
});

client.login(process.env.DISCORD_TOKEN);
