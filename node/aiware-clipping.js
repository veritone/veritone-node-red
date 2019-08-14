const { getConfig } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');
const axios = require("axios");
const request = require('superagent');
const fs = require('fs');
const os = require('os');

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
  try {
    const file = await downloadFile(input, node);
    const headers = { Authorization:  `Bearer ${API_TOKEN}` };
    const fileName = file.headers['content-disposition'].split('="').pop().split('"')[0];
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
      }
    }`;

    return fs.readFile(os.tmpdir() + '/' + fileName, (err, data) => {
      if (err) node.error(log);
      return request
        .post(URL)
        .set(headers)
        .field('query', query)
        .field('filename', fileName)
        .attach('file', Buffer.from(data, 'utf8'), fileName)
        .end(function gotResponse(err, response) {
          if (!err) {
            const responseData = JSON.parse(response.text);
            node.log("new asset created with id "+ responseData.data.createAsset.id);
            return responseData;
          }
        });
    })
    
  } catch (error) {
    node.log(error);
    return error;
  }
}

function CreateNode(RED, node, config) {
  node.on("input", function (msg) {
    const input = {};
    fields.forEach(field => {
        input[field] = fieldValue(config, field, msg);
    });
    const { onError, onSuccess, onRequesting } = NewOutput(node, msg);
    onRequesting();
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
