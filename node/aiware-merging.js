const { NewOutput } = require('../lib/output');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
var axios = require('axios');
var superagent = require('superagent');
var fs = require('fs');
var download = require('download');
var { onError, onSuccess } = {};
async function CreateNode(RED, node, config) {
    node.on("input", async function (msg) {
        node.status({ fill: "blue", shape: "dot", text: "processing...   " });
        onError = NewOutput(node, msg).onError;
        onSuccess = NewOutput(node, msg).onSuccess;
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

        clone()
        .then((files)=>{
            merge(files, outputFile)
            .then(async ()=>{
                msg.filename = outputFile;
                var createTDO = `mutation {
                                    createTDO(input: {
                                    startDateTime: "${new Date()}"
                                    stopDateTime: "${new Date()}"
                                    }) {
                                    id
                                    startDateTime
                                    stopDateTime
                                    }
                                }`
                var tdo = await graph(createTDO);
                var tdoid;
                if (tdo) tdoid = tdo['data'].data.createTDO.id;
                await uploadFile(outputFile, tdoid, contentType);
            })
            .catch(err=>{
                onError(err)
            })
        })
        .catch(err=>{
            onError(err)
        })
        
        function clone() { // download media file to /tmp
            var count = 0;
            return new Promise((resolve, reject) => {
                for (let i = 0; i < urls.length; i++) {
                    download(urls[i], cloneFolder).then((data) => {
                        if (!data) reject("Download error!")
                        else {
                            count++;
                            if (count == urls.length) {
                                fs.readdir(cloneFolder, (err, files) => { // get list files which was downloaded
                                    if (err) reject(err)
                                    else {
                                        for(let j =0; j< files.length; j++) 
                                            files[j] = cloneFolder + '/' + files[j];
                                        resolve(files)
                                    }
                                })
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

        async function request(options) {
            try {
                return await axios(options);
            } catch (err) {
                onError(err)
                return null;
            }
        }
        const getConfig = (obj) => {
            const { VERITONE_API_BASE_URL, API_TOKEN, GRAPHQL_TIMEOUT } = obj;
            let URL = VERITONE_API_BASE_URL + "/v3/graphql";
            if (!URL.startsWith("http")) {
                URL = "https://" + URL;
            }
            const TIMEOUT = +GRAPHQL_TIMEOUT || 30000;
            return { URL, API_TOKEN, TIMEOUT };
        };

        const VeritoneGraphqlEnv = getConfig(process.env);
        
        async function graph(query) {
            var options = {
                url: VeritoneGraphqlEnv.URL,
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + VeritoneGraphqlEnv.API_TOKEN
                },
                data: {
                    query: query
                }
            }
            return await request(options);
        }
        
        async function uploadFile(filePath, tdoId, contentType) { // upload outputfile to an asset (with new tdo)
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
              }
               `;
            try {
                await superagent
                    .post(VeritoneGraphqlEnv.URL)
                    .set({ Authorization: `Bearer ${VeritoneGraphqlEnv.API_TOKEN}` })
                    .field('query', query)
                    .field('filename', filePath)
                    .attach('file', filePath)
                    .end(function gotResponse(err, response) {
                        if (!err) {
                            let responseData = JSON.parse(response.text);
                            let url = responseData.data.createAsset.signedUri;
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    onError(err);
                                    throw err;
                                }
                            });
                            onSuccess(url);
                            return url;
                        } else {
                            onError(err)
                            return null
                        }
                    });
            } catch (err) {
                onError(err)
                return null;
            }
        }
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware-merging';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
