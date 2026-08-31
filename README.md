# ✅ Premium Discord Bot - Готовий для продажу

### Модель: Клієнт просто додає бота по лінку - нічого не встановлює
Ти хостиш бота 1 раз, всі клієнти користуються твоїм ботом.

### Що в середині (20 команд):
- **Інфо:** /ping /help /server /user /avatar
- **Модерація:** /clear /kick /ban /unban /timeout /warn
- **Економіка:** /balance /daily /work /pay (автоматично зберігається в database.json)
- **Рівні:** /rank /leaderboard (XP за кожне повідомлення + сповіщення про level up)
- **Фан:** /8ball /coinflip
- **Тікети:** /ticket-panel (створює панель з кнопкою, кожен юзер отримує свій приватний канал)
- **Автовітання** нових учасників

### Запуск за 2 хвилини:
1. Створи бота: https://discord.com/developers/applications -> New Application -> Bot -> Reset Token -> скопіюй TOKEN і CLIENT_ID
2. Встав їх в `.env`
3. Запусти `start.bat` або вручну:
   ```
   node deploy-commands.js  (1 раз для реєстрації команд)
   node index.js
   ```
4. Запроси бота: Developers -> OAuth2 -> URL Generator -> bot + applications.commands + Administrator -> скопіюй лінк -> дай клієнту

### Для 24/7:
Залий папку на Railway.app / Render.com / VPS. Бот працюватиме навіть коли ПК вимкнений.

### Як продавати:
- Економ $10 - даєш лінк на свого бота (ти хостиш)
- Стандарт $25 - даєш архів з кодом + інструкція
- Преміум $50 - змінюєш config.json (колір, назва) під клієнта і хостиш з його назвою

Налаштування в `config.json` - колір ембедів, щоденна нагорода, XP.
База даних - `database.json` створюється автоматично.
