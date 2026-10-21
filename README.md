# PocketWaifu

Lucy, a shy maid, on the LilyGO T-Embed CC1101. This is not a separate firmware. The script sits on the microSD card and runs in the Bruce interpreter.

She is already on screen. The wheel scrolls her line. A click opens a short list of actions. That action goes to DeepSeek, and she answers with a pixel face and a line. She calls you Master. The first line is `Welcome my Master`.

## What to copy onto the card

The card must be FAT32. Copy the `BruceJS` folder from `copy-to-sd-card/` onto the card. Do not rename it. Bruce only runs scripts from that folder.

```
BruceJS/lucy/pocketwaifu.js
BruceJS/lucy/config.example.json
```

`lucy` is her own folder inside `BruceJS`. The interpreter shows it as **[ lucy ]**, so the script is not in the main list. Open **pocketwaifu** inside that folder. Her nine portraits are in `lucy/faces`.

Copy `config.example.json` to `config.json` in that same folder and paste the key. After she answers, the game writes `save.json` there.

Leave `tools/` on the computer. `deepseek-ping.js` is an optional connection check. To run it, copy that one file into `BruceJS/lucy` on the card.

A card that still has the key in `/pocketwaifu/config.json` or `/lucy/config.json` keeps working. A new save is written to `/BruceJS/lucy/save.json`.

## Firmware

Official Bruce for the **LilyGO T-Embed CC1101**, not a LITE build (LITE removes the interpreter). Flash it from [bruce.computer](https://bruce.computer) or [BruceDevices/firmware](https://github.com/BruceDevices/firmware). Wi-Fi on this board is **2.4 GHz** only.

Put the files on the card with a reader, or through Bruce: **Files → WebUI**, SD (not internal storage), upload the folder `BruceJS`. The WebUI login is `admin` / `bruce`.

## Run

1. Open **JS Interpreter → [ lucy ] → pocketwaifu**. Lucy is drawn before any file is read.
2. Join Wi-Fi from the Bruce menu **Connect to WiFi** before you open the script. The script does not connect by itself and does not store the password. If Wi-Fi is off, it says so and returns to the menu.
3. Put the API key in `/BruceJS/lucy/config.json` as `deepseekToken`. It starts with `sk-` and comes from [platform.deepseek.com](https://platform.deepseek.com). The script only reads that file. HTTP 401 means DeepSeek refused the key that is already there.
4. A click opens Actions, Write to her, and Status. Actions lists Praise, Hug, Kiss, Pet, Pay, Thank, Scold, Question, and Order. Write to her opens an empty keyboard. Status shows Horny, Bored, Poverty, Stress, Affection, and Confidence. Back from Status returns to that menu. The side button on her scene leaves the script.

Her mood and the last lines are kept in `/BruceJS/lucy/save.json`. Her face is drawn in the script. Nine expressions cover the emotion tag she sends back.
