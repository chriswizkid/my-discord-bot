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

client.once('ready', () => { console.log('🚀 3C_GPT Engine is online and running stable!'); });

client.on('messageDelete', (message) => {
    if (!message.guild || message.author?.bot) return;
    if (!snipes.has(message.channel.id)) snipes.set(message.channel.id, []);
    snipes.get(message.channel.id).unshift({ content: message.content || '[Attachment]', author: message.author, timestamp: Date.now() });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logChannel?.send({ embeds: [emb] });

    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(message.content) || bannedWords.some(w => message.content.toLowerCase().includes(w))) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await message.delete(); } catch {}
        if (!warnings[message.author.id]) warnings[message.author.id] = [];
        warnings[message.author.id].push({ reason: 'AutoMod Violation', mod: 'AutoMod', time: Date.now() });
        
        const amEmbed = new EmbedBuilder()
            .setTitle('🚫 AutoMod Violation')
            .setDescription(`**User:** ${message.author}\n**Reason:** Link sharing or blacklisted language detected.`)
            .addFields({ name: 'Active Strikes', value: `\`${warnings[message.author.id].length}/3\`` })
            .setColor('#ED4245').setTimestamp();
        message.channel.send({ embeds: [amEmbed] });
        sendLog(amEmbed);

        if (warnings[message.author.id].length >= 3) {
            warnings[message.author.id] = [];
            await message.member.ban({ reason: 'AutoMod 3 Strikes' }).catch(() => null);
            return message.channel.send(`🔨 **${message.author.user.username}** auto-banned for hitting 3 strikes.`);
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
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify 1-99.");
        await message.delete().catch(() => null);
        const del = await message.channel.bulkDelete(amount, true);
        
        sendLog(new EmbedBuilder().setTitle('🧹 Chat Purged').setDescription(`**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Cleared Messages:** \`${del.size + 1}\``).setColor('#5865F2').setTimestamp());
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
        
        sendLog(new EmbedBuilder().setTitle('🎭 Nickname Modified').setDescription(`**Target:** ${t}\n**Moderator:** ${message.author}\n**New Nickname:** \`${name || 'Reset to Default'}\``).setColor('#9B59B6').setTimestamp());
        return message.channel.send(`✅ Nickname updated for **${t.user.username}**.`);
    }

    if (command === 'clearnick' || command === 'cn') {
        const t = target || message.member;
        await t.setNickname(null).catch(() => null);
        sendLog(new EmbedBuilder().setTitle('🎭 Nickname Reset').setDescription(`**Target:** ${t}\n**Moderator:** ${message.author}`).setColor('#9B59B6').setTimestamp());
        return message.channel.send(`🧹 Nickname cleared.`);
    }

    if (command === 'slowmode') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No permission.");
        const time = args?.toLowerCase();
        const secs = time === 'off' ? 0 : Math.floor(ms(time || '0s') / 1000);
        await message.channel.setRateLimitPerUser(secs).catch(() => null);
        
        sendLog(new EmbedBuilder().setTitle('⏱️ Slowmode Changed').setDescription(`**Channel:** ${message.channel}\n**Moderator:** ${message.author}\n**Setting:** \`${time}\``).setColor('#F1C40F').setTimestamp());
        return message.channel.send(secs === 0 ? "⏱️ Slowmode disabled." : `⏱️ Slowmode set to **${time}**.`);
    }

    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify member.");
        if (!warnings[target.id]) warnings[target.id] = [];
        
        const finalReason = reason || 'No reason provided';
        warnings[target.id].push({ reason: finalReason, mod: message.author.username, time: Date.now() });
        
        const warnEmbed = new EmbedBuilder()
            .setTitle('⚠️ Warning Strike Issued')
            .setDescription(`**Target:** ${target}\n**Moderator:** ${message.author}`)
            .setColor('#F1C40F').setTimestamp();
        if (reason) warnEmbed.addFields({ name: 'Reason', value: `\`${reason}\`` });
        warnEmbed.addFields({ name: 'Total Strikes', value: `\`${warnings[target.id].length}/3\`` });
        
        message.channel.send({ embeds: [warnEmbed] });
        sendLog(warnEmbed);

        if (warnings[target.id].length >= 3) {
            warnings[target.id] = [];
            await target.ban({ reason: 'Accumulated 3 warning strikes.' }).catch(() => null);
            return message.channel.send(`🔨 **${target.user.username}** auto-banned for reaching 3 warnings.`);
        }
    }

    if (command === 'warns' || command === 'warnings') {
        if (!target) return message.reply("⚠️ Specify user.");
        const list = warnings[target.id] || [];
        if (list.length === 0) return message.channel.send(`✅ **${target.user.username}** has 0 active warnings.`);
        
        const desc = list.map((r, i) => `**${i + 1}.** *${r.reason}*\n┗ **By Staff:** \`${r.mod}\` • <t:${Math.floor(r.time / 1000)}:f>`).join('\n\n');
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`🗃️ Warnings: ${target.user.username}`).setColor('#E67E22').setDescription(desc)] });
    }

    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify user.");
        let time = args || '10m';
        let r = args.slice(1).join(' ').trim();
        if (!time.endsWith('s') && !time.endsWith('m') && !time.endsWith('h')) { time = '10m'; r = args.join(' ').trim(); }
        
        let role = message.guild.roles.cache.find(roleObj => roleObj.name.toLowerCase() === 'muted');
        if (!role) role = await message.guild.roles.create({ name: 'Muted', color: '#818386' });
        await message.channel.permissionOverwrites.edit(role, { SendMessages: false });
        await target.roles.add(role).catch(() => null);
        
        const muteEmbed = new EmbedBuilder().setTitle('⏱️ Member Muted').setDescription(`**Target:** ${target}\n**Moderator:** ${message.author}\n**Duration:** \`${time}\``).setColor('#E67E22').setTimestamp();
        if (r) muteEmbed.addFields({ name: 'Reason', value: `\`${r}\`` });
        
        message.channel.send({ embeds: [muteEmbed] });
        sendLog(muteEmbed);
        setTimeout(async () => { await target.roles.remove(role).catch(() => null); }, ms(time));
    }

    if (command === 'unmute') {
        if (!target) return message.reply("⚠️ Specify user.");
