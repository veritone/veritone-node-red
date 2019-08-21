const { NewVeritoneAPI, GetUserAgent, getConfig, UploadFileToTDO } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');
const axios = require("axios");
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const readFile = promisify(fs.readFile);

const { URL, API_TOKEN, TIMEOUT: timeout } = getConfig(process.env);
const fields = ["tdoId", "startOffsetMs", "endOffsetMs", "engineCategoryId"];

const fieldValue = (config, field, msg) => {
  const value = config[field];
  const isStr = config[`${field}Type`] === 'str';
  return isStr ? value : get(msg, value);
};

async function getEngineResults(api, input) {
  const query = `query {
    engineResults(tdoId: "${input.tdoId}", engineCategoryIds: ["0481ff76-00c5-4e2d-b73d-2e3aaeef79eb"]){
      records {
        jsondata
        startOffsetMs
        stopOffsetMs
        assetId
        userEdited
        taskId
        libraryId
      }
    }
  }`;
  const { engineResults } = await api.Query(query);
  return engineResults;
};

async function downloadFile(input) {
  const download_url = `${URL.replace('/v3/graphql','')}/media-streamer/download/tdo/${input.tdoId}?startOffsetMs=${input.startOffsetMs}&endOffsetMs=${input.endOffsetMs}`;
  const headers = { "Authorization": `Bearer ${API_TOKEN}`,"Content-Type": "application/json" };
  return axios({ method: "GET", url: download_url, responseType: 'arraybuffer', headers, timeout});
}

async function createAsset(api, input, node) {
  const file = await downloadFile(input);
  const engineResults = await getEngineResults(api, input);
  node.log(engineResults);
  const time = (new Date()).getTime();
  const ext = file.headers['content-disposition'].split('="').pop().split('"')[0].split('.').pop();
  const fileName = time + "." + ext;
  fs.writeFileSync(os.tmpdir() + '/' + fileName, file);
  const buffer = await readFile(os.tmpdir() + '/' + fileName);
  node.log(JSON.stringify(input));
  const r = UploadFileToTDO(input.tdoId, buffer, file.headers['content-type']);
  return r;
}

function CreateNode(RED, node, config) {
  node.on("input", function (msg) {
    const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
    const input = {};
    fields.forEach(field => input[field] = fieldValue(config, field, msg));
    const { onError, onSuccess } = NewOutput(node, msg);
    node.status({ fill: "blue", shape: "dot", text: "processing...   " });
    createAsset(api, input, node).then(onSuccess).catch(onError);
  });
}

module.exports = function (RED) {
  const NodeName = 'aiware-clipping';
  RED.nodes.registerType(NodeName, function (config) {
      RED.nodes.createNode(this, config);
      CreateNode(RED, this, config);
  });
};
