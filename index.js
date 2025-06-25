#!/usr/bin/env node
import { QBittorrent } from '@ctrl/qbittorrent';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2), {
    alias: {
        port: 'P',
        user: 'u',
        pass: 'p',
        cadence: 'c',
        help: 'h'
    }
});

if (args.help) {
    console.log(`Usage: npx qbunseed [options]

Options:
  -P, --port <port>       Set the port for qBittorrent
  -u, --user <username>   Set the username for qBittorrent
  -p, --pass <password>   Set the password for qBittorrent
  -c, --cadence <ms>      Set the cadence in seconds
  -h, --help              Display this help message

  Example:
  npx @tb.pqbunseed@latest -P 8080 -u admin -p password -c 1000
`);
    process.exit(0);
}

if (!args.port || !args.user || !args.pass) {
    console.error(`Error: Missing required arguments.

Required options:
  -P, --port <port>       Set the port for qBittorrent
  -u, --user <username>   Set the username for qBittorrent
  -p, --pass <password>   Set the password for qBittorrent

Use -h for help.
`);
    process.exit(1);
}

const cadence = args.cadence;

const client = new QBittorrent({
    baseUrl: `http://localhost:${args.port}` || process.env.QBITTORRENT_URL,
    username: args.user || process.env.QBITTORRENT_USER,
    password: args.pass || process.env.QBITTORRENT_PASS,
});

async function main() {
    try {
        const torrents = await client.getAllData();
        for (const torrent of torrents.torrents) {
            await processTorrent(torrent);
            await new Promise(res => setTimeout(res, cadence));
        }
    } catch (err) {
        console.error(err);
    }
}

async function processTorrent(torrent) {
    console.log(`Processing ${torrent.name}`);
    const files = await client.torrentFiles(torrent.id);
    if (!files.length) return;
    let doneList = [];

    for (const file of files) {
        if (file.progress == 1) {
            // We will only process files that are still being downloaded
            if (file.priority >= 1) {
                let fileDir = torrent.raw.content_path + (file.name).replace(torrent.name, '');

                // Check if file exists
                if (fs.existsSync(fileDir)) {
                    let rel;
                    if (fileDir.startsWith(torrent.savePath)) {
                        rel = path.relative(torrent.savePath, fileDir);
                    } else {
                        // fallback: just use the file name (or subpath after torrent.name)
                        rel = file.name;
                    }
                    let newPath = path.join(torrent.savePath, '@done', rel);
                    const newDir = path.dirname(newPath);
                    if (!fs.existsSync(newDir)) {
                        try {
                            fs.mkdirSync(newDir, { recursive: true });
                        } catch (e) {
                            // Ignore EEXIST
                            if (e.code !== 'EEXIST') throw e;
                        }
                    }
                    try {
                        fs.renameSync(fileDir, newPath);
                        doneList.push(file.index);
                    } catch (err) {
                        continue;
                    }
                } else {
                    console.log(`file ${file.index} is not found, setting to done/DO NOT DOWNLOAD`);
                    doneList.push(file.index);
                }
            }
        }
    }

    // Print Done count with color
    if (doneList.length === 0) {
        console.log('Done count:', '\x1b[31m0\x1b[0m'); // Red text
    } else {
        console.log('Done count:', `\x1b[42m${doneList.length}\x1b[0m`); // Green background
    }
    if (doneList.length) {
        await client.setFilePriority(torrent.id, doneList, 0);
        let hasInProgress = false;
        const _files = await client.torrentFiles(torrent.id);
        _files.forEach(_file => {
            if (_file.priority >= 1) hasInProgress = true;
            if (_file.progress < 1) hasInProgress = true;
        });
        if (!hasInProgress) {
            await client.removeTorrent(torrent.id, true);
        }
    }
}

if (args.cadence || args.c) {
    const cadence = parseInt(args.cadence || args.c, 10) * 1000; // Convert cadence to milliseconds
    setInterval(() => {
        main();
    }, cadence);
} else {
    main();
}
