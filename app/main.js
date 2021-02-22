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

const analyseSymbol = async (symbol, lastPrice) => {
  let rsiResponse; let
    bollingerBandsResponse; let sma50Response;
  try {
    rsiResponse = await getRSI(symbol);
  } catch (e) {
    log({
      message: 'Error during retrieving RSI indicator', error: e.toString(), errorr_trace: e.stack, type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  try {
    bollingerBandsResponse = await getBollingerBands(symbol);
  } catch (e) {
    log({
      message: 'Error during retrieving BollingerBands indicator', error: e.toString(), errorr_trace: e.stack, type: OPERATIONAL, transactional: false, severity: ERROR,
    });
    return;
  }
  try {
    sma50Response = await getSMA(symbol, 50);
  } catch (e) {
    log({
      message: 'Error during retrieving SMA 50 indicator', error: e.toString(), errorr_trace: e.stack, type: OPERATIONAL, transactional: false, severity: ERROR,
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

  const currentQuote = lastPrice;

  proccessResults({
    symbol,
    rsi: rsiValue,
    bb_upper: bollingerBandsUpper,
    bb_lower: bollingerBandsLower,
    current_quote: currentQuote,
    sma50,
  });
};

if (process.env.BUSGNAG_API_KEY) {
  Bugsnag.start({ apiKey: `${process.env.BUSGNAG_API_KEY}` });
}

startClient(analyseSymbol);
