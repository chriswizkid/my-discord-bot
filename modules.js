const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

module.exports = (msg, cmd, args, target, reason, warnings, afkProfile, snipes, bannedWords, sendLog) => {
    // 📖 HELP & COMMANDS SUITE
    if (cmd === 'commands' || cmd === 'help') {
        if (args && cmdHelp[args.toLowerCase()]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Help: !' + args.toLowerCase()).setDescription(cmdHelp[args.toLowerCase()]).setColor('#5865F2')] });
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ 3C System Registry').setDescription(Object.values(cmdHelp).join('\n')).setColor('#5865F2').setTimestamp()] });
    }

    // 🎫 TICKETY INTERACTIVE BUTTON PANEL SPAWNER
    if (cmd === 'ticketpanel') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        msg.delete().catch(() => null);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('Create a ticket 🎫').setStyle(ButtonStyle.Secondary));
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('Create a ticket').setDescription('Please click on the button below to create a support ticket.').setFooter({ text: 'Tickety | Tickety.top' }).setColor('#1A1C1E')], components: [row] });
    }

    // 🗣️ ANONYMOUS BOT MESSAGING
    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const ch = msg.mentions.channels.first(); const txt = ch ? args.slice(1).join(' ') : args.join(' ');
        if (!txt) return; msg.delete().catch(() => null); return (ch || msg.channel).send(txt);
    }

    // 🧹 SMART CHAT LINES PURGING
    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amt = parseInt(args); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99.");
        msg.delete().catch(() => null); msg.channel.bulkDelete(amt, true).then(del => {
            msg.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
        });
        return;
    }

    // 🧹 TARGET PROFILE SPECIFIC CHAT PURGING
    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        msg.delete().catch(() => null); msg.channel.messages.fetch({ limit: 100 }).then(async fetched => {
            const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, parseInt(args) || 10);
            if (filtered.length === 0) return; const del = await msg.channel.bulkDelete(filtered, true);
            msg.channel.send(`🧹 **${del.size}** messages cleared.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
        });
        return;
    }

    // 🎭 FUZZY MATCHING SERVER ROLE ASSIGNMENTS
    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target) return msg.reply("❌ Usage: `!r add/remove @user [role]`");
        if (act === 'add') target.roles.add(role); else target.roles.remove(role);
        return msg.channel.send('✅ Role **' + role.name + '** updated.');
    }

    // 💤 LOCAL USER PROFILE AFK ASSIGNMENTS
    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() }); return msg.reply('💤 AFK status set!'); }

    // 🎯 RECOVER RECENT DELETIONS (SNIPE)
    if (cmd === 'snipe' || cmd === 's') {
        const list = snipes.get(msg.channel.id) || []; if (list.length === 0) return msg.channel.send("❌ No snipes.");
        const snip = list[0]; return msg.channel.send({ embeds: [new EmbedBuilder().setDescription(snip.content).setAuthor({ name: snip.author.username, iconURL: snip.author.displayAvatarURL() }).setColor('#5865F2')] });
    }
    if (cmd === 'cs') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; snipes.set(msg.channel.id, []); return msg.react('✔️').catch(() => null); }

    // ⏱️ NATIVE CHANNEL RATELIMIT COOLDOWNS & NICKNAMES
    if (cmd === 'slowmode') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return; const time = args?.toLowerCase(); if (!time) return; const secs = time === 'off' ? 0 : Math.floor(ms(time) / 1000); msg.channel.setRateLimitPerUser(secs).catch(() => null); return msg.channel.send('⏱️ Slowmode set to **' + time + '**.'); }
    if (cmd === 'nick' || cmd === 'n') { const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return; const name = target ? args.slice(1).join(' ') : args.join(' '); t.setNickname(name || null).catch(() => null); return msg.channel.send('✅ Nickname updated.'); }
    if (cmd === 'clearnick' || cmd === 'cn') { const t = target || msg.member; t.setNickname(null).catch(() => null); return msg.channel.send('🧹 Nickname cleared.'); }

    // ⚠️ DISCIPLINARY STRIKES & DM DESIGN CARD DELIVERY
    if (cmd === 'warn') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        if (!warnings[target.id]) warnings[target.id] = []; const r = reason || 'No reason provided'; warnings[target.id].push({ reason: r, mod: msg.author.username, time: Date.now() });
        msg.channel.send('⚠️ **' + target.user.username + '** warned. Total strikes: **' + warnings[target.id].length + '**');
        
        const warnEmbed = new EmbedBuilder().setTitle('Warned').setDescription('You have been warned in\n**' + msg.guild.name + '**').setColor('#F2A400').setThumbnail(msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com').addFields({ name: 'Moderator', value: msg.author.username, inline: false }, { name: 'Reason', value: r, inline: false }).setFooter({ text: 'Contact a staff member to discuss this warning' }).setTimestamp();
        target.send({ embeds: [warnEmbed] }).catch(() => null); return sendLog(warnEmbed);
    }
    if (cmd === 'warns' || cmd === 'warnings') {
        if (!target) return; const list = warnings[target.id] || []; if (list.length === 0) return msg.channel.send('✅ **' + target.user.username + '** has 0 active warnings.');
        const desc = list.map((r, i) => '**' + (i + 1) + '.** *' + r.reason + '* (By Staff: `' + r.mod + '`)').join('\n'); return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🗃️ Warnings').setDescription(desc).setColor('#E67E22')] });
    }
    if (cmd === 'clearwarns') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return; warnings[target.id] = []; return msg.channel.send('🧹 Wiped infractions.'); }

    // ⏱️ STAFF TIMEOUTS & ACCESS MUTING CONTROL ROUTINES
    if (cmd === 'mute') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return; if (!target) return;
        let time = args || '10m'; let r = args.slice(2).join(' ').trim(); if (!time.endsWith('s') && !time.endsWith('m') && !time.endsWith('h')) { time = '10m'; r = args.slice(1).join(' ').trim(); }
        let role = msg.guild.roles.cache.find(ro => ro.name.toLowerCase() === 'muted'); if (!role) return msg.reply("❌ Create a role named 'Muted' first.");
        if (target.roles.cache.has(role.id)) return msg.channel.send('⚠️ **' + target.user.username + '** is already muted!');
        target.roles.add(role); msg.channel.send({ embeds: [new EmbedBuilder().setTitle('⏱️ Member Muted').setDescription('**Target:** ' + target.toString() + '\n**Duration:** `' + time + '`').setColor('#E67E22')] });
        setTimeout(() => target.roles.remove(role).catch(() => null), ms(time)); return;
    }
    if (cmd === 'unmute') {
        if (!target) return; const role = msg.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!role || !target.roles.cache.has(role.id)) return msg.channel.send('⚠️ **' + target.user.username + '** is not currently muted!');
        target.roles.remove(role).catch(() => null); return msg.channel.send('🔊 Unmuted **' + target.user.username + '**.');
    }
    if (cmd === 'kick') { if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) return; target?.kick().catch(() => null); return msg.channel.send('🥾 Kicked user.'); }
    if (cmd === 'ban') { if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) return; target?.ban().catch(() => null); return msg.channel.send('🔨 Banned user.'); }
};
