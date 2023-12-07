require('dotenv').config();

const sendAlertToAdmin = async (bot, error, updateId = 0) => {
  try {
    await bot.api.sendMessage(
      process.env.ADMIN_TELEGRAM_ID,
      `<b>❗❗❗ ОШИБКА БОТА</b>\nUpdate ID: ${updateId}\n\n${JSON.stringify(
        error,
      )}`,
      {
        parse_mode: 'HTML',
      },
    );
  } catch (err) {
    console.error('Ошибка при отправке алерта админу:', err);
  }
};

module.exports = sendAlertToAdmin;
