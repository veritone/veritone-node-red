const bodyParser = require("body-parser");
const multer = require('multer');
const { RemoveNodeRedRoute } = require('../lib/http');
const upload = multer({ storage: multer.memoryStorage() }).fields([
    { name: 'chunk', maxCount: 1 }
]);

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
        if (req.files && Array.isArray(req.files.chunk) && req.files.chunk[0]) {
            msg.chunk = get(req.files.chunk[0].buffer);
        }
        RED.log.vtn({ _msgid, body }, { node });
        node.send(msg);
    }
    RED.httpNode.post(uri, jsonParser, formParser, upload, handler, errorHandler);
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
