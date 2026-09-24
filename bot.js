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

client.once('ready', () => { console.log(`🚀 3C_GPT is fully online and stable!`); });

client.on('messageDelete', (message) => {
    if (!message.guild || message.author?.bot) return;
    if (!snipes.has(message.channel.id)) snipes.set(message.channel.id, []);
    snipes.get(message.channel.id).unshift({ content: message.content || '[Attachment]', author: message.author, timestamp: Date.now() });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'mod-logs');
    const sendLog = (emb) => logChannel?.send({ embeds: [emb] });

    // AutoMod Links & Language Filters
    if ((/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i.test(message.content) || bannedWords.some(w => message.content.toLowerCase().includes(w))) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try { await message.delete(); } catch {}
        if (!warnings[message.author.id]) warnings[message.author.id] = [];
        warnings[message.author.id].push({ reason: 'AutoMod Flag', mod: 'AutoMod', time: Date.now() });
        message.channel.send(`🚫 ${message.author} warned by AutoMod. Striking: **${warnings[message.author.id].length}/3**`);
        if (warnings[message.author.id].length >= 3) {
            warnings[message.author.id] = [];
            await message.member.ban({ reason: 'AutoMod 3 Strikes' }).catch(() => null);
            return message.channel.send(`🔨 **${message.author.user.username}** banned for hitting 3 strikes.`);
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
    const logMsg = (txt) => reason ? `${txt}\n📝 **Reason:** ${reason}` : txt;

    if (command === 'afk') {
        afkProfile.set(message.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() });
        return message.reply(`💤 AFK status set!`);
    }

    if (command === 'purge' || command === 'c' || command === 'p') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 99) return message.reply("⚠️ Specify 1-99.");
        await message.delete().catch(() => null);
        const del = await message.channel.bulkDelete(amount, true);
        return message.channel.send(`🧹 **${del.size + 1}** messages purged.`).then(m => setTimeout(() => m.delete().catch(() => null), 4000));
    }

    if (command === 'snipe' || command === 's') {
        const list = snipes.get(message.channel.id) || [];
        if (list.length === 0) return message.channel.send("❌ No recently deleted messages.");
        let idx = parseInt(args[0]) - 1;
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
        return message.channel.send(`✅ Nickname updated for **${t.user.username}**.`);
    }

    if (command === 'clearnick' || command === 'cn') {
        const t = target || message.member;
        await t.setNickname(null).catch(() => null);
        return message.channel.send(`🧹 Nickname cleared.`);
    }

    if (command === 'slowmode') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No permission.");
        const time = args[0]?.toLowerCase();
        const secs = time === 'off' ? 0 : Math.floor(ms(time || '0s') / 1000);
        await message.channel.setRateLimitPerUser(secs).catch(() => null);
        return message.channel.send(secs === 0 ? "⏱️ Slowmode disabled." : `⏱️ Slowmode set to **${time}**.`);
    }

    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify member.");
        if (!warnings[target.id]) warnings[target.id] = [];
        warnings[target.id].push({ reason: reason || 'Warned', mod: message.author.username, time: Date.now() });
        
        message.channel.send(logMsg(`⚠️ **${target.user.username}** warned. Total: **${warnings[target.id].length}**`));
        if (warnings[target.id].length >= 3) {
            warnings[target.id] = [];
            await target.ban({ reason: '3 Strikes' }).catch(() => null);
            return message.channel.send(`🔨 **${target.user.username}** auto-banned.`);
        }
    }

    if (command === 'warns' || command === 'warnings') {
        if (!target) return message.reply("⚠️ Specify user.");
        const list = warnings[target.id] || [];
        if (list.length === 0) return message.channel.send(`✅ **${target.user.username}** has 0 warnings.`);
        const desc = list.map((r, i) => `**${i + 1}.** *${r.reason}*\n┗ **By:** \`\${r.mod}\` • <t:${Math.floor(r.time / 1000)}:f>`).join('\n\n');
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`🗃️ Warnings: ${target.user.username}`).setColor('#E67E22').setDescription(desc)] });
    }

    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify user.");
        let time = args[0] || '10m';
        let r = args.slice(1).join(' ');
        if (!time.endsWith('s') && !time.endsWith('m') && !time.endsWith('h')) { time = '10m'; r = args.join(' '); }
        let role = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!role) role = await message.guild.roles.create({ name: 'Muted', color: '#818386' });
        await message.channel.permissionOverwrites.edit(role, { SendMessages: false });
        await target.roles.add(role).catch(() => null);
        message.channel.send(r ? `⏱️ **${target.user.username}** muted for **${time}**.\n📝 **Reason:** ${r}` : `⏱️ **${target.user.username}** muted for **${time}**.`);
        setTimeout(async () => { await target.roles.remove(role).catch(() => null); }, ms(time));
    }

    if (command === 'unmute') {
        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (role) await target?.roles.remove(role).catch(() => null);
        return message.channel.send(`🔊 Unmuted.`);
    }

    if (command === 'kick') {
        if (!target) return;
        await target.kick(reason || undefined).catch(() => null);
        return message.channel.send(logMsg(`🥾 **${target.user.username}** kicked.`));
    }

    if (command === 'ban') {
        if (!target) return;
        await target.ban({ reason: reason || undefined }).catch(() => null);
        return message.channel.send(logMsg(`🔨 **${target.user.username}** banned.`));
    }
});

client.login(process.env.DISCORD_TOKEN);
