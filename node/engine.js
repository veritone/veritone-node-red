const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const mustache = require("mustache");
const { get } = require('lodash');

const render = (tmpl, obj) => mustache.render(tmpl, obj);

const formatRecords = (data) =>
    (data && Array.isArray(data.records)) ?
        data.records.sort((a, b) => a.name < b.name ? -1 : 1) :
        [];

async function getEngineCategories(api) {
    const query = `query { engineCategories { 
    records { id name description type { name description } totalEngines categoryType } 
} }`;
    const { engineCategories } = await api.Query(query);
    return formatRecords(engineCategories);
};

async function getEnginesByCategory(api, categoryId) {
    const query = `query { engines(limit: 10000, offset: 0, categoryId: "${categoryId}", state: active) { 
    records { id name description rating price libraryRequired deploymentModel } 
} }`;
    const { engines } = await api.Query(query);
    return formatRecords(engines);
};

async function getLibraries(api) {
    const query = `query { libraries { 
    records { id name description libraryType { id entityTypeName } } 
} }`;
    const { libraries } = await api.Query(query);
    return formatRecords(libraries);
};

async function createJob(api, targetId, tasks) {
    const command = 'createJob';
    const input = { targetId, tasks };
    const fields = `id name status tasks { records {id name status engine { id name }} }`;
    const { createJob: res } = await api.Mutate(command, input, fields);
    return res;
}

const fieldValue = (config, field, msg) => {
  const value = config[field];
  const isStr = config[`${field}Type`] === 'str';
  // if targetId Type is str, we render the template, if it is msg, we use lodash to get the field's value
  return isStr ? render(value, msg) : get(msg, value);
};

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const { tasks: tasksConfig } = config;
        const engineIds = fieldValue(config, 'engineIds', msg) || [];
        const tasksList = [...new Set(engineIds.concat(tasksConfig))];
        const tasks = tasksList.map(({ engineId }) => ({ engineId }));
        const { onError, onSuccess } = NewOutput(node, msg);
        const targetId = fieldValue(config, 'targetId', msg);
        createJob(api, targetId, tasks).then(onSuccess).catch(onError);
    });
}

function registerHttpEndpoints(RED) {
    const api = NewVeritoneAPI(RED.log.debug);
    RED.httpAdmin.get("/veritone/libraries", function (req, res, next) {
        getLibraries(api).then(data => res.json(data)).catch(next);
    });
    RED.httpAdmin.get("/veritone/engineCategories", function (req, res, next) {
        getEngineCategories(api).then(data => res.json(data)).catch(next);
    });
    RED.httpAdmin.get("/veritone/engines", function (req, res, next) {
        const { categoryId } = req.query;
        getEnginesByCategory(api, categoryId).then(data => res.json(data)).catch(next);
    });
}

module.exports = function (RED) {
    if (RED.settings.httpNodeRoot !== false) {
        registerHttpEndpoints(RED);
    }
    const NodeName = 'ai-processing';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
