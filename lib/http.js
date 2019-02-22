function NewExpressResponse(res) {
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

module.exports = {
    NewExpressOutput: NewExpressResponse,
};
