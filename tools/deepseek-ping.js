// Tiny DeepSeek check. Reads /pocketwaifu/config.json and sends one header.
// GET /user/balance has no prompt and no body.

var display = require("display");
var keyboard = require("keyboard");
var storage = require("storage");
var wifi = require("wifi");

var API_URL = "https://api.deepseek.com/user/balance";
var CONFIG_PATH = "/pocketwaifu/config.json";

var W = 320;
var H = 170;

function sdPath(path) {
    return { fs: "sd", path: path };
}

function trimStr(text) {
    if (!text) return "";
    if (text.trim) return text.trim();
    return text;
}

function tailOf(token) {
    var n = token.length;
    if (n <= 4) return token;
    return token.substring(n - 4, n);
}

function readConfig() {
    var raw = "";
    try {
        raw = storage.read(sdPath(CONFIG_PATH));
    } catch (err) {
        raw = "";
    }
    if (!raw) raw = "";
    raw = String(raw);
    var scanned = "";
    var i;
    for (i = 0; i + 2 < raw.length; i++) {
        if (raw.charAt(i) === "s" && raw.charAt(i + 1) === "k" && raw.charAt(i + 2) === "-") {
            var j;
            for (j = i; j < raw.length; j++) {
                var c = raw.charAt(j);
                if (c === "\"" || c === "\n" || c === "\r" || c === " " || c === "}") break;
                scanned += c;
            }
            break;
        }
    }
    var parsed = "";
    try {
        var data = JSON.parse(raw);
        if (data && data.deepseekToken) parsed = trimStr(String(data.deepseekToken));
    } catch (errParse) {
        parsed = "";
    }
    var token = scanned.length >= parsed.length ? scanned : parsed;
    return {
        rawLen: raw.length,
        hasEnd: raw.indexOf("85e8") >= 0,
        parsedLen: parsed.length,
        scanLen: scanned.length,
        token: token
    };
}

function wifiUp() {
    try {
        return !!wifi.connected();
    } catch (errOn) {
        return false;
    }
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

function wrapText(text, maxChars) {
    var words = String(text || "").split(" ");
    var lines = [];
    var line = "";
    var i;
    for (i = 0; i < words.length; i++) {
        var word = words[i];
        if (!word) continue;
        var next = line ? line + " " + word : word;
        if (next.length > maxChars && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function pollNav() {
    if (keyboard.getSelPress()) return "sel";
    if (keyboard.getEscPress()) return "esc";
    return "";
}

function holdScreen(title, message) {
    var lines = wrapText(message, Math.floor((W - 16) / 6));
    while (true) {
        display.fill(display.color(255, 214, 196));
        display.setTextSize(2);
        display.setTextColor(display.color(168, 64, 88), display.color(255, 214, 196));
        display.drawString(title, 8, 8);
        display.setTextSize(1);
        display.setTextColor(display.color(48, 32, 36), display.color(255, 214, 196));
        var i;
        for (i = 0; i < lines.length && i < 9; i++) {
            display.drawString(lines[i], 8, 34 + i * 12);
        }
        display.setTextColor(display.color(140, 104, 96), display.color(255, 214, 196));
        display.drawString("click to leave", 8, H - 16);
        var waited = 0;
        while (waited < 1000) {
            var key = pollNav();
            if (key === "sel" || key === "esc") return;
            delay(30);
            waited += 30;
        }
    }
}

function errText(err) {
    if (!err) return "error";
    if (typeof err === "string") return err;
    if (err.message) return String(err.message);
    return "error";
}

function main() {
    try {
        W = display.width();
        H = display.height();
    } catch (errSize) {
        W = 320;
        H = 170;
    }
    if (!wifiUp()) {
        holdScreen("Wi-Fi", "Wi-Fi is off. Open Connect to WiFi, then start deepseek-ping again.");
        return;
    }
    var cfg = readConfig();
    var token = cfg.token;
    var note = "raw " + cfg.rawLen + " end " + (cfg.hasEnd ? "yes" : "no") + " scan " + cfg.scanLen + " json " + cfg.parsedLen;
    if (!token || token.indexOf("sk-") !== 0) {
        holdScreen("Key", note + " No sk- key in /pocketwaifu/config.json");
        return;
    }
    note = note + " use " + token.length + " ends " + tailOf(token);
    var res = null;
    try {
        res = wifi.httpFetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });
    } catch (errFetch) {
        holdScreen("Error", note + " " + errText(errFetch));
        return;
    }
    var status = res && res.status ? res.status : 0;
    var text = bodyText(res && res.body);
    if (text.length > 180) text = text.substring(0, 180);
    holdScreen("DeepSeek", note + " HTTP " + status + " " + text);
}

main();
