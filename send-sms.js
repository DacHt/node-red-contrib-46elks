var https = require('https')
var querystring = require('querystring')
  
module.exports = function (RED) {
    
    
    function elksSMS(node, number, text) {
        var postData = querystring.stringify ({
            from: node.elks.credentials.from,
            to: number,
            message: text,
            whendelivered: "http://knottebo.ddns.net:2269/red/sms"
        })
        node.warn(postData)
        
        var postOptions = {
            host: 'api.46elks.com',
            path:     '/a1/SMS',
            method:   'POST',
            auth: node.elks.credentials.user + ':' + node.elks.credentials.password,
            headers:  {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData)
            }
        }
        node.warn(postOptions)
        
        // Start the web request.
        var post_req = https.request(postOptions, function(response) {
            var str = ''
            response.on('data', (chunk) => {
                str += chunk
            })
        
            response.on('end', () => {
                node.warn(str)
            })
        })
        
        // Send the real data away to the server.
        post_req.write(postData)

        // Finish sending the request.
        post_req.end()
    }
  
    function sendSMS(node, msg) {
      //Array.prototype.push.apply(node.buffer, makeNumberMessagePairs(node, msg))
      //var elem = node.buffer.shift();
      node.warn("Now in sendSMS")
      elksSMS(node, node.numbers, node.message);
    }
  
    function SendSmsNode(config) {
      RED.nodes.createNode(this, config)
      var node = this
      this.elks = RED.nodes.getNode(config.elks)
      this.message = config.message
      this.numbers = config.numbers
      this.on("input", sendSMS.bind(undefined, this))
    }
  
    function elksConfigNode(config) {
      RED.nodes.createNode(this, config)
      this.name = config.name
      this.user = config.user
      this.password = config.password
    }
  
    RED.nodes.registerType("send-sms", SendSmsNode)
    RED.nodes.registerType("elksConfig", elksConfigNode, {
      credentials: {
        user: {
          type: "text"
        },
        password: {
          type: "text"
        },
        from: {
          type: "text"
        }
      }
    })
  
  }
  