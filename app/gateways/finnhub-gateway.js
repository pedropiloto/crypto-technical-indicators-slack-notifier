require('dotenv').config();
const moment = require('moment');
const axios = require('axios');
const Bottleneck = require('bottleneck');

const finnhubToken = `${process.env.FINNHUB_TOKEN}`;

const limiter = new Bottleneck({
  reservoir: 40, // initial value
  reservoirRefreshAmount: 40,
  reservoirRefreshInterval: 60 * 1000, // must be divisible by 250

  // also use maxConcurrent and/or minTime for safety
  maxConcurrent: 1,
  minTime: 1000, // pick a value that makes sense for your use case
});

const granularity = 3600;
const numberOfCandles = 184;

// eslint-disable-next-line import/prefer-default-export
const getRSI = async (symbol) => {
  const start = moment().subtract(granularity * numberOfCandles, 'seconds').unix();
  const end = Date.now();

  return limiter.wrap(() => axios({
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=60&from=${start}&to=${end}&indicator=rsi&timeperiod=14`,
    headers: { 'X-Finnhub-Token': finnhubToken },
  }))();
};

const getBollingerBands = async (symbol) => {
  const start = moment().subtract(granularity * numberOfCandles * 20, 'seconds').unix();
  const end = Date.now();
  return limiter.wrap(() => axios({
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${start}&to=${end}&indicator=bbands&timeperiod=20`,
    headers: { 'X-Finnhub-Token': finnhubToken },
  }))();
};

const getSMA = async (symbol, timePeriod) => {
  const start = moment().subtract(granularity * numberOfCandles * timePeriod, 'seconds').unix();
  const end = Date.now();
  return limiter.wrap(() => axios({
    method: 'get',
    url: `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${start}&to=${end}&indicator=sma&timeperiod=${timePeriod}`,
    headers: { 'X-Finnhub-Token': finnhubToken },
  }))();
};

module.exports = {
  getRSI, getBollingerBands, getSMA,
};
