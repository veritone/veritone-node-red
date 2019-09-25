const mustache = require("mustache");
const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const template = msg.template || config.template;
        const syntax = msg.syntax || config.syntax;
        const query = (syntax === "mustache") ? mustache.render(template, msg) : template;
        const { onError, onSuccess } = NewOutput(node, msg);
        const onMulErrors = (res) => {
            onError(res)
            if (res.response.data.data) onSuccess(res.response.data.data)
        }
        api.Query(query, msg.variables).then(onSuccess).catch(onMulErrors);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
