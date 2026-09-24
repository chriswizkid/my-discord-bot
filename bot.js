require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const ms = require('ms');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans
    ]
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

    // ==========================================
    // 🛡️ SECURITY AUTOMOD FILTER ENGINE (BAN TRIGGER REMOVED)
    // ==========================================
    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(message.content) || bannedWords.some(w => message.content.toLowerCase().includes(w))) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await message.delete(); } catch {}
        if (!warnings[message.author.id]) warnings[message.author.id] = [];
        warnings[message.author.id].push({ reason: 'AutoMod Violation', mod: 'AutoMod Engine', time: Date.now() });
        
        const amEmbed = new EmbedBuilder()
            .setTitle('🚫 AutoMod Violation Detected')
            .setDescription(`**Member:** ${message.author}\n**Infraction:** Unauthorized link placement or prohibited word usage.`)
            .addFields({ name: 'Active Strikes', value: `\`${warnings[message.author.id].length} Warnings\`` })
            .setColor('#ED4245').setTimestamp();
        message.channel.send({ embeds: [amEmbed] });
        return sendLog(amEmbed);
    }

    if (afkProfile.has(message.author.id)) {
        const data = afkProfile.get(message.author.id);
        afkProfile.delete(message.author.id);
        message.reply(`👋 Welcome back ${message.author}, your AFK status has been cleared (Away for: **${ms(Date.now() - data.time, { long: true })}**).`);
    }

    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach((u) => {
            if (afkProfile.has(u.id)) message.reply(`💤 **${u.username}** is currently AFK: *${afkProfile.get(u.id).reason}*`);
        });
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ').trim();
    const logMsg = (txt) => reason ? `${txt}\n📝 **Reason:** ${reason}` : txt;

    // ==========================================
    // 📖 HELP MENU SYSTEMS
    // ==========================================
    if (command === 'commands' || command === 'help') {
        const cmdHelp = {
            afk: '`!afk [reason]` - Sets your profile to away mode status.',
            purge: '`!purge [1-99]` or `!c`/`!p` - Bulk deletes clean chat lines instantly.',
            pus: '`!pus @user [1-99]` - Target purges messages from a specific user.',
            snipe: '`!snipe [number]` or `!s` - Pulls recently deleted messages from local memory caches.',
            cs: '`!cs` - Flushes the deleted message snipe array database logs for this channel.',
            slowmode: '`!slowmode [time/off]` - Controls text rate-limiting constraints.',
            nick: '`!nick @user [name]` or `!n` - Modifies a server member nickname instantly.',
            cn: '`!cn @user` - Resets a server member nickname back to default records.',
            warn: '`!warn @user [reason]` - Issues a disciplinary warning strike to a profile.',
            warns: '`!warnings @user` - Audits a user\'s warning time-stamps and moderator history records.',
            clearwarns: '`!clearwarns @user` - Wipes a member\'s strike registry sheet clean.',
            mute: '`!mute @user [time] [reason]` - Mutes a member for a temporary duration window.',
            unmute: '`!unmute @user` - Restores voice and chat access paths for a user.',
            kick: '`!kick @user [reason]` - Kicks a target account safely out of the server.',
            ban: '`!ban @user [reason]` - Restricts and bans a target account permanently.',
            r: '`!r add/remove @user [role name]` - Modifies member role values using fuzzy-matching.',
            say: '`!say #channel [text]` - Sends an anonymous message broadcast through the bot.',
            ticket: '`!ticket [reason]` - Instantly boots up a secure private support room channel.',
            close: '`!close` - Locks down, clips, and terminates an active help ticket room archive.'
        };

        if (args && cmdHelp[args.toLowerCase()]) {
            const hEmbed = new EmbedBuilder().setTitle(`📖 Help Manual: !${args.toLowerCase()}`).setDescription(cmdHelp[args.toLowerCase()]).setColor('#5865F2');
            return message.channel.send({ embeds: [hEmbed] });
        }

        const listEmbed = new EmbedBuilder()
            .setTitle('🛡️ 3C_GPT System Command Registry')
            .setDescription('Type `!help [command]` to audit specific execution rules.\n\n' + Object.values(cmdHelp).join('\n'))
            .setColor('#5865F2').setTimestamp();
        return message.channel.send({ embeds: [listEmbed] });
    }

    // ==========================================
    // 🗣️ ANONYMOUS SAY BROADCASTER
    // ==========================================
    if (command === 'say') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ Missing staff configuration clearance.");
        const txtChannel = message.mentions.channels.first();
        const broadcastText = txtChannel ? args.slice(1).join(' ').trim() : args.join(' ').trim();
        const destination = txtChannel || message.channel;

        if (!broadcastText) return message.reply("⚠️ Usage: `!say #channel Text content` or `!say Text content`");
        await message.delete().catch(() => null);
        return destination.send(broadcastText);
    }

    // ==========================================
    // 🧹 DUAL PURGE UTILITIES
    // ==========================================
    if (command === 'purge' || command === 'c' || command === 'p') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify an amount between 1 and 99.");
        await message.delete().catch(() => null);
        const del = await message.channel.bulkDelete(amount, true);
        
        sendLog(new EmbedBuilder().setTitle('🧹 Chat Purged').setDescription(`**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Cleared Rows:** \`${del.size + 1}\``).setColor('#5865F2').setTimestamp());
        return message.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (command === 'purgeuser' || command === 'pus') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Usage: `!pus @user [1-99]`");
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify a count limit between 1 and 99.");

        await message.delete().catch(() => null);
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const userMsgs = msgs.filter(m => m.author.id === target.id).toJSON().slice(0, amount);
        
        if (userMsgs.length === 0) return message.channel.send("❌ Could not find recent messages from that user to purge.");
        const del = await message.channel.bulkDelete(userMsgs, true);
        
        sendLog(new EmbedBuilder().setTitle('🧹 Target User Purge executed').setDescription(`**Target Account:** ${target}\n**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Cleaned Lines:** \`${del.size}\``).setColor('#5865F2').setTimestamp());
        return message.channel.send(`🧹 **${del.size}** messages from **${target.user.username}** purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    // ==========================================
    // 🎭 FUZZY SEARCH ROLE MANAGER
    // ==========================================
    if (command === 'r' || command === 'role') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
        const action = args?.toLowerCase();
        if ((action !== 'add' && action !== 'remove') || !target) return message.reply("⚠️ Usage: `!r add/remove @user [role search keyword]`");
        
        const searchString = args.slice(2).join(' ').trim().toLowerCase();
        if (!searchString) return message.reply("⚠️ Provide the name of the role to search for.");

        const matchedRole = message.guild.roles.cache.find(role => role.name.toLowerCase().includes(searchString));
        if (!matchedRole) return message.reply(`❌ Could not locate any server role matching the text string: **${searchString}**`);

        try {
