const W3CWebSocket = require('websocket').w3cwebsocket;

require('dotenv').config();
const { log, sendAndCloseLogzio } = require('./utils/logger');
const {
  OPERATIONAL_LOG_TYPE: OPERATIONAL,
  ERROR_SEVERITY: ERROR,
} = require('./utils/constants');

module.exports = (updatePriceCallback) => {
  const client = new W3CWebSocket(process.env.FINNHUB_WS_SERVER);
  client.onerror = (error) => {
    log({
      message: `Connect Error: ${error.toString()}`,
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
      const price = data.data[0].p;
      const symbol = data.data[0].s;
      updatePriceCallback(symbol, price);
      // log({
      //   message: `Messsage: {symbol:${symbol} price: ${price}}`,
      //   type: OPERATIONAL,
      //   transactional: true,
      // });
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
