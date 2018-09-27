module.exports = function(RED) {
 // https://github.com/axios/axios
 var axios = require("axios");
 var mustache = require("mustache");

 function safeJSONStringify(input, maxDepth) {
  var output,
	  refs = [],
	  refsPaths = [];

  maxDepth = maxDepth || 5;

  function recursion(input, path, depth) {
   var output = {},
	   pPath,
	   refIdx;

   path = path || "";
   depth = depth || 0;
   depth++;

   if (maxDepth && depth > maxDepth) {
	return "{depth over " + maxDepth + "}";
   }

   for (var p in input) {
	pPath = (path ? path + "." : "") + p;
	if (typeof input[p] === "function") {
	 output[p] = "{function}";
	} else if (typeof input[p] === "object") {
	 refIdx = refs.indexOf(input[p]);

	 if (-1 !== refIdx) {
	  output[p] = "{reference to " + refsPaths[refIdx] + "}";
	 } else {
	  refs.push(input[p]);
	  refsPaths.push(pPath);
	  output[p] = recursion(input[p], pPath, depth);
	 }
	} else {
	 output[p] = input[p];
	}
   }

   return output;
  }

  if (typeof input === "object") {
   output = recursion(input);
  } else {
   output = input;
  }

  return JSON.stringify(output);
 }

 function GraphqlExecNode(config) {
  RED.nodes.createNode(this, config);
  
  this.veritoneUrl = process.env.VERITONE_API_BASE_URL + "/v3/graphql";
  this.token = process.env.API_TOKEN;

  this.query = config.query;
  this.template = config.template;
  this.name = config.name;
  this.field = config.field || "payload";
  this.syntax = config.syntax || "mustache";
  var node = this;
  RED.log.debug("--- Veritone API init ---");

  function callGraphQLServer(query) {
   axios({
	method: "POST",
	url: this.veritoneUrl,
	data: {
	 query: query
	},
	headers: {
	 Authorization: "Bearer " + this.token
	}
   }).then(function(response) {
		//TODO: parse graphQL errors
		switch (response.status) {
		 case 200:
		  node.status({
		   fill: "green",
		   shape: "dot",
		   text: RED._("graphql.status.success")
		  });
		  node.msg.payload = response.data.data;
		  node.send(node.msg);
		  break;
		 default:
		  node.status({
		   fill: "red",
		   shape: "dot",
		   text: "status: " + response.status
		  });
		  node.msg.payload = {
		   statusCode: response.statusCode,
		   body: response.body
		  };
		  node.error(
			  "401 error, msg: " + safeJSONStringify(node.msg),
			  node.msg
		  );
		  node.send([null, node.msg]);
		  break;
		}
	   })
	   .catch(function(error) {
		RED.log.debug("error:" + error);
		node.status({ fill: "red", shape: "dot", text: "error" });
		node.msg.payload = { error };
		node.error("error: " + error);
		node.send([null, node.msg]);
	   });
  }

  //*********************************
  // main function invoked on input
  //*********************************
  node.on("input", function(msg) {
   RED.log.debug("--- on(input) ---");
   RED.log.debug("msg: " + safeJSONStringify(msg));
   node.msg = msg;
   node.template = msg.template || node.template;
   node.syntax = msg.syntax || node.syntax;

   var query;
   if (node.syntax === "mustache") {
	query = mustache.render(node.template, msg);
   } else {
	query = node.template;
   }

   callGraphQLServer(query);
  });

  node.on("close", function() {
   RED.log.debug("--- closing node VritoneAPI ---");
  });
 }

 RED.nodes.registerType("veritoneApi", GraphqlExecNode);
};
