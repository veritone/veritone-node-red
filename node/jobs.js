const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');


const defaultFields = ['id', 'name', 'status', 'createdDateTime'];

async function getJobs(api, config) {
    let { limit = 10, fields = defaultFields, taskFields = [] } = config;
    if (fields.length < 1) { fields = defaultFields; }
    let tasks = '';
    if (taskFields.length > 0) {
        tasks = ` tasks { records { ${taskFields.join(' ')} } } `
    };
    const query = `query { jobs(limit: ${limit}) { 
        records { ${fields.join(' ')} ${tasks} } 
    } }`;
    const { jobs } = await api.Query(query);
    if (!jobs) { return []; }
    const jobRecords = jobs.records || [];
    return jobRecords.map(j => {
        if (!j.tasks || !j.tasks.records) { return j; }
        const { records: taskRecords } = j.tasks;
        j.tasks = taskRecords;
        return j;
    });
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
