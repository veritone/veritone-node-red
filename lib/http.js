// Extracted from Node-RED's "http in" node
function CreateResponseWrapper(node, res) {
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

module.exports = {
    CreateResponseWrapper
};
