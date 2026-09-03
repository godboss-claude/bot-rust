require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('🏓 Пінг бота'),
  new SlashCommandBuilder().setName('help').setDescription('📋 Список всіх команд'),
  new SlashCommandBuilder().setName('server').setDescription('🏰 Інфо про сервер'),
  new SlashCommandBuilder().setName('user').setDescription('👤 Інфо про юзера').addUserOption(o => o.setName('користувач').setDescription('Вибери юзера').setRequired(false)),
  new SlashCommandBuilder().setName('avatar').setDescription('🖼️ Показати аватарку').addUserOption(o => o.setName('користувач').setDescription('Юзер').setRequired(false)),
  new SlashCommandBuilder().setName('clear').setDescription('🧹 Очистити чат').addIntegerOption(o => o.setName('кількість').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('kick').setDescription('👢 Кікнути').addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true)).addStringOption(o => o.setName('причина').setDescription('Причина').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('🔨 Забанити').addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true)).addStringOption(o => o.setName('причина').setDescription('Причина').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('unban').setDescription('🔓 Розбанити по ID').addStringOption(o => o.setName('id').setDescription('ID юзера').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('timeout').setDescription('🔇 Замутити').addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true)).addIntegerOption(o => o.setName('хвилини').setDescription('На скільки хв').setRequired(true).setMinValue(1).setMaxValue(10080)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('warn').setDescription('⚠️ Видати варн').addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true)).addStringOption(o => o.setName('причина').setDescription('Причина').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('balance').setDescription('💰 Баланс').addUserOption(o => o.setName('користувач').setDescription('Чий баланс').setRequired(false)),
  new SlashCommandBuilder().setName('daily').setDescription('🎁 Щоденна нагорода'),
  new SlashCommandBuilder().setName('work').setDescription('💼 Працювати'),
  new SlashCommandBuilder().setName('pay').setDescription('💸 Переказати монети').addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true)).addIntegerOption(o => o.setName('сума').setDescription('Сума').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('rank').setDescription('⭐ Твій рівень').addUserOption(o => o.setName('користувач').setDescription('Чий ранг').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('🏆 Топ по рівню або балансу').addStringOption(o => o.setName('тип').setDescription('level або money').setRequired(false).addChoices({name:'Рівень',value:'level'},{name:'Монети',value:'money'})),
  new SlashCommandBuilder().setName('8ball').setDescription('🎱 Куля передбачень').addStringOption(o => o.setName('питання').setDescription('Твоє питання').setRequired(true)),
  new SlashCommandBuilder().setName('coinflip').setDescription('🪙 Орел чи решка'),
  new SlashCommandBuilder().setName('ticket-panel').setDescription('🎫 Створити панель тікетів').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('deactivate').setDescription('⛔ Деактивувати бота (тільки власник)').addStringOption(o=>o.setName('id').setDescription('Вибери сервер зі списку').setRequired(false).setAutocomplete(true)),
  new SlashCommandBuilder().setName('activate').setDescription('✅ Активувати бота знову (тільки власник)').addStringOption(o=>o.setName('id').setDescription('Вибери сервер').setRequired(false).setAutocomplete(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('Реєструю команди...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`✅ Зареєстровано ${commands.length} команд!`);
  } catch (e) { console.error(e); }
})();
