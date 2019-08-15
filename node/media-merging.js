const { NewOutput } = require('../lib/output');
const { NewVeritoneAPI, GetUserAgent, VeritoneGraphqlEnv } = require('../lib/graphql');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const superagent = require('superagent');
const fs = require('fs');
const download = require('download');
async function CreateNode(RED, node, config) {
    node.on("input", async function (msg) {
        node.status({ fill: "blue", shape: "dot", text: "processing...   " });
        const { onError, onSuccess } = NewOutput(node, msg);
        var urls;
        if (msg.urls) {
            if (msg.urls.length < 2) onError(new Error("Need at least 2 urls"))
            else urls = msg.urls;
        } else {
            if (!config.url1 || !config.url2) onError(new Error("Need at least 2 urls"))
            else urls = [config.url1, config.url2]
        }

        var extFile = '.' + config.format;
        var contentType = extFile == '.mp3' ? 'audio/mpeg' : 'video/mp4';
        var time = (new Date()).getTime();
        var folderTmp = "/tmp/"
        var outputFile = folderTmp + "output_" + time + extFile;
        var cloneFolder = folderTmp + "clone_" + time;

        try {
            var files = await clone();
            await merge(files, outputFile);
            msg.filename = outputFile;
            var tdoid = await createTDO();
            var url = await uploadFile(outputFile, tdoid, contentType);
            onSuccess(url);
        } catch (err) {
            onError(err)
        }

        function clone() { // download media file to /tmp
            var count = 0;
            return new Promise((resolve, reject) => {
                for (let i = 0; i < urls.length; i++) {
                    download(urls[i], cloneFolder).then(async (data) => {
                        if (!data) reject(new Error("Download error!"))
                        else {
                            count++;
                            if (count == urls.length) {
                                try {
                                    var files = await fs.readdirSync(cloneFolder);
                                    for (let j = 0; j < files.length; j++)
                                        files[j] = cloneFolder + '/' + files[j];
                                    resolve(files)
                                } catch (err) {
                                    reject(err)
                                }
                            }
                        }
                    })
                }
            })
        }


        function merge(inputs, output) { // merge media files to outputFile
            return new Promise((resolve, reject) => {
                var tmp_ffmpeg = ffmpeg();
                inputs.forEach(input => {
                    tmp_ffmpeg.addInput(input)
                });
                tmp_ffmpeg.mergeToFile(output)
                    .on('end', () => {
                        resolve()
                    })
                    .on('error', (err) => {
                        reject(err)
                    })
            })
        } 
        function createTDO() { // create a new TDO
            return new Promise(async (resolve, reject)=>{
                const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
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

                try {
                    const { createTDO: response } = await api.Query(query);
                    var tdoid = response.id;
                    resolve(tdoid);
                } catch (error) {
                    reject(error);
                }
            });
        }

        function uploadFile(filePath, tdoId, contentType) { // upload outputfile to an asset (with new tdo)
            return new Promise(async (resolve, reject)=>{
                var query = `mutation {
                    createAsset(input: {
                       containerId: "${tdoId}"
                       contentType: "${contentType}"
                       assetType: "media"
                    }) {
                       id
                       uri
                       signedUri
                    }
                }`;
                try {
                    var response = await superagent
                                        .post(VeritoneGraphqlEnv.URL)
                                        .set({ Authorization: `Bearer ${VeritoneGraphqlEnv.API_TOKEN}` })
                                        .field('query', query)
                                        .field('filename', filePath)
                                        .attach('file', filePath)
                    var responseData = JSON.parse(response.text).data
                    var url = responseData.createAsset.signedUri;
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            });
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
