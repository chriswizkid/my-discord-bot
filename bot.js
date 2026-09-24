require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const cmdHelp = require('./commands.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans
    ]
});

const warnings = {}; const afkProfile = new Map(); const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log('🚀 3C_GPT Engine is online and running stable!'); });

client.on('messageDelete', (m) => {
    if (!m.guild || m.author?.bot) return;
    if (!snipes.has(m.channel.id)) snipes.set(m.channel.id, []);
    snipes.get(m.channel.id).unshift({ content: m.content || '[Attachment/Embed]', author: m.author, timestamp: Date.now() });
    if (snipes.get(m.channel.id).length > 20) snipes.get(m.channel.id).pop();
});

// Clickable Button Support Ticket Interaction Listener Loop
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'create_ticket_btn') {
        await interaction.deferReply({ ephemeral: true });
        const roomName = `ticket-${interaction.user.username.toLowerCase()}`;
        
        const existingRoom = interaction.guild.channels.cache.find(c => c.name === roomName);
        if (existingRoom) return interaction.editReply(`⚠️ You already have an active support room line operating open over here: ${existingRoom}`);

        const ch = await interaction.guild.channels.create({
            name: roomName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎫 Help Ticket Opened')
            .setDescription(`Welcome ${interaction.user}, a support team agent will be with you shortly.\n\nType \`!close\` to seal and delete this room space channel layout files.`)
            .setColor('#5865F2').setTimestamp();

        await ch.send({ content: `${interaction.user} • Support Team`, embeds: [welcomeEmbed] });
        return interaction.editReply(`✅ Your private assistance path room channel has been generated: ${ch}`);
    }
});

client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author?.bot) return;
    const logCh = msg.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logCh?.send({ embeds: [emb] });

    // AutoMod Link and Language Scanners
    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(msg.content) || bannedWords.some(w => msg.content.toLowerCase().includes(w))) && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await msg.delete(); } catch {}
        if (!warnings[msg.author.id]) warnings[msg.author.id] = [];
        warnings[msg.author.id].push({ reason: 'AutoMod Flag', mod: 'AutoMod', time: Date.now() });
        const amEmbed = new EmbedBuilder().setTitle('🚫 AutoMod Violation').setDescription(`**User:** ${msg.author}\n**Reason:** Link sharing or blacklisted language detected.`).addFields({ name: 'Active Strikes', value: `\`${warnings[msg.author.id].length} Warnings\`` }).setColor('#ED4245').setTimestamp();
        msg.channel.send({ embeds: [amEmbed] }); return sendLog(amEmbed);
    }

    // AFK System Logic
    if (afkProfile.has(msg.author.id)) {
        const d = afkProfile.get(msg.author.id); afkProfile.delete(msg.author.id);
        msg.reply(`👋 Welcome back ${msg.author}, your away status was cleared. You were away for: **${ms(Date.now() - d.time, { long: true })}**\n📝 **AFK Note:** *${d.reason}*`);
    }
    if (msg.mentions.users.size > 0) {
        msg.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) msg.reply(`💤 **${u.username}** is currently AFK: *${afkProfile.get(u.id).reason}*`); });
    }

    if (!msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const target = msg.mentions.members.first();
    const reason = args.slice(1).join(' ').trim();

    // Help Systems
    if (cmd === 'commands' || cmd === 'help') {
        if (args[0] && cmdHelp[args[0].toLowerCase()]) return msg.channel.send({ embeds: [new EmbedBuilder().setTitle(`📖 Help: !${args[0].toLowerCase()}`).setDescription(cmdHelp[args[0].toLowerCase()]).setColor('#5865F2')] });
        const list = Object.values(cmdHelp).join('\n');
        return msg.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Command Registry').setDescription(list).setColor('#5865F2').setTimestamp()] });
    }

    // Tickety System Interactive Button Panel Spawner Room Command
    if (cmd === 'ticketpanel') {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Administrator clearance required.");
        await msg.delete().catch(() => null);

        const panelEmbed = new EmbedBuilder()
            .setTitle('Create a ticket')
            .setDescription('Please click on the button below to create a support ticket.')
            .setFooter({ text: 'Tickety | Tickety.top' })
            .setColor('#1A1C1E');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('Create a ticket 🎫').setStyle(ButtonStyle.Secondary)
        );

        return msg.channel.send({ embeds: [panelEmbed], components: [row] });
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
        sendLog(new EmbedBuilder().setTitle('🧹 Chat Purged').setDescription(`**Channel:** ${msg.channel}\n**Count:** \`${del.size + 1}\``).setColor('#5865F2'));
        return msg.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'purgeuser' || cmd === 'pus') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        if (!target) return msg.reply("⚠️ Specify user."); const amt = parseInt(args[1]);
        await msg.delete().catch(() => null); const fetched = await msg.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, amt || 10);
        if (filtered.length === 0) return msg.channel.send("❌ No recent messages found."); const del = await msg.channel.bulkDelete(filtered, true);
        return msg.channel.send(`🧹 **${del.size}** messages cleared.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (cmd === 'r' || cmd === 'role') {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        const act = args[0]?.toLowerCase(); const search = args.slice(2).join(' ').toLowerCase();
        const role = msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role || !target) return msg.reply("❌ Usage: `!r add/remove @user [role name]`");
        if (act === 'add') await target.roles.add(role); else await target.roles.remove(role);
        return msg.channel.send(`✅ Role **${role.name}** updated for **${target.user.username}**.`);
    }

    if (cmd === 'ticket') {
        const roomName = `ticket-${msg.author.username.toLowerCase()}`;
        if (msg.guild.channels.cache.find(c => c.name === roomName)) return msg.reply("⚠️ Ticket room already active.");
        const supportRoom = await msg.guild.channels.create({
            name: roomName, type: ChannelType.GuildText,
            permissionOverwrites: [{ id: msg.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: msg.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
        });
        await supportRoom.send({ embeds: [new EmbedBuilder().setTitle('🎫 Ticket').setDescription(`Welcome ${msg.author}. Type !close to delete room.`).setColor('#57F287')] });
        return msg.reply(`✅ Ticket channel opened: ${supportRoom}`);
    }

    if (cmd === 'close') {
        if (!msg.channel.name.startsWith('ticket-')) return msg.reply("❌ Closed inside ticket channel spaces only.");
        await msg.channel.send('🧹 *Closing in 5 seconds...*');
        return setTimeout(() => msg.channel.delete().catch(() => null), 5000);
    }

    if (cmd === 'afk') { afkProfile.set(msg.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() }); return msg.reply(`💤 AFK status set!`); }
    if (cmd === 'cs') { if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return msg.reply("❌ No permission."); snipes.set(msg.channel.id, []); return msg.react('✔️').catch(() => null); }
