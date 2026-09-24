const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

module.exports = async (msg, cmd, args, target, reason, warnings, afkProfile, snipes, bannedWords, sendLog, currentPrefix) => {
    // ==========================================
    // 📖 AUDITED !COMMANDS REGISTER MANPAGE
    // ==========================================
    if (cmd === 'commands' || cmd === 'help') {
        const specArg = args?.toLowerCase();
        if (specArg && cmdHelp[specArg]) {
            return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('Help Manual: ' + currentPrefix + specArg).setDescription(cmdHelp[specArg]).setColor('#5865F2')] });
        }

        const modLines = ['warn','warns','clearwarns','mute','unmute','kick','ban','purge','pus','cs','slowmode','nick','cn','r'].map(c => '`' + currentPrefix + c + '`').join(', ');
        const utilLines = ['help','commands','afk','say','ticketsetup','close','prefix'].map(c => '`' + currentPrefix + c + '`').join(', ');

        const listEmbed = new EmbedBuilder()
            .setTitle('🛡️ 3C_GPT Master Core Manual Directory')
            .setDescription('Type `' + currentPrefix + 'help [command_name]` to audit explicit instructions.\n\n📊 **Staff Administration & Moderation Utilities:**\n' + modLines + '\n\n⚙️ **Server General Utilities & Configuration Elements:**\n' + utilLines)
            .setColor('#5865F2').setFooter({ text: 'All operations logs route automatically straight inside #mod-logs text logs.' }).setTimestamp();
        return msg.channel.send({ embeds: [listEmbed] });
    }

    // ==========================================
    // 🎫 CUSTOMIZABLE MULTI-TICKET PANEL ENGINE
    // ==========================================
    if (cmd === 'ticketsetup') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        msg.delete().catch(() => null);

        const fullTextRawStringInput = args.join(' ');
        const partsSplitBlock = fullTextRawStringInput.split('|');

        const categoryKeyTypeInput = partsSplitBlock[0] ? partsSplitBlock[0].trim().toLowerCase() : null;
        const hexColorInput = partsSplitBlock[1] ? partsSplitBlock[1].trim() : '#5865F2';
        const panelTitleInput = partsSplitBlock[2] ? partsSplitBlock[2].trim() : 'Support';
        const panelDescriptionInput = partsSplitBlock[3] ? partsSplitBlock[3].trim() : 'Click the interactive button component below to route straight into assistance paths.';

        if (!categoryKeyTypeInput) return msg.channel.send("⚠️ Usage format required:\n`" + currentPrefix + "ticketsetup category_name | #hex_color | Embed Title | Embed Description text lines`");

        const customSetupEmbed = new EmbedBuilder()
            .setTitle(panelTitleInput)
            .setDescription(panelDescriptionInput)
            .setFooter({ text: 'Tickety Panels Engine System' })
            .setColor(hexColorInput.startsWith('#') ? hexColorInput : '#5865F2').setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_' + categoryKeyTypeInput).setLabel('Open Ticket 🎫').setStyle(ButtonStyle.Secondary)
        );

        const setupLog = new EmbedBuilder().setTitle('🎫 Tickety Setup Matrix Deployed').setDescription('**Department Layout Key Category:** `' + categoryKeyTypeInput.toUpperCase() + '`\n**Target Channel:** ' + msg.channel.toString() + '\n**Color Mapping:** `' + hexColorInput + '`').setColor('#5865F2').setTimestamp();
        sendLog(setupLog);

        return msg.channel.send({ embeds: [customSetupEmbed], components: [row] });
    }

    // ==========================================
    // STANDARD AUDITED SUBROUTINES SUITE
    // ==========================================
    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const ch = msg.mentions.channels.first(); const txt = ch ? args.slice(1).join(' ') : args.join(' ');
        if (!txt) return; msg.delete().catch(() => null);
        sendLog(new EmbedBuilder().setTitle('🗣️ Say broadcaster log').setDescription('**Channel destination:** ' + (ch || msg.channel).toString() + '\n**Staff Author Account:** ' + msg.author.tag + '\n**Broadcast Output Text:** ' + txt).setColor('#3498DB').setTimestamp());
        return (ch || msg.channel).send(txt);
    }

    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amt = parseInt(args); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99 messages.");
        msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true).catch(() => null);
        if (del) {
            const purLog = new EmbedBuilder().setTitle('🧹 Chat Purged Action executed').setDescription('**Channel:** ' + msg.channel.toString() + '\n**Staff Moderator:** ' + msg.author.toString() + '\n**Cleaned lines count:** `' + del.size + '` rows').setColor('#34495E').setTimestamp();
            sendLog(purLog); return msg.channel.send('🧹 **' + (del.size + 1) + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
        }
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return msg.reply("⚠️ Specify target member profile.");
        const amt = parseInt(args) || 10; msg.delete().catch(() => null);
        msg.channel.messages.fetch({ limit: 100 }).then(async fetched => {
            const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, amt); if (filtered.length === 0) return;
            const del = await msg.channel.bulkDelete(filtered, true).catch(() => null);
            if (del) {
                const pusLog = new EmbedBuilder().setTitle('🧹 Target Profile Purge Completed').setDescription('**Target Account Profile:** ' + target.toString() + '\n**Channel:** ' + msg.channel.toString() + '\n**Staff Moderator:** ' + msg.author.toString() + '\n**Vanished lines count:** `' + del.size + '` rows').setColor('#34495E').setTimestamp();
                sendLog(pusLog); msg.channel.send('🧹 **' + del.size + '** messages cleared.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
            }
        });
        return;
    }

    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args[0] ? args[0].toLowerCase() : null; const search = args.slice(1).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target || (act !== 'add' && act !== 'remove')) return msg.reply("❌ Usage format: `" + currentPrefix + "r add/remove @user [role name keyword]`");
        try { if (act === 'add') await target.roles.add(role); else await target.roles.remove(role); return msg.channel.send('✅ Role assignment updated successfully: **' + role.name + '**.'); } catch { return msg.reply("❌ Hierarchy permission constraint block."); }
    }

    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ') || 'AFK Status Flag', time: Date.now() }); return msg.reply('💤 AFK status set!'); }

    if (cmd === 'snipe' || cmd === 's') {
        const list = snipes.get(msg.channel.id) || []; if (list.length === 0) return msg.channel.send("❌ No deletions cached.");
        let idx = parseInt(args) - 1; if (isNaN(idx) || idx < 0) idx = 0; if (idx >= list.length) return msg.channel.send("❌ Index out of range.");
        const snip = list[idx]; return msg.channel.send({ embeds: [new EmbedBuilder().setDescription(snip.content).setAuthor({ name: snip.author.username, iconURL: snip.author.displayAvatarURL() }).setColor('#5865F2').setFooter({ text: 'Cached Message Snipe Recovery' })] });
    }
    if (cmd === 'cs') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; snipes.set(msg.channel.id, []); return msg.react('✔️').catch(() => null); }

    if (cmd === 'slowmode') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return; const time = args[0]?.toLowerCase(); if (!time) return; const secs = time === 'off' ? 0 : Math.floor(ms(time) / 1000); await msg.channel.setRateLimitPerUser(secs).catch(() => null); return msg.channel.send('⏱️ Slowmode throttling active interval window locked at: **' + time + '**.'); }
    if (cmd === 'nick' || cmd === 'n') { const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return; const name = target ? args.slice(1).join(' ') : args.join(' '); await t.setNickname(name || null).catch(() => null); return msg.channel.send('✅ Nickname map configuration updated.'); }
    if (cmd === 'clearnick' || cmd === 'cn') { const t = target || msg.member; await t.setNickname(null).catch(() => null); return msg.channel.send('🧹 Nickname cleared.'); }

    if (cmd === 'warn') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        if (!warnings[target.id]) warnings[target.id] = []; const r = reason || 'No reason provided'; warnings[target.id].push({ reason: r, mod: msg.author.username, time: Date.now() });
        msg.channel.send('⚠️ **' + target.user.username + '** warned. Total strikes: **' + warnings[target.id].length + '**');
        
        const guildIcon = msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com';
