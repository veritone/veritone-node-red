module.exports = function(RED) {
  const bodyParser = require("body-parser");

  function rawBodyParser(req, res, next) {
    if (req.skipRawBodyParser) { next(); } // don't parse this if told to skip
    if (req._body) { return next(); }
    req.body = "";
    req._body = true;

    var isText = true;
    var checkUTF = false;

    if (req.headers['content-type']) {
      var parsedType = typer.parse(req.headers['content-type'])
      if (parsedType.type === "text") {
        isText = true;
      } else if (parsedType.subtype === "xml" || parsedType.suffix === "xml") {
        isText = true;
      } else if (parsedType.type !== "application") {
        isText = false;
      } else if (parsedType.subtype !== "octet-stream") {
        checkUTF = true;
      } else {
        // applicatino/octet-stream
        isText = false;
      }
    }

    getBody(req, {
      length: req.headers['content-length'],
      encoding: isText ? "utf8" : null
    }, function (err, buf) {
      if (err) { return next(err); }
      if (!isText && checkUTF && isUtf8(buf)) {
        buf = buf.toString()
      }
      req.body = buf;
      next();
    });
  }

  function createResponseWrapper(node,res) {
    var wrapper = {
      _res: res
    };
    var toWrap = [
      "append",
      "attachment",
      "cookie",
      "clearCookie",
      "download",
      "end",
      "format",
      "get",
      "json",
      "jsonp",
      "links",
      "location",
      "redirect",
      "render",
      "send",
      "sendfile",
      "sendFile",
      "sendStatus",
      "set",
      "status",
      "type",
      "vary"
    ];
    toWrap.forEach(function(f) {
      wrapper[f] = function() {
        node.warn(RED._("httpin.errors.deprecated-call",{method:"msg.res."+f}));
        var result = res[f].apply(res,arguments);
        if (result === res) {
          return wrapper;
        } else {
          return result;
        }
      }
    });
    return wrapper;
  }

  function SubscribeEvent(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    if (!process.env.VERITONE_API_BASE_URL) {
      throw new Error('VERITONE_API_BASE_URL env variable not set')
    }
    if (!process.env.NODE_INSTANCE_URL) {
      throw new Error('NODE_INSTANCE_URL env variable not set')
    }
    this.veritoneUrl = process.env.VERITONE_API_BASE_URL + '/v3/graphql';
    this.url = '/' + config.id.replace('.','-');
    this.nodeUrl = process.env.NODE_INSTANCE_URL + this.url;
    this.token = config.token;
    this.app = config.app;
    this.event = config.event_name;
    this.type = config.event_type;
    const apiUtil = require('../utils/api-util.js')(this.veritoneUrl, this.token)

    this.errorHandler = function(err,req,res,next) {
      node.warn(err);
      res.sendStatus(500);
    };

    this.callback = function(req,res) {
      var msgid = RED.util.generateId();
      res._msgid = msgid;
      node.send({_msgid:msgid,req:req,res:createResponseWrapper(node,res),payload:req.body});
      return res.status(200).jsonp(req.body);
    };

    apiUtil.subscribeEvents(this.event, this.type, this.app, this.nodeUrl).then((subscriptionId)=>{
      this.subscriptionId = subscriptionId;
      RED.httpNode.post(this.url,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);
    }).catch((err) => {
      this.error('failed to subscribe events');
      done();
    })

    var maxApiRequestSize = RED.settings.apiMaxLength || '5mb';
    var jsonParser = bodyParser.json({limit:maxApiRequestSize});
    var urlencParser = bodyParser.urlencoded({limit:maxApiRequestSize,extended:true});

    RED.httpNode.post(this.url,jsonParser,urlencParser,rawBodyParser,this.callback,this.errorHandler);

    this.on("close",function() {
      var node = this;
      RED.httpNode._router.stack.forEach(function(route,i,routes) {
        if (route.route && route.route.path === node.url && route.route.methods["post"]) {
          routes.splice(i,1);
        }
      });
    });
  }
  RED.nodes.registerType("event in",SubscribeEvent);
}
