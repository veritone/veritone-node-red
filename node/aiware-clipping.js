const { NewOutput } = require('../lib/output');
const { get } = require('lodash');
const axios = require("axios");
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');

const getDirName = require('path').dirname;
const readFileAsync = Promise.promisify(fs.readFile);
const mkdirpAsync = Promise.promisify(mkdirp);

const fields = [
  "tdoId", "startOffsetMs", "endOffsetMs"
];

const fieldValue = (config, field, msg) => {
  const value = config[field];
  const isStr = config[`${field}Type`] === 'str';
  return isStr ? value : get(msg, value);
};

async function createAsset(input, node) {
  const destination = path.join(__dirname, `../uploads/${input.tdoId}.mp4`);
  return readFileAsync(destination).then(data => {
    const form_data = new FormData();
    form_data.append("file", data);

    node.log('-------upload------');
    node.log(destination);

    let headers = {
      "Authorization": "Bearer b514d894-3c1d-415b-b8d1-ed9b6a90e8c7",
      "Content-Type": "multipart/form-data"
    };

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
    return axios({
      method: "POST", 
      url: "https://api.aws-stage.veritone.com/v3/graphql", 
      timeout: 30000, 
      data: form_data, 
      headers, 
      query
    })
    .then(() => node.log('ok'))
    .catch(err => node.log(err));
  });
}

async function downloadFile(input) {
  const headers = {
      "Authorization": `Bearer b514d894-3c1d-415b-b8d1-ed9b6a90e8c7`,
      "Content-Type": "application/json"
  };
  
  const url = `https://api.aws-stage.veritone.com/media-streamer/download/tdo/${input.tdoId}?startOffsetMs=${input.startOffsetMs}&endOffsetMs=${input.endOffsetMs}`;

  axios({
      method: "GET", url, responseType: 'arraybuffer', headers, timeout: 30000
  }).then( res => {
    const destination = path.join(__dirname,`../uploads/${input.tdoId}.mp4`);
    return mkdirpAsync(getDirName(destination)).then(() => 
      fs.writeFileSync(destination, res)
    );
  }).catch(err => {
    return err;
  });
}

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
      const input = {};
      fields.forEach(field => {
          input[field] = fieldValue(config, field, msg);
      });
      const { onError, onSuccess } = NewOutput(node, msg);
      
      downloadFile(input)
        .then(() => createAsset(input, node).then(onSuccess).catch(onError))
        .catch(onError);
    });
    
}

module.exports = function (RED) {
    const NodeName = 'aiware-clipping';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
