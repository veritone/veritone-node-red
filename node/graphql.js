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
        api.Query(query, msg.variables).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware-api';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
