const Bugsnag = require('@bugsnag/js');
require('dotenv').config();
const { log, sendAndCloseLogzio } = require('./utils/logger');
const {
  OPERATIONAL_LOG_TYPE: OPERATIONAL,
  ERROR_SEVERITY: ERROR,
} = require('./utils/constants');
const { decimalAdjust } = require('./utils/calculation');
const startClient = require('./client');
const {
  getRSI, getBollingerBands, getSMA,
} = require('./gateways/finnhub-gateway');
const {
  publishSellAlert, publishBuyAlert,
} = require('./gateways/slack-gateway');
const { SELL_RULE, BUY_RULE } = require('./utils/rules');
const DecisionEngine = require('./decision-engine');

const lastPrice = {};

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
  let rsiResponse; let
    bollingerBandsResponse; let sma50Response;
  try {
    [rsiResponse,
      bollingerBandsResponse,
      sma50Response] = await Promise.all([
      getRSI(symbol),
      getBollingerBands(symbol),
      getSMA(symbol, 50),
    ]);
  } catch (e) {
    log({
      message: 'Error during retrieving indicators', error: e.toString(), type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  const rsiValues = rsiResponse.data.rsi;

  if (!rsiValues) {
    log({
      message: 'RSI has no value for some reason', type: OPERATIONAL, transactional: true, severity: ERROR,
    });
    return;
  }
  const rsiValue = decimalAdjust('floor', rsiValues[rsiValues.length - 1], -2);

  const bollingerBandsLower = decimalAdjust('floor', bollingerBandsResponse.data.lowerband[
    bollingerBandsResponse.data.upperband.length - 1
  ], -6);

  const bollingerBandsUpper = decimalAdjust('floor', bollingerBandsResponse.data.upperband[
    bollingerBandsResponse.data.upperband.length - 1
  ], -6);

  const sma50 = decimalAdjust('floor', sma50Response.data.sma[sma50Response.data.sma.length - 1], -6);

  const currentQuote = lastPrice[symbol];

  proccessResults({
    symbol,
    rsi: rsiValue,
    bb_upper: bollingerBandsUpper,
    bb_lower: bollingerBandsLower,
    current_quote: currentQuote,
    sma50,
  });
};

const start = async () => {
  const symbols = process.env.SYMBOLS.split(',');
  try {
    while (true) {
      log({
        message: 'starting symbols analysis loop', type: OPERATIONAL, transactional: false,
      });
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < symbols.length; i++) {
        log({
          message: `analysing ${symbols[i]}`, type: OPERATIONAL, transactional: true,
        });
        if (lastPrice[symbols[i]]) {
        // eslint-disable-next-line no-await-in-loop
          await analyseSymbol(symbols[i]);
        } else {
          log({
            message: `skipping ${symbols[i]} because no last price is set`, type: OPERATIONAL, transactional: true,
          });
        }
      }
      log({
        message: 'finishing symbols analysis loop', type: OPERATIONAL, transactional: false,
      });
      // eslint-disable-next-line no-await-in-loop
      await delay(300000);
    }
    // await analyseSymbol('CRM');
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

    sendAndCloseLogzio();
    process.exit(1);
  }
};

if (process.env.BUSGNAG_API_KEY) {
  Bugsnag.start({ apiKey: `${process.env.BUSGNAG_API_KEY}` });
}
start();

startClient((symbol, price) => {
  lastPrice[symbol] = price;
});
