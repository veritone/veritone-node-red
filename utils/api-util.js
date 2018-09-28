"use strict";
const request = require("superagent");

module.exports = function init(url, token) {
  async function gqlQuery(query) {
    const headers = {
      Authorization: "Bearer " + token
    };
    return new Promise((resolve, reject) => {
      request
        .post(url)
        .set(headers)
        .field("query", query)
        .end((err, data) => {
          if (!err && data) {
            resolve(data);
          } else {
            reject(err);
          }
        });
    });
  }

  async function subscribeEvents(event, type, app, nodeUrl) {
    const query = `mutation{
		  subscribeEvent(input:{
		    eventName: "${event}"
		    eventType: "${type}"
		    application: "${app}"
		    delivery:{
          name:Webhook
          params:{url:"${nodeUrl}", encoding:"json"}
        }
      })
		}`;
    try {
      const data = await gqlQuery(query);
      const json = JSON.parse(data.text);
      if (json.errors) {
        throw new Error(
          "failed to parse subscribeEvents response",
          json.errors
        );
      } else {
        return json.data.subscribeEvent;
      }
    } catch (err) {
      throw new Error("failed to subscribe event", err);
    }
  }

  async function unsubscribeEvents(id) {
    const query = `mutation{
		  unsubscribeEvent(id:"${id}") {
		    id
		  }
    }
		`;
    try {
      const data = await gqlQuery(query);
      const json = JSON.parse(data.text);
      if (json.errors) {
        throw new Error("failed to subscribe to event", json.errors);
      } else {
        return json.data.subscribeEvent;
      }
    } catch (err) {
      throw new Error("failed to unsubscribe event", err);
    }
  }

  return {
    subscribeEvents: subscribeEvents,
    unsubscribeEvents: unsubscribeEvents
  };
};
