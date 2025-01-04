import api from 'qbittorrent-api-v2';
import 'dotenv/config';
import fs, { existsSync } from 'fs';
import { rename } from 'fs/promises';
import path from 'path';
let qb;
api.connect(
    process.env.QBITTORRENT_URL || 'http://localhost:8843',
    process.env.QBITTORRENT_USER || 'root',
    process.env.QBITTORRENT_PASS || 'administer'
)
    .then(getqb)
    .catch(err => {
        console.error(err)
    })

function getqb(qbt) {
    qb = qbt;

    qb.torrents()
        .then(processTorrents)
        .catch(err => {
            console.error(err)
        })
}

function processTorrents(torrents) {
    torrents.forEach(processEachTorrents);
}

function processEachTorrents(torrent) {
    if (!torrent.name.includes(' thai friend with boy ninf KOTOS RICAS CONOS INFANT hyman.mp4.torrent')) return;

    qb.properties(torrent.hash).then(properties => {
        // console.log(properties);
        let baseSavePath = properties.save_path + '/';
        qb.files(torrent.hash).then(files => {

            files.forEach(file => {
                // Only proceed if the file is fully downloaded
                if (file.progress < 1) return;
                // console.log(file);
                let filePath = baseSavePath + file.name;

                if (existsSync(filePath)) {
                    let newFilePath = baseSavePath + '@done/' + file.name;
                    // Create @done directory if it doesn't exist
                    const doneDir = path.dirname(newFilePath);
                    if (!existsSync(doneDir)) {
                        fs.mkdir(doneDir, { recursive: true }, err => {
                            console.log(`Working on ##############1`, file.index)
                            // rename(filePath, newFilePath)
                            //     .then(() => {
                            //         // @@@@@@@@@@@@@
                            //         console.log(`Set priority #1`, file, torrent.hash, file.index, 0);
                            //         qb.setFilePriority(torrent.hash, file.index, 0)
                            //             .then(() => {
                            //                 console.log(`Successfully set priority to 0 for file ${file.name}`);
                            //             })
                            //             .catch(err => {
                            //                 console.error(`Error setting priority: ${err}`);
                            //             });
                            //         // @@@@@@@@@@@@@
                            //     })
                            //     .catch(err => {
                            //         console.error(`Error moving file: ${err}`);
                            //     });
                        })
                    } else {
                        console.log(`Working on ##############2`, file.index)
                        // rename(filePath, newFilePath)
                        //     .then(() => {
                                // qb.setFilePriority(torrent.hash, file.index, 0)
                                //     .then(() => {
                                //         console.log(`Successfully set priority to 0 for file ${file.name}`);
                                //     })
                                //     .catch(err => {
                                //         console.error(`Error setting priority: ${err}`);
                                //     });
                            // })
                            // .catch(err => {
                            //     console.error(`Error moving file: ${err}`);
                            // });
                    }
                } else {
                    console.log(`Working on ##############3`, file.index)
                    qb.setFilePriority(torrent.hash, file.index, 0)
                        .then(() => {
                            console.log(`Successfully set priority to 0 for file ${file.name}`);
                        })
                        .catch(err => {
                            console.error(`Error setting priority: ${err}`);
                        });
                }
            });
        });
    });
}
