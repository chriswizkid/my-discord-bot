require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const ms = require('ms');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans]
});

const warnings = {};
const afkProfile = new Map();
const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log('🚀 3C_GPT Engine is online and running stable!'); });

client.on('messageDelete', (message) => {
    if (!message.guild || message.author?.bot) return;
    if (!snipes.has(message.channel.id)) snipes.set(message.channel.id, []);
    snipes.get(message.channel.id).unshift({ content: message.content || '[Attachment]', author: message.author, timestamp: Date.now() });
    if (snipes.get(message.channel.id).length > 20) snipes.get(message.channel.id).pop();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logChannel?.send({ embeds: [emb] });

    // AutoMod Link and Word Filters
    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(message.content) || bannedWords.some(w => message.content.toLowerCase().includes(w))) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await message.delete(); } catch {}
        if (!warnings[message.author.id]) warnings[message.author.id] = [];
        warnings[message.author.id].push({ reason: 'AutoMod Violation', mod: 'AutoMod Engine', time: Date.now() });
        
        const amEmbed = new EmbedBuilder().setTitle('🚫 AutoMod Violation').setDescription(`**User:** ${message.author}\n**Reason:** Link sharing or blacklisted word detected.`).addFields({ name: 'Active Strikes', value: `\`${warnings[message.author.id].length} Warnings\`` }).setColor('#ED4245').setTimestamp();
        message.channel.send({ embeds: [amEmbed] });
        return sendLog(amEmbed);
    }

    if (afkProfile.has(message.author.id)) {
        const data = afkProfile.get(message.author.id);
        afkProfile.delete(message.author.id);
        message.reply(`👋 Welcome back ${message.author}, your AFK status has been cleared (Away for: **${ms(Date.now() - data.time, { long: true })}**).`);
    }

    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach((u) => { if (afkProfile.has(u.id)) message.reply(`💤 **${u.username}** is currently AFK: *${afkProfile.get(u.id).reason}*`); });
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ').trim();
    const logMsg = (txt) => reason ? `${txt}\n📝 **Reason:** ${reason}` : txt;

    // Help Systems
    if (command === 'commands' || command === 'help') {
        const cmdHelp = {
            afk: '`!afk [reason]` - Sets your status to away.',
            purge: '`!purge [1-99]` or `!c`/`!p` - Clears chat lines.',
            pus: '`!pus @user [1-99]` - Purges messages from a specific user.',
            snipe: '`!snipe` or `!s` - Recovers recently deleted messages.',
            cs: '`!cs` - Flushes snipes cache storage data.',
            slowmode: '`!slowmode [time/off]` - Controls chat cooldown throttles.',
            nick: '`!nick @user [name]` - Changes a user\'s name nickname.',
            cn: '`!cn @user` - Resets nickname to normal profile values.',
            warn: '`!warn @user [reason]` - Issues a strike to a profile.',
            warns: '`!warnings @user` - Checks a member\'s warning file records.',
            clearwarns: '`!clearwarns @user` - Wipes strikes sheet clean.',
            mute: '`!mute @user [time] [reason]` - Mutes a member temporarily.',
            unmute: '`!unmute @user` - Restores access configurations.',
            kick: '`!kick @user [reason]` - Kicks a user from the server.',
            ban: '`!ban @user [reason]` - Bans a user from the server.',
            r: '`!r add/remove @user [role]` - Fuzzy searches and modifies roles.',
            say: '`!say #channel [text]` - Speaks anonymously through the bot.',
            ticket: '`!ticket [reason]` - Opens a private support help room.',
            close: '`!close` - Shuts down an active help ticket room.'
        };
        if (args && cmdHelp[args.toLowerCase()]) return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`📖 Help Menu: !${args.toLowerCase()}`).setDescription(cmdHelp[args.toLowerCase()]).setColor('#5865F2')] });
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle('🛡️ Command Registry').setDescription('Type `!help [command]` for specifics.\n\n' + Object.values(cmdHelp).join('\n')).setColor('#5865F2').setTimestamp()] });
    }

    if (command === 'say') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        const txtChannel = message.mentions.channels.first();
        const msgText = txtChannel ? args.slice(1).join(' ').trim() : args.join(' ').trim();
        if (!msgText) return message.reply("⚠️ Specify text.");
        await message.delete().catch(() => null);
        return (txtChannel || message.channel).send(msgText);
    }

    if (command === 'purge' || command === 'c' || command === 'p') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify 1-99.");
        await message.delete().catch(() => null);
        const del = await message.channel.bulkDelete(amount, true);
        sendLog(new EmbedBuilder().setTitle('🧹 Chat Purged').setDescription(`**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Cleared Rows:** \`${del.size + 1}\``).setColor('#5865F2').setTimestamp());
        return message.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (command === 'purgeuser' || command === 'pus') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify user.");
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify 1-99.");
        await message.delete().catch(() => null);
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter(m => m.author.id === target.id).toJSON().slice(0, amount);
        if (filtered.length === 0) return message.channel.send("❌ No recent messages found.");
        const del = await message.channel.bulkDelete(filtered, true);
        sendLog(new EmbedBuilder().setTitle('🧹 Target Purge').setDescription(`**Target:** ${target}\n**Channel:** ${message.channel}\n**Cleared:** \`${del.size}\``).setColor('#5865F2').setTimestamp());
        return message.channel.send(`🧹 **${del.size}** messages from **${target.user.username}** purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (command === 'r' || command === 'role') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
        const action = args?.toLowerCase();
        if ((action !== 'add' && action !== 'remove') || !target) return message.reply("⚠️ Use: `!r add/remove @user [role]`");
        const search = args.slice(2).join(' ').trim().toLowerCase();
        const role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(search));
        if (!role) return message.reply("❌ Role not found.");
        try {
            if (action === 'add') await target.roles.add(role); else await target.roles.remove(role);
            message.channel.send(`✅ Role **${role.name}** updated for **${target.user.username}**.`);
            return sendLog(new EmbedBuilder().setTitle('🎭 Role Log').setDescription(`**Target:** ${target}\n**Mod:** ${message.author}\n**Role:** \`${role.name}\` (${action})`).setColor('#9B59B6').setTimestamp());
        } catch { return message.reply("❌ Hierarchy permissions error block."); }
    }

    if (command === 'ticket') {
        const ticReason = args.join(' ') || 'No reason specified';
        const roomName = `ticket-${message.author.username.toLowerCase()}`;
        if (message.guild.channels.cache.find(c => c.name === roomName)) return message.reply("⚠️ Ticket room already active.");
        const supportRoom = await message.guild.channels.create({
            name: roomName, type: ChannelType.GuildText,
            permissionOverwrites: [{ id: message.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
        });
        await supportRoom.send({ embeds: [new EmbedBuilder().setTitle('🎫 Help Ticket').setDescription(`Welcome ${message.author}.\n📝 **Reason:** \`${ticReason}\``).setFooter({ text: 'Type !close to seal room.' }).setColor('#57F287')] });
        message.reply(`✅ Ticket opened: ${supportRoom}`);
        return sendLog(new EmbedBuilder().setTitle('🎫 Ticket Opened').setDescription(`**User:** ${message.author}\n**Reason:** \`${ticReason}\``).setColor('#57F287').setTimestamp());
    }

    if (command === 'close') {
        if (!message.channel.name.startsWith('ticket-')) return message.reply("❌ Ticket channels only.");
        await message.channel.send('🧹 *Closing room in 5 seconds...*');
