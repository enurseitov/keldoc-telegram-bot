# keldoc-telegram-bot
Telegram bot that scrapes KelDoc for available slots for vaccine dose and sends a notification to all its subscribers once one or more are available in next few days.


How to use:

* modify `config.json`
  * add your bot token obtained from @BotFather
  * modify URLs to check
* run `main.js` with node

The script will terminate on unhandled promise rejection which happens from time to time, so run it with `forever` or `pm2` or similar.

Script use `puppeteer` to reload whole pages. To make it more efficient, you can modify it a bit to click on the appropriate dropdowns instead of reloading the whole page, it will be much faster.