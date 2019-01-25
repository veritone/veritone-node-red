
function NewOutput(node, msg) {
    const showStatus = (color, text) => node.status({ fill: color, shape: 'dot', text });
    const onError = (error) => {
        if (error.response) {
            onFail(error.response);
            return;
        }
        let message = error.message || statusText;
        let detail = error.message;
        if (error.request) {
            detail = error.request;
            message = error.request.message || 'invalid request';
        }
        const payload = { error, detail, message };
        msg.payload = payload;
        showStatus("red", message);
        node.error("error: " + message);
        node.send([null, msg]);
    }
    const onSuccess = (data) => {
        showStatus("green", "aiware.status.success");
        msg.payload = data;
        node.send(msg);
    }
    const onFail = ({ status, statusText, data: { errors } }) => {
        let message = statusText;
        // change the message
        if (Array.isArray(errors) && errors.length > 0) {
            message = errors[0].message || statusText;
        }
        showStatus("red", `error: ${message}`);
        node.error(message);
        const payload = { status, errors, message };
        msg.payload = payload;
        node.send([null, msg]);
    }
    const onResponse = (response) => {
        const { status, data: { data, errors } } = response;
        if (status > 200 || errors) {
            onFail(response);
        } else {
            onSuccess(data);
        }
    }
    return {
        onError, onResponse
    }
}

module.exports = {
    NewOutput,
};
