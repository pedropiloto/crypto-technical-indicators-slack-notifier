const WS = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

require('dotenv').config();
const { log, sendAndCloseLogzio } = require('./utils/logger');
const {
  OPERATIONAL_LOG_TYPE: OPERATIONAL,
  ERROR_SEVERITY: ERROR,
} = require('./utils/constants');

module.exports = (analyseSymbol) => {
  const options = {
    WebSocket: WS, // custom WebSocket constructor
    debug: true,
  };
  const client = new ReconnectingWebSocket(process.env.FINNHUB_WS_SERVER, [], options);

  const counter = {};
  client.onerror = (error) => {
    log({
      message: `Connect Error: ${JSON.stringify(error)}`,
      error: error.toString(),
      type: OPERATIONAL,
      transactional: true,
      severity: ERROR,
    });

    sendAndCloseLogzio();
    process.exit(1);
  };

  client.onopen = () => {
    log({
      message: 'Connection Success',
      type: OPERATIONAL,
      transactional: true,
    });
    const symbols = process.env.SYMBOLS.split(',');
    symbols.forEach((item) => client.send(JSON.stringify({ type: 'subscribe', symbol: item })));
  };

  client.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data);
      if (data.type === 'trade') {
        const price = data.data[0].p;
        const symbol = data.data[0].s;
        if (!counter[symbol] || counter[symbol] === 200) {
          analyseSymbol(symbol, price);
          counter[symbol] = 1;
          log({
            message: `Processing Messsage: {symbol:${symbol} price: ${price}}`,
            type: OPERATIONAL,
            transactional: true,
          });
        } else {
          counter[symbol] += 1;
        }
      }
    } catch (error) {
      log({
        message: `Error Proccessing Messsage: ${error.toString()}`,
        error: error.toString(),
        errorr_trace: error.stack,
        type: OPERATIONAL,
        transactional: true,
        severity: ERROR,
      });
    }
  };
};
