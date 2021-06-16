const {
  BELOW_OPERATOR,
  ABOVE_OPERATOR,
  ABSOLUTE_VARIANCE,
  PERCENTAGE_VARIANCE,
  CURRENT_QUOTE,
} = require('./constants');

const SELL_RULE = [
  {
    metric: 'rsi',
    operator: ABOVE_OPERATOR,
    value: 66,
    assert_type: ABSOLUTE_VARIANCE,
    weight: 4,
  },
  {
    metric: 'bb_upper',
    operator: BELOW_OPERATOR,
    value: CURRENT_QUOTE,
    assert_type: PERCENTAGE_VARIANCE,
    weight: 4,
  },

  {
    metric: 'sma50',
    operator: BELOW_OPERATOR,
    value: CURRENT_QUOTE,
    assert_type: PERCENTAGE_VARIANCE,
    weight: 0.5,
  },
];

const BUY_RULE = [
  {
    metric: 'rsi',
    operator: BELOW_OPERATOR,
    value: 32,
    assert_type: ABSOLUTE_VARIANCE,
    weight: 4,
  },
  {
    metric: 'bb_lower',
    operator: ABOVE_OPERATOR,
    value: CURRENT_QUOTE,
    assert_type: PERCENTAGE_VARIANCE,
    weight: 4,
  },

  {
    metric: 'sma50',
    operator: ABOVE_OPERATOR,
    value: CURRENT_QUOTE,
    assert_type: PERCENTAGE_VARIANCE,
    weight: 1,
  },
];

module.exports = {
  SELL_RULE,
  BUY_RULE,
};
