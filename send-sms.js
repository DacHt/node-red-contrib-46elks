var https = require('https')
var querystring = require('querystring')
  
module.exports = function (RED) {
    
    
    function elksSMS(node, number, text) {
      
      
      
      var postData = querystring.stringify ({
          from: node.elks.from,
          to: number,
          message: text,
          dryrun: node.dryrun?"yes":"no",
          flashsms: node.flashsms?"yes":"no",
          dontlog: node.dontlog?"message":"",
          whendelivered: node.elks.feedbackURL
      })
      node.warn(postData)
      
      var key = new Buffer(node.elks.credentials.user + ':' + node.elks.credentials.password).toString('base64')
      var postOptions = {
          hostname: 'api.46elks.com',
          path:     '/a1/SMS',
          method:   'POST',
          headers:  {
            'Authorization': 'Basic ' + key
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
      elksSMS(node, node.numbers, node.message);
    }
  
    function SendSmsNode(config) {
      RED.nodes.createNode(this, config)
      var node = this
      this.elks = RED.nodes.getNode(config.elks)
      this.message = config.message
      this.numbers = config.numbers
      this.dryrun = config.dryrun
      this.flashsms = config.flashsms
      this.dontlog = config.dontlog
      this.on("input", sendSMS.bind(undefined, this))
    }
  
    function elksConfigNode(config) {
      RED.nodes.createNode(this, config)
      this.name = config.name
      this.user = config.user
      this.password = config.password
      this.from = config.from    
      this.feedbackURL = config.feedbackURL
    }
  
    RED.nodes.registerType("send-sms", SendSmsNode)
    RED.nodes.registerType("elksConfig", elksConfigNode, {
      credentials: {
        user: {
          type: "text"
        },
        password: {
          type: "text"
        }
      },
      from: {
          type: "text"
      },
      feedbackURL: {
        type: "text"
      }
      })
  
  }
  