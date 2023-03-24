require('dotenv').config();
const axios = require('axios');
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  reservoir: 40, // initial value
  reservoirRefreshAmount: 40,
  reservoirRefreshInterval: 60 * 1000, // must be divisible by 250

  // also use maxConcurrent and/or minTime for safety
  maxConcurrent: 1,
  minTime: 1000, // pick a value that makes sense for your use case
});

// eslint-disable-next-line import/prefer-default-export
const getCandles = async (symbol) => limiter.wrap(() => axios({
  method: 'get',
  url: `https://api.binance.com/api/v3/klines?symbol=${symbol}&limit=200&interval=1d`,
}))();

const getQuote = async (symbol) => limiter.wrap(() => axios({
  method: 'get',
  url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
}))();

module.exports = {
  getQuote, getCandles,
};
