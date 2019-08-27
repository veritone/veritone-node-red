function CreateNode(RED, node, config) {
    config.counter = 0;

    node.on('input', function(msg) {
        this.status({ fill: "blue", shape: "dot", text: "processing" });

        const retryAttempts = msg.retryAttempts || config.retryAttempts;
        const attemptDelay = msg.attemptDelay || config.attemptDelay;

        setTimeout(() => {
            if (config.counter  < retryAttempts) {
                node.send({
                    payload: 1
                });

                config.counter ++;
            } else {
                config.counter = 0;
                let outputErrorMsg = {};
                outputErrorMsg.payload = {
                    message: msg.payload.message || "",
                    retryCount: retryAttempts,
                    delayInSeconds: attemptDelay
                };
                node.send([null, outputErrorMsg]);
            }
            this.status({});
        }, attemptDelay * 1000);
    });
}

module.exports = function(RED) {
    const NodeName = 'retry';

    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
}
