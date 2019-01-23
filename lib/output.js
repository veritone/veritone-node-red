
function NewOutput(node, msg) {
    const showStatus = (color, text) => node.status({ fill: color, shape: 'dot', text });
    const onError = (error) => {
        const payload = { error };
        if (error.response) {
            payload.detail = error.response.data;
        } else if (error.request) {
            payload.detail = error.request;
        } else {
            payload.detail = error.message;
        }
        msg.payload = payload;
        showStatus("red", "error");
        node.error("error: " + error);
        node.send([null, msg]);
    }
    const onSuccess = (data, errors) => {
        msg.payload = data;
        node.send(msg);
        if (Array.isArray(errors) && errors.length > 0) {
            node.error(errors);
            showStatus("red", `error: ${errors[0].message || errors[0]}`);
        } else {
            showStatus("green", "aiware.status.success");
        }
    }
    const onFail = (status, statusCode, body) => {
        showStatus("red", "status: " + status);
        msg.payload = {
            statusCode,
            body
        };
        node.error(
            "401 error, msg: " + JSON.stringify(msg),
            msg
        );
        node.send([null, msg]);
    }
    const onResponse = (response) => {
        if (response.status === 200) {
            const { data, errors } = response.data;
            onSuccess(data, errors);
        } else {
            const { status, statusCode, body } = response;
            onFail(`status: ${status}`, statusCode, body);
        }
    }
    return {
        onError, onResponse
    }
}

module.exports = {
    NewOutput,
};
