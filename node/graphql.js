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
        // Support multiple/bulk GQL query
        // 1. output 1 is data if success: response.data.data
        // 2. output 2 is errors if exits: response.data.errors

        // revert back to previous revision
        api.Query(query, msg.variables).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
