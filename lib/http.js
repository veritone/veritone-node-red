function NewExpressOutput(res) {
    const onError = (error) => {
        if (error.response) {
            onFailedResponse(error.response);
            return;
        }
        let message = error.message || 'statusText';
        let detail = error.message;
        if (error.request) {
            detail = error.request;
            message = error.request.message || 'invalid request';
        }
        const payload = { error, detail, message };
        res.status(500).json(payload);
    }
    const onSuccess = (data) => res.json(data);
    const onFailedResponse = ({ status, statusText, data: { errors } }) => {
        let message = statusText;
        // change the message
        if (Array.isArray(errors) && errors.length > 0) {
            message = errors.map(e => e.message).join("; ") || statusText;
        }
        const payload = { status, errors, message };
        res.status(500).json(payload);
    }
    return {
        onError, onSuccess
    }
}

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

function RemoveNodeRedRoute(RED, url, method = 'post') {
    const routes = RED.httpNode._router.stack;
    for (let i = 0; i < routes.length; i++) {
        const { route } = routes[i];
        if (route && route.path === url && route.methods[method]) {
            routes.splice(i, 1);
            RED.log.debug(`removed route [${method} ${url}]`);
            return;
        }
    }
}

module.exports = {
    NewExpressOutput,
    CreateResponseWrapper,
    RemoveNodeRedRoute,
};
