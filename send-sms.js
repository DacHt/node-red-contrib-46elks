/***************************************************************************** 
MIT License

Copyright (c) 2020 David Rozenbeek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
******************************************************************************/

var https = require('https')
var querystring = require('querystring')
 
module.exports = function (RED) {
    
    var return_msg = []
    var return_msg_recived = false

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
      //node.warn(postData)
      
      var key = new Buffer(node.elks.credentials.user + ':' + node.elks.credentials.password).toString('base64')
      var postOptions = {
          hostname: 'api.46elks.com',
          path:     '/a1/SMS',
          method:   'POST',
          headers:  {
            'Authorization': 'Basic ' + key
          }
      }
      //node.warn(postOptions)
      
      // Start the web request.
      var post_req = https.request(postOptions, function(response) {
          var str = ''
          response.on('data', (chunk) => {
              str += chunk
          })
      
          response.on('end', () => {
            //node.warn(str)
            if (node.buffer.length === 0) {
              return_msg_recived = true  
            } 
            return_msg.push(JSON.parse(str))
          })
      })

      // Send the real data away to the server.
      post_req.write(postData)

      // Finish sending the request.
      post_req.end()

    }
    

    function getMsgProps(msg, props) {
      return props.split(".").reduce(function (obj, i) {
        return obj[i]
      }, msg)
    }

    function makeNumberMessagePairs(node, msg) {
      var message = node.message;
      var numbers = node.numbers;
      if (!message) {
        message = getMsgProps(msg, 'payload.message')
      }
      if (!numbers) {
        numbers = getMsgProps(msg, 'payload.numbers').split(",")
      } else {
        numbers = numbers.split(",")
      }
      return numbers.map(function (elem) {
        return {
          to: elem,
          text: message
        }
      })
    }

    function SendSmsNode(config) {
      RED.nodes.createNode(this, config)
      let node = this
      this.elks = RED.nodes.getNode(config.elks)
      this.message = config.message
      this.numbers = config.numbers
      this.dryrun = config.dryrun
      this.flashsms = config.flashsms
      this.dontlog = config.dontlog
      this.throttle = config.throttle || 0
      this.buffer = []
      this.intervalID = -1 
      this.on("input", function(msg, send, done) {
        send = send || function() { node.send.apply(node,arguments) }
        Array.prototype.push.apply(node.buffer, makeNumberMessagePairs(node, msg))
        
        // if timer already running there is nothing to do
        if (node.intervalID !== -1) {
          return;
        }
        
        node.intervalID = setInterval(function () {
          if (node.buffer.length === 0) {
            clearInterval(node.intervalID)
            node.intervalID = -1
            node.status({
              text: 'Done',
              fill: 'green',
              shape: 'dot'
            })
          } else {
            node.status({
                text: node.buffer.length + ' pending',
                fill: 'grey',
                shape: 'dot'
              })
            var elem = node.buffer.shift()
            elksSMS(node, elem.to, elem.text)           
          }
        }, node.throttle)
        
        var time_now_ms = Date.now();
        while(!return_msg_recived) {
            if(return_msg_recived) {
              break
            } else if((Date.now() - time_now_ms) > 10000) {
              return_msg.push(JSON.parse("{ 'err': 'No response from server!'}"))
              break
            }
        }
        
        msg.payload = return_msg 
        send(msg)
        return_msg = ''

        if(done) {
          done();
        }
      })
      this.on("close", function () {
        clearInterval(this.intervalID)
        this.buffer = []
      })
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
  