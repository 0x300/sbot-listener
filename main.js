const
    autoit = require("autoit"),
    fb = require("firebase-admin")

const config = require("config/bot-reader.json")

fb.initializeApp({
    credential: fb.credential.cert(
        "config/bot-manager-9cdd2-firebase-adminsdk-y2gfn-6fd60e9166.json"
    ),
    databaseURL: "https://bot-manager-9cdd2.firebaseio.com"
})

const
    db = fb.database(),
    logRef = db.ref("Dragneel/log"),
    charStatusRef = db.ref(`${characterName}/botStatus`),
    globalChatRef = db.ref(`chat/global`),
    uniqueRef = db.ref(`uniques`)

const characterName = config.characterName

autoit.Init()
autoit.Opt("WinTitleMatchMode", 2) // enable partial string matching
autoit.WinWait(characterName)

// Get hWnd's for window and controls
const botHwnd = autoit.WinGetHandle(characterName) // need to have before calls to getCtrlHandleById!!

function getCtrlHandleById(id, windowHwnd = botHwnd) {
    return autoit.ControlGetHandle(botHwnd, `[ID:${id}]`)
}

// TODO: Figure out how I want to handle bot generic handles
const
    logCtrl = [botHwnd, getCtrlHandleById(1133)],
    btnStartTrainingCtrl = [botHwnd, getCtrlHandleById(1130)],
    btnStopTrainingCtrl = [botHwnd, getCtrlHandleById(1131)],
    btnResetStatsCtrl = [botHwnd, getCtrlHandleById(1126)],
    btnSaveSettingsCtrl = [botHwnd, getCtrlHandleById(1128)],
    silkroadServerStatusCtrl = [botHwnd, getCtrlHandleById(235)],
    charStatusCtrl = [botHwnd, getCtrlHandleById(237)],
    charGoldCtrl = [botHwnd, getCtrlHandleById(1096)],
    charKillsCtrl = [botHwnd, getCtrlHandleById(1105)],
    charDeathsSessionCtrl = [botHwnd, getCtrlHandleById(1121)],
    botUptimeCtrl = [botHwnd, getCtrlHandleById(1103)],
    globalChatCtrl = [botHwnd, getCtrlHandleById(784)],
    uniqueChatCtrl = [botHwnd, getCtrlHandleById(786)]

// TODO: Use cli args or config to turn these on or off instead of commenting out
// Poll the bot log for changes and upload text to firebase
// let prevLogText = autoit.ControlGetText(...logCtrl, 200000000)
// setInterval(() => {
//   const currLogCtrlText = autoit.ControlGetText(...logCtrl, 200000000)
//   const newLogText = currLogCtrlText.replace(prevLogText, '')
//   if (!newLogText) return
//   prevLogText = currLogCtrlText
//
//   // Push the new log text to firebase
//   logRef.push().set(newLogText.split('\r\n').slice(0,-1))
// }, 1000)

// Poll bot for bot status
// setInterval(() => {
//   // Get values from each of the bot ui controls
//   const botState = {
//     gold: autoit.ControlGetText(...charGoldCtrl),
//     botUptime: autoit.ControlGetText(...botUptimeCtrl),
//     charKills: autoit.ControlGetText(...charKillsCtrl),
//     charStatus: autoit.ControlGetText(...charStatusCtrl),
//     charDeathsSession: autoit.ControlGetText(...charDeathsSessionCtrl)
//   }
//
//   // Send updated bot state object to firebase
//   charStatusRef.set(botState)
// }, 1000)

// Poll bot for global chat
// let prevGlobalChat = autoit.ControlGetText(...globalChatCtrl, 200000000)
// setInterval(() => {
//   const newChatText = autoit.ControlGetText(...globalChatCtrl, 200000000).replace(prevGlobalChat, '')
//   if (!newChatText) return
//
//   // Split the chat up on newline and construct a message object for each msg
//   newChatText.split('\r\n').slice(0,-1).forEach((message) => {
//     globalChatRef.push(constructMsgObj(message))
//   })
//
//   prevGlobalChat += newChatText
// }, 1000)
// TODO: When storing message times, store in UTC to simplify timezone calculation for the client app
// TODO: Is there some event I can listen for to know when the bot gets more chat content instead of polling?
// Poll bot for uniques
// let prevUniqueChat = autoit.ControlGetText(...uniqueChatCtrl, 200000000)
let prevUniqueChat = ""
setInterval(() => {
    // const newChatText = autoit.ControlGetText(...uniqueChatCtrl, 200000000).replace(prevUniqueChat, '')

    // TODO: This method gets expensive as the log gets longer.. need to just get recent content and prune cached chat
    const newChatText = autoit
        .ControlGetText(...uniqueChatCtrl, 20000)
        .replace(prevUniqueChat, "")

    if (!newChatText) return

    // TODO: Move regex to config so this can support multiple bots
    // Split the chat up on newline and construct a message object for each msg
    newChatText
        .split("\r\n")
        .slice(0, -1)
        .forEach(message => {
            if (message.match(/.*spawned.*|.*killed.*/)) {
                // this should really just update status to alive..
                const uniqueObj = constructUniqueObj(message)
                uniqueRef.child(`${uniqueObj.uniqueName}/${uniqueObj.type}`).set({
                    status: uniqueObj.status,
                    statusUpdateTime: uniqueObj.statusUpdateTime
                })
            }
        })

    prevUniqueChat += newChatText
}, 3000)

// Constructs an object for a chat message that has parsed out information
// about the sender and whether there are things they want to sell, buy, or trade
function constructMsgObj(msg) {
    // make sure message isn't empty or undefined
    if (!(msg !== "" && msg)) return

    const obj = {
        message: msg,
        senderName: "",
        offers: {
            wts: [],
            wtb: [],
            wtt: []
        }
    }

    // parse sender name
    const senderName = msg.match(
        /\((?:Global|Guild|Party|Private|General)\)(.*?)(?=:)/
    )
    if (senderName) obj.senderName = senderName[1]

    // parse offers from message
    const matchArr = msg
        .toLowerCase()
        .match(/((wtb|wts|wtt)(.*?))+?(?=wts|wtb|wtt|$)/g)
    if (!matchArr) return obj // no offers found.. just return the message object

    // push each offer into the appropriate array
    matchArr.forEach(match => {
        obj.offers[match.substring(0, 3)].push(match)
    })

    return obj
}

function constructUniqueObj(msg) {
    // make sure message isn't empty or undefined
    if (!(msg !== "" && msg)) return

    const obj = {}

    // parse unique information
    const isUniqueSpawned = msg.match(/.*spawned.*/) ? true : false
    const parsedMsg = isUniqueSpawned ?
        msg.match(/\[(\d\d:\d\d:\d\d)\] ((?:\w+ )*\w+) (?:\((STR|INT)\))?/) :
        msg.match(
            /\[(\d\d:\d\d:\d\d)\]\ \w+ killed ((?:\w+ )*\w+)(?: \((STR|INT)\))?/
        )

    if (parsedMsg) {
        obj.statusUpdateTime = parsedMsg[1] ? parsedMsg[1] : ""
        obj.status = isUniqueSpawned ? "alive" : "dead"
        obj.uniqueName = parsedMsg[2] ? parsedMsg[2] : ""
        obj.type = parsedMsg[3] ? parsedMsg[3] : ""
    }

    return obj
}

// Make it easier to exit the process since windows handles SIGINT oddly
if (process.platform === "win32") {
    var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    })

    rl.on("SIGINT", function () {
        process.emit("SIGINT")
    })
}

process.on("SIGINT", function () {
    process.exit()
})
