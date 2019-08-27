const bodyParser = require("body-parser");
const { NewOutput } = require('../lib/output');
const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NodeRedEnv } = require('../lib/env');

function RemoveNodeRedRoute(RED, url, method = 'post') {
  const routes = RED.httpNode._router.stack;
  for (let i = 0; i < routes.length; i++) {
    const { route } = routes[i];
    if (route && route.path === url && route.methods[method]) {
      routes.splice(i, 1);
      RED.log.debug(`removed route [${method} ${url}]`);
      return;
    }
  }
}

async function Subscribe(api, { event_name, event_type, app, webhook_url }) {
  const query = `mutation {
    subscribeEvent(input: {
      eventName: "${event_name}"
      eventType: "${event_type}"
      application: "${app}"
      delivery:{
        name:Webhook
        params:{ url:"${webhook_url}", encoding:"json" }
      }
    })
  }`;
  const { subscribeEvent } = await api.Query(query);
  return subscribeEvent;
};

async function Unsubscribe(api, subscriptionId) {
  const query = `mutation{
    unsubscribeEvent(id:"${subscriptionId}") { id } }
  `;
  await api.Query(query);
}

function CreateNode(RED, node, config) {
  if (!RED.settings.httpNodeRoot) {
    node.status({ fill: 'red', shape: 'ring', text: 'http node root disabled' });
    return;
  }

  const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config));
  const maxApiRequestSize = RED.settings.apiMaxLength || '5mb';
  const jsonParser = bodyParser.json({ limit: maxApiRequestSize });
  const errorHandler = (err, req, res) => { node.warn(err); res.sendStatus(500); };
  const handler = (req, res) => {
    node.send({
      _msgid: RED.util.generateId(),
      payload: req.body
    });
    res.sendStatus(200);
  }
  const { onSuccess, onError } = NewOutput(node);
  const { event_type, event_name, app } = config;
  const uri = `/${config.id.replace(".", "-")}`;
  const webhook_url = NodeRedEnv.GetAbsUrl(uri);
  Subscribe(api, { event_name, event_type, app, webhook_url })
    .then(subscriptionId => {
      onSuccess(subscriptionId, 'aiware.connected');
      RED.log.debug(`subscribe ${subscriptionId} created to ${webhook_url}`);
      RED.httpNode.post(uri, jsonParser, handler, errorHandler);
      // the flow has been stopped or the node has been deleted
      // unsubscribe from the event and remove the http handler
      node.on('close', () => {
        RemoveNodeRedRoute(RED, uri);
        Unsubscribe(api, subscriptionId).then(() => {
          RED.log.debug(`unsubscribe ${subscriptionId} succeeded`);
        }).catch(e => {
          RED.log.error(`unsubscribe ${subscriptionId} error`, e);
        });
      });
    }, e => onError(e, 'disconnected'))
    .catch(e => {
      const message = 'error ' + e.message;
      node.status({ fill: 'red', shape: 'ring', text: message });
    });
};

module.exports = function (RED) {
  const NodeName = 'event in';
  RED.nodes.registerType(NodeName, function (config) {
    RED.nodes.createNode(this, config);
    CreateNode(RED, this, config);
  });
};
