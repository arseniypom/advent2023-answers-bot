const getTodaysDay = () => {
  const moscowTime = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
  });
  const [day] = moscowTime.split('.');
  return day;
};

module.exports = getTodaysDay;
