module.exports = function(RED) {
  const kafka = require('kafka-node');

  function KafkaEvent(config) {
    RED.nodes.createNode(this, config);

    if (!process.env.CLUSTER_ID) {
      // noop on non-edge deployments
      return;
    }

    const node = this;
    const consumerGroup = new kafka.ConsumerGroup(
      {
        kafkaHost: config.kafka.brokers || process.env.KAFKA_BROKERS,
        groupId: config.kafka.consumerGroupId || process.env.KAFKA_CONSUMER_GROUP_ID,
        protocol: ['roundrobin'],
        fromOffset: 'earliest',
        maxAsyncRequests: 10
      },
      config.kafka.topics.inputQueue || process.env.KAFKA_TOPIC_INPUT_QUEUE
    );

    consumerGroup.on('error', err => {
      this.error(err);
      this.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
    });
  
    consumerGroup.on('message', message => {
      const { value } = message;
      this.debug('Got message: ' + value);
      let event;
      try {
        event = JSON.parse(value);
      } catch (error) {
        this.debug('Failed to parse json: ' + value);
        return;
      }
      node.send(event);
      this.status({ fill: 'green', shape: 'dot', text: 'connected' });
    });

    node.send({
      message: 'Kafka node initialized!'
    });

    this.on('close', function() {
      this.debug('Initiating graceful shutdown');

      const cleanUpResources = [];
      if (consumerGroup) cleanUpResources.push(Promise.promisify(consumerGroup.close));
      if (producer) cleanUpResources.push(Promise.promisify(producer.close));
      if (client) cleanUpResources.push(Promise.promisify(client.close));
    
      Promise.all(cleanUpResources).then(res => {
        this.debug('Closed all resources');
      }).catch(err => {
        this.debug('Failed to close resources:', err);
      });
    });
  }
  RED.nodes.registerType('event in', KafkaEvent);
};
