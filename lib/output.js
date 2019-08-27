function NewOutput(node, msg) {
    const showStatus = (color, text) => node.status({ fill: color, shape: 'dot', text });
    const onError = (error, status = '') => {
        if (error.response) {
            onFailedResponse(error.response, status);
            return error;
        }
        let message = error.message || 'statusText';
        let detail = error.message;
        if (error.request) {
            detail = error.request;
            message = error.request.message || 'invalid request';
        }
        showStatus("red", `${status} ${message}`);
        if (msg) {
            const payload = { error, detail, message };
            msg.payload = payload;
            node.error("error: " + message);
            node.send([null, msg]);
        }
        return error;
    }
    const onSuccess = (data, status = 'aiware.status.success') => {
        showStatus("green", status);
        if (msg) {
            msg.payload = data;
            node.send(msg);
        }
        return data;
    }
    const onFailedResponse = ({ status, statusText, data: { errors } }, statusMessage = 'error') => {
        let message = statusText;
        // change the message
        if (Array.isArray(errors) && errors.length > 0) {
            message = errors.map(e => e.message).join("; ") || statusText;
        }
        showStatus("red", `${statusMessage}: ${message}`);
        node.error(message);
        if (msg) {
            const payload = { status, errors, message };
            msg.payload = payload;
            node.send([null, msg]);
        }
    }
    return {
        onError, onSuccess
    }
}

module.exports = {
    NewOutput,
};
