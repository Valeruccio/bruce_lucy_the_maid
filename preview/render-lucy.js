var zlib = require("zlib");
var fs = require("fs");
var path = require("path");

var C = {
    out: 0x2a221c,
    hair: 0x4a3428,
    hairD: 0x3a2820,
    hairL: 0x6a4c38,
    skin: 0xf6c8a6,
    skinD: 0xe2aa88,
    blush: 0xf4a8a4,
    white: 0xfffefb,
    frill: 0xf7f4f2,
    frillD: 0xddd6d4,
    iris: 0x8a5834,
    irisD: 0x5c3a24,
    pupil: 0x1c1410,
    mouth: 0xd08080,
    dress: 0x2c2c32,
    dressD: 0x1c1c22,
    dressL: 0x3c3c44,
    apron: 0xf4f4f6,
    apronD: 0xd4d4dc,
    bow: 0x1a1a1e,
    sock: 0xf6f6f8,
    sockD: 0xe0e0e6,
    shoe: 0x242428,
    shine: 0xf2f2f4,
    wall: 0xffd6c4,
    floor: 0xb07a4e,
    base: 0x704830,
    panel: 0xfff6ec,
    name: 0xa84058,
    ink: 0x302024,
    dim: 0x8c6860
};

function Grid(w, h) {
    this.w = w;
    this.h = h;
    this.p = new Array(w * h).fill(0);
}
Grid.prototype.set = function (x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    this.p[y * this.w + x] = c;
};
Grid.prototype.get = function (x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.p[y * this.w + x];
};
Grid.prototype.fill = function (x, y, w, h, c) {
    var yy, xx;
    for (yy = y; yy < y + h; yy++) {
        for (xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    }
};
function ellipse(g, cx, cy, rx, ry, c) {
    var y, x, dx, dy;
    for (y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
        for (x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
            dx = (x + 0.5 - cx) / rx;
            dy = (y + 0.5 - cy) / ry;
            if (dx * dx + dy * dy <= 1) g.set(x, y, c);
        }
    }
}
function ring(g, cx, cy, rx, ry, c) {
    var y, x, dx, dy, d;
    for (y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
        for (x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
            dx = (x + 0.5 - cx) / rx;
            dy = (y + 0.5 - cy) / ry;
            d = dx * dx + dy * dy;
            if (d <= 1 && d >= 0.72) g.set(x, y, c);
        }
    }
}

function eye(g, x, y, kind) {
    if (kind === "joy") {
        g.set(x, y + 3, C.out);
        g.set(x + 1, y + 2, C.out);
        g.set(x + 2, y + 1, C.out);
        g.set(x + 3, y + 1, C.out);
        g.set(x + 4, y + 2, C.out);
        g.set(x + 5, y + 3, C.out);
        return;
    }
    if (kind === "heart") {
        g.set(x + 1, y + 1, C.mouth);
        g.set(x + 3, y + 1, C.mouth);
        g.fill(x, y + 2, 5, 1, C.mouth);
        g.fill(x + 1, y + 3, 3, 1, C.mouth);
        g.set(x + 2, y + 4, C.mouth);
        return;
    }
    g.set(x + 1, y, C.out);
    g.set(x + 2, y, C.out);
    g.set(x + 3, y, C.out);
    g.set(x, y + 1, C.out);
    g.set(x + 4, y + 1, C.out);
    g.set(x, y + 2, C.out);
    g.set(x + 5, y + 2, C.out);
    g.set(x, y + 3, C.out);
    g.set(x + 5, y + 3, C.out);
    g.set(x, y + 4, C.out);
    g.set(x + 5, y + 4, C.out);
    g.set(x + 1, y + 5, C.out);
    g.set(x + 2, y + 5, C.out);
    g.set(x + 3, y + 5, C.out);
    g.set(x + 4, y + 5, C.out);
    g.fill(x + 1, y + 1, 3, 1, C.white);
    g.fill(x + 1, y + 2, 4, 3, C.iris);
    g.set(x + 4, y + 1, C.white);
    g.set(x + 4, y + 4, C.white);
    var px = kind === "shy" || kind === "blush" ? 1 : 2;
    if (kind === "wide") {
        g.fill(x + 1, y + 2, 4, 3, C.iris);
        g.fill(x + 2, y + 2, 2, 2, C.pupil);
        g.set(x + 2, y + 2, C.shine);
        return;
    }
    if (kind === "sad") px = 2;
    g.fill(x + px, y + 2, 2, 2, C.pupil);
    g.set(x + px, y + 2, C.shine);
    g.set(x + px, y + 3, C.irisD);
    if (kind === "angry") {
        g.set(x, y, C.hair);
        g.set(x + 1, y, C.hair);
        g.set(x + 2, y + 1, C.hair);
    }
}

function mouth(g, x, y, kind) {
    if (kind === "sad") {
        g.set(x, y, C.mouth);
        g.set(x + 4, y, C.mouth);
        g.fill(x + 1, y + 1, 3, 1, C.mouth);
        return;
    }
    if (kind === "angry" || kind === "fear") {
        g.fill(x + 1, y, 2, 1, C.mouth);
        return;
    }
    if (kind === "surprise") {
        g.set(x + 1, y, C.mouth);
        g.set(x + 2, y, C.mouth);
        g.set(x, y + 1, C.mouth);
        g.set(x + 3, y + 1, C.mouth);
        g.set(x + 1, y + 2, C.mouth);
        g.set(x + 2, y + 2, C.mouth);
        return;
    }
    if (kind === "joy") {
        g.set(x, y, C.mouth);
        g.fill(x + 1, y + 1, 4, 1, C.mouth);
        g.set(x + 5, y, C.mouth);
        return;
    }
    if (kind === "blush") {
        g.set(x, y + 1, C.mouth);
        g.set(x + 1, y, C.mouth);
        g.set(x + 2, y + 1, C.mouth);
        g.set(x + 3, y, C.mouth);
        return;
    }
    g.set(x, y, C.mouth);
    g.fill(x + 1, y + 1, 3, 1, C.mouth);
    g.set(x + 4, y, C.mouth);
}

function scallop(g, x, y, n, c, shade) {
    var i;
    for (i = 0; i < n; i++) {
        g.fill(x + i * 3, y + 1, 2, 1, shade);
        g.fill(x + i * 3, y, 2, 1, c);
        g.set(x + i * 3 + 2, y + 1, shade);
    }
}

function bump(g, x, y, c, shade) {
    g.set(x, y + 1, shade);
    g.set(x + 1, y, c);
    g.set(x + 2, y, c);
    g.set(x + 1, y + 1, c);
    g.set(x + 2, y + 1, shade);
}

function drawLucy(kind) {
    var g = new Grid(40, 64);

    ellipse(g, 20, 22, 14, 13, C.out);
    ellipse(g, 20, 22, 13, 12, C.hairD);
    ellipse(g, 20, 21, 12, 11, C.hair);
    g.fill(12, 13, 5, 2, C.hairL);

    ellipse(g, 20, 24, 9, 9, C.skin);
    g.fill(11, 16, 18, 4, C.hair);
    g.fill(14, 18, 3, 2, C.skin);
    g.fill(23, 18, 3, 2, C.skin);
    g.fill(18, 17, 4, 1, C.hair);

    var i;
    for (i = 0; i < 7; i++) bump(g, 8 + i * 4, 9 + (i === 0 || i === 6 ? 2 : i === 1 || i === 5 ? 1 : 0), C.frill, C.frillD);
    g.fill(12, 12, 16, 2, C.frill);
    g.fill(11, 13, 18, 1, C.frillD);

    g.fill(18, 31, 4, 2, C.skin);
    g.fill(17, 33, 6, 2, C.skinD);

    g.fill(10, 34, 20, 4, C.dress);
    ellipse(g, 11, 35, 4, 3, C.dress);
    ellipse(g, 29, 35, 4, 3, C.dress);
    g.fill(8, 36, 5, 2, C.frill);
    g.fill(27, 36, 5, 2, C.frill);
    g.fill(9, 38, 4, 8, C.skin);
    g.fill(27, 38, 4, 8, C.skin);
    g.fill(9, 44, 4, 2, C.frill);
    g.fill(27, 44, 4, 2, C.frill);
    g.fill(10, 45, 2, 2, C.skin);
    g.fill(28, 45, 2, 2, C.skin);

    g.fill(14, 33, 12, 2, C.frill);
    g.fill(15, 32, 10, 1, C.frill);
    g.fill(17, 34, 2, 2, C.bow);
    g.fill(21, 34, 2, 2, C.bow);
    g.set(19, 35, C.bow);
    g.set(20, 35, C.bow);

    g.fill(13, 37, 14, 10, C.apron);
    scallop(g, 13, 36, 4, C.frill, C.frillD);
    scallop(g, 13, 46, 5, C.frill, C.frillD);
    g.fill(13, 39, 1, 8, C.apronD);
    g.fill(26, 39, 1, 8, C.apronD);

    ellipse(g, 20, 52, 14, 6, C.dress);
    g.fill(8, 48, 24, 5, C.dress);
    scallop(g, 7, 53, 9, C.frill, C.frillD);

    g.fill(15, 55, 3, 4, C.sock);
    g.fill(22, 55, 3, 4, C.sock);
    g.fill(15, 55, 1, 4, C.sockD);
    g.fill(24, 55, 1, 4, C.sockD);
    g.fill(14, 59, 5, 3, C.shoe);
    g.fill(21, 59, 5, 3, C.shoe);
    g.fill(15, 59, 2, 1, C.shine);
    g.fill(22, 59, 2, 1, C.shine);
    g.fill(15, 60, 3, 1, C.out);
    g.fill(22, 60, 3, 1, C.out);

    eye(g, 12, 21, kind);
    eye(g, 22, 21, kind);
    mouth(g, 17, 30, kind === "heart" || kind === "care" ? "shy" : kind);
    if (kind !== "angry" && kind !== "sad") {
        g.fill(11, 28, 2, 1, C.blush);
        g.fill(27, 28, 2, 1, C.blush);
    }
    if (kind === "blush" || kind === "heart") {
        g.fill(10, 27, 3, 2, C.blush);
        g.fill(27, 27, 3, 2, C.blush);
    }
    if (kind === "fear") {
        g.set(31, 20, 0x7ec8e0);
        g.set(31, 21, C.white);
    }
    return g;
}

function blit(dst, src, ox, oy, scale) {
    var y, x, sy, sx;
    for (y = 0; y < src.h; y++) {
        for (x = 0; x < src.w; x++) {
            var c = src.get(x, y);
            if (!c) continue;
            for (sy = 0; sy < scale; sy++) {
                for (sx = 0; sx < scale; sx++) dst.set(ox + x * scale + sx, oy + y * scale + sy, c);
            }
        }
    }
}

function text(dst, s, x, y, c, scale) {
    var font = {
        " ": [],
        L: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
        u: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 1], [2, 2], [2, 3], [2, 4]],
        c: [[1, 1], [0, 2], [0, 3], [1, 4], [2, 1], [2, 4]],
        y: [[0, 1], [2, 1], [1, 2], [1, 3], [0, 4]],
        W: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 4], [2, 2], [2, 3], [3, 4], [4, 0], [4, 1], [4, 2], [4, 3]],
        e: [[1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [1, 4], [2, 4]],
        l: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 4]],
        o: [[1, 1], [0, 2], [0, 3], [1, 4], [2, 2], [2, 3], [2, 4], [2, 1]],
        m: [[0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [2, 4], [3, 2], [4, 3], [4, 4]],
        a: [[1, 2], [2, 2], [0, 3], [2, 3], [0, 4], [1, 4], [2, 4]],
        s: [[1, 1], [2, 1], [0, 2], [1, 3], [2, 4], [0, 4]],
        t: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3], [2, 4]],
        r: [[0, 2], [0, 3], [0, 4], [1, 2], [2, 1]],
        M: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [2, 1], [3, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
        i: [[1, 0], [1, 2], [1, 3], [1, 4]],
        k: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 1], [2, 3], [2, 4]]
    };
    var i, p, ch, glyph, adv;
    for (i = 0; i < s.length; i++) {
        ch = s.charAt(i);
        glyph = font[ch] || font[ch.toLowerCase()] || [];
        adv = ch === "W" || ch === "M" || ch === "m" ? 5 : 4;
        for (p = 0; p < glyph.length; p++) {
            dst.fill(x + glyph[p][0] * scale, y + glyph[p][1] * scale, scale, scale, c);
        }
        x += (adv + 1) * scale;
    }
}

function toRgba(g) {
    var buf = Buffer.alloc(g.w * g.h * 4);
    var i, c;
    for (i = 0; i < g.p.length; i++) {
        c = g.p[i];
        if (!c) continue;
        buf[i * 4] = (c >> 16) & 255;
        buf[i * 4 + 1] = (c >> 8) & 255;
        buf[i * 4 + 2] = c & 255;
        buf[i * 4 + 3] = 255;
    }
    return buf;
}

function crc32(buf) {
    var c = ~0;
    var i, k;
    for (i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
}
function chunk(type, data) {
    var len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    var t = Buffer.from(type);
    var body = Buffer.concat([t, data]);
    var crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
}
function writePng(file, g) {
    var w = g.w;
    var h = g.h;
    var raw = Buffer.alloc((w * 4 + 1) * h);
    var rgba = toRgba(g);
    var y;
    for (y = 0; y < h; y++) {
        raw[y * (w * 4 + 1)] = 0;
        rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    }
    var ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    var png = Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0))
    ]);
    fs.writeFileSync(file, png);
}

var screen = new Grid(320, 170);
screen.fill(0, 0, 320, 170, C.wall);
var lucy = drawLucy("shy");
var scale = 2;
var ox = 10;
var oy = 170 - 18 - lucy.h * scale;
screen.fill(0, oy + lucy.h * scale, 320, 170, C.floor);
screen.fill(0, oy + lucy.h * scale, 320, 3, C.base);
blit(screen, lucy, ox, oy, scale);
var panelX = ox + lucy.w * scale + 8;
screen.fill(panelX, 8, 320 - panelX - 6, oy + lucy.h * scale - 16, C.panel);
screen.fill(panelX, 8, 320 - panelX - 6, 1, C.base);
screen.fill(panelX, oy + lucy.h * scale - 17, 320 - panelX - 6, 1, C.base);
screen.fill(panelX, 8, 1, oy + lucy.h * scale - 24, C.base);
text(screen, "Lucy", panelX + 10, 16, C.name, 2);
text(screen, "Welcome my Master", panelX + 10, 44, C.ink, 1);
text(screen, "click", panelX + 10, oy + lucy.h * scale - 32, C.dim, 1);

var zoom = new Grid(lucy.w * 6, lucy.h * 6);
zoom.fill(0, 0, zoom.w, zoom.h, C.wall);
blit(zoom, lucy, 0, 0, 6);

var kinds = ["shy", "joy", "care", "heart", "sad", "angry", "fear", "blush", "surprise"];
var sheet = new Grid(3 * (40 * 3 + 6) + 4, 3 * (64 * 3 + 6) + 4);
sheet.fill(0, 0, sheet.w, sheet.h, C.wall);
var n;
for (n = 0; n < kinds.length; n++) {
    blit(sheet, drawLucy(kinds[n]), 4 + (n % 3) * (40 * 3 + 6), 4 + Math.floor(n / 3) * (64 * 3 + 6), 3);
}

var dir = __dirname;
writePng(path.join(dir, "lucy-screen.png"), screen);
writePng(path.join(dir, "lucy-zoom.png"), zoom);
writePng(path.join(dir, "lucy-faces.png"), sheet);
console.log("wrote preview");
