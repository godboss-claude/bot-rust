require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const ROLES = ["Білдер", "Електрик", "Фермер", "Комбатер", "Коллер"];

const sessions = new Map(); // userId -> {step, role, answers}

bot.start((ctx) => {
  sessions.set(ctx.from.id, { step: 0, role: null, answers: {} });
  ctx.reply(
    `👋 Привіт, ${ctx.from.first_name}! Я бот *HATO* — набір в клан Rust.\n\nНа яку роль хочеш вступити?`,
    { parse_mode: "Markdown",
      ...Markup.inlineKeyboard(ROLES.map(r => [Markup.button.callback(r, `role_${r}`)]))
    }
  );
});

bot.action(/role_(.+)/, async (ctx) => {
  const role = ctx.match[1];
  const s = sessions.get(ctx.from.id) || { step: 0, answers: {} };
  s.role = role;
  s.step = 1;
  sessions.set(ctx.from.id, s);
  await ctx.answerCbQuery();
  await ctx.editMessageText(`✅ Обрано: *${role}*\n\n1️⃣ Напиши свій нік в Rust:`, { parse_mode:"Markdown" });
});

bot.on("text", async (ctx, next) => {
  const s = sessions.get(ctx.from.id);
  if (!s || !s.role) return next();
  const text = ctx.message.text.trim();
  if (s.step === 1) {
    s.answers.nick = text;
    s.step = 2;
    return ctx.reply("2️⃣ Скільки годин в Rust? (напр. 1200)");
  }
  if (s.step === 2) {
    s.answers.hours = text;
    s.step = 3;
    return ctx.reply("3️⃣ Розкажи коротко про досвід і чому хочеш саме цю роль?");
  }
  if (s.step === 3) {
    s.answers.about = text;
    s.step = 4;
    // відправка адміну
    const app = `📩 *Нова заявка HATO*\n\n👤 Від: @${ctx.from.username || ctx.from.first_name} (\`${ctx.from.id}\`)\n🎭 Роль: *${s.role}*\n🔸 Нік: ${s.answers.nick}\n⏱ Годин: ${s.answers.hours}\n📝 Про себе: ${s.answers.about}`;
    const adminKb = Markup.inlineKeyboard([
      [Markup.button.callback("✅ Прийняти", `accept_${ctx.from.id}`), Markup.button.callback("❌ Відхилити", `reject_${ctx.from.id}`)]
    ]);
    try {
      if (ADMIN_ID) await bot.telegram.sendMessage(ADMIN_ID, app, { parse_mode:"Markdown", ...adminKb });
    } catch(e){ console.error("send admin", e.message)}
    // також вебхук якщо є
    sessions.delete(ctx.from.id);
    return ctx.reply(`✅ Заявку на *${s.role}* відправлено! Очікуй відповідь від @${process.env.ADMIN_USERNAME || "Harusan11"}.`, {parse_mode:"Markdown"});
  }
});

bot.action(/accept_(.+)/, async (ctx) => {
  const uid = ctx.match[1];
  await ctx.answerCbQuery("Прийнято");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✅ *ПРИЙНЯТО*");
  try { await bot.telegram.sendMessage(uid, "🎉 Твою заявку в HATO *прийнято*! З тобою зв'яжуться."); } catch {}
});
bot.action(/reject_(.+)/, async (ctx) => {
  const uid = ctx.match[1];
  await ctx.answerCbQuery("Відхилено");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ *ВІДХИЛЕНО*");
  try { await bot.telegram.sendMessage(uid, "😔 На жаль, заявку в HATO відхилено."); } catch {}
});

bot.launch().then(()=>console.log("✅ HATO bot запущений"));
process.once('SIGINT', ()=>bot.stop('SIGINT'));
process.once('SIGTERM', ()=>bot.stop('SIGTERM'));
