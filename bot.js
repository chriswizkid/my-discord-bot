require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans]
});

const warnings = {};
const afkProfile = new Map();
const snipes = new Map();
const bannedWords = ['badword1', 'badword2'];

client.once('ready', () => { console.log(`🚀 3C_GPT Moderation Engine is active and running cleanly!`); });

client.on('messageDelete', (message) => {
    if (!message.guild || message.author?.bot) return;
    if (!snipes.has(message.channel.id)) snipes.set(message.channel.id, []);
    snipes.get(message.channel.id).unshift({ content: message.content || '[Attachment]', author: message.author, timestamp: Date.now() });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Find the log channel dynamically by name
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logChannel?.send({ embeds: [emb] });

    // AutoMod Engine Filter
    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(message.content) || bannedWords.some(w => message.content.toLowerCase().includes(w))) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await message.delete(); } catch {}
        if (!warnings[message.author.id]) warnings[message.author.id] = [];
        
        const amLog = { reason: 'AutoMod Violation', mod: 'AutoMod Engine', time: Date.now() };
        warnings[message.author.id].push(amLog);
        
        const amEmbed = new EmbedBuilder()
            .setTitle('🚫 AutoMod System Warning')
            .setDescription(`**Member:** ${message.author}\n**Reason:** Link posting or prohibited words filter triggered.`)
            .addFields({ name: 'Active Strikes', value: `\`${warnings[message.author.id].length}/3\`` })
            .setColor('#ED4245')
            .setTimestamp();
        message.channel.send({ embeds: [amEmbed] });

        // AutoMod Log Delivery
        sendLog(new EmbedBuilder().setTitle('🛡️ AutoMod Action Log').setDescription(`**Target:** ${message.author.tag}\n**Infraction:** System filter trigger\n**Current Strikes:** ${warnings[message.author.id].length}/3`).setColor('#ED4245').setTimestamp());

        if (warnings[message.author.id].length >= 3) {
            warnings[message.author.id] = [];
            await message.member.ban({ reason: 'AutoMod 3 Strikes' }).catch(() => null);
            sendLog(new EmbedBuilder().setTitle('🔨 Automated Permanent Ban').setDescription(`**User:** ${message.author.tag}\n**Reason:** Reached maximum threshold limit of 3 warnings.`).setColor('#FF0000').setTimestamp());
            return message.channel.send(`🔨 **${message.author.user.username}** has been automatically banned for reaching 3 active strikes.`);
        }
        return;
    }

    if (afkProfile.has(message.author.id)) {
        const data = afkProfile.get(message.author.id);
        afkProfile.delete(message.author.id);
        message.reply(`👋 Welcome back, you were afk for **${ms(Date.now() - data.time, { long: true })}**.`);
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ').trim();

    if (command === 'afk') {
        afkProfile.set(message.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() });
        return message.reply(`💤 AFK status set!`);
    }

    if (command === 'purge' || command === 'c' || command === 'p') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify an amount between 1 and 99.");
        await message.delete().catch(() => null);
        const del = await message.channel.bulkDelete(amount, true);
        
        // Clean log capture update
        sendLog(new EmbedBuilder().setTitle('🧹 Chat Purged').setDescription(`**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Deleted Rows:** \`${del.size + 1}\` messages`).setColor('#5865F2').setTimestamp());
        return message.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (command === 'snipe' || command === 's') {
        const list = snipes.get(message.channel.id) || [];
        if (list.length === 0) return message.channel.send("❌ No recently deleted messages.");
        let idx = parseInt(args) - 1;
        if (isNaN(idx) || idx < 0) idx = 0;
        if (idx >= list.length) return message.channel.send("❌ Index out of range.");
        const snip = list[idx];
        const embed = new EmbedBuilder().setAuthor({ name: snip.author.username, iconURL: snip.author.displayAvatarURL() }).setDescription(snip.content).setColor('#5865F2').setFooter({ text: `${ms(Date.now() - snip.timestamp, { long: true })} ago` });
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'cs') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        snipes.set(message.channel.id, []);
        return message.react('✔️').catch(() => null);
    }

    if (command === 'nick' || command === 'n') {
        const t = target || message.member;
        if (t.id !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return message.reply("❌ No permission.");
        const name = target ? args.slice(1).join(' ') : args.join(' ');
        await t.setNickname(name || null).catch(() => null);
        
        sendLog(new EmbedBuilder().setTitle('🎭 Nickname Altered').setDescription(`**Member:** ${t}\n**Moderator:** ${message.author}\n**New Identity Assignment:** \`${name || 'Reset to Default'}\``).setColor('#9B59B6').setTimestamp());
        return message.channel.send(`✅ Nickname updated for **${t.user.username}**.`);
    }

    if (command === 'clearnick' || command === 'cn') {
        const t = target || message.member;
        await t.setNickname(null).catch(() => null);
        sendLog(new EmbedBuilder().setTitle('🎭 Nickname Reset').setDescription(`**Member:** ${t}\n**Moderator:** ${message.author}`).setColor('#9B59B6').setTimestamp());
        return message.channel.send(`🧹 Nickname cleared.`);
    }

    if (command === 'slowmode') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No permission.");
        const time = args?.toLowerCase();
        const secs = time === 'off' ? 0 : Math.floor(ms(time || '0s') / 1000);
        await message.channel.setRateLimitPerUser(secs).catch(() => null);
        
        sendLog(new EmbedBuilder().setTitle('⏱️ Slowmode Throttle Configuration').setDescription(`**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Throttling:** \`${time}\``).setColor('#F1C40F').setTimestamp());
        return message.channel.send(secs === 0 ? "⏱️ Slowmode disabled." : `⏱️ Slowmode set to **${time}**.`);
    }

    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify member.");
        if (!warnings[target.id]) warnings[target.id] = [];
        
        const finalReason = reason || 'No reason provided';
        warnings[target.id].push({ reason: finalReason, mod: message.author.username, time: Date.now() });
        
        // Beautiful output embed card
        const warnEmbed = new EmbedBuilder()
            .setTitle('⚠️ Disciplinary Warning Issued')
            .setDescription(`**User:** ${target}\n**Moderator:** ${message.author}`)
            .setColor('#F1C40F')
            .setTimestamp();
        if (reason) warnEmbed.addFields({ name: 'Reason / Infraction File', value: `\`${reason}\`` });
        warnEmbed.addFields({ name: 'Total Warning Strikes', value: `\`${warnings[target.id].length}/3\`` });
        
        message.channel.send({ embeds: [warnEmbed] });
        sendLog(warnEmbed); // Route straight to mod logs

        if (warnings[target.id].length >= 3) {
            warnings[target.id] = [];
            await target.ban({ reason: 'Accumulated 3 warning strikes.' }).catch(() => null);
            sendLog(new EmbedBuilder().setTitle('🔨 Threshold Auto-Ban executed').setDescription(`**User:** ${target.user.username}\n**Reason:** Accumulated 3 warnings.`).setColor('#FF0000').setTimestamp());
            return message.channel.send(`🔨 **${target.user.username}** has been automatically banned for reaching 3 server warnings.`);
        }
    }

    if (command === 'warns' || command === 'warnings') {
        if (!target) return message.reply("⚠️ Specify user.");
        const list = warnings[target.id] || [];
        if (list.length === 0) return message.channel.send(`✅ **${target.user.username}** has clean records with **0** active strikes.`);
        
        // Fixed syntax layout mapping injection wrapper string block
        const desc = list.map((r, i) => `**${i + 1}.** *${r.reason}*\n┗ **By Staff:** \`${r.mod}\` • <t:${Math.floor(r.time / 1000)}:f>`).join('\n\n');
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`🗃️ Warning Files: ${target.user.username}`).setColor('#E67E22').setDescription(desc)] });
    }

    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
