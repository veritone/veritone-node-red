const { NewOutput } = require('../lib/output');
const { VeritoneGraphqlEnv } = require('../lib/graphql');
const superagent = require('superagent');
async function CreateNode(RED, node, config) {
    node.on("input", async function (msg) {
        node.status({ fill: "blue", shape: "dot", text: "uploading...   " });
        const { onError, onSuccess } = NewOutput(node, msg);
        var contentType = config.format == 'mp3' ? 'audio/mpeg' : 'video/mp4';
        var query = `mutation {
                    createAsset(input: {
                       containerId: "${config.tdoid}"
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
                .field('filename', config.fileName)
                .attach('file', Buffer.from(msg.payload, 'utf8'), config.fileName)
            var responseData = JSON.parse(response.text).data
            var url = responseData.createAsset.signedUri;
            onSuccess(url);
        } catch (err) {
            onError(err);
        }
    });
}

module.exports = function (RED) {
    const NodeName = 'upload-file';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};