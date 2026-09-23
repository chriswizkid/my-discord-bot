require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans]
});

const warnings = {};
const afkProfile = new Map();

client.once('ready', () => { console.log(`🚀 3C_GPT is fully online and ready with maximum speed!`); });

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

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

    // Fix: Proper slice indices to completely skip command word and user mention
    const reason = args.slice(1).join(' ').trim();
    const replyMsg = (text) => reason ? `${text}\n📝 **Reason:** ${reason}` : text;
    const makeEmbed = (title, color) => {
        const emb = new EmbedBuilder().setTitle(title).setDescription(`${title} from ${message.guild.name}`).setColor(color);
        if (reason) emb.addFields({ name: 'Reason', value: reason });
        return emb;
    };

    if (command === 'afk') {
        afkProfile.set(message.author.id, { reason: args.join(' ') || 'AFK', time: Date.now() });
        return message.reply(`💤 AFK status set!`);
    }

    if (command === 'serverinfo') {
        const embed = new EmbedBuilder().setTitle(`📊 ${message.guild.name} Stats`).setColor('#5865F2').addFields({ name: 'Members', value: `${message.guild.memberCount}`, inline: true });
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify a user.");
        
        // Fix: Carefully target the element *after* the mention for the time variable
        let timeArg = args[1]; 
        let muteReason = args.slice(2).join(' ').trim();

        // If the word after the mention isn't a proper time scale (e.g., no s, m, h, d), treat it as part of the reason
        if (!timeArg || (!timeArg.endsWith('s') && !timeArg.endsWith('m') && !timeArg.endsWith('h') && !timeArg.endsWith('d'))) {
            timeArg = '10m';
            muteReason = args.slice(1).join(' ').trim();
        }

        let muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!muteRole) muteRole = await message.guild.roles.create({ name: 'Muted', color: '#818386' });
        try {
            await message.channel.permissionOverwrites.edit(muteRole, { SendMessages: false, AddReactions: false, Speak: false });
            await target.roles.add(muteRole);
            
            // Clean Mode Logic: Completely skip building the reason line if muteReason is blank
            message.channel.send(muteReason ? `⏱️ **${target.user.tag}** muted for **${ms(ms(timeArg), { long: true })}**.\n📝 **Reason:** ${muteReason}` : `⏱️ **${target.user.tag}** muted for **${ms(ms(timeArg), { long: true })}**.`);
            
            setTimeout(async () => { if (target.roles.cache.has(muteRole.id)) await target.roles.remove(muteRole); }, ms(timeArg));
        } catch { return message.reply("❌ Role block."); }
    }

    if (command === 'unmute') {
        if (!target) return message.reply("⚠️ Specify user.");
        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!muteRole || !target.roles.cache.has(muteRole.id)) return message.reply("❌ Not muted!");
        await target.roles.remove(muteRole);
        return message.channel.send(`🔊 **${target.user.tag}** unmuted.`);
    }

    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify member.");
        try {
            await target.send({ embeds: [makeEmbed('Kicked', '#E67E22')] }).catch(() => null);
            await target.kick(reason || undefined);
            return message.channel.send(replyMsg(`🥾 **${target.user.tag}** kicked.`));
        } catch { return message.reply("❌ Hierarchy block."); }
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify member.");
        try {
            await target.send({ embeds: [makeEmbed('Banned', '#ED4245')] }).catch(() => null);
            await target.ban({ reason: reason || undefined });
            return message.channel.send(replyMsg(`🔨 **${target.user.tag}** banned permanently.`));
        } catch { return message.reply("❌ Hierarchy block."); }
    }

    if (command === 'unban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No permission.");
        if (!args[0]) return message.reply("⚠️ Provide User ID.");
        try { await message.guild.members.unban(args[0]); return message.channel.send(`🔊 Unbanned User ID: **${args[0]}**`); }
        catch { return message.reply("❌ Ban record not found."); }
    }

    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify member.");
        if (!warnings[target.id]) warnings[target.id] = [];
        warnings[target.id].push(reason || 'Warned');
        const dm = makeEmbed('Warned', '#FEE75C').addFields({ name: 'Total Warnings', value: `${warnings[target.id].length}` });
        await target.send({ embeds: [dm] }).catch(() => null);
        return message.channel.send(replyMsg(`⚠️ **${target.user.tag}** warned. Total: **${warnings[target.id].length}**`));
    }

    if (command === 'unwarn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target || !warnings[target.id] || warnings[target.id].length === 0) return message.reply("❌ No warnings found.");
        warnings[target.id].pop();
        return message.channel.send(`🧹 Warning removed. Current total: **${warnings[target.id].length}**`);
    }

    if (command === 'warns' || command === 'warnings') {
        if (!target) return message.reply("⚠️ Specify user.");
        const list = warnings[target.id] || [];
        if (list.length === 0) return message.channel.send(`✅ **${target.user.username}** has **0** warnings.`);
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`⚠️ Infractions: ${target.user.username}`).setColor('#E67E22').setDescription(list.map((r, i) => `**${i + 1}.** ${r}`).join('\n'))] });
    }

    if (command === 'clearwarns') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No permission.");
        if (!target) return message.reply("⚠️ Specify user.");
        warnings[target.id] = [];
        return message.channel.send(`🧹 Wiped infractions for **${target.user.tag}**.`);
    }

    if (command === 'lock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No permission.");
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.channel.send("🔒 Channel locked.");
    }

    if (command === 'unlock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No permission.");
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        return message.channel.send("🔓 Channel unlocked.");
    }

    if (command === 'r') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply("❌ No permission.");
        const act = args[0]?.toLowerCase();
        if ((act !== 'add' && act !== 'remove') || !target) return message.reply("⚠️ Use \`!r add/remove @user Role\`");
        const rName = args.slice(2).join(' ').trim();
        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === rName.toLowerCase());
        if (!role) return message.reply(`❌ Role **${rName}** not found.`);
        try { if (act === 'add') await target.roles.add(role); else await target.roles.remove(role); return message.channel.send(`✅ Roles updated.`); }
        catch { return message.reply("❌ Hierarchy block."); }
    }
});

client.login(process.env.DISCORD_TOKEN);
