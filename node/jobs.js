const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');


const defaultFields = ['id', 'name', 'status', 'createdDateTime'];

async function getJobs(api, config) {
    let { limit = 20, fields = defaultFields } = config;
    if (fields.length < 1) { fields = defaultFields; }
    const query = `query { jobs(limit: ${limit}) { 
        records { ${fields.join(' ')} } 
    } }`;
    const { jobs } = await api.Query(query);
    if (!jobs) { return []; }
    return jobs.records || [];
}

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const { onError, onSuccess } = NewOutput(node, msg);
        getJobs(api, config).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware-jobs';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
