const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');
const axios = require("axios");
const request = require('superagent');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');

const getDirName = require('path').dirname;
const readFileAsync = Promise.promisify(fs.readFile);
const mkdirpAsync = Promise.promisify(mkdirp);

let VERITONE_API_BASE_URL = process.env.VERITONE_API_BASE_URL;
if (!VERITONE_API_BASE_URL.startsWith("http")) {
  VERITONE_API_BASE_URL = "https://" + VERITONE_API_BASE_URL;
}
const fields = [
  "tdoId", "startOffsetMs", "endOffsetMs", "engineCategoryId"
];

const formatRecords = (data) =>
  (data && Array.isArray(data.records)) ?
      data.records.sort((a, b) => a.name < b.name ? -1 : 1) :
      [];

const fieldValue = (config, field, msg) => {
  const value = config[field];
  const isStr = config[`${field}Type`] === 'str';
  return isStr ? value : get(msg, value);
};

async function getEngineCategories(api) {
  const query = `query { engineCategories { 
  records { id name description type { name description } totalEngines categoryType } 
} }`;
  const { engineCategories } = await api.Query(query);
  return formatRecords(engineCategories);
};

async function createAsset(input, node, file) {
  return readFileAsync(file.destination).then(data => {
    let query =  `mutation {
      createAsset(input: {
        containerId: "${input.tdoId}"
        contentType: "${file.contentType}"
        details: "{ 'engineCategoryId': ${input.engineCategoryId} }"
        assetType: "media"
      }) {
        id
        uri
      }
    }`;

    let headers = {
      Authorization:  `Bearer ${process.env.API_TOKEN}`,
    };
    return request
      .post(VERITONE_API_BASE_URL + "/v3/graphql", )
      .set(headers)
      .field('query', query)
      .field('filename', file.fileName)
      .attach('file', Buffer.from(data, 'utf8'), file.fileName)
      .end(function gotResponse(err, response) {
        if (!err) {
          let responseData = JSON.parse(response.text);
          node.log("new asset created with id "+ responseData.data.createAsset.id);
          return responseData;
        }
        node.log(err);
      });
  });
}

async function downloadFile(input, node) {
  const headers = {
      "Authorization": `Bearer ${process.env.API_TOKEN}`,
      "Content-Type": "application/json"
  };
  
  const url = `${VERITONE_API_BASE_URL}/media-streamer/download/tdo/${input.tdoId}?startOffsetMs=${input.startOffsetMs}&endOffsetMs=${input.endOffsetMs}`;

  axios({
      method: "GET", url, responseType: 'arraybuffer', headers, timeout: 30000
  }).then( res => {
    const fileName = res.headers['content-disposition'].split('="').pop().split('"')[0];
    const file = {
      fileName,
      contentType: res.headers['content-type'],
      destination: path.join(__dirname,`../uploads/${fileName}`)
    };
    return mkdirpAsync(getDirName(file.destination)).then(() => {
      fs.writeFileSync(file.destination, res);
      createAsset(input, node, file);
    });
  }).catch(err => {
    return err;
  });
}

function registerHttpEndpoints(RED) {
  const api = NewVeritoneAPI(RED.log.debug);
  RED.httpAdmin.get("/veritone/engineCategories", function (req, res, next) {
    getEngineCategories(api).then(data => res.json(data)).catch(next);
  });
}

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
      const input = {};
      fields.forEach(field => {
          input[field] = fieldValue(config, field, msg);
      });
      const { onError, onSuccess, onRequesting } = NewOutput(node, msg);
      downloadFile(input, node)
        .then(onRequesting)
        .then(onSuccess)
        .catch(onError);
    });
    
}

module.exports = function (RED) {
  if (RED.settings.httpNodeRoot !== false) {
    registerHttpEndpoints(RED);
  }
  const NodeName = 'aiware-clipping';
  RED.nodes.registerType(NodeName, function (config) {
      RED.nodes.createNode(this, config);
      CreateNode(RED, this, config);
  });
};
