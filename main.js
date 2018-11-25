const _ = require("lodash");
const { default: magister, getSchools } = require("magister.js");
const electron = require("electron");
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const isDev = require('electron-is-dev');

if (isDev) {
    require("electron-reload")(__dirname, {
        electron: require(`${__dirname}/node_modules/electron`)
    });
}

let mainWin;
let authWin;

function createWindow() {
    mainWin = new BrowserWindow({
        width: 1220,
        height: 800,
        show: false,
        icon: path.join(__dirname, 'img/icons/icon@64px.png')
    });

    authWin = new BrowserWindow({
        parent: mainWin,
        width: 500,
        height: 700,
        frame: false,
        icon: path.join(__dirname, 'img/icons/icon@64px.png')
    });

    mainWin.on("closed", function () {
        app.quit();
    });

    authWin.loadURL(url.format({
        pathname: path.join(__dirname, "auth.html"),
        protocol: "file:",
        slashes: true
    }));
}

ipcMain.on("validate-creds", (event, creds) => {
    getSchools(creds.school)
	    .then((schools) => schools[0])
	    .then((school) => magister({
		    school,
		    username: creds.username,
		    password: creds.password,
        }))
        .then((m) => {
            global.m = m;
            authWin.webContents.send("login-success", true);
        }, (err) => {
            authWin.webContents.send("login-success", false);
        });
});

ipcMain.on("prepare-main", (event) => {
    mainWin.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true
    }));
})

ipcMain.on("content-loaded", (event) => {
    try {
        authWin.close();
        mainWin.show();
    } catch (err) { }
});

app.on("ready", function () {
    createWindow();
});
