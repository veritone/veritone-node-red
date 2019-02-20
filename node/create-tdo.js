
const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

async function createTDOWithAsset(api, input) {
    const command = 'createTDOWithAsset';
    const fields = `id,name`;
    const { createTDOWithAsset: res } = api.Mutate(command, input, fields);
    return res;
}

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug);
    const {
        uri, uriType, isPublic, tdoName: name,
        sourceId, contentType,
        startDateTime, updateStopDateTimeFromAsset
    } = config;
    const getUri = uriType === 'str' ? () => uri : (msg) => msg[uri];
    node.on("input", function (msg) {
        const uri = getUri(msg);
        const input = {
            uri, isPublic, name,
            sourceId, contentType,
            startDateTime, updateStopDateTimeFromAsset
        };

        const { onError, onResponse } = NewOutput(node, msg);
        createTDOWithAsset(api, input).then(onResponse).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'create-tdo';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
