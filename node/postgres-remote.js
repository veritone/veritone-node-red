const { NewOutput } = require('../lib/output');
const pg = require('pg');
const Client = require('ssh2').Client;
const net = require('net');


function CreateNode(RED, node, config) {
    node.on('input', function(msg) {
        const { onError, onSuccess } = NewOutput(node, msg);
        this.status({ fill: "blue", shape: "dot", text: "processing" });

        sshConnect(config).then(onSuccess).catch(onError);
    });
}

module.exports = function(RED) {
    const NodeName = 'postgres-remote';

    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
}

function sshConnect(pramData) {
    const ssh = new Client();
    var srv;

    return new Promise(function(resolve, reject){
        ssh.on('ready', function() {
            srv = net.createServer( (sock) => {
                ssh.forwardOut(
                    // source address, this can usually be any valid address
                    'localhost',
                    // source port, this can be any valid port number
                    0,
                    // destination address (localhost here refers to the SSH server)
                    'localhost',
                    // destination port
                    pramData.dbServerPort, //5432
                    function (err, stream) {
                        if (err) {
                            reject(err);
                            ssh.end();
                            return;
                        }

                        sock.pipe(stream).pipe(sock);
    
                    }
                );
            });
            
            srv.listen(0, function() {
                const sourcePort = srv.address().port;
                
                const client = new pg.Client({
                    user: pramData.dbUsername,
                    host: 'localhost',
                    database: pramData.dbSchema || 'postgres',
                    password: pramData.dbPassword,
                    port: sourcePort,
                });

                client.connect(function(err) {
                    if(err) {
                        reject(err);
                    }

                    client.query(pramData.dbQuery, function(err, result) {
                        client.end();
                        ssh.end();
                        if(err) {
                            reject(err);
                        }
                        resolve(result);
                    });
                });
            }).on('error', (err) => {
                ssh.end();
                reject(err);
            });

        })
        .on('end', function() {
            console.log('Client disconnected');
            srv && srv.close();
        })
        .on('error', function(err) {
            reject(err);
        })
        .connect({
            host: pramData.sshHostname,
            port: pramData.sshPort || 22,
            username: pramData.sshUsername,
            password: pramData.sshPassword 
        });
    });
}
