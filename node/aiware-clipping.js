const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');
const axios = require("axios");
const request = require('superagent');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
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
  "tdoId", "startOffsetMs", "endOffsetMs"
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

async function createAsset(input, node) {
  const destination = path.join(__dirname, `../uploads/${input.tdoId}.mp4`);
  return readFileAsync(destination).then(data => {
    const form_data = new FormData();
    form_data.append("file", data);

    let query =  `mutation {
      createAsset(input: {
        containerId: "${input.tdoId}"
        contentType: "video/mp4"
        assetType: "media"
      }) {
        id
        uri
      }
    }`;
    node.log(query);

    let headers = {
      Authorization:  `Bearer ${process.env.API_TOKEN}`,
    };
    const fileName = `${input.tdoId}.mp4`
    return request
      .post(VERITONE_API_BASE_URL + "/v3/graphql", )
      .set(headers)
      .field('query', query)
      .field('filename', fileName)
      .attach('file', Buffer.from(data, 'utf8'), fileName)
      .end(function gotResponse(err, response) {
        if (!err) {
          let responseData = JSON.parse(response.text);
          node.log("new asset created with id "+ responseData.data.createAsset.id);
        }
        
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
    const destination = path.join(__dirname,`../uploads/${input.tdoId}.mp4`);
    return mkdirpAsync(getDirName(destination)).then(() => {
      fs.writeFileSync(destination, res);
      createAsset(input, node);
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
      const { onError, onSuccess } = NewOutput(node, msg);
      downloadFile(input, node).then(onSuccess).catch(onError);
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
