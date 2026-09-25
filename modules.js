const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

module.exports = async (msg, cmd, args, target, reason, warnings, afkProfile, snipes, editSnipes, sendLog, currentPrefix, setPrefix) => {
    // Standard Branded private action DM card layout generator helper subroutine
    const dispatchDmActionCard = async (targetUserAccount, operationalTitleLabel, cardHexColorBorder) => {
        const guildProfilePictureIcon = msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com';
        const unifiedEmbedCard = new EmbedBuilder()
            .setTitle(operationalTitleLabel)
            .setDescription('You have been ' + operationalTitleLabel.toLowerCase() + ' in\n**' + msg.guild.name + '**')
            .setColor(cardHexColorBorder)
            .setThumbnail(guildProfilePictureIcon)
            .addFields({ name: 'Moderator', value: msg.author.username, inline: false });
        if (reason) unifiedEmbedCard.addFields({ name: 'Reason', value: reason, inline: false });
        unifiedEmbedCard.setFooter({ text: 'Contact a staff member to discuss this administrative action file.' }).setTimestamp();
        await targetUserAccount.send({ embeds: [unifiedEmbedCard] }).catch(() => null);
    };

    // ==========================================
    // 📖 HELPMENU SYSTEM MANPAGES PIPELINE
    // ==========================================
    if (cmd === 'commands' || cmd === 'help') {
        const targetLookupKeyString = args ? args.toLowerCase().trim() : null;
        if (targetLookupKeyString && cmdHelp[targetLookupKeyString]) {
            return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Help Index Manual: ' + currentPrefix + targetLookupKeyString).setDescription(cmdHelp[targetLookupKeyString]).setColor('#5865F2')] });
        }
        const mGroup = ['warn','unwarn','mute','unmute','kick','ban','unban','purge','pus','slowmode','nick','clearnick','r','cs','ces'].map(c => currentPrefix + c).join(', ');
        const uGroup = ['help','commands','afk','say','ticket','closeticket','serverinfo','snipe','es','prefix'].map(c => currentPrefix + c).join(', ');
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ 3C Master Systems Command Registry Directory').setDescription('Type `' + currentPrefix + 'help [command]` to audit specific action metrics rules.\n\n📊 **Staff Administration Protocols:**\n' + mGroup + '\n\n⚙️ **Server General Utilities:**\n' + uGroup).setColor('#5865F2').setTimestamp()] });
    }

    // ==========================================
    // 🎫 TICKETY SPANER CUSTOM EMBED BUILDER
    // ==========================================
    if (cmd === 'ticket') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        await msg.delete().catch(() => null);

        const joinedArgumentsTextString = args.join(' ');
        const structuralPipeCuts = joinedArgumentsTextString.split('|');

        const catRoutingKey = structuralPipeCuts[0] ? structuralPipeCuts[0].trim().toLowerCase() : null;
        const panelBorderHex = structuralPipeCuts[1] ? structuralPipeCuts[1].trim() : '#5865F2';
        const panelTitleHeader = structuralPipeCuts[2] ? structuralPipeCuts[2].trim() : 'Create a ticket';
        const panelDescBodyText = structuralPipeCuts[3] ? structuralPipeCuts[3].trim() : 'Please click on the button below to open a ticket room.';

        if (!catRoutingKey) return msg.channel.send("⚠️ Usage layout parameter requirements metric: `" + currentPrefix + "ticket category_name | #hex_color | Title Header Text | Description lines text body content`规定");

        const setupPanelDisplayCard = new EmbedBuilder()
            .setTitle(panelTitleHeader)
            .setDescription(panelDescBodyText)
            .setFooter({ text: 'Tickety Supporting Room Systems Interface Engine' })
            .setColor(panelBorderHex.startsWith('#') ? panelBorderHex : '#5865F2').setTimestamp();

        const componentsRowWrapper = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_' + catRoutingKey).setLabel('Open Ticket 🎫').setStyle(ButtonStyle.Secondary)
        );

        sendLog(new EmbedBuilder().setTitle('🎫 Tickety Interface Element Spawned').setDescription('**Department Layout Key Category Name:** `' + catRoutingKey.toUpperCase() + '`\n**Target Setup Channel:** ' + msg.channel.toString() + '\n**Color Mapping Hex:** `' + panelBorderHex + '`').setColor('#5865F2').setTimestamp());
        return msg.channel.send({ embeds: [setupPanelDisplayCard], components: [componentsRowWrapper] });
    }

    // ==========================================
    // 🗣️ ANONYMOUS BOT BROADCASTER
    // ==========================================
    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const rawBodyTextPayload = args.join(' ').trim(); if (!rawBodyTextPayload) return;
        await msg.delete().catch(() => null); return msg.channel.send(rawBodyTextPayload);
    }

    // ==========================================
    // 🧹 DUAL BULK PURGE ROUTINES SYSTEM
    // ==========================================
    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const totalLinesCount = parseInt(args); if (isNaN(totalLinesCount) || totalLinesCount < 1 || totalLinesCount > 99) return msg.reply("⚠️ Specify an amount window limit parameter between 1 and 99 messages.");
        await msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(totalLinesCount, true).catch(() => null);
        if (del) {
            sendLog(new EmbedBuilder().setTitle('🧹 Chat Purge Log Entry').setDescription('**Text Channel Target:** ' + msg.channel.toString() + '\n**Staff Moderator Account:** ' + msg.author.toString() + '\n**Cleared lines count:** `' + del.size + '` rows').setColor('#34495E').setTimestamp());
            return msg.channel.send('🧹 **' + (del.size + 1) + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
        }
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return msg.reply("⚠️ Target user check profile verification tag reference mapping layout needed.");
        const userPurgeRowConstraint = parseInt(args) || 10; await msg.delete().catch(() => null);
        msg.channel.messages.fetch({ limit: 100 }).then(async elementsCacheCollection => {
            const isolatedRows = elementsCacheCollection.filter(m => m.author.id === target.id).toJSON().slice(0, userPurgeRowConstraint);
            if (isolatedRows.length === 0) return msg.channel.send("❌ Could not isolate any recent chat dialogue lines belonging to that user validation profile.");
            const del = await msg.channel.bulkDelete(isolatedRows, true).catch(() => null);
            if (del) {
                sendLog(new EmbedBuilder().setTitle('🧹 Target Profile Purge Completed Log').setDescription('**Target account profile:** ' + target.toString() + '\n**Channel line location:** ' + msg.channel.toString() + '\n**Moderator:** ' + msg.author.toString() + '\n**Cleared Lines:** `' + del.size + '` rows').setColor('#34495E').setTimestamp());
                return msg.channel.send('🧹 **' + del.size + '** messages belonging to **' + target.user.username + '** cleared cleanly.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
            }
        });
        return;
    }

    // ==========================================
    // ⏱️ NATIVE CHANNEL RATELIMIT COOLDOWNS & NICKNAMES
    // ==========================================
    if (cmd === 'slowmode') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
        const timingWindowInput = args?.toLowerCase(); if (!timingWindowInput) return msg.reply("⚠️ Specify time duration mapping parameter value (e.g. `5s`, `10m`, `off`).");
        const parsedSecondsDuration = timingWindowInput === 'off' ? 0 : Math.floor(ms(slowTimeInput) / 1000);
        await msg.channel.setRateLimitPerUser(parsedSecondsDuration).catch(() => null);
        const slowLogCardEmbed = new EmbedBuilder().setTitle('⏱️ Cooldown Throttle Threshold Modified').setDescription('**Channel:** ' + msg.channel.toString() + '\n**Staff Moderator:** ' + msg.author.toString() + '\n**Interval Mapping Value:** `' + timingWindowInput + '`').setColor('#F1C40F').setTimestamp();
        msg.channel.send('⏱️ Slowmode throttling active interval window locked at: **' + slowTimeInput + '**.'); return sendLog(slowLogCardEmbed);
    }

    if (cmd === 'nick' || cmd === 'n') {
        const t = target || msg.member; if (t.id !== msg.author.id && !msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return;
        const nicknameTextMapOverride = target ? args.slice(1).join(' ').trim() : args.join(' ').trim();
        await t.setNickname(nicknameTextMapOverride || null).catch(() => null);
        const nickLogCardEmbed = new EmbedBuilder().setTitle('🎭 Profile Nickname Overridden Log').setDescription('**Target Member:** ' + t.toString() + '\n**Moderator Author Account:** ' + msg.author.toString() + '\n**Identity Value String Mapping:** `' + (nicknameTextMapOverride || 'Reset back to default layout values') + '`').setColor('#9B59B6').setTimestamp();
        msg.channel.send('✅ Nickname map configuration overrides established.'); return sendLog(nickLogCardEmbed);
    }

    if (cmd === 'clearnick' || cmd === 'cn') {
        const t = target || msg.member; await t.setNickname(null).catch(() => null);
