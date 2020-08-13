module.exports = function (RED) {
    
    var https = require('https')
    var querystring = require('querystring')
    
    const callback = (response) => {
        var str = ''
        response.on('data', (chunk) => {
            str += chunk
        })
    
        response.on('end', () => {
            this.warn(str)
        })
    }
    
    function elksSMS(node, number, text) {
        node.warn("Now in elksSMS")
        postFields = {
            from: node.elks.credentials.from,
            to: number,
            message: text
        }
        node.warn(node.elks.credentials.user + ':' + node.elks.credentials.password)
        key = new Buffer(node.elks.credentials.user + ':' + node.elks.credentials.password).toString('base64')
        postData = querystring.stringify(postFields)

        options = {
            hostname: 'api.46elks.com',
            path:     '/a1/SMS',
            method:   'POST',
            headers:  {
                'Authorization': 'Basic ' + key
            }
        }
        node.warn(options)
        
        // Start the web request.
        var request = https.request(options, callback)

        node.warn(postData)
        
        // Send the real data away to the server.
        request.write(postData)

        // Finish sending the request.
        request.end()
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
  