
const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug);
    const {
        uri, uriType, isPublic, name,
        startDateTime, updateStopDateTimeFromAsset
    } = config;
    const getUri = uriType === 'str' ? () => uri : (msg) => msg[uri];
    node.on("input", function (msg) {
        const command = 'createTDOWithAsset';
        const uri = getUri(msg);
        const input = {
            uri, isPublic, name,
            startDateTime, updateStopDateTimeFromAsset
        };
        const fields = `id,name`;
        const { onError, onResponse } = NewOutput(node, msg);
        api.Mutate(command, input, fields).then(onResponse).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'create-tdo';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
