const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');

async function createTDOWithAsset(api, input) {
    const command = 'createTDOWithAsset';
    const fields = `id name assets { records { id assetType signedUri } }`;
    const { createTDOWithAsset: res } = await api.Mutate(command, input, fields);
    return res;
}

function CreateNode(RED, node, config) {
    const {
        uri, uriType, isPublic, tdoName: name,
        sourceId, contentType,
        startDateTime, updateStopDateTimeFromAsset
    } = config;
    const getUri = uriType === 'str' ? () => uri : (msg) => get(msg, uri);
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg.orgToken);
        const uri = getUri(msg);
        const input = {
            uri, isPublic, name,
            sourceId, contentType,
            startDateTime, updateStopDateTimeFromAsset
        };

        const { onError, onSuccess } = NewOutput(node, msg);
        createTDOWithAsset(api, input).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'create-tdo';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
