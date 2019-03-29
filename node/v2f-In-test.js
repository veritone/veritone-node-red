const bodyParser = require("body-parser");

function createResponseWrapper(node, res) {
    const wrapper = { _res: res };
    const toWrap = [
        "append", "attachment", "cookie", "clearCookie", "download", "end",
        "format", "get", "json", "jsonp", "links", "location",
        "redirect", "render", "send", "sendfile", "sendFile", "sendStatus",
        "set", "status", "type", "consty"
    ];
    toWrap.forEach(function (f) {
        wrapper[f] = function () {
            node.warn(RED._("httpin.errors.deprecated-call", {
                method: "msg.res." + f
            }));
            const result = res[f].apply(res, arguments);
            if (result === res) {
                return wrapper;
            } else {
                return result;
            }
        }
    });
    return wrapper;
}

function CreateNode(RED, node, config) {
    const { engineMode, mimeType, testPayload } = config;
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
                const msg = {
                    _msgid: msgid, req: req,
                    res: createResponseWrapper(node, res),
                    payload: req.body
                };
                node.receive(msg);
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
            console.log(e);
        }
    }
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
