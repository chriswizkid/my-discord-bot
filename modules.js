const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

module.exports = async (msg, cmd, args, target, reason, warnings, afkProfile, snipes, editSnipes, sendLog, currentPrefix, setPrefix) => {
    const buildDmCard = (title, color) => new EmbedBuilder().setTitle(title).setDescription('You have been ' + title.toLowerCase() + ' in\n**' + msg.guild.name + '**').setColor(color).setThumbnail(msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com').addFields({ name: 'Moderator', value: msg.author.username, inline: false }).setTimestamp();

    if (cmd === 'prefix') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const newSym = args[0]; if (!newSym || newSym.length > 3) return msg.reply("⚠️ Specify a symbol (1-3 characters).");
        setPrefix(newSym); const pre = new EmbedBuilder().setTitle('⚙️ Prefix Updated').setDescription('Prefix changed to: `' + newSym + '`').setColor('#57F287');
        return msg.channel.send({ embeds: [pre] });
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
    if (cmd === 'closeticket' || cmd === 'ct') { if (!msg.channel.name.includes('ticket-')) return; await msg.channel.send('🧹 *Closing room in 5 seconds...*'); return setTimeout(() => msg.channel.delete().catch(() => null), 5000); }
    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ').trim() || null, time: Date.now() }); return msg.reply('💤 Your status profile has been flagged as away (AFK)!'); }

    if (cmd === 'warn') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; await msg.delete().catch(() => null);
        if (!warnings[target.id]) warnings[target.id] = []; warnings[target.id].push({ reason, mod: msg.author.username, time: Date.now() });
        msg.channel.send('⚠️ **' + target.user.username + '** warned.' + (reason ? ' Reason: ' + reason : '') + ' (Total strikes: **' + warnings[target.id].length + '**)');
        const card = buildDmCard('Warned', '#F2A400'); if (reason) card.addFields({ name: 'Reason', value: reason });
        await target.send({ embeds: [card] }).catch(() => null); return sendLog(card);
    }
    if (cmd === 'unwarn') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; const amt = parseInt(args[1]) || 1; const list = warnings[target.id] || []; if (list.length === 0) return msg.channel.send("❌ No warnings found."); for(let j=0; j<amt; j++) { list.pop(); } return msg.channel.send('🧹 Removed ' + amt + ' warnings from **' + target.user.username + '**. Current Total: **' + list.length + '**'); }
    if (cmd === 'warns' || cmd === 'warnings') { if (!target) return; const list = warnings[target.id] || []; if (list.length === 0) return msg.channel.send('✅ **' + target.user.username + '** has 0 active warnings.'); const desc = list.map((r, idx) => '**' + (idx + 1) + '.** *' + r.reason + '* (By Staff: `' + r.mod + '`)').join('\n'); return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🗃️ Warnings').setDescription(desc).setColor('#E67E22')] }); }
    if (cmd === 'clearwarns') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; warnings[target.id] = []; return msg.channel.send('🧹 Wiped infractions.'); }
    if (cmd === 'mute') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return; if (!target) return; await msg.delete().catch(() => null);
        let time = args[1] || '10m'; let r = args.slice(2).join(' ').trim() || null; if (!time.endsWith('s') && !time.endsWith('m') && !time.endsWith('h')) { time = '10m'; r = args.slice(1).join(' ').trim() || null; }
        let role = msg.guild.roles.cache.find(ro => ro.name.toLowerCase() === 'muted'); if (!role) role = await msg.guild.roles.create({ name: 'Muted', color: '#818386' });
        if (target.roles.cache.has(role.id)) return msg.channel.send('⚠️ **' + target.user.username + '** is already muted!');
        await msg.channel.permissionOverwrites.edit(role, { SendMessages: false }); await target.roles.add(role);
        msg.channel.send('⏱️ **' + target.user.username + '** muted for **' + time + '**.' + (r ? ' Reason: ' + r : ''));
