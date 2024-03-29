# Node Technical Indicators Slack Notifier

## Description

Simple tracker that connects to Finnhub API and notifies on slack when tecnhinal indicators reach configured values

## Environment Variables

| Name                  | Description                                                                                    | Required |
|-----------------------|------------------------------------------------------------------------------------------------|----------|
| SLACK_SELL_SERVICE    | slack sell channel service                                                                     | YES      |
| SLACK_SELL_TEAM       | slack sell channel team                                                                        | YES      |
| SLACK_SELL_TOKEN      | slack sell channel token                                                                       | YES      |
| SLACK_BUY_SERVICE     | slack buy channel servie                                                                       | YES      |
| SLACK_BUY_TEAM        | slack buy channel team                                                                         | YES      |
| SLACK_BUY_TOKEN       | slack buy channel token                                                                        | YES      |
| FINNHUB_TOKEN         | Finnhub api key used to request technical indicators data                                      | YES      |
| LOG_LEVEL             | Log level, it should be dbug for development purposes and info for production purposes.        | YES      |
| NODE_ENV              | Variable used to identify the environment of the app. Should be `development` or `production`. | YES      |
| MONGODB_URL           | MongoDB connection URL.                                                                        | YES      |
| TRADE_BOT_API_KEY     | Value used to protect to the api exposed by the bot web component.                             | YES      |
| SYMBOLS               | Symbols that will be tracked                                                                   | YES      |      

## Running

```sh
$ yarn
$ cp .env.example .env
$ yarn start
```
