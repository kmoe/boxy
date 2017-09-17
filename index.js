const R = require('ramda');
const fs = require('fs');
const readline = require('readline');
const async = require('async');
const jsonfile = require('jsonfile');
const pify = require('pify');
const winston = require('winston');
const vsprintf = require('sprintf-js').vsprintf;
const WebTorrent = require('webtorrent');
const parseTorrent = require('parse-torrent');
const Telegraf = require('telegraf');
const { Extra, memorySession, reply, Markup } = Telegraf;

const generateRandomWords = require('./generate-random-words');

const DL_YES = 'dl_yes';
const DL_NO = 'dl_no';
const SAMPLE_TORRENT_URI = 'https://archive.org/download/thelivesofthetwe06393gut/thelivesofthetwe06393gut_archive.torrent'; // Suetonius Twelve Caesars Chapter VIII - Otho
const { BOXY_TORRENT_SUBSCRIBERS_FILENAME, BOXY_ALLOWED_USERS_FILENAME, BOXY_TELEGRAM_API_TOKEN, TORRENT_DOWNLOAD_PATH, URL_LINK } = process.env;
const BOXY_EXPECTED_NUMBER_OF_USERS = 2;

let DIALOGUE_STRINGS = {};

winston.add(winston.transports.File, {
  filename: 'log.log',
  handleExceptions: true,
  humanReadableUnhandledException: true,
  exitOnError: false,
});

const torrentClient = new WebTorrent();
torrentClient.on('error', winston.error);

const torrentSubscribersQueue = async.queue((task, callback) => {
  winston.info('executing', task.name);
  callback();
});

const bot = new Telegraf(BOXY_TELEGRAM_API_TOKEN);
bot.catch((err) => {
  winston.error(`error ${err}, continuing`);
});

const allowedUsers = fs.readFileSync(BOXY_ALLOWED_USERS_FILENAME).toString().split('\n', BOXY_EXPECTED_NUMBER_OF_USERS);

const unrecognisedMessageCounts = {}; //map allowedUsers to {user:0}
allowedUsers.forEach((user) => {
  unrecognisedMessageCounts[user] = 0;
});

bot.use(memorySession());

// logger middleware
bot.use((ctx, next) => {
  winston.info(ctx.message);
  const start = new Date();
  return next().then(() => {
    const ms = new Date() - start;
    winston.verbose('response time %sms', ms);
  });
});

// auth middleware
bot.use(Telegraf.branch((ctx) => !ctx.message || allowedUsers.includes(ctx.message.from.id.toString()), Telegraf.safePassThru(), reply(getDialogueString('unknown_user'))));

const dlMenu = Markup
  .inlineKeyboard([
    Markup.callbackButton('yes', DL_YES),
    Markup.callbackButton('no', DL_NO),
  ])
  .oneTime()
  .extra();

// parse torrent middleware
bot.use(Telegraf.mount('message', (ctx, next) => {
  const msg = ctx.message.text;
  const thisUser = ctx.message.from.id.toString();
  const unrecognisedMessagesFromThisUser = unrecognisedMessageCounts[thisUser];

  if (unrecognisedMessagesFromThisUser > 2) {
    unrecognisedMessageCounts[ctx.message.from.id.toString()] = 0;
    winston.info(`got ${unrecognisedMessagesFromThisUser} non-torrent messages from ${thisUser}`);
    return ctx.reply(getDialogueString("help_long"));
  }

  // short-circuit if the message looks nothing like a torrent link
  if (!msg.includes(':')) {
    unrecognisedMessageCounts[thisUser]++;
    winston.info(`assuming message ${msg} is not a torrent link`);
    return ctx.reply(getDialogueString("default_reply"));
  }

  return pify(parseTorrent.remote)(msg).then(parsedTorrent => {
    if (!parsedTorrent) {
      winston.info(`torrent ${msg} could not be parsed`);
      return ctx.reply(getDialogueString("could_not_parse_torrent"), [msg]);;
    }

    ctx.session.parsedTorrent = parsedTorrent;

    const torrentName = parsedTorrent.dn || parsedTorrent.name;

    if (!torrentName) {
      addTorrent(parsedTorrent, ctx.message.from.id.toString());
      return next();
    }

    return ctx.reply(getDialogueString("parsed_torrent_name", [torrentName]), dlMenu);
  });
}));

bot.on('callback_query', (ctx, next) => {
  switch (ctx.update.callback_query.data) {
    case DL_NO:
      winston.info('user clicked no');
      return ctx.reply(getDialogueString("torrent_download_declined"));
    case DL_YES:
      winston.info(`going to download torrent ${ctx.session.parsedTorrent.infoHash}`);
      winston.info('CALLBACK_QUERY');
      winston.info(ctx.update.callback_query);
      winston.info(ctx.update.callback_query.from.id.toString());
      addTorrent(ctx.session.parsedTorrent, ctx.update.callback_query.from.id.toString()); // throws
      return ctx.reply(getDialogueString("torrent_download_confirmed"));
    default:
      winston.warn('unknown callback_query type, o no');
      break;
  }
  next();
});

// returns array of user ids subscribed to given torrent by infohash
function updateTorrentSubscription(infoHash, userId, subscribed, error) {
  const filename = BOXY_TORRENT_SUBSCRIBERS_FILENAME;

  //parse JSON into object, modify object, overwrite file
  //if file is fucked (not valid JSON) just overwrite with new data
  jsonfile.readFile(filename, (err, obj) => {
    if (err) {
      winston.warn('error reading JSON file: ', err.message);
      obj = {[infoHash]: {[userId]: [subscribed]}};
    } else {
      obj[infoHash] = obj[infoHash] || {};
      obj[infoHash][userId] = subscribed;
    }

    jsonfile.writeFile(filename, obj, (err) => {
      if (err) {
        winston.warn('error writing to JSON file: ', err.message);
      }
    });
  });
}

function addTorrentSubscription(infoHash, userId) {
  torrentSubscribersQueue.push({name: 'hi'}, R.partial(updateTorrentSubscription, [infoHash, userId, true]));
}

function removeTorrentSubscription(infoHash, userId) {
  torrentSubscribersQueue.push({name: 'hi2'}, R.partial(updateTorrentSubscription, [infoHash, userId, false]));
}

function getTorrentSubscribers(infoHash, callback) {
  jsonfile.readFile(BOXY_TORRENT_SUBSCRIBERS_FILENAME, (err, obj) => {
    if (err) {
      winston.warn('error reading JSON file: ', err.message);
    }

    callback(err, obj[infoHash]);
  });
}

// N.B. only call this with parsed torrents (at least {infoHash: ...})
function addTorrent(parsedTorrent, userId) {
  torrentClient.add(parsedTorrent, {
    path: TORRENT_DOWNLOAD_PATH,
  }, (torrent) => {
    winston.info(`torrenting ${torrent.infoHash}`);

    addTorrentSubscription(torrent.infoHash, userId); // infoHash already exists since this is a parsed torrent

    torrent.on('error', (err) => {
      winston.info(`${err.name} ${err.message}`);
      if (err.message.contains('duplicate')) {
        removeTorrentSubscription(torrent.infoHash, userId);
        winston.info('duplicate, need to inform user'); // i've already got this torrent and it's 50% downloaded
      }
    });

    torrent.on('metadata', winston.info);

    torrent.on('ready', () => {
      winston.info(`torrent ${torrent.infoHash} ready`);
    });

    torrent.on('download', (bytes) => {
      winston.info(`just downloaded:  ${bytes}`);
      winston.info(`total downloaded: ${torrent.downloaded}`);
      winston.info(`download speed: ${torrent.downloadSpeed}`);
      winston.info(`progress: ${torrent.progress}`);
    });

    torrent.on('done', () => {
      winston.info(`torrent ${torrent.infoHash} done`);

      getTorrentSubscribers(torrent.infoHash, (err, subscribers) => {
        if (err) {
          winston.info('error getting torrent subscribers: ', err.message)
        }

        if (subscribers) {
          Object.keys(subscribers).forEach((subscriber) => {
            if (subscribers[subscriber]) {
              bot.telegram.sendMessage(subscriber, getDialogueString("torrent_download_complete", [torrent.name, URL_LINK]));
            //  removeTorrentSubscription(torrent.infoHash, subscriber);
            }
          });
        }
      });
    });
  });
}

jsonfile.readFile('dialogue.json', (err, obj) => {
  if (err) {
    winston.error('could not read dialogue file, aborting');
    return;
  }

  DIALOGUE_STRINGS = obj;

  bot.startPolling();
});

function getDialogueString(key, templateVars) { //templateVars is an array
  const dialogueLine = DIALOGUE_STRINGS[key];

  if (!templateVars || !templateVars.length) {
    return dialogueLine;
  }

  return vsprintf(dialogueLine, templateVars);
}
