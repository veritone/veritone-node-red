function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const { res } = msg;
        if (res) {
            const statusCode = config.statusCode || msg.statusCode || 200;
            res.status(statusCode);
            const { _msgid, payload } = msg;
            res.json(payload);
            RED.log.vtn({ _msgid, payload, statusCode }, { node });
        } else {
            node.warn(RED._("httpin.errors.no-response"));
        }
    });
}

module.exports = function (RED) {
    const NodeName = 'engine-out';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
