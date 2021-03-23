const Bugsnag = require('@bugsnag/js');
require('dotenv').config();
const { RSI } = require('technicalindicators');
const { BollingerBands, SMA } = require('trading-signals');
const { log } = require('./utils/logger');
const {
  OPERATIONAL_LOG_TYPE: OPERATIONAL,
  ERROR_SEVERITY: ERROR,
} = require('./utils/constants');
const { decimalAdjust } = require('./utils/calculation');
const {
  publishSellAlert, publishBuyAlert,
} = require('./gateways/slack-gateway');
const { SELL_RULE, BUY_RULE } = require('./utils/rules');
const DecisionEngine = require('./decision-engine');
const { getQuote, getCandles } = require('./gateways/binnance-gateway');

const delay = (interval) => new Promise((resolve) => setTimeout(resolve, interval));

const proccessResults = (indicatorResults) => {
  try {
    const sellWeight = DecisionEngine.evaluate(indicatorResults, SELL_RULE);
    const buyWeight = DecisionEngine.evaluate(indicatorResults, BUY_RULE);

    if (sellWeight > 0) publishSellAlert(indicatorResults, sellWeight);
    if (buyWeight > -20) publishBuyAlert(indicatorResults, buyWeight);

    log({
      message: `Resume for symbol ${indicatorResults.symbol}`,
      rsi: indicatorResults.rsi,
      bb_upper: indicatorResults.bb_upper,
      bb_lower: indicatorResults.bb_lower,
      current_quote: indicatorResults.current_quote,
      sma50: indicatorResults.sma50,
      sell_weight: sellWeight,
      buy_weight: buyWeight,
      type: OPERATIONAL,
      transactional: true,
    });
  } catch (exception) {
    const message = 'Error occurred processing results';
    const error = exception.toString();
    const stackTrace = exception.stack;

    log({
      message,
      error,
      errorr_trace: stackTrace,
      type: OPERATIONAL,
      transactional: true,
      severity: ERROR,
    });
  }
};

const analyseSymbol = async (symbol) => {
  let candles; let quote;

  try {
    quote = (await getQuote(symbol)).data.price;
  } catch (e) {
    log({
      message: 'Error during retrieving quote', error: e.toString(), errorr_trace: e.stack, type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  try {
    candles = (await getCandles(symbol)).data.map((x) => x[4]);
  } catch (e) {
    log({
      message: 'Error during retrieving candles', error: e.toString(), errorr_trace: e.stack, type: OPERATIONAL, transactional: false, severity: ERROR,
    });
  }

  const rsiArray = RSI.calculate({
    values: candles,
    period: 14,
  });
  const rsiValue = decimalAdjust('floor', rsiArray[rsiArray.length - 1], -2);
  console.log('rsi', symbol, rsiValue);

  const bb = new BollingerBands(14, 2);

  candles.forEach((x) => bb.update(x));

  const bollingerBandsLower = decimalAdjust('floor', bb.getResult().lower.valueOf(), -6);

  const bollingerBandsUpper = decimalAdjust('floor', bb.getResult().upper.valueOf(), -6);

  const sma50 = new SMA(50);
  candles.slice(candles.length - 50, candles.length).forEach((x) => sma50.update(x));

  const sma50Value = decimalAdjust('floor', sma50.getResult().valueOf(), -6);

  // const sma200 = new SMA(200);
  // candles.slice(candles.length - 200, candles.length).forEach((x) => sma200.update(x));
  //
  // const sma200Value = decimalAdjust('floor', sma200.getResult().valueOf(), -6);

  proccessResults({
    symbol,
    rsi: rsiValue,
    bb_upper: bollingerBandsUpper,
    bb_lower: bollingerBandsLower,
    current_quote: quote,
    sma50: sma50Value,
  });
};

const start = async () => {
  const symbols = process.env.SYMBOLS.split(',');
  while (true) {
    log({
      message: 'starting symbols analysis loop', type: OPERATIONAL, transactional: false,
    });
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < symbols.length; i++) {
      log({
        message: `analysing ${symbols[i]}`, type: OPERATIONAL, transactional: true,
      });
      // eslint-disable-next-line no-await-in-loop
      await analyseSymbol(symbols[i]);
    }
    log({
      message: 'finishing symbols analysis loop', type: OPERATIONAL, transactional: false,
    });
    // eslint-disable-next-line no-await-in-loop
    await delay(720000);
  }
};

if (process.env.BUSGNAG_API_KEY) {
  Bugsnag.start({ apiKey: `${process.env.BUSGNAG_API_KEY}` });
}

try {
  start();
} catch (exception) {
  const message = 'Error occured in bot, shutting down. Check the logs for more information.';
  const error = exception.toString();
  const stackTrace = exception.stack;

  log({
    message,
    error,
    errorr_trace: stackTrace,
    type: OPERATIONAL,
    transactional: true,
    severity: ERROR,
  });
  start();
}
