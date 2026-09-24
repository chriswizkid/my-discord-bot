const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

module.exports = async (msg, cmd, args, target, reason, warnings, afkProfile, snipes, bannedWords, sendLog) => {
    if (cmd === 'commands' || cmd === 'help') {
        if (args && cmdHelp[args.toLowerCase()]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Help Menu: !' + args.toLowerCase()).setDescription(cmdHelp[args.toLowerCase()]).setColor('#5865F2')] });
        const cleanListDescription = Object.values(cmdHelp).join('\n');
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Commands Registry Manual').setDescription(cleanListDescription).setColor('#5865F2').setTimestamp()] });
    }

    // 🎫 HIGHLY CUSTOMIZABLE TICKET PANEL GENERATOR UTILITY
    if (cmd === 'ticketpanel') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        msg.delete().catch(() => null);

        // Customize Embed Profile Data Parameters directly via command arguments text strings!
        const pTitle = args.join(' ').split('|')[0]?.trim() || 'Create a ticket';
        const pDesc = args.join(' ').split('|')[1]?.trim() || 'Please click on the button below to create a support ticket.';
        const pColor = args.join(' ').split('|')[2]?.trim() || '#1A1C1E';

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('Create a ticket 🎫').setStyle(ButtonStyle.Secondary));
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle(pTitle).setDescription(pDesc).setFooter({ text: 'Tickety | Support Desk' }).setColor(pColor.startsWith('#') ? pColor : '#1A1C1E')], components: [row] });
    }

    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const ch = msg.mentions.channels.first(); const txt = ch ? args.slice(1).join(' ') : args.join(' ');
        if (!txt) return; msg.delete().catch(() => null); return (ch || msg.channel).send(txt);
    }

    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amt = parseInt(args); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99.");
        msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true).catch(() => null);
        if (del) return msg.channel.send('🧹 **' + (del.size + 1) + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        msg.delete().catch(() => null); const fetched = await msg.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, parseInt(args) || 10);
        if (filtered.length === 0) return; const del = await msg.channel.bulkDelete(filtered, true).catch(() => null);
        if (del) return msg.channel.send('🧹 **' + del.size + '** messages cleared.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args[0]?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target || (act !== 'add' && act !== 'remove')) return msg.reply("❌ Usage: `!r add/remove @user [role reference name]`规定");
        try { if (act === 'add') await target.roles.add(role); else await target.roles.remove(role); return msg.channel.send('✅ Role assignment updated layout mapping successfully.'); } catch { return msg.reply("❌ Hierarchy permission constraint block."); }
    }

    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ') || 'AFK Status Flag', time: Date.now() }); return msg.reply('💤 AFK status set!'); }

    if (cmd === 'snipe' || cmd === 's') {
        const list = snipes.get(msg.channel.id) || []; if (list.length === 0) return msg.channel.send("❌ No deletions cached.");
        let idx = parseInt(args) - 1; if (isNaN(idx) || idx < 0) idx = 0; if (idx >= list.length) return msg.channel.send("❌ Out of grid range bounds.");
        const snip = list[idx]; return msg.channel.send({ embeds: [new EmbedBuilder().setDescription(snip.content).setAuthor({ name: snip.author.username, iconURL: snip.author.displayAvatarURL() }).setColor('#5865F2').setFooter({ text: 'Cached Message Snipe Recovery' })] });
    }
    if (cmd === 'cs') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; snipes.set(msg.channel.id, []); return msg.react('✔️').catch(() => null); }

    if (cmd === 'slowmode') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return; const time = args[0]?.toLowerCase(); if (!time) return; const secs = time === 'off' ? 0 : Math.floor(ms(time) / 1000); await msg.channel.setRateLimitPerUser(secs).catch(() => null); return msg.channel.send('⏱️ Slowmode throttling active interval window locked at: **' + time + '**.'); }
    if (cmd === 'nick' || cmd === 'n') { const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return; const name = target ? args.slice(1).join(' ') : args.join(' '); await t.setNickname(name || null).catch(() => null); return msg.channel.send('✅ Nickname map configuration overrides established.'); }
    if (cmd === 'clearnick' || cmd === 'cn') { const t = target || msg.member; await t.setNickname(null).catch(() => null); return msg.channel.send('🧹 Nickname profile override stripped back to default configuration files.'); }

    if (cmd === 'warn') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        if (!warnings[target.id]) warnings[target.id] = []; const r = reason || 'No explicit reason specified'; warnings[target.id].push({ reason: r, mod: msg.author.username, time: Date.now() });
        msg.channel.send('⚠️ **' + target.user.username + '** warned. Total strikes: **' + warnings[target.id].length + '**');
        
        const guildIcon = msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com';
        const warnEmbed = new EmbedBuilder().setTitle('Warned').setDescription('You have been warned in\n**' + msg.guild.name + '**').setColor('#F2A400').setThumbnail(guildIcon).addFields({ name: 'Moderator', value: msg.author.username, inline: false }, { name: 'Reason', value: r, inline: false }).setFooter({ text: 'Contact a staff member to discuss this warning file infraction strike.' }).setTimestamp();
        await target.send({ embeds: [warnEmbed] }).catch(() => null); return sendLog(warnEmbed);
    }
    if (cmd === 'warns' || cmd === 'warnings') {
        if (!target) return; const list = warnings[target.id] || []; if (list.length === 0) return msg.channel.send('✅ **' + target.user.username + '** has 0 active warning files.');
        const desc = list.map((r, i) => '**' + (i + 1) + '.** *' + r.reason + '* (By Staff Moderator: `' + r.mod + '`)').join('\n'); return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🗃️ Warnings Log Matrix Sheet Lookup').setDescription(desc).setColor('#E67E22')] });
    }
    if (cmd === 'clearwarns') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; warnings[target.id] = []; return msg.channel.send('🧹 Wiped all infraction files.'); }

    if (cmd === 'mute') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return; if (!target) return;
        let time = args[1] || '10m'; let r = args.slice(2).join(' ').trim(); if (!time.endsWith('s') && !time.endsWith('m') && !time.endsWith('h')) { time = '10m'; r = args.slice(1).join(' ').trim(); }
        let role = msg.guild.roles.cache.find(ro => ro.name.toLowerCase() === 'muted'); if (!role) role = await msg.guild.roles.create({ name: 'Muted', color: '#818386' });
        if (target.roles.cache.has(role.id)) return msg.channel.send('⚠️ **' + target.user.username + '** is already muted!');
        await msg.channel.permissionOverwrites.edit(role, { SendMessages: false }); await target.roles.add(role);
        msg.channel.send({ embeds: [new EmbedBuilder().setTitle('⏱️ Member Muted').setDescription('**Target User account:** ' + target.toString() + '\n**Duration Window Locking:** `' + time + '`').setColor('#E67E22')] });
        setTimeout(async () => { await target.roles.remove(role).catch(() => null); }, ms(time));
    }
    if (cmd === 'unmute') {
        if (!target) return; const role = msg.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!role || !target.roles.cache.has(role.id)) return msg.channel.send('⚠️ **' + target.user.username + '** is not currently muted!');
        await target.roles.remove(role).catch(() => null); return msg.channel.send('🔊 Unmuted structural layout profile mapping for: **' + target.user.username + '**.');
    }
    if (cmd === 'close') { if (!msg.channel.name.startsWith('ticket-')) return; await msg.channel.send('🧹 *Closing room file configuration matrix...*'); return setTimeout(() => msg.channel.delete().catch(() => null), 5000); }
    if (cmd === 'kick') { if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) return; await target.kick().catch(() => null); return msg.channel.send('🥾 Kicked user account profile.'); }
    if (cmd === 'ban') { if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) return; await target.ban().catch(() => null); return msg.channel.send('🔨 Banned user profile permanently.'); }
};
