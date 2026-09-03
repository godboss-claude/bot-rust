require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('./config.json');

const DB_PATH = path.join(__dirname, 'database.json');
function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ economy: {}, levels: {}, daily: {}, warns: {}, blacklist: [] }, null, 2));
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!db.blacklist) db.blacklist = [];
  return db;
}
function saveDB(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function getUser(db, guildId, userId, category) {
  const key = `${guildId}_${userId}`;
  if (!db[category][key]) {
    if (category === 'economy') db[category][key] = config.economy.startBalance;
    if (category === 'levels') db[category][key] = { xp: 0, level: 0 };
    if (category === 'warns') db[category][key] = 0;
  }
  return key;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

async function sendWebhook(title, desc, color = 0x5865F2) {
  if (!config.webhookUrl) return;
  try {
    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ title, description: desc, color, timestamp: new Date().toISOString() }] })
    });
  } catch {}
}

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} запущений на ${client.guilds.cache.size} серверах`);
  client.user.setActivity('/help • Premium Bot');
  sendWebhook('✅ Бот запущений', `Бот ${client.user.tag} онлайн на ${client.guilds.cache.size} серверах`);
});

// XP система
client.on('messageCreate', async msg => {
  if (msg.author.bot || !msg.guild) return;
  const db = loadDB();
  const key = getUser(db, msg.guild.id, msg.author.id, 'levels');
  const data = db.levels[key];
  const add = config.levels.xpPerMessage + Math.floor(Math.random() * config.levels.xpRandom);
  data.xp += add;
  const need = data.level * 300 + 300;
  if (data.xp >= need) {
    data.level++;
    data.xp = 0;
    msg.channel.send(`🎉 ${msg.author} досяг **${data.level} рівня**!`).catch(()=>null);
  }
  saveDB(db);
});

client.on('interactionCreate', async interaction => {
  // Кнопки тікетів
  if (interaction.isButton()) {
    if (interaction.customId === 'create_ticket') {
      const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
      if (existing) return interaction.reply({ content: `❌ У тебе вже є тікет: ${existing}`, ephemeral: true });
      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
      });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Закрити тікет').setStyle(ButtonStyle.Danger));
      await channel.send({ content: `${interaction.user} Тікет створено! Адміни скоро відповідуть.`, components: [row] });
      return interaction.reply({ content: `✅ Тікет створено: ${channel}`, ephemeral: true });
    }
    if (interaction.customId === 'close_ticket') {
      await interaction.reply({ content: '🔒 Закриваю тікет через 3 сек...' });
      setTimeout(() => interaction.channel.delete().catch(()=>null), 3000);
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  const color = config.color;
  const db = loadDB();

  // blacklist check (крім activate/deactivate)
  if (db.blacklist && db.blacklist.includes(interaction.guildId) && !['deactivate','activate'].includes(commandName)) {
    return interaction.reply({ content: '⛔ Бота деактивовано на цьому сервері. Зверніться до власника.', ephemeral: true });
  }
  // вебхук лог
  sendWebhook('📝 Команда', `/${commandName} від ${interaction.user.tag} на ${interaction.guild?.name || 'DM'}`).catch(()=>{});
  try {
    // перевірка власника (якщо ownerId не вказано — дозволяємо адміну сервера для тесту)
    const isOwner = !config.ownerId || config.ownerId === "" ? interaction.member.permissions.has(PermissionFlagsBits.Administrator) : interaction.user.id === config.ownerId;
    if (commandName === 'deactivate') {
      if (!isOwner) return interaction.reply({ content: '❌ Тільки власник бота може деактивувати', ephemeral: true });
      const targetId = interaction.options.getString('id') || interaction.guildId;
      if (!targetId) return interaction.reply({ content: '❌ Вкажи ID сервера або юзай на сервері', ephemeral: true });
      if (!db.blacklist.includes(targetId)) db.blacklist.push(targetId);
      saveDB(db);
      try { const g = client.guilds.cache.get(targetId); if (g) await g.leave().catch(()=>{}); } catch {}
      sendWebhook('⛔ Деактивація', `Сервер ${targetId} деактивовано`);
      return interaction.reply({ content: `⛔ Бота деактивовано на \`${targetId}\` ${targetId !== interaction.guildId ? '(віддалено, бот вийшов)' : ''}`, ephemeral: true });
    }
    if (commandName === 'activate') {
      if (!isOwner) return interaction.reply({ content: '❌ Тільки власник', ephemeral: true });
      const targetId = interaction.options.getString('id') || interaction.guildId;
      if (!targetId) return interaction.reply({ content: '❌ Вкажи ID', ephemeral: true });
      db.blacklist = db.blacklist.filter(id => id !== targetId);
      saveDB(db);
      sendWebhook('✅ Активація', `Сервер ${targetId} активовано`);
      return interaction.reply({ content: `✅ Бота активовано знову на \`${targetId}\`!`, ephemeral: true });
    }
    if (commandName === 'ping') return interaction.reply(`🏓 Понг! \`${client.ws.ping}ms\``);

    if (commandName === 'help') {
      const embed = new EmbedBuilder().setTitle('📋 Premium Bot - Всі команди').setColor(color)
        .addFields(
          { name: 'ℹ️ Інфо', value: '`/ping` `/help` `/server` `/user` `/avatar`' },
          { name: '🛡️ Модерація', value: '`/clear` `/kick` `/ban` `/unban` `/timeout` `/warn`' },
          { name: '💰 Економіка', value: '`/balance` `/daily` `/work` `/pay`' },
          { name: '⭐ Рівні', value: '`/rank` `/leaderboard` - пиши в чат і качай рівень!' },
          { name: '🎲 Фан', value: '`/8ball` `/coinflip`' },
          { name: '🎫 Тікети', value: '`/ticket-panel` - панель для звернень' }
        ).setFooter({ text: config.footer });
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'server') {
      const g = interaction.guild;
      const embed = new EmbedBuilder().setTitle(g.name).setThumbnail(g.iconURL()).setColor(color)
        .addFields({ name: 'Власник', value: `<@${g.ownerId}>`, inline: true }, { name: 'Людей', value: `${g.memberCount}`, inline: true }, { name: 'Створено', value: `<t:${Math.floor(g.createdTimestamp/1000)}:R>`, inline: true });
      return interaction.reply({ embeds: [embed] });
    }
    if (commandName === 'user') {
      const user = interaction.options.getUser('користувач') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);
      const embed = new EmbedBuilder().setTitle(user.tag).setThumbnail(user.displayAvatarURL({dynamic:true})).setColor(color)
        .addFields({ name: 'ID', value: user.id }, { name: 'На сервері з', value: member ? `<t:${Math.floor(member.joinedTimestamp/1000)}:R>` : 'Невідомо' });
      return interaction.reply({ embeds: [embed] });
    }
    if (commandName === 'avatar') {
      const user = interaction.options.getUser('користувач') || interaction.user;
      const embed = new EmbedBuilder().setTitle(`Аватар ${user.tag}`).setImage(user.displayAvatarURL({dynamic:true,size:512})).setColor(color);
      return interaction.reply({ embeds: [embed] });
    }
    if (commandName === 'clear') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Немає прав', ephemeral: true });
      const amount = interaction.options.getInteger('кількість');
      await interaction.channel.bulkDelete(amount, true).catch(()=>null);
      return interaction.reply({ content: `✅ Видалено ${amount}`, ephemeral: true });
    }
    if (commandName === 'kick') {
      const m = interaction.options.getMember('користувач');
      const reason = interaction.options.getString('причина') || 'Без причини';
      if (!m || !m.kickable) return interaction.reply({ content: '❌ Не можу кікнути', ephemeral: true });
      await m.kick(reason); return interaction.reply(`✅ ${m.user.tag} кікнуто`);
    }
    if (commandName === 'ban') {
      const u = interaction.options.getUser('користувач');
      const reason = interaction.options.getString('причина') || 'Без причини';
      await interaction.guild.members.ban(u.id, { reason }).catch(()=>null);
      return interaction.reply(`✅ ${u.tag} забанено`);
    }
    if (commandName === 'unban') {
      const id = interaction.options.getString('id');
      await interaction.guild.members.unban(id).catch(()=> interaction.reply({ content: '❌ Не знайдено бану', ephemeral: true }));
      return interaction.reply(`✅ Розбанено ${id}`);
    }
    if (commandName === 'timeout') {
      const m = interaction.options.getMember('користувач');
      const min = interaction.options.getInteger('хвилини');
      if (!m || !m.moderatable) return interaction.reply({ content: '❌ Не можу', ephemeral: true });
      await m.timeout(min*60*1000); return interaction.reply(`✅ ${m.user.tag} в муті на ${min} хв`);
    }
    if (commandName === 'warn') {
      const u = interaction.options.getUser('користувач');
      const key = getUser(db, interaction.guild.id, u.id, 'warns');
      db.warns[key]++; saveDB(db);
      return interaction.reply(`⚠️ ${u.tag} отримав варн (${db.warns[key]}/3)`);
    }
    // ЕКОНОМІКА
    if (commandName === 'balance') {
      const u = interaction.options.getUser('користувач') || interaction.user;
      const key = getUser(db, interaction.guild.id, u.id, 'economy');
      return interaction.reply(`💰 Баланс ${u}: **${db.economy[key]}** монет`);
    }
    if (commandName === 'daily') {
      const key = `${interaction.guild.id}_${interaction.user.id}`;
      const last = db.daily[key] || 0;
      if (Date.now() - last < 86400000) {
        const left = Math.ceil((86400000 - (Date.now()-last))/3600000);
        return interaction.reply({ content: `⏳ Вже брав! Через ${left} год`, ephemeral: true });
      }
      const ekey = getUser(db, interaction.guild.id, interaction.user.id, 'economy');
      db.economy[ekey] += config.economy.dailyAmount;
      db.daily[key] = Date.now(); saveDB(db);
      return interaction.reply(`🎁 Отримано **${config.economy.dailyAmount}** монет! Баланс: ${db.economy[ekey]}`);
    }
    if (commandName === 'work') {
      const key = getUser(db, interaction.guild.id, interaction.user.id, 'economy');
      const earned = Math.floor(Math.random()*(config.economy.workMax-config.economy.workMin))+config.economy.workMin;
      db.economy[key]+=earned; saveDB(db);
      return interaction.reply(`💼 Ти попрацював і заробив **${earned}** монет!`);
    }
    if (commandName === 'pay') {
      const u = interaction.options.getUser('користувач');
      const amount = interaction.options.getInteger('сума');
      if (u.bot || u.id===interaction.user.id) return interaction.reply({ content:'❌ Не можна', ephemeral:true });
      const fromKey = getUser(db, interaction.guild.id, interaction.user.id, 'economy');
      const toKey = getUser(db, interaction.guild.id, u.id, 'economy');
      if (db.economy[fromKey] < amount) return interaction.reply({ content:'❌ Недостатньо монет', ephemeral:true });
      db.economy[fromKey]-=amount; db.economy[toKey]+=amount; saveDB(db);
      return interaction.reply(`💸 ${interaction.user} переказав **${amount}** монет для ${u}`);
    }
    if (commandName === 'rank') {
      const u = interaction.options.getUser('користувач') || interaction.user;
      const key = getUser(db, interaction.guild.id, u.id, 'levels');
      const d = db.levels[key];
      const need = d.level*300+300;
      const embed = new EmbedBuilder().setTitle(`⭐ Ранг ${u.tag}`).setColor(color).setDescription(`Рівень: **${d.level}**\nXP: **${d.xp}/${need}**`);
      return interaction.reply({ embeds:[embed] });
    }
    if (commandName === 'leaderboard') {
      const type = interaction.options.getString('тип') || 'level';
      let sorted=[];
      if (type==='money') {
        sorted = Object.entries(db.economy).filter(([k])=>k.startsWith(interaction.guild.id)).sort((a,b)=>b[1]-a[1]).slice(0,10);
        const text = sorted.map(([k,v],i)=>`**${i+1}.** <@${k.split('_')[1]}> — ${v} монет`).join('\n') || 'Порожньо';
        const embed = new EmbedBuilder().setTitle('🏆 Топ по монетах').setDescription(text).setColor(color);
        return interaction.reply({ embeds:[embed] });
      } else {
        sorted = Object.entries(db.levels).filter(([k])=>k.startsWith(interaction.guild.id)).sort((a,b)=>b[1].level-a[1].level).slice(0,10);
        const text = sorted.map(([k,v],i)=>`**${i+1}.** <@${k.split('_')[1]}> — ${v.level} рівень`).join('\n') || 'Порожньо';
        const embed = new EmbedBuilder().setTitle('🏆 Топ по рівню').setDescription(text).setColor(color);
        return interaction.reply({ embeds:[embed] });
      }
    }
    if (commandName === '8ball') {
      const ans = ["Так","Ні","Можливо","100%","Точно ні","Запитай пізніше","Без сумнівів","Не думаю"];
      return interaction.reply(`🎱 **Питання:** ${interaction.options.getString('питання')}\n**Відповідь:** ${ans[Math.floor(Math.random()*ans.length)]}`);
    }
    if (commandName === 'coinflip') {
      return interaction.reply(`🪙 Випало: **${Math.random()>0.5?'Орел':'Решка'}**`);
    }
    if (commandName === 'ticket-panel') {
      const embed = new EmbedBuilder().setTitle('🎫 Підтримка').setDescription('Натисни кнопку щоб створити приватний тікет з адмінами').setColor(color);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('📩 Створити тікет').setStyle(ButtonStyle.Primary));
      return interaction.reply({ embeds:[embed], components:[row] });
    }
  } catch(e){ console.error(e); if(!interaction.replied) interaction.reply({content:'❌ Помилка',ephemeral:true}).catch(()=>null); }
});

client.on('guildMemberAdd', member => {
  const ch = member.guild.systemChannel;
  if (ch) ch.send(`👋 Вітаємо ${member} на **${member.guild.name}**! Напиши \`/help\``).catch(()=>null);
});

client.login(process.env.TOKEN);

// для Render — тримає порт відкритим щоб не крашився
require('http').createServer((req,res)=>res.end('Harusan Bot is running')).listen(process.env.PORT || 3000);
