require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans] });
const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log('🚀 3C_GPT Engine is online and running stable!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment]', author: m.author, timestamp: Date.now() });
});

client.on('interactionCreate', async (i) => {
    if (!i.isButton() || i.customId !== 'create_ticket_btn') return;
    await i.deferReply({ ephemeral: true });
    const name = 'ticket-' + i.user.username.toLowerCase();
    if (i.guild.channels.cache.find(c => c.name === name)) return i.editReply('⚠️ You already have an open ticket.');
    const ch = await i.guild.channels.create({ name, type: ChannelType.GuildText, permissionOverwrites: [{ id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] });
    await ch.send({ content: i.user.toString() + ' • Support Team', embeds: [new EmbedBuilder().setTitle('🎫 Ticket Opened').setDescription('Support will be with you shortly. Type `!close` to delete room.').setColor('#5865F2')] });
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
        msg.reply('👋 Welcome back ' + msg.author.toString() + ', you were away for **' + ms(Date.now() - d.time, { long: true }) + '**.');
    }

    if (!msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first(); const reason = args.slice(1).join(' ').trim();

    if (cmd === 'commands' || cmd === 'help') {
        if (args && cmdHelp[args.toLowerCase()]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('📖 Help: !' + args.toLowerCase()).setDescription(cmdHelp[args.toLowerCase()]).setColor('#5865F2')] });
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Commands').setDescription(Object.values(cmdHelp).join('\n')).setColor('#5865F2')] });
    }

    if (cmd === 'ticketpanel') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        await msg.delete().catch(() => null);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('Create a ticket 🎫').setStyle(ButtonStyle.Secondary));
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('Create a ticket').setDescription('Please click on the button below to create a support ticket.').setFooter({ text: 'Tickety | Tickety.top' }).setColor('#1A1C1E')], components: [row] });
    }

    if (cmd === 'say') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const ch = msg.mentions.channels.first(); const txt = ch ? args.slice(1).join(' ') : args.join(' ');
        if (!txt) return; await msg.delete().catch(() => null); return (ch || msg.channel).send(txt);
    }

    if (cmd === 'purge' || cmd === 'c' || cmd === 'p') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amt = parseInt(args); if (isNaN(amt) || amt < 1 || amt > 99) return msg.reply("⚠️ Specify 1-99.");
        await msg.delete().catch(() => null); const del = await msg.channel.bulkDelete(amt, true);
        return msg.channel.send('🧹 **' + (del.size + 1) + '** messages purged.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        await msg.delete().catch(() => null); const fetched = await msg.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, parseInt(args) || 10);
        if (filtered.length === 0) return; const del = await msg.channel.bulkDelete(filtered, true);
        return msg.channel.send('🧹 **' + del.size + '** messages cleared.').then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target) return msg.reply("❌ Usage: `!r add/remove @user [role]`");
        if (act === 'add') await target.roles.add(role); else await target.roles.remove(role);
        return msg.channel.send('✅ Role **' + role.name + '** updated.');
    }

    if (cmd === 'close') { if (!msg.channel.name.startsWith('ticket-')) return; await msg.channel.send('🧹 *Closing room...*'); return setTimeout(() => msg.channel.delete().catch(() => null), 5000); }
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
    if (cmd === 'slowmode') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return; const time = args?.toLowerCase(); if (!time) return; const secs = time === 'off' ? 0 : Math.floor(ms(time) / 1000); await msg.channel.setRateLimitPerUser(secs).catch(() => null); return msg.channel.send('⏱️ Slowmode set to **' + time + '**.'); }

    if (cmd === 'warn') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return; if (!target) return;
        if (!warnings[target.id]) warnings[target.id] = []; const r = reason || 'No reason provided'; warnings[target.id].push({ reason: r, mod: msg.author.username, time: Date.now() });
        msg.channel.send('⚠️ **' + target.user.username + '** warned. Total strikes: **' + warnings[target.id].length + '**');
        
        const guildIcon = msg.guild.iconURL({ dynamic: true }) || 'https://imgur.com';
        const warnEmbed = new EmbedBuilder()
            .setTitle('Warned')
            .setDescription('You have been warned in\n**' + msg.guild.name + '**')
            .setColor('#F2A400')
            .setThumbnail(guildIcon)
            .addFields(
                { name: 'Moderator', value: msg.author.username, inline: false },
                { name: 'Reason', value: r, inline: false }
            )
            .setFooter({ text: 'Contact a staff member to discuss this warning' })
            .setTimestamp();

        await target.send({ embeds: [warnEmbed] }).catch(() => null);
        return sendLog(warnEmbed);
    }
    if (cmd === 'warns' || cmd === 'warnings') {
        if (!target) return; const list = warnings[target.id] || []; if (list.length === 0) return msg.channel.send('✅ **' + target.user.username + '** has 0 warnings.');
