module.exports = function (RED) {
    const bodyParser = require("body-parser");

    function rawBodyParser(req, res, next) {
        if (req.skipRawBodyParser) {
            next();
        } // don't parse this if told to skip
        if (req._body) {
            return next();
        }
        req.body = "";
        req._body = true;

        var isText = true;
        var checkUTF = false;

        if (req.headers["content-type"]) {
            var parsedType = typer.parse(req.headers["content-type"]);
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

        getBody(
            req, {
                length: req.headers["content-length"],
                encoding: isText ? "utf8" : null
            },
            function (err, buf) {
                if (err) {
                    return next(err);
                }
                if (!isText && checkUTF && isUtf8(buf)) {
                    buf = buf.toString();
                }
                req.body = buf;
                next();
            }
        );
    }

    function createResponseWrapper(node, res) {
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
        toWrap.forEach(function (f) {
            wrapper[f] = function () {
                node.warn(
                    RED._("httpin.errors.deprecated-call", {
                        method: "msg.res." + f
                    })
                );
                var result = res[f].apply(res, arguments);
                if (result === res) {
                    return wrapper;
                } else {
                    return result;
                }
            };
        });
        return wrapper;
    }

    function StartProcessing(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.url = "/process";
        node.token = process.env.API_TOKEN;
        node.app = config.app;

        this.errorHandler = function (err, req, res, next) {
            node.warn(err);
            res.sendStatus(500);
        };

        this.callback = function (req, res) {
            var msgid = RED.util.generateId();
            res._msgid = msgid;
            node.send({
                _msgid: msgid,
                req: req,
                res: createResponseWrapper(node, res),
                payload: req.body
            });
            return res.status(200).jsonp(req.body);
        };

        var maxApiRequestSize = RED.settings.apiMaxLength || "5mb";
        var jsonParser = bodyParser.json({
            limit: maxApiRequestSize
        });
        var urlencParser = bodyParser.urlencoded({
            limit: maxApiRequestSize,
            extended: true
        });

        RED.httpNode.post(
            this.url,
            jsonParser,
            urlencParser,
            rawBodyParser,
            this.callback,
            this.errorHandler
        );

        this.on("close", function () {
            var node = this;
            apiUtil.unsubscribeEvents(this.subscriptionId);
            RED.httpNode._router.stack.forEach(function (route, i, routes) {
                if (
                    route.route &&
                    route.route.path === node.url &&
                    route.route.methods["post"]
                ) {
                    routes.splice(i, 1);
                }
            });
        });
        RED.nodes.registerType("V2F In", StartProcessing);
    }
}