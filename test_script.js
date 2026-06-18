const MIN_DATE = new Date("2000-01-01T00:00:00.000Z");
const MAX_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
console.log(MIN_DATE.getTime(), MAX_DATE.getTime());
