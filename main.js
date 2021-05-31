const config = require('./config.json');
const puppeteer = require('puppeteer');
const fs = require('fs');


function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

console.logCopy = console.log.bind(console);
console.log = function (data) {
   var currentDate = '[' + new Date().toUTCString() + '] ';
   console.logCopy(currentDate, data);
};

const TelegramBot = require('node-telegram-bot-api');
const token = config.botToken;
const bot = new TelegramBot(token, { polling: true });

const botCommands = [
   // { command: "test", description: "test" },

   { command: "subscribe", description: "S'abonner aux notifications" },
   { command: "unsubscribe", description: "Arrêter les notifications" },
   { command: "buycoffee", description: "Offrir un café au développeur" }
]
bot.setMyCommands(botCommands);


process.on('unhandledRejection', up => {
   throw up
})

let subscribers = []
try {
   subscribers = JSON.parse(fs.readFileSync('subs.json', 'utf-8'));
} catch (error) {
   console.log("Subs file does not exist")
}
console.log(JSON.stringify(subscribers))

async function sendToAllSubscribers(message, picture) {
   for (const subscriber of subscribers) {
      if (picture) {
         bot.sendPhoto(subscriber.id, picture,
            {
               caption: message,
               parse_mode: "Markdown"
            })
      }
      else (
         bot.sendMessage(subscriber.id, message, { parse_mode: "Markdown" })
      )
      await sleep(50) // to not get banned by Telegram API (30 messages/second max)
   }
}
bot.on("polling_error", console.log);

bot.on('message', (msg) => {
   const chatID = msg.chat.id;

   switch (msg.text) {
      case "/start":
         addSubscriber(msg)

         bot.sendMessage(chatID, "Tapez /unsubscribe pour arrêter les notifications..")
         break;

      case "/subscribe":
         addSubscriber(msg)
         break;

      case "/unsubscribe":
         removeSubscriber(msg)
         break;

      case "/buycoffee":

         bot.sendMessage(chatID, "Vous pouvez me faire un petit don en utilisant le lien ci-dessous. \nMerci et restez en bonne santé :) \n https://www.buymeacoffee.com/enurseitov")
         break;


      default:
         bot.sendMessage(chatID, "Commande incorrecte")
         break;
   }
});

function addSubscriber(msg) {
   if (!subscribers.length || (subscribers.length && !subscribers.some(e => e.id === msg.chat.id))) {
      console.log(`New subscription: ${JSON.stringify(msg.from)}`)
      subscribers.push(msg.chat);
      bot.sendMessage(msg.chat.id, 'Vous êtes abonné aux notifications. \nLes créneaux sont pris très rapidement, alors créez le compte sur KelDoc et connectez-vous sur votre téléphone à l\'avance !');
      fs.writeFileSync('subs.json', JSON.stringify(subscribers), 'utf-8');
   }
   else {
      bot.sendMessage(msg.chat.id, 'Vous êtes déjà abonné');
   }
}

async function removeSubscriber(msg) {

   for (var i = 0; i < subscribers.length; i++) {
      if (subscribers[i].id == msg.chat.id) {
         subscribers.splice(i, 1);
         break;
      }
   }
   console.log(`Subscription stopped: ${JSON.stringify(msg.from)}`)

   bot.sendMessage(msg.chat.id, 'Vous êtes désabonné des notifications. \nPour vous abonner à nouveau, tapez /subscribe');
   fs.writeFileSync('subs.json', JSON.stringify(subscribers), 'utf-8');

   await sleep(2000);
   bot.sendMessage(msg.chat.id, 'Si ce bot vous a aidé à obtenir votre dose, vous pouvez remercier son développeur en lui [offrant un café](https://www.buymeacoffee.com/enurseitov).\nMerci ! 🙂', { parse_mode: "Markdown" });
}



async function checkPageContents(page) {
   const slots = (await page.content()).match(/[0-2][0-9]\:[0-5][0-9]/g) //RexEx simply looking for strings that look like time (e.g. 08:30)
   if (slots) {
      console.log(`Available: ${JSON.stringify(slots)}`);
      await page.screenshot({
         path: "./available.jpg",
         type: "jpeg",
         fullPage: false
      });
      sendToAllSubscribers(`⚠️ Choronodoses disponibles! ⚠️ \r\n[Réservez-une en suivant ce lien rapidement](${page.url()})`, './available.jpg')

      await sleep(60 * 1000) //to not spam
   }
   else {
      // console.log("n/a")
   }
}

async function main() {

   console.log("Bot restarted")

   const browser = await puppeteer.launch({
      headless: true,
      args: [`--window-size=1920,1080`]
   });
   const page = await browser.newPage();

   await page.setViewport({
      width: 1240,
      height: 860,
      deviceScaleFactor: 1,
   });

   await page.goto(config.urlsToCheck[0]);
   await page.waitForXPath(".//kd-patients-availability-select");
   await page.waitForSelector("#ncc-reject"); // "reject cookies" button
   await page.click("#ncc-reject")

   while (true) { //switch between Phizer and Moderna in a loop

      for (const url of config.urlsToCheck) {
         await page.goto(url);
         await page.waitForTimeout(3000); //to let the page load
         await checkPageContents(page);
         await page.waitForTimeout(config.sleepBetweenChecks)
      }
   }
}

main();