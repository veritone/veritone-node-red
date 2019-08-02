const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');

async function createTDOWithAsset(api, input) {
    const command = 'createTDOWithAsset';
    const fields = `id name assets { records { id assetType signedUri } }`;
    const { createTDOWithAsset: res } = await api.Mutate(command, input, fields);
    return res;
}

const fields = [
    "tdoName", "sourceId", "contentType",
    "uri", "startDateTime", "stopDateTime"
];

const fieldValue = (config, field, msg) => {
    const value = config[field];
    const isStr = config[`${field}Type`] === 'str';
    return isStr ? value : get(msg, value);
};

function CreateNode(RED, node, config) {
    const { startDateTime, updateStopDateTimeFromAsset } = config;
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const alias = { tdoName: 'name' };
        const input = { startDateTime, updateStopDateTimeFromAsset };
        fields.forEach(field => {
            input[alias[field] || field] = fieldValue(config, field, msg);
        });
        const { onError, onSuccess } = NewOutput(node, msg);
        createTDOWithAsset(api, input).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'create-file';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
