const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs');
const ipc = ipcMain;
const { EKool } = require('./lib/index');
var ekool = null;

var addWindows = [];
function createWindow () {
  var win = new BrowserWindow({
    width: 1280,
    
    height: 720,
    minHeight: 720,
    minWidth: 1280,
    
    icon: path.join(__dirname, '/src/images/ekpp_t.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });
  win.maximize();
  win.setMenuBarVisibility(false);
  win.loadFile('src/index.html')
  //api
  ipcMain.on('api', async function(event, arg){
    var method = arg.method;
    var args = arg.args;
    switch (method) {
      case "set_role":
        const role = ekool.personData.roles.filter(role => {
          return role.studentId === args[0]
        })[0]
        ekool.studentID = args[0];
        event.reply('client', {method: method, response: role})
        closeAddWins();
        break;
      case "get_feed_item":
        var item = await ekool.getFeedItem(args[0])
        event.reply('client', {method: method, response: item})
        show_feed_item(item)
        break;
      case "get_viruterm":
        event.reply('client', {method: method, response: "https://dev-roled.000webhostapp.com/projects/vtb/"})
        break;
      case "get_feed":
        const feed = await ekool.getFeedForStudent();
        const feed2 = await ekool.cleanFeed(feed);
        var cleanfeed = blankFeedLinks(feed2)
        if(ekool.personData.id == 15250255418){
          cleanfeed.unshift(generateNastenkaSpecial())
        }
        if(args.length !== 0){
          switch (args[0]) {
            case "grades":
              var grades_only = []
              cleanfeed.forEach(feed_item => {
                if(feed_item.itemType == 1) grades_only.push(feed_item);
              });
              event.reply('client', {method: method, response: {feed: grades_only, feed_type:"grades"}});
              break;
            case "other":
              var other_only = []
              cleanfeed.forEach(feed_item => {
                if(feed_item.itemType !== 1) other_only.push(feed_item);
              });
              event.reply('client', {method: method, response: {feed: other_only, feed_type:"other"}});
              break;
            default:
              event.reply('client', {method: method, response: {feed: cleanfeed, feed_type:"all"}});
              break;
          }
          break;
        }
        event.reply('client', {method: method, response: {feed: cleanfeed, feed_type:"all"}});
        break;
      case "deauth":
        ekool = null;
        closeAddWins();
        await initialize();
        win.destroy();
        event.reply('client', {method: method, response: true})
        break;
      default:
        event.reply('client', {method: method, response: null})
        break;
    }
  })
  return win;
}

app.whenReady().then(() => {
  initialize()
  app.on('activate', async function () {
    if (BrowserWindow.getAllWindows().length === 0) initialize();
    })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

function blankFeedLinks(feed) {
  var newfeed = [];
  feed.forEach(feed_item => {
    if(feed_item.itemType == 5 || feed_item.itemType == 10){
      feed_item.content = feed_item.content.replaceAll("href=","target=\"_blank\" href=")
      newfeed.push(feed_item);
    }else{
      newfeed.push(feed_item);
    }
  });
  return newfeed;
}

function generateNastenkaSpecial(){
  var quotes = [
    {text:"J - Пять."}, {text:"Пэпчики"}, {text:"Тутрагуви"}, {text:"Kotka kauplus", a:"Автобусная бабка"}, {text:"Laagna", a:"Автобусная бабка"}
  ]
  var quoteObject = quotes[Math.floor(Math.random()*quotes.length)];
  var quote = `"${quoteObject.text}"`;
  if(typeof quoteObject.a !== "undefined") quote += ` - ${quoteObject.a}`;
  
  return {itemType: "special", title: quote, subtitle:"Великий цитатник для Настеньки"};
}

function show_feed_item(item){
  var fullitem = item;
  var item = item.lastEvent;
  var feeditemwin = new BrowserWindow({
    width: 500,
    height: 500,
    resizable: false,
    icon: path.join(__dirname, '/src/images/ekpp_t.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  feeditemwin.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });
  feeditemwin.webContents.on('did-finish-load', async()=>{
    await feeditemwin.webContents.send("client", {method: "load_feed_item_info", response: fullitem});
  })
  feeditemwin.setMenuBarVisibility(false);
  feeditemwin.loadFile('src/grade.html')
  addWindows.push(feeditemwin);
}
function initialize(){
  var authwin = new BrowserWindow({
    width: 480,
    height: 480,
    resizable: false,
    title:"eKool++ | Авторизация",
    icon: path.join(__dirname, '/src/images/ekpp_t.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  authwin.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  }); 
  authwin.setMenuBarVisibility(false);
  authwin.loadFile('src/auth.html')
  //api

  ipcMain.on('api', async function(event, arg){
    var method = arg.method;
    var args = arg.args;
    switch (method) {
      case "authenticate":
        try{
          var pekool = await new EKool(await EKool.login(args[0], args[1]));
          ekool = pekool;
          await ekool.getPersonData();
          await ekool.getFamily();
          var feedwin = await createWindow();
          feedwin.webContents.on('did-finish-load', async()=>{
            await feedwin.webContents.send("client", {method: "set_person", response: ekool})
          })
          authwin.hide();
        }catch(err){
          if(!err.message.includes("500")){
            dialog.showErrorBox("Авторизация не удалась", err.message)
          }
          
          console.log(err)
        }
        break;
    }
  })
}

function closeAddWins(){
  addWindows.forEach(win => {
    try {
      win.close();
      win.destroy();
    }catch(e){}
  });
  addWindows=[];
}