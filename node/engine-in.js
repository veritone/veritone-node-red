const bodyParser = require("body-parser");
const { RemoveNodeRedRoute } = require('../lib/http');

function CreateNode(RED, node, config) {
    if (!RED.settings.httpNodeRoot) {
        node.warn(RED._("httpin.errors.not-created"));
        return;
    }

    const uri = `/process`;
    const maxApiRequestSize = RED.settings.apiMaxLength || '5mb';
    const jsonParser = bodyParser.json({ limit: maxApiRequestSize });
    const formParser = bodyParser.urlencoded({ extended: true, limit: maxApiRequestSize });
    const errorHandler = (err, req, res) => { node.warn(err); res.sendStatus(500); };
    const handler = (req, res) => {
        const _msgid = RED.util.generateId();
        const { body } = req;
        const msg = { _msgid, res, payload: body };
        RED.log.vtn({ _msgid, body }, { node });
        node.send(msg);
    }
    RED.httpNode.post(uri, jsonParser, formParser, handler, errorHandler);
    node.on('close', () => {
        RemoveNodeRedRoute(RED, uri);
    });
};

module.exports = function (RED) {
    const NodeName = 'engine-in';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
