const getTodaysDay = () => {
  const moscowTime = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
  });
  const [day] = moscowTime.split('.');
  return parseInt(day, 10).toString();
};

module.exports = getTodaysDay;
