require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans
    ]
});

const warnings = {};
const afkProfile = new Map();
const snipes = new Map(); // Core memory storage bucket for deleted text tracking
const bannedWords = ['badword1', 'badword2', 'toxictext'];

client.once('ready', () => { console.log(`🚀 3C_GPT is fully online, ultra-fast, and loaded with the extended command kit!`); });

// Message Deletion Memory Tracking Listener
client.on('messageDelete', (message) => {
    if (!message.guild || message.author?.bot) return;
    
    if (!snipes.has(message.channel.id)) snipes.set(message.channel.id, []);
    const channelSnipes = snipes.get(message.channel.id);
    
    // Store message data at the beginning of the local array list
    channelSnipes.unshift({
        content: message.content || '[Image/Embed/Attachment]',
        author: message.author,
        timestamp: Date.now()
    });
    
    // Cap memory history tracking threshold at the last 20 deletions per channel to save RAM speed
    if (channelSnipes.length > 20) channelSnipes.pop();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (embed) => { if (logChannel) logChannel.send({ embeds: [embed] }); };

    // ==========================================
    // 🚫 AUTOMOD SCANNER
    // ==========================================
    const hasInviteLink = /(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(message.content);
    const hasBannedWord = bannedWords.some(word => message.content.toLowerCase().includes(word));

    if ((hasInviteLink || hasBannedWord) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await message.delete(); } catch {}
        if (!warnings[message.author.id]) warnings[message.author.id] = [];
        
        const triggerReason = hasInviteLink ? "Posting unauthorized server invite links" : "Using prohibited language";
        warnings[message.author.id].push({
            reason: triggerReason,
            moderator: 'AutoMod System',
            timestamp: Date.now()
        });

        message.channel.send({ embeds: [new EmbedBuilder().setTitle("🚫 AutoMod Filter Triggered").setDescription(`${message.author} has been warned automatically.\n📝 **Reason:** ${triggerReason}`).setColor('#ED4245').addFields({ name: 'Total Warnings', value: `${warnings[message.author.id].length}/3` })] });

        if (warnings[message.author.id].length >= 3) {
            warnings[message.author.id] = [];
            try {
                await message.member.send({ embeds: [new EmbedBuilder().setTitle('Banned').setDescription(`Automatically banned from ${message.guild.name} for hitting 3 strikes.`).setColor('#ED4245')] }).catch(() => null);
                await message.member.ban({ reason: 'AutoMod: Reached 3 warnings.' });
                message.channel.send(`🔨 **${message.author.tag}** has been automatically banned for accumulating 3 warnings.`);
                return sendLog(new EmbedBuilder().setTitle('🔨 Automated Ban Triggered').setDescription(`**Target:** ${message.author.tag}\n**Reason:** Reached 3 warning metrics via AutoMod filter blocks.`).setColor('#ED4245').setTimestamp());
            } catch { return message.channel.send("❌ Auto-ban failed due to role hierarchy limits."); }
        }
        return;
    }

    // ==========================================
    // 💤 AFK ACTIONS
    // ==========================================
    if (afkProfile.has(message.author.id)) {
        const data = afkProfile.get(message.author.id);
        afkProfile.delete(message.author.id);
        message.reply(`👋 Welcome back ${message.author}, you have been afk for **${ms(Date.now() - data.time, { long: true })}**.`);
    }

    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach((user) => {
            if (user && afkProfile.has(user.id)) {
                message.reply(`💤 **${user.username}** is currently AFK: *${afkProfile.get(user.id).reason}*`);
            }
        });
    }

    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ').trim();

    const replyMsg = (text) => reason ? `${text}\n📝 **Reason:** ${reason}` : text;
    const makeEmbed = (title, color) => {
        const emb = new EmbedBuilder().setTitle(title).setDescription(`${title} action executed in ${message.guild.name}`).setColor(color);
        if (reason) emb.addFields({ name: 'Reason', value: reason });
        return emb;
    };

    if (command === 'afk') {
        afkProfile.set(message.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() });
        return message.reply(`💤 AFK status set!`);
    }

    if (command === 'serverinfo') {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`📊 ${message.guild.name} Stats`).setColor('#5865F2').addFields({ name: 'Members', value: `${message.guild.memberCount}`, inline: true })] });
    }

    // ==========================================
    // 🧹 PURGE ENGINE (!purge, !c, !p)
    // ==========================================
    if (command === 'purge' || command === 'c' || command === 'p') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify an amount between 1 and 99.");

        // Delete trigger command message first, then clear requested pool count
        try {
            await message.delete();
            const deleted = await message.channel.bulkDelete(amount, true);
            const totalPurged = deleted.size + 1; // Includes the initial command trigger removal line
            
            return message.channel.send(`🧹 **${totalPurged}** messages purged.`).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 4000); // Cleans up output notification after 4 seconds
            });
        } catch { return message.reply("❌ Failed to purge text rows. Messages older than 14 days cannot be bulk deleted."); }
    }

    // ==========================================
    // 🎯 MESSAGE SNIPE COMMANDS (!snipe, !s, !cs)
    // ==========================================
    if (command === 'snipe' || command === 's') {
        const channelSnipes = snipes.get(message.channel.id) || [];
        if (channelSnipes.length === 0) return message.channel.send("❌ There are no recently deleted messages to snipe in this channel!");

        // Parse optional numbered offset integer argument (defaults to index position 0 for most recent deletion)
        let index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0) index = 0;
        if (index >= channelSnipes.length) return message.channel.send(`❌ Can't locate index history. Only the last **${channelSnipes.length}** deletions are stored.`);

        const targetedSnipe = channelSnipes[index];
        const timePassed = ms(Date.now() - targetedSnipe.timestamp, { long: true });
        
        const snipeEmbed = new EmbedBuilder()
            .setAuthor({ name: targetedSnipe.author.tag, iconURL: targetedSnipe.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(targetedSnipe.content)
            .setColor('#5865F2')
            .setFooter({ text: `Deleted ${timePassed} ago • Message ${index + 1}/${channelSnipes.length}` });

        return message.channel.send({ embeds: [snipeEmbed] });
    }

    if (command === 'cs') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        snipes.set(message.channel.id, []);
        return message.react('✔️').catch(() => null);
    }

    // ==========================================
    // 🎭 PROFILE NICKNAME UTILITIES (!nick, !n, !clearnick, !cn)
    // ==========================================
    if (command === 'nick' || command === 'n') {
        const targetMember = target || message.member;
        if (targetMember.id !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("❌ You do not have permissions to alter other user nicknames.");
        }
        
        const newNick = target ? args.slice(1).join(' ').trim() : args.join(' ').trim();
        if (!newNick) return message.reply("⚠️ Usage: `!nick [new name]` or `!nick @member [new name]`");

        try {
            await targetMember.setNickname(newNick);
            return message.channel.send(`✅ Successfully updated nickname mapping for **${targetMember.user.tag}** to *${newNick}*.`);
        } catch { return message.reply("❌ Hierarchy permission layout block: I cannot change that user's name alignment."); }
    }

    if (command === 'clearnick' || command === 'cn') {
        const targetMember = target || message.member;
        if (targetMember.id !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply("❌ No permission.");
        }
        try {
            await targetMember.setNickname(null);
            return message.channel.send(`🧹 Reset profile nickname structure back to normal for **${targetMember.user.tag}**.`);
        } catch { return message.reply("❌ Hierarchy block."); }
        
