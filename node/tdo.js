
const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug);
    const { uri } = config;
    node.on("input", function (msg) {
        const query = `mutation {
            createTDOWithAsset(input: {
                startDateTime: 1476726655,
                uri: "${uri}"
            }) {
                id
            }
        }`;
        const { onError, onResponse } = NewOutput(node, msg);
        api.Query(query).then(onResponse).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'create-tdo';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
