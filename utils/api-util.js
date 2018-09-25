'use strict';
const request = require('superagent');

module.exports = function init(url, token) {
  async function query(query) {
    const headers = {
      Authorization: 'Bearer ' + token
    };
    return new Promise((resolve, reject) => {
      request
        .post(url)
        .set(headers)
        .field('query', query)
        .end((err, data) => {
          if (!err && data) {
            resolve(data);
          } else {
            reject(err);
          }
        });
    });
  }

  async function subscribeEvents(event, type, app, url) {
    const query = `mutation{
		  subscribeEvent(input:{
		    eventName: "${event}"
		    eventType: "${type}"
		    app: "${app}"
		    delivery:{
          name:Webhook
          params:{url:"${url}", encoding:"json"}
        }
      })
		}`;
    try {
      const data = await this.query(query);
      const json = JSON.parse(data.text);
      if (json.errors) {
        throw new Error('failed to subscribe to event', json.errors);
      } else {
        return json.data.subscribeEvent;
      }
    } catch (err) {
      throw new Error('failed to subscribe to event', err);
    }
  }

  return {
    subscribeEvents: subscribeEvents
  }
}

