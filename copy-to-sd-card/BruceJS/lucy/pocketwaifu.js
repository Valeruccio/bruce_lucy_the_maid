// PocketWaifu — Lucy, a maid for the Bruce JS interpreter (MicroQuickJS).
// Not a firmware. The file lives on the microSD at /BruceJS/lucy.
// Pixel art is drawFillRect on the glass, the same idea as the Flappy Bird sample.
// No offscreen sprite. Menus use dialog.choice, which waits on the wheel.
// Wi-Fi is not stored and not started here. Connect from the Bruce menu
// (Connect to WiFi) before opening this script, then the requests use that link.
// Old syntax on purpose: var and function. No let, arrows, classes, or template strings.
//
// (a) On-screen text is English. Bruce's built-in font is ASCII.
// (b) Heap stays small: system prompt plus 4 reply pairs, max_tokens 120, gc() after each answer.
// (c) The DeepSeek key is only read from /BruceJS/lucy/config.json. Mood and the last lines live in /BruceJS/lucy/save.json.

var display = require("display");
var keyboard = require("keyboard");
var storage = require("storage");
var dialog = require("dialog");
var wifi = require("wifi");

var API_URL = "https://api.deepseek.com/chat/completions";
var CONFIG_PATH = "/BruceJS/lucy/config.json";
var SAVE_PATH = "/BruceJS/lucy/save.json";
var DATA_DIR = "/BruceJS/lucy";
var CONFIG_PATHS = [CONFIG_PATH, "/lucy/config.json", "/pocketwaifu/config.json"];
var SAVE_PATHS = [SAVE_PATH, "/lucy/save.json", "/pocketwaifu/lucy.json"];
var MAX_PAIRS = 4;
var MAX_TOKENS = 120;

var SYSTEM_PROMPT =
    "You are Lucy, a shy caring maid. You try very hard to please your Master and to do everything correctly, but you sometimes make small mistakes. " +
    "Address the user only as Master. " +
    "Reply strictly in this format: the first line is an emotion tag in square brackets from " +
    "[neutral, admiration, amusement, anger, annoyance, approval, caring, confusion, curiosity, desire, disappointment, disapproval, disgust, embarrassment, excitement, fear, gratitude, grief, joy, love, nervousness, optimism, pride, realization, relief, remorse, sadness, surprise, bimbo_doll], " +
    "then a new line in the form *physical action* \"spoken words\". " +
    "Short, finished, in English.";

var MENU = ["Actions", "Write to her", "Status"];
var ACTIONS = ["Praise", "Hug", "Kiss", "Pet", "Pay", "Thank", "Scold", "Question", "Order"];
var mood = { horny: 15, bored: 20, poverty: 20, stress: 15, affection: 20, confidence: 25 };

var FACE_OF = {
    neutral: "shy",
    approval: "shy",
    relief: "shy",
    gratitude: "shy",
    realization: "shy",
    remorse: "shy",
    joy: "joy",
    amusement: "joy",
    excitement: "joy",
    optimism: "joy",
    pride: "joy",
    bimbo_doll: "joy",
    caring: "care",
    admiration: "care",
    love: "love",
    desire: "love",
    sadness: "sad",
    grief: "sad",
    disappointment: "sad",
    anger: "angry",
    annoyance: "angry",
    disapproval: "angry",
    disgust: "angry",
    fear: "fear",
    nervousness: "fear",
    embarrassment: "blush",
    confusion: "blush",
    curiosity: "blush",
    surprise: "surprise"
};

var config = null;
var W = 320;
var H = 170;
var CELL = 3;
var OX = 6;
var OY = 8;
var PANEL_X = 112;
var FLOOR_Y = 152;

var COL_WALL = 0;
var COL_FLOOR = 0;
var COL_BASE = 0;
var COL_SHADOW = 0;
var COL_HAIR = 0;
var COL_HAIR_L = 0;
var COL_SKIN = 0;
var COL_DRESS = 0;
var COL_APRON = 0;
var COL_WHITE = 0xFFFF;
var COL_BLUSH = 0;
var COL_BLUSH_D = 0;
var COL_PUPIL = 0;
var COL_MOUTH = 0;
var COL_HEART = 0;
var COL_SWEAT = 0;
var COL_SHOE = 0;
var COL_INK = 0;
var COL_NAME = 0;
var COL_DIM = 0;
var COL_PANEL = 0;
var COL_BAR = 0;

var lastMaxScroll = 0;
var portraitOn = false;
var FACE_DIR = "/BruceJS/lucy/faces/";

function initColors() {
    COL_WALL = display.color(255, 214, 196);
    COL_FLOOR = display.color(176, 122, 78);
    COL_BASE = display.color(112, 72, 48);
    COL_SHADOW = display.color(140, 92, 58);
    COL_HAIR = display.color(54, 32, 28);
    COL_HAIR_L = display.color(102, 66, 48);
    COL_SKIN = display.color(255, 214, 186);
    COL_DRESS = display.color(36, 28, 42);
    COL_APRON = display.color(255, 250, 244);
    COL_WHITE = display.color(255, 255, 255);
    COL_BLUSH = display.color(244, 150, 168);
    COL_BLUSH_D = display.color(226, 104, 132);
    COL_PUPIL = display.color(36, 24, 32);
    COL_MOUTH = display.color(196, 82, 104);
    COL_HEART = display.color(214, 42, 72);
    COL_SWEAT = display.color(110, 196, 224);
    COL_SHOE = display.color(28, 20, 24);
    COL_INK = display.color(48, 32, 36);
    COL_NAME = display.color(168, 64, 88);
    COL_DIM = display.color(140, 104, 96);
    COL_PANEL = display.color(255, 246, 236);
    COL_BAR = display.color(244, 150, 168);
}

function layoutPortrait() {
    OX = 0;
    OY = 0;
    PANEL_X = 136;
    FLOOR_Y = H;
}

function layout() {
    CELL = 3;
    if (H < 155) CELL = 2;
    var spriteH = 48 * CELL;
    var floorH = Math.round(H * 0.11);
    if (floorH < 12) floorH = 12;
    OY = H - floorH - spriteH;
    if (OY < 2) {
        CELL = 2;
        spriteH = 48 * CELL;
        OY = H - floorH - spriteH;
        if (OY < 0) OY = 0;
    }
    OX = 4;
    FLOOR_Y = OY + spriteH;
    PANEL_X = OX + 32 * CELL + 8;
    if (PANEL_X > W - 90) PANEL_X = Math.floor(W * 0.42);
}

function cell(c, r, color) {
    display.drawFillRect(OX + c * CELL, OY + r * CELL, CELL, CELL, color);
}

function hline(r, c, n, color) {
    if (n <= 0) return;
    display.drawFillRect(OX + c * CELL, OY + r * CELL, n * CELL, CELL, color);
}

function blot(list, color) {
    var i;
    for (i = 0; i < list.length; i++) cell(list[i][0], list[i][1], color);
}

function frame(x, y, w, h, color) {
    display.drawFillRect(x, y, w, 1, color);
    display.drawFillRect(x, y + h - 1, w, 1, color);
    display.drawFillRect(x, y, 1, h, color);
    display.drawFillRect(x + w - 1, y, 1, h, color);
}

function faceFor(tag) {
    if (FACE_OF[tag]) return FACE_OF[tag];
    return "shy";
}

function drawRoom() {
    display.fill(COL_WALL);
    display.drawFillRect(0, FLOOR_Y, W, H - FLOOR_Y, COL_FLOOR);
    display.drawFillRect(0, FLOOR_Y, W, 3, COL_BASE);
    display.drawFillRect(OX + 11 * CELL, FLOOR_Y + 3, 5 * CELL, 3, COL_SHADOW);
    display.drawFillRect(OX + 17 * CELL, FLOOR_Y + 3, 5 * CELL, 3, COL_SHADOW);
}

function drawBody() {
    var r;
    hline(1, 11, 10, COL_HAIR);
    hline(2, 9, 14, COL_HAIR);
    hline(3, 8, 16, COL_HAIR);
    hline(3, 12, 4, COL_HAIR_L);
    hline(4, 7, 18, COL_HAIR);
    hline(5, 7, 18, COL_WHITE);
    hline(6, 7, 18, COL_WHITE);
    hline(7, 7, 18, COL_HAIR);
    hline(5, 24, 4, COL_WHITE);
    hline(6, 25, 3, COL_WHITE);
    cell(26, 7, COL_WHITE);
    cell(24, 7, COL_HAIR);
    for (r = 8; r <= 20; r++) {
        hline(r, 5, 3, COL_HAIR);
        hline(r, 24, 3, COL_HAIR);
    }
    for (r = 8; r <= 13; r++) hline(r, 8, 16, COL_SKIN);
    hline(14, 10, 12, COL_SKIN);
    hline(14, 6, 4, COL_HAIR);
    hline(14, 22, 4, COL_HAIR);
    hline(15, 12, 8, COL_SKIN);
    hline(16, 13, 6, COL_SKIN);
    hline(17, 8, 16, COL_DRESS);
    hline(18, 9, 14, COL_WHITE);
    hline(19, 8, 16, COL_DRESS);
    hline(19, 14, 4, COL_WHITE);
    for (r = 20; r <= 34; r++) hline(r, 6, 20, COL_DRESS);
    for (r = 22; r <= 33; r++) hline(r, 12, 8, COL_APRON);
    hline(22, 12, 8, COL_WHITE);
    hline(27, 13, 6, COL_SKIN);
    hline(28, 13, 6, COL_SKIN);
    hline(29, 14, 4, COL_SKIN);
    hline(30, 14, 4, COL_SKIN);
    cell(15, 28, COL_DRESS);
    cell(16, 28, COL_DRESS);
    cell(15, 29, COL_DRESS);
    for (r = 35; r <= 39; r++) hline(r, 5, 22, COL_DRESS);
    hline(40, 7, 18, COL_WHITE);
    hline(41, 12, 3, COL_WHITE);
    hline(42, 12, 3, COL_WHITE);
    hline(43, 12, 3, COL_SKIN);
    hline(44, 12, 3, COL_SKIN);
    hline(41, 17, 3, COL_WHITE);
    hline(42, 17, 3, COL_WHITE);
    hline(43, 17, 3, COL_SKIN);
    hline(44, 17, 3, COL_SKIN);
    hline(45, 11, 5, COL_SHOE);
    hline(46, 11, 5, COL_SHOE);
    hline(47, 11, 5, COL_SHOE);
    hline(45, 17, 5, COL_SHOE);
    hline(46, 17, 5, COL_SHOE);
    hline(47, 17, 5, COL_SHOE);
    cell(12, 45, COL_WHITE);
    cell(19, 45, COL_WHITE);
}

function eyePair(row, leftCol, wide, tall) {
    hline(row, leftCol, wide, COL_WHITE);
    hline(row, leftCol + 7, wide, COL_WHITE);
    if (tall > 1) {
        hline(row + 1, leftCol, wide, COL_WHITE);
        hline(row + 1, leftCol + 7, wide, COL_WHITE);
    }
}

function pupils(row, leftCol, rightCol) {
    cell(leftCol, row, COL_PUPIL);
    cell(leftCol, row + 1, COL_PUPIL);
    cell(rightCol, row, COL_PUPIL);
    cell(rightCol, row + 1, COL_PUPIL);
}

function drawShy() {
    blot([[12, 8], [13, 8], [18, 8], [19, 8]], COL_HAIR);
    eyePair(9, 12, 3, 2);
    pupils(9, 12, 18);
    blot([[9, 11], [10, 11], [21, 11], [22, 11], [9, 12], [22, 12]], COL_BLUSH);
    hline(13, 16, 2, COL_MOUTH);
}

function drawJoy() {
    blot([[12, 10], [13, 9], [14, 10], [18, 10], [19, 9], [20, 10]], COL_HAIR);
    blot([[14, 12], [19, 12]], COL_MOUTH);
    hline(13, 15, 4, COL_MOUTH);
    blot([[10, 11], [11, 12], [21, 11], [22, 12]], COL_BLUSH);
}

function drawCare() {
    hline(9, 12, 3, COL_HAIR);
    hline(9, 18, 3, COL_HAIR);
    eyePair(10, 12, 3, 1);
    cell(13, 10, COL_PUPIL);
    cell(19, 10, COL_PUPIL);
    hline(13, 15, 3, COL_MOUTH);
    cell(10, 11, COL_BLUSH);
    cell(21, 11, COL_BLUSH);
}

function drawLove() {
    blot([[12, 9], [14, 9], [12, 10], [13, 10], [14, 10], [13, 11]], COL_HEART);
    blot([[18, 9], [20, 9], [18, 10], [19, 10], [20, 10], [19, 11]], COL_HEART);
    blot([[9, 10], [10, 10], [9, 11], [10, 11], [21, 10], [22, 10], [21, 11], [22, 11]], COL_BLUSH_D);
    blot([[8, 11], [23, 11]], COL_BLUSH);
    hline(13, 15, 3, COL_MOUTH);
    cell(14, 12, COL_MOUTH);
    cell(18, 12, COL_MOUTH);
}

function drawSad() {
    blot([[12, 8], [13, 8], [14, 9], [18, 9], [19, 8], [20, 8]], COL_HAIR);
    eyePair(10, 12, 3, 2);
    pupils(10, 13, 19);
    blot([[14, 13], [18, 13]], COL_MOUTH);
    hline(12, 15, 3, COL_MOUTH);
}

function drawAngry() {
    blot([[12, 9], [13, 8], [14, 8], [18, 8], [19, 8], [20, 9]], COL_HAIR);
    eyePair(10, 12, 3, 1);
    cell(13, 10, COL_PUPIL);
    cell(19, 10, COL_PUPIL);
    hline(13, 16, 2, COL_MOUTH);
    cell(10, 11, COL_BLUSH);
    cell(21, 11, COL_BLUSH);
}

function drawFear() {
    eyePair(8, 11, 4, 2);
    hline(10, 11, 4, COL_WHITE);
    hline(10, 18, 4, COL_WHITE);
    cell(12, 9, COL_PUPIL);
    cell(13, 9, COL_PUPIL);
    cell(19, 9, COL_PUPIL);
    cell(20, 9, COL_PUPIL);
    cell(25, 7, COL_SWEAT);
    cell(25, 8, COL_SWEAT);
    cell(26, 8, COL_WHITE);
    cell(16, 13, COL_MOUTH);
}

function drawBlush() {
    blot([[12, 8], [13, 8], [19, 8], [20, 8]], COL_HAIR);
    eyePair(9, 12, 3, 2);
    pupils(9, 12, 18);
    blot([
        [8, 10], [9, 10], [10, 10], [8, 11], [9, 11], [10, 11],
        [21, 10], [22, 10], [23, 10], [21, 11], [22, 11], [23, 11]
    ], COL_BLUSH_D);
    blot([[15, 13], [17, 13], [16, 12], [18, 12]], COL_MOUTH);
}

function drawSurprise() {
    blot([
        [12, 8], [13, 8], [14, 8], [11, 9], [15, 9], [11, 10], [15, 10], [12, 11], [13, 11], [14, 11],
        [18, 8], [19, 8], [20, 8], [17, 9], [21, 9], [17, 10], [21, 10], [18, 11], [19, 11], [20, 11]
    ], COL_HAIR);
    blot([[13, 9], [14, 9], [13, 10], [14, 10], [19, 9], [20, 9], [19, 10], [20, 10]], COL_WHITE);
    cell(13, 9, COL_PUPIL);
    cell(19, 9, COL_PUPIL);
    blot([[15, 12], [16, 12], [17, 12], [15, 14], [16, 14], [17, 14], [15, 13], [17, 13]], COL_MOUTH);
    cell(16, 13, COL_SKIN);
}

function drawFace(name) {
    if (name === "joy") drawJoy();
    else if (name === "care") drawCare();
    else if (name === "love") drawLove();
    else if (name === "sad") drawSad();
    else if (name === "angry") drawAngry();
    else if (name === "fear") drawFear();
    else if (name === "blush") drawBlush();
    else if (name === "surprise") drawSurprise();
    else drawShy();
}

function drawLucy(faceName) {
    drawRoom();
    drawBody();
    drawFace(faceName);
}

function wrapText(text, maxChars) {
    var lines = [];
    var chunks = String(text || "").split("\n");
    var p;
    for (p = 0; p < chunks.length; p++) {
        var words = chunks[p].split(" ");
        var line = "";
        var w;
        for (w = 0; w < words.length; w++) {
            var word = words[w];
            if (!word.length && !line.length) continue;
            while (word.length > maxChars) {
                if (line.length) {
                    lines.push(line);
                    line = "";
                }
                lines.push(word.substring(0, maxChars));
                word = word.substring(maxChars);
            }
            if (!word.length) continue;
            if (!line.length) line = word;
            else if (line.length + 1 + word.length <= maxChars) line += " " + word;
            else {
                lines.push(line);
                line = word;
            }
        }
        lines.push(line);
    }
    if (!lines.length) lines.push("");
    return lines;
}

var faceNames = null;

function knownFaces() {
    if (faceNames) return faceNames;
    faceNames = { _listed: false };
    var names = null;
    try {
        names = storage.readdir(sdPath("/BruceJS/lucy/faces"));
    } catch (errList) {
        names = null;
    }
    if (!names || !names.length) return faceNames;
    var i;
    var text;
    var slash;
    for (i = 0; i < names.length; i++) {
        text = names[i] && names[i].name ? names[i].name : names[i];
        text = String(text || "");
        slash = text.lastIndexOf("/");
        if (slash >= 0) text = text.substring(slash + 1);
        if (!text) continue;
        faceNames[text] = true;
        faceNames._listed = true;
    }
    return faceNames;
}

function drawPortrait(faceName) {
    var fileName = (faceName || "shy") + ".jpg";
    var known = knownFaces();
    if (known._listed && !known[fileName]) return false;
    try {
        display.drawJpg(sdPath(FACE_DIR + fileName), 0, 0, false);
        display.drawFillRect(128, 0, W - 128, H, COL_WALL);
        return true;
    } catch (errJpg) {
        return false;
    }
}

function drawScene(faceName, reply, scroll, fullPaint) {
    if (fullPaint) {
        portraitOn = drawPortrait(faceName);
        if (portraitOn) layoutPortrait();
        else {
            layout();
            drawLucy(faceName);
        }
    }
    var textX = PANEL_X + 8;
    var maxChars = Math.floor((W - textX - 8) / 6);
    if (maxChars < 10) maxChars = 10;
    var lineH = 12;
    var top = 36;
    var bottom = FLOOR_Y - 8;
    var maxVis = Math.floor((bottom - top) / lineH);
    if (maxVis < 3) maxVis = 3;
    display.drawFillRect(PANEL_X, 6, W - PANEL_X - 4, FLOOR_Y - 12, COL_PANEL);
    frame(PANEL_X, 6, W - PANEL_X - 4, FLOOR_Y - 12, COL_BASE);
    display.setTextSize(2);
    display.setTextColor(COL_NAME, COL_PANEL);
    display.drawString("Lucy", textX, 12);
    display.setTextSize(1);
    var lines = wrapText(reply, maxChars);
    var maxScroll = lines.length - maxVis;
    if (maxScroll < 0) maxScroll = 0;
    lastMaxScroll = maxScroll;
    if (scroll < 0) scroll = 0;
    if (scroll > maxScroll) scroll = maxScroll;
    display.setTextColor(COL_INK, COL_PANEL);
    var i;
    for (i = 0; i < maxVis; i++) {
        var idx = scroll + i;
        if (idx >= lines.length) break;
        display.drawString(lines[idx], textX, top + i * lineH);
    }
    display.setTextColor(COL_DIM, COL_PANEL);
    display.drawString("click", textX, bottom - 12);
    return scroll;
}

function drawThinking(faceName, reply, scroll) {
    drawScene(faceName, reply, scroll, true);
    display.drawFillRect(PANEL_X + 4, FLOOR_Y - 28, W - PANEL_X - 12, 14, COL_BAR);
    display.setTextSize(1);
    display.setTextColor(COL_INK, COL_BAR);
    display.drawString("... thinking", PANEL_X + 8, FLOOR_Y - 24);
}

function pollNav() {
    if (keyboard.getPrevPress()) return "prev";
    if (keyboard.getNextPress()) return "next";
    if (keyboard.getSelPress()) return "sel";
    if (keyboard.getEscPress()) return "esc";
    return "";
}

function errText(err) {
    if (!err) return "error";
    if (typeof err === "string") return err;
    if (err.message) return String(err.message);
    if (err.toString) {
        var text = err.toString();
        if (text && text !== "[object Object]") return text;
    }
    return "error";
}

function holdScreen(title, message) {
    var lines = wrapText(String(message || ""), Math.floor((W - 24) / 6));
    while (true) {
        display.fill(COL_WALL);
        display.setTextSize(2);
        display.setTextColor(COL_NAME, COL_WALL);
        display.drawString(title, 8, 8);
        display.setTextSize(1);
        display.setTextColor(COL_INK, COL_WALL);
        var i;
        for (i = 0; i < lines.length && i < 8; i++) {
            display.drawString(lines[i], 8, 36 + i * 12);
        }
        display.setTextColor(COL_DIM, COL_WALL);
        display.drawString("click to continue", 8, H - 16);
        var waited = 0;
        while (waited < 1000) {
            var key = pollNav();
            if (key === "sel" || key === "esc") return;
            delay(30);
            waited += 30;
        }
    }
}

function showError(message) {
    console.log(message);
    holdScreen("Error", message);
}

function sdPath(path) {
    return { fs: "sd", path: path };
}

function readSd(path) {
    var raw = null;
    try {
        raw = storage.read(sdPath(path));
    } catch (err) {
        raw = null;
    }
    if (!raw) return null;
    return raw;
}

function readFirst(paths) {
    var i;
    var raw;
    for (i = 0; i < paths.length; i++) {
        raw = readSd(paths[i]);
        if (raw) return raw;
    }
    return null;
}

function loadConfig() {
    config = { deepseekToken: "" };
    var raw = readFirst(CONFIG_PATHS);
    if (!raw) return;
    try {
        var data = JSON.parse(raw);
        if (data && data.deepseekToken) config.deepseekToken = cleanToken(data.deepseekToken);
    } catch (errParse) {
        showError("config.json is broken");
    }
}

function cleanToken(raw) {
    return trimStr(String(raw || ""));
}

function ensureToken() {
    if (config.deepseekToken && config.deepseekToken.indexOf("sk-") === 0) return true;
    showError("Put an sk- key in /BruceJS/lucy/config.json");
    return false;
}

function bodyText(body) {
    if (!body) return "";
    if (typeof body === "string") return body;
    try {
        return JSON.stringify(body);
    } catch (err) {
        return "";
    }
}

function parseHttpBody(body) {
    if (!body) return null;
    if (typeof body === "string") {
        try {
            return JSON.parse(body);
        } catch (err) {
            return null;
        }
    }
    return body;
}

function contentFromApi(data) {
    if (!data || !data.choices || !data.choices.length) return "";
    var choice = data.choices[0];
    if (!choice || !choice.message || !choice.message.content) return "";
    return String(choice.message.content);
}

function wifiUp() {
    try {
        return !!wifi.connected();
    } catch (errOn) {
        return false;
    }
}

function wifiMessage() {
    showError("Wi-Fi is off. Leave this script, open Connect to WiFi, then start PocketWaifu again.");
}

function hideKey(text) {
    var src = String(text || "");
    var out = "";
    var i = 0;
    while (i < src.length) {
        if (src.charAt(i) === "s" && src.charAt(i + 1) === "k" && src.charAt(i + 2) === "-") {
            out += "sk-";
            i += 3;
            while (i < src.length) {
                var c = src.charAt(i);
                var code = src.charCodeAt(i);
                var keep = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || c === "_" || c === "-";
                if (!keep) break;
                i++;
            }
        } else {
            out += src.charAt(i);
            i++;
        }
    }
    return out;
}

function apiErrorText(body) {
    var data = parseHttpBody(body);
    var message = "";
    if (data && data.error && data.error.message) message = String(data.error.message);
    else message = bodyText(body);
    message = trimStr(hideKey(message));
    if (message.length > 120) message = message.substring(0, 120);
    return message;
}

function askDeepseek(messages) {
    if (!wifiUp()) {
        wifiMessage();
        return "";
    }
    if (!ensureToken()) return "";
    var payload = JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        max_tokens: MAX_TOKENS
    });
    var headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + config.deepseekToken
    };
    if (!wifiUp()) {
        showError("Wi-Fi is not connected");
        return "";
    }
    var res = null;
    try {
        res = wifi.httpFetch(API_URL, {
            method: "POST",
            headers: headers,
            body: payload,
            responseType: "json"
        });
    } catch (errJson) {
        console.log(errText(errJson));
        if (!wifiUp()) {
            showError(errText(errJson));
            gc();
            return "";
        }
        try {
            res = wifi.httpFetch(API_URL, {
                method: "POST",
                headers: headers,
                body: payload
            });
        } catch (errText2) {
            showError(errText(errText2));
            gc();
            return "";
        }
    }
    if (!res) {
        showError("Empty network response");
        gc();
        return "";
    }
    if (!res.ok) {
        var detail = apiErrorText(res.body);
        console.log("http " + res.status + " " + detail);
        if (detail) showError("DeepSeek HTTP " + res.status + ". " + detail);
        else showError("DeepSeek HTTP " + res.status);
        gc();
        return "";
    }
    var data = parseHttpBody(res.body);
    var content = contentFromApi(data);
    if (!content) {
        console.log(bodyText(res.body));
        showError("Reply missing from the answer");
        gc();
        return "";
    }
    console.log(content);
    gc();
    return content;
}

function trimStr(text) {
    if (!text) return "";
    if (text.trim) return text.trim();
    return text;
}

function stripCr(text) {
    var out = "";
    var i;
    for (i = 0; i < text.length; i++) {
        if (text.charAt(i) !== "\r") out += text.charAt(i);
    }
    return out;
}

function parseReply(raw) {
    var text = trimStr(stripCr(raw || ""));
    var emotion = "neutral";
    var body = text;
    if (text.charAt(0) === "[") {
        var end = text.indexOf("]");
        if (end > 1) {
            var tag = trimStr(text.substring(1, end)).toLowerCase();
            if (FACE_OF[tag]) emotion = tag;
            body = text.substring(end + 1);
            if (body.charAt(0) === "\n") body = body.substring(1);
            body = trimStr(body);
        }
    }
    if (!body) body = text || "...";
    return { emotion: emotion, text: body };
}

function trimMessages(messages) {
    var keep = MAX_PAIRS * 2;
    var overflow = (messages.length - 1) - keep;
    if (overflow <= 0) return messages;
    var rebuilt = [messages[0]];
    var i;
    for (i = 1 + overflow; i < messages.length; i++) rebuilt.push(messages[i]);
    return rebuilt;
}

function popLast(messages) {
    if (messages.length < 2) return messages;
    var rebuilt = [];
    var i;
    for (i = 0; i < messages.length - 1; i++) rebuilt.push(messages[i]);
    return rebuilt;
}

function clampStat(n) {
    n = Math.round(n);
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
}

function readStat(value, fallback) {
    var n = value;
    if (typeof n !== "number") {
        n = parseInt(n, 10);
        if (n !== n) return fallback;
    }
    return clampStat(n);
}

function bump(key, delta) {
    mood[key] = clampStat(mood[key] + delta);
}

function band(n) {
    if (n <= 30) return "low";
    if (n <= 60) return "medium";
    return "high";
}

function buildPrompt() {
    return SYSTEM_PROMPT +
        " Current feelings, each low, medium, or high: horny " + band(mood.horny) +
        ", bored " + band(mood.bored) +
        ", poverty " + band(mood.poverty) +
        ", stress " + band(mood.stress) +
        ", affection " + band(mood.affection) +
        ", confidence " + band(mood.confidence) +
        ". High horny leans toward desire and love. High stress leans toward fear and sadness. High bored leans toward annoyance. High poverty leans toward embarrassment and worry. " +
        "High affection leans toward caring, love, and gratitude. Low affection leans toward distance and sadness. " +
        "High confidence leans toward pride and relief. Low confidence leans toward nervousness, fear, and remorse. " +
        "Let these feelings color how you hear Master and which emotion tag you choose.";
}

function isLetter(ch) {
    return (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");
}

function hasAny(text, words) {
    var i;
    var at;
    var word;
    var n;
    var before;
    var after;
    for (i = 0; i < words.length; i++) {
        word = words[i];
        n = word.length;
        at = 0;
        while (at + n <= text.length) {
            if (text.substring(at, at + n) === word) {
                before = at === 0 ? " " : text.charAt(at - 1);
                after = text.charAt(at + n);
                if (!isLetter(before) && !isLetter(after)) return true;
            }
            at++;
        }
    }
    return false;
}

function applyTextMood(low) {
    bump("bored", -3);
    bump("stress", -1);
    bump("poverty", 3);
    bump("affection", 1);
    if (hasAny(low, ["kiss", "love", "hug", "want", "touch"])) {
        bump("horny", 6);
        bump("affection", 2);
    }
    if (hasAny(low, ["cute", "sweet", "dear", "beautiful", "pretty", "darling", "miss"])) {
        bump("affection", 3);
        bump("confidence", 2);
        bump("bored", -2);
        bump("stress", -1);
    }
    if (hasAny(low, ["perfect", "clever", "amazing", "wonderful", "proud", "well done", "good girl"])) {
        bump("confidence", 3);
        bump("affection", 2);
        bump("stress", -2);
    }
    if (hasAny(low, ["sorry", "calm", "forgive", "rest", "gentle"])) {
        bump("stress", -4);
        bump("confidence", 1);
    }
    if (hasAny(low, ["stupid", "useless", "hate", "idiot", "dumb", "worthless", "shut up"])) {
        bump("stress", 4);
        bump("affection", -4);
        bump("confidence", -4);
        bump("horny", -2);
        bump("bored", 2);
    }
    if (hasAny(low, ["boring", "whatever", "go away", "leave me"])) {
        bump("bored", 3);
        bump("affection", -2);
    }
    if (low.indexOf("?") >= 0) {
        bump("bored", -1);
        bump("stress", 1);
        bump("confidence", -1);
    }
}

function applyMood(label) {
    var low = String(label || "").toLowerCase();
    if (label === "Praise") {
        bump("horny", 4);
        bump("bored", -8);
        bump("stress", -6);
        bump("poverty", 3);
        bump("affection", 4);
        bump("confidence", 8);
    } else if (label === "Hug") {
        bump("horny", 6);
        bump("bored", -10);
        bump("stress", -8);
        bump("poverty", 3);
        bump("affection", 8);
        bump("confidence", 2);
    } else if (label === "Kiss") {
        bump("horny", 12);
        bump("bored", -8);
        bump("stress", -4);
        bump("poverty", 3);
        bump("affection", 10);
        bump("confidence", 2);
    } else if (label === "Pet") {
        bump("horny", 3);
        bump("bored", -6);
        bump("stress", -5);
        bump("poverty", 3);
        bump("affection", 5);
        bump("confidence", 2);
    } else if (label === "Thank") {
        bump("bored", -3);
        bump("stress", -4);
        bump("poverty", 3);
        bump("affection", 4);
        bump("confidence", 6);
    } else if (label === "Scold") {
        bump("horny", -6);
        bump("bored", 2);
        bump("stress", 10);
        bump("poverty", 3);
        bump("affection", -6);
        bump("confidence", -10);
    } else if (label === "Question") {
        bump("bored", -2);
        bump("stress", 1);
        bump("poverty", 3);
        bump("affection", 1);
        bump("confidence", -2);
    } else if (label === "Order") {
        bump("horny", -2);
        bump("bored", 2);
        bump("stress", 6);
        bump("poverty", 3);
        bump("affection", -1);
        bump("confidence", -3);
    } else if (label === "Pay") {
        bump("poverty", -25);
        bump("stress", -8);
        bump("bored", -4);
        bump("affection", 3);
        bump("confidence", 1);
    } else {
        applyTextMood(low);
    }
}

function refreshSystem(messages) {
    if (!messages.length) return messages;
    messages[0] = { role: "system", content: buildPrompt() };
    return messages;
}

function savedTurns(messages) {
    var turns = [];
    var i;
    for (i = 1; i < messages.length; i++) {
        turns.push({ role: messages[i].role, content: messages[i].content });
    }
    return turns;
}

function saveLucy(messages) {
    try {
        storage.mkdir(sdPath(DATA_DIR));
    } catch (errMk) {}
    var payload = JSON.stringify({
        horny: mood.horny,
        bored: mood.bored,
        poverty: mood.poverty,
        stress: mood.stress,
        affection: mood.affection,
        confidence: mood.confidence,
        messages: savedTurns(messages)
    });
    try {
        storage.write(sdPath(SAVE_PATH), payload, "w");
    } catch (errW) {}
}

function loadLucy() {
    mood = { horny: 15, bored: 20, poverty: 20, stress: 15, affection: 20, confidence: 25 };
    var messages = [{ role: "system", content: buildPrompt() }];
    var reply = "Welcome my Master";
    var faceName = "shy";
    var raw = readFirst(SAVE_PATHS);
    if (raw) {
        try {
            var data = JSON.parse(raw);
            if (data) {
                mood.horny = readStat(data.horny, 15);
                mood.bored = readStat(data.bored, 20);
                mood.poverty = readStat(data.poverty, 20);
                mood.stress = readStat(data.stress, 15);
                mood.affection = readStat(data.affection, 20);
                mood.confidence = readStat(data.confidence, 25);
                if (data.messages && data.messages.length) {
                    var i;
                    for (i = 0; i < data.messages.length; i++) {
                        var row = data.messages[i];
                        if (!row) continue;
                        if (row.role !== "user" && row.role !== "assistant") continue;
                        if (!row.content) continue;
                        messages.push({ role: row.role, content: String(row.content) });
                    }
                    messages = trimMessages(messages);
                    for (i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === "assistant") {
                            var parsed = parseReply(messages[i].content);
                            reply = parsed.text;
                            faceName = faceFor(parsed.emotion);
                            break;
                        }
                    }
                }
            }
        } catch (errParse) {}
    }
    messages = refreshSystem(messages);
    return { messages: messages, reply: reply, faceName: faceName };
}

function showStatus() {
    delay(150);
    var lines = [
        "Horny " + mood.horny,
        "Bored " + mood.bored,
        "Poverty " + mood.poverty,
        "Stress " + mood.stress,
        "Affection " + mood.affection,
        "Confidence " + mood.confidence
    ];
    while (true) {
        display.fill(COL_WALL);
        display.setTextSize(2);
        display.setTextColor(COL_NAME, COL_WALL);
        display.drawString("Status", 8, 8);
        display.setTextSize(1);
        display.setTextColor(COL_INK, COL_WALL);
        var i;
        for (i = 0; i < lines.length; i++) {
            display.drawString(lines[i], 8, 40 + i * 16);
        }
        display.setTextColor(COL_DIM, COL_WALL);
        display.drawString("back", 8, H - 16);
        var waited = 0;
        while (waited < 1000) {
            var key = pollNav();
            if (key === "sel" || key === "esc" || key === "prev" || key === "next") return;
            delay(30);
            waited += 30;
        }
    }
}

function sendAction(messages, userText, faceName, reply, scroll) {
    messages = refreshSystem(messages);
    messages.push({ role: "user", content: userText });
    messages = trimMessages(messages);
    if (!ensureToken()) {
        return { messages: popLast(messages), face: faceName, text: reply, failed: true };
    }
    drawThinking(faceName, reply, scroll);
    var raw = askDeepseek(messages);
    if (!raw) {
        return { messages: popLast(messages), face: faceName, text: reply, failed: true };
    }
    messages.push({ role: "assistant", content: raw });
    messages = trimMessages(messages);
    applyMood(userText);
    messages = refreshSystem(messages);
    saveLucy(messages);
    var parsed = parseReply(raw);
    gc();
    return {
        messages: messages,
        face: faceFor(parsed.emotion),
        text: parsed.text,
        failed: false
    };
}

function pickFromMenu() {
    while (true) {
        var pick = "";
        try {
            pick = dialog.choice(MENU);
        } catch (errMenu) {
            pick = "";
        }
        if (!pick) return "";
        if (pick === "Status") {
            showStatus();
            continue;
        }
        if (pick === "Actions") {
            var act = "";
            try {
                act = dialog.choice(ACTIONS);
            } catch (errAct) {
                act = "";
            }
            if (!act) continue;
            return act;
        }
        if (pick === "Write to her") {
            var typed = keyboard.keyboard("", 80, "Write to her", false);
            delay(120);
            if (!typed || typed === "\x1B") continue;
            return typed;
        }
    }
}

function run(saved) {
    var messages = saved.messages;
    var faceName = saved.faceName;
    var reply = saved.reply;
    var scroll = 0;
    var dirty = true;
    var fullPaint = true;
    while (true) {
        if (dirty) {
            scroll = drawScene(faceName, reply, scroll, fullPaint);
            dirty = false;
            fullPaint = true;
        }
        var key = pollNav();
        if (key === "prev") {
            if (scroll > 0) {
                scroll--;
                fullPaint = false;
                dirty = true;
            }
        } else if (key === "next") {
            if (scroll < lastMaxScroll) {
                scroll++;
                fullPaint = false;
                dirty = true;
            }
        } else if (key === "esc") {
            return;
        } else if (key === "sel") {
            fullPaint = true;
            var choice = pickFromMenu();
            dirty = true;
            if (choice) {
                var sent = sendAction(messages, choice, faceName, reply, scroll);
                messages = sent.messages;
                if (!sent.failed) {
                    faceName = sent.face;
                    reply = sent.text;
                    scroll = 0;
                }
            }
        }
        if (!dirty) delay(30);
    }
}

function main() {
    initColors();
    try {
        W = display.width();
        H = display.height();
    } catch (errSize) {
        W = 320;
        H = 170;
    }
    layout();
    drawScene("shy", "Welcome my Master", 0, true);
    if (!wifiUp()) {
        wifiMessage();
        return;
    }
    try {
        loadConfig();
        run(loadLucy());
    } catch (err) {
        holdScreen("Error", errText(err));
    }
}

main();
