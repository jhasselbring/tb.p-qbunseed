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
  -c, --cadence <ms>      Set the cadence in milliseconds
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



function main() {
    client.getAllData().then(torrents => {
        torrents.torrents.forEach((torrent, i) => {
            setTimeout(() => processTorrent(torrent), i * cadence);
        });

    }).catch(err => {
        console.error(err);
    });
}
function processTorrent(torrent) {
    console.log(`Processing ${torrent.name}`);
    client.torrentFiles(torrent.id).then(files => {
        if (!files.length) return;
        let doneList = [];

        files.forEach(file => {
            if (file.progress == 1) {

                // We will only process files that are still being downloaded
                if (file.priority >= 1) {
                    let fileDir = torrent.raw.content_path + (file.name).replace(torrent.name, '');

                    // Check if file exists
                    if (fs.existsSync(fileDir)) {
                        let newPath = torrent.savePath + '/' + '@done/' + fileDir.replace(torrent.savePath, '');
                        const newDir = path.dirname(newPath);
                        if (!fs.existsSync(newDir)) {
                            fs.mkdirSync(newDir, { recursive: true });
                        }
                        try {
                            fs.renameSync(fileDir, newPath);
                            doneList.push(file.index);
                        } catch (err) {
                            return;
                        }
                    } else {
                        console.log(`file ${file.index} is not found, setting to done/DO NOT DOWNLOAD`);
                        doneList.push(file.index);
                    }
                }
            }
        });

        console.log('Done count:', doneList.length);
        if (doneList.length) {
            client.setFilePriority(torrent.id, doneList, 0).then(res => {

                let hasInProgress = false;
                client.torrentFiles(torrent.id)
                    .then(_files => {
                        _files.forEach(_file => {
                            if (_file.priority >= 1) hasInProgress = true;
                            if (_file.progress < 1) hasInProgress = true;
                        })
                        if (!hasInProgress) {
                            client.removeTorrent(torrent.id, true);
                        }
                    })
            });
        }

    });
}



if (args.cadence || args.c) {
    const cadence = parseInt(args.cadence || args.c, 10) * 1000; // Convert cadence to milliseconds
    setInterval(() => {
        main();
    }, cadence);
} else {
    main();
}
