require('dotenv').config();
const {
  Bot,
  Keyboard,
  InlineKeyboard,
  GrammyError,
  HttpError,
} = require('grammy');
const { hydrate } = require('@grammyjs/hydrate');
const logger = require('./utils/logger');
const mongoose = require('mongoose');

const User = require('./models/User');
const SupportRequest = require('./models/SupportRequest');

const sendAlertToAdmin = require('./utils/alert');
const getTodaysDay = require('./utils/utils');
const faqMessage = require('./consts/faq');
const rulesMessage = require('./consts/rules');

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

bot.command('start', async (ctx) => {
  const inlineKeyboard = new InlineKeyboard().text('Начать', 'start-advent');

  await ctx.reply(
    `Привет!\nЯ - Advent Coding Bot от\n<a href='https://t.me/pomazkovjs' target='_blank'>Pomazkov JS</a> 🤖\nЯ принимаю ответы на задачи, которые публикуются здесь: <i>ссылка</i>\nНажми на кнопку 'Начать', чтобы зарегистрироваться и принять участие ⬇️`,
    {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: inlineKeyboard,
    },
  );
});

bot.command('support', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      await ctx.reply(
        `Похоже, ты ещё не зарегистрирован(а) для участия в Advent Coding. Поскольку только зарегистрирванные пользователи могут запрашивать поддержку через бота, зарегистируйся (нажми /start для регистрации) или напиши свой вопрос в <a href='https://t.me/+Hx6RaBT4Trw3ZjM6' target='_blank'>чате</a>`,
        {
          parse_mode: 'HTML',
        },
      );
      return;
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        waitingForSupportRequest: true,
        updatedAt: Date.now(),
      },
    );

    const inlineKeyboard = new InlineKeyboard().text(
      'Отмена ❌',
      'cancel-support',
    );

    await ctx.reply(
      'Пожалуйста, опиши проблему или вопрос максимально подробно. Я передам всё Арсению и он свяжется с тобой в ближайшее время (убедись, пожалуйста, что твой аккаунт открыт и тебе можно написать)',
      {
        reply_markup: inlineKeyboard,
      },
    );
  } catch (error) {
    console.error('Ошибка при обработке команды /support:', error);
    sendAlertToAdmin(bot, error, ctx?.update?.update_id);
    await ctx.reply('Простите, произошла ошибка, уже разбираюсь.');
  }
});

bot.command('faq', async (ctx) => {
  await ctx.reply(faqMessage, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
});

bot.command('rules', async (ctx) => {
  await ctx.reply(rulesMessage);
});

bot.hears('Отправить ответ', async (ctx) => {
  const todaysDate = getTodaysDay();

  const inlineKeyboard = new InlineKeyboard()
    .text('1', `${todaysDate}.1`)
    .text('2', `${todaysDate}.2`);

  await ctx.reply(
    `Сегодня я принимаю ответ на задачи от ${todaysDate} декабря. На какую задачу хочешь ответить?`,
    {
      reply_markup: inlineKeyboard,
    },
  );
});

bot.on('message', async (ctx) => {
  const messageText = ctx.message.text;

  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      await ctx.reply(
        `Похоже, ты ещё не зарегистрирован(а) для участия в Advent Coding. Поскольку только зарегистрирванные пользователи могут запрашивать поддержку через бота, зарегистируйся (нажми /start для регистрации) или напиши свой вопрос в <a href='https://t.me/+Hx6RaBT4Trw3ZjM6' target='_blank'>чате</a>`,
        {
          parse_mode: 'HTML',
        },
      );
      return;
    }

    if (user.waitingForSupportRequest) {
      const newRequest = new SupportRequest({
        telegramId: user.telegramId,
        userName: user.userName,
        text: messageText,
      });
      await newRequest.save();
      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        {
          waitingForSupportRequest: false,
          updatedAt: Date.now(),
        },
      );

      await bot.api.sendMessage(
        process.env.ADMIN_TELEGRAM_ID,
        `<b>❗Обращение в поддержку</b>\nПользователь: @${newRequest.userName}\nТекст: ${newRequest.text}`,
        {
          parse_mode: 'HTML',
        },
      );

      logger.info('Запрос в поддержку:', {
        userId: ctx.from.id,
        userName: ctx.from.username,
        message: ctx.message.text,
      });

      await ctx.reply(
        'Я сохранил обращение, Арсений свяжется с тобой в ближайшее время!',
      );

      return;
    }

    const taskNumber = user.waitingForAnswerNumber;
    const todaysDate = getTodaysDay();
    if (taskNumber) {
      if (taskNumber.split('.')[0] !== todaysDate) {
        await User.findOneAndUpdate(
          { telegramId: ctx.from.id },
          {
            waitingForAnswerNumber: '',
            updatedAt: Date.now(),
          },
        );
        await ctx.reply(
          `Сегодня ${todaysDate} декабря и ответ на задачу ${taskNumber} я уже принять не могу :(`,
        );
        return;
      }
      if (user.answers[taskNumber]) {
        await User.findOneAndUpdate(
          { telegramId: ctx.from.id },
          {
            waitingForAnswerNumber: '',
            updatedAt: Date.now(),
          },
        );
        await ctx.reply(
          `Ответ на задачу ${taskNumber} уже был принят, повторно отправить или изменить ответ нельзя`,
        );
      } else {
        await User.findOneAndUpdate(
          { telegramId: ctx.from.id },
          {
            answers: {
              ...user.answers,
              [taskNumber]: messageText,
            },
            waitingForAnswerNumber: '',
            updatedAt: Date.now(),
          },
        );
        await ctx.reply('Ответ сохранен ✅');
      }

      return;
    }

    const keyboard = new Keyboard().text('Отправить ответ').row().resized();
    await ctx.reply(
      `Чтобы отправить ответ на одну из сегодняшних задач, нажми 'Отправить ответ' в меню`,
      {
        reply_markup: keyboard,
      },
    );
  } catch (error) {
    console.error('Ошибка при обработке текстового сообщения:', error);
    logger.error('Ошибка при обработке текстового сообщения: %o', error);
    sendAlertToAdmin(bot, error, ctx?.update?.update_id);
    await ctx.reply('Простите, произошла ошибка, уже разбираюсь.');
  }
});

bot.callbackQuery(/(7|8|9|1[0-8])\.(1|2)/, async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  try {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        waitingForAnswerNumber: callbackData,
        updatedAt: Date.now(),
      },
    );

    const inlineKeyboard = new InlineKeyboard().text(
      'Отмена ❌',
      'cancel-answer',
    );

    await ctx.reply(`Напиши ответ на задачу ${callbackData}`, {
      reply_markup: inlineKeyboard,
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error(`Ошибка при обработке коллбэка ${callbackData}:`, error);
    logger.error(`Ошибка при обработке команды ${callbackData}: %o`, error);
    logger.error('Ошибка при обработке команды Отправить ответ: %o', error);
    sendAlertToAdmin(bot, error, ctx?.update?.update_id);
    await ctx.reply('Простите, произошла ошибка, уже разбираюсь.');
  }
});

bot.callbackQuery('start-advent', async (ctx) => {
  const { id, first_name, username } = ctx?.from;

  try {
    const statusMessage = await ctx.reply('Секунду...');

    const userInDB = await User.findOne({ telegramId: ctx.from.id });
    if (!userInDB) {
      const newUser = new User({
        telegramId: id,
        firstName: first_name,
        userName: username,
      });
      await newUser.save();
      await statusMessage.editText('Зарегистрировал, добро пожаловать! 🙌');
    } else {
      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        { hasBlockedBot: false, updatedAt: Date.now() },
      );
      await statusMessage.editText('Нашел и обновил данные в базе 👌');
    }

    const keyboard = new Keyboard().text('Отправить ответ').row().resized();
    await ctx.reply(
      `Теперь тебе доступно участие в челлендже. Чтобы отправить ответ на задачу, нажми 'Отправить ответ' в меню`,
      {
        reply_markup: keyboard,
      },
    );

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
    logger.error('Ошибка при обработке сообщения: %o', error);
    sendAlertToAdmin(bot, error, ctx?.update?.update_id);
    await ctx.reply('Простите, произошла ошибка, уже разбираюсь.');
  }
});

bot.callbackQuery('cancel-support', async (ctx) => {
  const statusMessage = await ctx.reply('Секунду...');

  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { waitingForSupportRequest: false, updatedAt: Date.now() },
    );
    await statusMessage.editText('Запрос отменён ✅');

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Ошибка при обработке cancel-support:', error);
    logger.error('Ошибка при обработке cancel-support: %o', error);
    sendAlertToAdmin(bot, error, ctx?.update?.update_id);
    await ctx.reply('Простите, произошла ошибка, уже разбираюсь.');
  }
});

bot.callbackQuery('cancel-answer', async (ctx) => {
  const statusMessage = await ctx.reply('Секунду...');

  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { waitingForAnswerNumber: '', updatedAt: Date.now() },
    );
    await statusMessage.editText('Ввод отменён ✅');

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Ошибка при обработке cancel-answer:', error);
    logger.error('Ошибка при обработке cancel-answer: %o', error);
    sendAlertToAdmin(bot, error, ctx?.update?.update_id);
    await ctx.reply('Простите, произошла ошибка, уже разбираюсь.');
  }
});

bot.catch(async (err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  logger.error(
    `Ошибка при обработке апдейта ${ctx.update.update_id}: %o`,
    err.error,
  );
  const e = err.error;
  sendAlertToAdmin(bot, e, ctx?.update?.update_id);
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

async function startBot() {
  try {
    await mongoose.connect(process.env.MONGO_DB_URI);
    bot.start();
  } catch (error) {
    console.log(error.message);
    logger.error(`Ошибка при обработке старта бота: %o`, error);
  }
}

startBot();
