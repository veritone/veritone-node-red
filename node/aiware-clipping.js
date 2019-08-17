const { getConfig } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');
const axios = require("axios");
const { promisify } = require('util');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const readFile = promisify(fs.readFile);

const { URL, API_TOKEN, TIMEOUT: timeout } = getConfig(process.env);

const fields = [
  "tdoId", "startOffsetMs", "endOffsetMs", "engineCategoryId"
];

const fieldValue = (config, field, msg) => {
  const value = config[field];
  const isStr = config[`${field}Type`] === 'str';
  return isStr ? value : get(msg, value);
};

async function downloadFile(input, node) {
  const download_url = `${URL.replace('/v3/graphql','')}/media-streamer/download/tdo/${input.tdoId}?startOffsetMs=${input.startOffsetMs}&endOffsetMs=${input.endOffsetMs}`;
  const headers = { "Authorization": `Bearer ${API_TOKEN}`,"Content-Type": "application/json" };
  try {
    return axios({ method: "GET", url: download_url, responseType: 'arraybuffer', headers, timeout});
  } catch (error) {
    node.log(error);
  }
}

async function createAsset(input, node) {
  const formData = new FormData();
  const file = await downloadFile(input, node);
  const headers = { 
    Authorization:  `Bearer ${API_TOKEN}`,
    ...formData.getHeaders()
  };
  const time = (new Date()).getTime();
  const ext = file.headers['content-disposition'].split('="').pop().split('"')[0].split('.').pop();
  const fileName = time + "." + ext;
  await fs.writeFileSync(os.tmpdir() + '/' + fileName, file);
  const query =  `mutation {
    createAsset(input: {
      containerId: "${input.tdoId}"
      contentType: "${file.headers['content-type']}"
      details: "{ 'engineCategoryId': ${input.engineCategoryId} }"
      assetType: "media"
    }) {
      id
      uri
      signedUri
    }
  }`;
  
  const buffer = await readFile(os.tmpdir() + '/' + fileName);
  formData.append('query', query);
  formData.append('file', buffer, { filename: fileName }); 
  const r = await axios({
    method: 'POST',
    url: URL,
    data: formData,
    headers
  });
  return r.data;
}

function CreateNode(RED, node, config) {
  node.on("input", function (msg) {
    const input = {};
    fields.forEach(field => {
        input[field] = fieldValue(config, field, msg);
    });
    const { onError, onSuccess } = NewOutput(node, msg);
    node.status({ fill: "blue", shape: "dot", text: "processing...   " });
    createAsset(input, node).then(onSuccess).catch(onError);
  });
}

module.exports = function (RED) {
  const NodeName = 'aiware-clipping';
  RED.nodes.registerType(NodeName, function (config) {
      RED.nodes.createNode(this, config);
      CreateNode(RED, this, config);
  });
};
