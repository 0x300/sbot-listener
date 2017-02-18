const autoit = require('autoit')
const fb = require('firebase-admin')
fb.initializeApp({
  credential: fb.credential.cert('bot-manager-9cdd2-firebase-adminsdk-y2gfn-6fd60e9166.json'),
  databaseURL: "https://bot-manager-9cdd2.firebaseio.com"
})

const characterName = 'Dragneel'
const db = fb.database();
const logRef = db.ref('Dragneel/log')
const charStatusRef = db.ref(`${characterName}/botStatus`)
const globalChatRef = db.ref(`chat/global`)

autoit.Init()
autoit.Opt("WinTitleMatchMode", 2); // enable partial string matching
autoit.WinWait(characterName)

// Get hWnd's for window and controls
const botHwnd = autoit.WinGetHandle(characterName) // need to have before calls to getCtrlHandleById!!

function getCtrlHandleById(id, windowHwnd = botHwnd) {
  return autoit.ControlGetHandle(botHwnd, `[ID:${id}]`)
}

const logCtrl = [botHwnd, getCtrlHandleById(1133)]
const btnStartTrainingCtrl = [botHwnd, getCtrlHandleById(1130)]
const btnStopTrainingCtrl = [botHwnd, getCtrlHandleById(1131)]
const btnResetStatsCtrl = [botHwnd, getCtrlHandleById(1126)]
const btnSaveSettingsCtrl = [botHwnd, getCtrlHandleById(1128)]
const silkroadServerStatusCtrl = [botHwnd, getCtrlHandleById(235)]
const charStatusCtrl = [botHwnd, getCtrlHandleById(237)]
const charGoldCtrl = [botHwnd, getCtrlHandleById(1096)]
const charKillsCtrl = [botHwnd, getCtrlHandleById(1105)]
const charDeathsSessionCtrl = [botHwnd, getCtrlHandleById(1121)]
const botUptimeCtrl = [botHwnd, getCtrlHandleById(1103)]
const globalChatCtrl = [botHwnd, getCtrlHandleById(784)]

// Poll the bot log for changes and upload text to firebase
let prevLogText = autoit.ControlGetText(...logCtrl, 200000000)
setInterval(() => {
  const newLogText = autoit.ControlGetText(...logCtrl, 200000000).replace(prevLogText, '')
  if (!newLogText) return;

  // Push the new log text to firebase
  logRef.push().set(newLogText.split('\r\n').slice(0,-1))
  prevLogText += newLogText;
}, 1000)

// Poll bot for bot status
setInterval(() => {
  // Get values from each of the bot ui controls
  const botState = {
    gold: autoit.ControlGetText(...charGoldCtrl),
    botUptime: autoit.ControlGetText(...botUptimeCtrl),
    charKills: autoit.ControlGetText(...charKillsCtrl),
    charStatus: autoit.ControlGetText(...charStatusCtrl),
    charDeathsSession: autoit.ControlGetText(...charDeathsSessionCtrl)
  }

  // Send updated bot state object to firebase
  charStatusRef.set(botState)
}, 1000)

// Poll bot for global chat
let prevGlobalChat = autoit.ControlGetText(...globalChatCtrl, 200000000)
setInterval(() => {
  const newChatText = autoit.ControlGetText(...globalChatCtrl, 200000000).replace(prevGlobalChat, '')
  if (!newChatText) return;

  // Split the chat up on newline and construct a message object for each msg
  newChatText.split('\r\n').slice(0,-1).forEach((message) => {
    globalChatRef.push(constructMsgObj(message))
  })

  prevGlobalChat += newChatText;
}, 1000)

// Constructs an object for a chat message that has parsed out information
// about the sender and whether there are things they want to sell, buy, or trade
function constructMsgObj(msg) {
  // make sure message isn't empty or undefined
  if(!(msg !== '' && msg)) return;

  const obj = {
    message: msg,
    senderName: '',
    offers: {
      wts: [],
      wtb: [],
      wtt: []
    }
  }

  // parse sender name
  const senderName = msg.match(/\((?:Global|Guild|Party|Private|General)\)(.*?)(?=:)/)
  if(senderName) obj.senderName = senderName[1]

  // parse offers from message
  const matchArr = msg.toLowerCase().match(/((wtb|wts|wtt)(.*?))+?(?=wts|wtb|wtt|$)/g)
  if(!matchArr) return obj; // no offers found.. just return the message object

  // push each offer into the appropriate array
  matchArr.forEach((match) => {
    obj.offers[match.substring(0,3)].push(match);
  });

  return obj;
}

// Make it easier to exit the process since windows handles SIGINT oddly
if (process.platform === "win32") {
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function () {
  process.exit();
});
