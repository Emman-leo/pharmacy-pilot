export function getRange(period, customStart, customEnd) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);

  if (period === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    return {
      start_date: customStart,
      end_date: customEnd,
      group: 'day',
    };
  }

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      group: 'day',
    };
  }

  if (period === 'week') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      group: 'day',
    };
  }

  if (period === 'month') {
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      group: 'day',
    };
  }

  if (period === 'quarter') {
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      group: 'week',
    };
  }

  if (period === 'year') {
    start.setFullYear(start.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      group: 'month',
    };
  }

  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    group: 'day',
  };
}
