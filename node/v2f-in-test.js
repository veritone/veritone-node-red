const bodyParser = require("body-parser");
const { CreateResponseWrapper } = require('../lib/http');

function CreateNode(RED, node, config) {
    const { customFields, mimeType, testPayload } = config;
    node.config = { customFields };
    node.on("input", function (msg) {
        // overwrite payload
        const event = JSON.parse(testPayload);
        if (event.mimeType === mimeType) {
            msg.payload = event;
            node.send([msg, null]);
        } else {
            msg.payload = {
                type: 'chunk_processed_status',
                timestampUTC: Date.now(),
                taskId: event.taskId,
                chunkUUID: event.chunkUUID,
                status: 'IGNORED'
            };
            node.send([null, msg]);
        }
    });
}

function registerHttpEndpoints(RED) {
    const maxApiRequestSize = RED.settings.apiMaxLength || '5mb';
    const jsonParser = bodyParser.json({ limit: maxApiRequestSize });
    const errorHandler = function (req, res) {
        const node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            node.warn(err);
        }
        res.sendStatus(500);
    }
    const handler = function (req, res) {
        const node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                const msgid = RED.util.generateId();
                res._msgid = msgid;
                const msgPayload = req.body;
                const taskPayload = msgPayload.taskPayload || {};
                const { customFields = [] } = node.config || {};
                customFields.forEach(field => {
                    taskPayload[field.key] = field.value;
                });
                const msg = {
                    _msgid: msgid, req: req,
                    res: CreateResponseWrapper(node, res),
                    payload: msgPayload
                };
                node.send(msg);
                res.sendStatus(200);
            } catch (err) {
                res.sendStatus(500);
                node.error(RED._("inject.v2f-in.failed", { error: err.toString() }));
            }
        } else {
            res.sendStatus(404);
        }
    }
    RED.httpNode.post("/veritone/v2f-in-test/:id", jsonParser, handler, errorHandler);
}

module.exports = function (RED) {
    const NodeName = 'v2f-in-test';
    if (RED.settings.httpNodeRoot !== false) {
        try {
            registerHttpEndpoints(RED);
        } catch (e) {
            RED.log.debug(e.stack || e);
        }
    }
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
