
const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

async function me(api) {
    const query = `{ me {id name roles { name } } }`;
    const { me: res } = await api.Query(query);
    return res;
}

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg.orgToken);
        const { onError, onSuccess } = NewOutput(node, msg);
        me(api).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'me';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
