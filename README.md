## Veritone-Node-Red

### Testing a node module locally

To test a node module locally, the `npm link` command can be used. This allows you to develop the node in a local directory and have it linked into a local node-red install, as if it had been npm installed.

1. In the veritone-node-red directory, run: `sudo npm link`.
2. In your node-red user directory, typically `~/.node-red` run: `npm link veritone-node-red`.
