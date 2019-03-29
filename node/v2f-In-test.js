function createResponseWrapper(node, res) {
    const wrapper = { _res: res };
    const toWrap = [
        "append", "attachment", "cookie", "clearCookie", "download", "end",
        "format", "get", "json", "jsonp", "links", "location",
        "redirect", "render", "send", "sendfile", "sendFile", "sendStatus",
        "set", "status", "type", "vary"
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
        const event = JSON.parse(testPayload); // similate event
        if (event.mimeType === mimeType) {
            msg.event = msg.payload = event;
            node.send([msg, null]);
        } else {
            msg.event = msg.payload = {
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

module.exports = function (RED) {
    const NodeName = 'v2f-in-test';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
