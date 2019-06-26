const { Image, createCanvas } = require('canvas');
// faster tensorflow with node binding
require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const axios = require('axios');

async function Download(url) {
    const { data, status } = await axios.default.get(url, {
        responseType: 'arraybuffer'
    });
    if (status !== 200) {
        throw new Error(`download ${url} error status ${status}`)
    }
    return data;
}

async function TensorflowPosenet(event) {
    const buffer = await Download(event.cacheURI);
    const img = new Image();
    img.src = buffer;
    const canvas = createCanvas(img.width, img.height);
    canvas.getContext('2d').drawImage(img, 0, 0);
    const imageScaleFactor = event.taskPayload.imageScaleFactor;
    const outputStride = event.taskPayload.outputStride;
    const flipHorizontal = event.taskPayload.flipHorizontal;
    const isSinglePerson = event.taskPayload.isSinglePerson || false;
    const net = await posenet.load();
    if (isSinglePerson) {
        return net.estimateSinglePose(canvas, imageScaleFactor, flipHorizontal, outputStride);
    }
    const maxPoseDetections = event.taskPayload.maxPoseDetections || 5;
    const nmsRadius = event.taskPayload.nmsRadius || 20;
    const scoreThreshold = event.taskPayload.scoreThreshold || 0.5;
    return net.estimateMultiplePoses(canvas, imageScaleFactor, flipHorizontal, outputStride, maxPoseDetections, scoreThreshold, nmsRadius);
}

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const event = msg.payload;
        TensorflowPosenet(event).then(data => {
            msg.payload = data;
            node.send(msg);
        }).catch(e => {
            const message = e.message || e;
            node.error("error: " + message);
            msg.payload = message;
            node.send([null, msg]);
        });
    });
}

module.exports = function (RED) {
    const NodeName = 'tensorflow-posenet';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
