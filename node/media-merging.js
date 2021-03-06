const { NewOutput } = require('../lib/output');
const { NewVeritoneAPI, GetUserAgent, UploadFileToTDO } = require('../lib/graphql');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const fs = require('fs');
const { get } = require('lodash');
const fields = [
    "tdoId", "url1", "url2"
];

const fieldValue = (config, field, msg) => {
    const value = config[field];
    const isStr = config[`${field}Type`] === 'str';
    return isStr ? value : get(msg, value);
};
async function CreateNode(RED, node, config) {
    node.on("input", async function (msg) {
        node.status({ fill: "blue", shape: "dot", text: "processing...   " });
        const { onError, onSuccess } = NewOutput(node, msg);
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const extFile = '.' + config.format;
        const contentType = extFile == '.mp3' ? 'audio/mpeg' : 'video/mp4';
        const time = (new Date()).getTime();
        const folderTmp = "/tmp/"
        const outputFile = folderTmp + "output_" + time + extFile;
        const downloads = [];
        var urls;
        fields.forEach(field => {
            config[field] = fieldValue(config, field, msg);
        });
        if (!msg.urls || (msg.urls && msg.urls.length<2)) {
            return onError(new Error("Need at least 2 urls"))
        }
        else {
            urls = msg.urls;
        }
        try {
            await download();
            await merge(downloads, outputFile);
            const buffer = await fs.readFileSync(outputFile);
            const tdoId = await createTDO();
            const result = await UploadFileToTDO(tdoId, buffer, contentType);
            onSuccess(result);
        } catch (e) {
            onError(e);
        }

        function download() { // download media file to /tmp
            return new Promise((resolve, reject) => {
                var done = 0;
                urls.forEach((url, i) => {
                    downloads[i] = folderTmp + "download_" + i + "_" + time + extFile;
                    ffmpeg(url)
                        .save(downloads[i])
                        .on('end', () => {
                            done++;
                            if (done == urls.length) resolve();
                        })
                        .on('error', (err) => { reject(err) })
                })
            });
        }

        function merge(inputs, output) { // merge media files to outputFile
            return new Promise((resolve, reject) => {
                var tmp_ffmpeg = ffmpeg();
                inputs.forEach(input => {
                    tmp_ffmpeg.addInput(input)
                });
                tmp_ffmpeg.mergeToFile(output)
                    .on('end', resolve)
                    .on('error', (err) => { reject(err) })
            })
        }

        async function createTDO() {
            const tdoId = config.tdoId; // if tdoId is be specified by setting config.tdoId, will not create a new tdo
            if (tdoId) return tdoId;
            const query = `mutation {
                createTDO(input: {
                    startDateTime: "${new Date()}"
                    stopDateTime: "${new Date()}"
                }) {
                    id
                    startDateTime
                    stopDateTime
                }
            }`;
            const { createTDO } = await api.Query(query);
            return createTDO.id;
        }
    });
}

module.exports = function (RED) {
    const NodeName = 'media-merging';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
