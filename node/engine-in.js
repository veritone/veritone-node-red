const bodyParser = require("body-parser");
const multer = require('multer');
const { RemoveNodeRedRoute } = require('../lib/http');
const upload = multer({ storage: multer.memoryStorage() }).any();

function CreateNode(RED, node, config) {
    if (!RED.settings.httpNodeRoot) {
        node.warn(RED._("httpin.errors.not-created"));
        return;
    }

    const maxApiRequestSize = RED.settings.apiMaxLength || '5mb';
    const jsonParser = bodyParser.json({ limit: maxApiRequestSize });
    const formParser = bodyParser.urlencoded({ extended: true, limit: maxApiRequestSize });
    const errorHandler = (err, req, res) => { node.warn(err); res.sendStatus(500); };
    const handler = (req, res) => {
        const _msgid = RED.util.generateId();
        const { body } = req;
        res._res = res;
        const msg = { _msgid, req, res, payload: body };
        if (req.files && Array.isArray(req.files) && req.files[0]) {
            msg.chunk = req.files[0].buffer;
        }
        // overwrite the url and orgToken
        if (body.veritoneApiBaseUrl && body.token) {
            msg.url = body.veritoneApiBaseUrl;
            msg.orgToken = body.token;
        }
        RED.log.vtn({ _msgid, ...body }, { node });
        node.send(msg);
    }
    const uri = `/process`;
    // support multiple flows on a single node-red instance
    const uri_unique = `/process/${node.id}`;
    RED.httpNode.post(uri, jsonParser, formParser, upload, handler, errorHandler);
    RED.httpNode.post(uri_unique, jsonParser, formParser, upload, handler, errorHandler);
    node.on('close', () => {
        RemoveNodeRedRoute(RED, uri);
        RemoveNodeRedRoute(RED, uri_unique);
    });
};

module.exports = function (RED) {
    const NodeName = 'engine-in';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
