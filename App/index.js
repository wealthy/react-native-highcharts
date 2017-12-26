import React, { Component, PropTypes, } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  WebView,
  Image,
  Dimensions
} from 'react-native';


const generateHTML = (config) => (
    `
    <html>
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0" />
    <style media="screen" type="text/css">
      #container {
          width:100%;
          height:100%;
          top:0;
          left:0;
          right:0;
          bottom:0;
          position:absolute;
          user-select: none;
          -webkit-user-select: none;
      }
    </style>
    <head>
        <script src="https://code.highcharts.com/highcharts.js"></script>
    </head>
    <body>
    <div id="container"></div>
      <script>
           ;(function () {
             
              var promiseChain = Promise.resolve();
          
          
              var promises = {};
              var callbacks = {};
          
             var init = function() {
          
                 const guid = function() {
                     function s4() {
                         return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                     }
                     return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
                 }
          
                 window.webViewBridge = {
                     /**
                      * send message to the React-Native WebView onMessage handler
                      * @param targetFunc - name of the function to invoke on the React-Native side
                      * @param data - data to pass
                      * @param success - success callback
                      * @param error - error callback
                      */
                     send: function(targetFunc, data, success, error) {
                        alert("in here");
                         success = success || function(){};
                         error = error || function () {};
          
                         var msgObj = {
                             targetFunc: targetFunc,
                             data: data || {},
                             msgId: guid(),
                         };
          
                         var msg = JSON.stringify(msgObj);
          
                         promiseChain = promiseChain.then(function () {
                             return new Promise(function (resolve, reject) {
                                 alert("in here too");
                                 console.log("sending message " + msgObj.targetFunc);
          
                                 promises[msgObj.msgId] = {resolve: resolve, reject: reject};
                                 callbacks[msgObj.msgId] = {
                                     onsuccess: success,
                                     onerror: error
                                 };
          
                                 window.postMessage(msg, "*");
                             })
                         }).catch(function (e) {
                             alert(e.message.toString());
                             console.error('rnBridge send failed ' + e.message);
                         });
                     },
          
          
                 };
          
                 window.document.addEventListener('message', function(e) {
                     console.log("message received from react native");
          
                     var message;
                     try {
                         message = JSON.parse(e.data)
                     }
                     catch(err) {
                         console.error("failed to parse message from react-native " + err);
                         return;
                     }
          
                     //resolve promise - send next message if available
                     if (promises[message.msgId]) {
                         promises[message.msgId].resolve();
                         delete promises[message.msgId];
                     }
          
                     //trigger callback
                     if (message.args && callbacks[message.msgId]) {
                         if (message.isSuccessfull) {
                             callbacks[message.msgId].onsuccess.apply(message.args);
                         }
                         else {
                             callbacks[message.msgId].onerror.apply(null, message.args);
                         }
                         delete callbacks[message.msgId];
                     }
          
                 });
             };
          
             init();
              Highcharts.chart('container',${config});
           }());
          </script>
    </body>
  </html>
  `
);

const win = Dimensions.get('window');
class ChartWeb extends Component {

  render() {
    let config = JSON.stringify(this.props.config, function (key, value) {//create string of json but if it detects function it uses toString()
      return (typeof value === 'function') ? value.toString() : value;
    });



    config = JSON.parse(config);
    const html = generateHTML(flattenObject(config));

    return (
        <View style={this.props.style}>
            <WebView
                style={styles.full}
                source={{ html}}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={true}
                scrollEnabled={false}
                automaticallyAdjustContentInsets={true}
                {...this.props}
            />
        </View>
    );
  };
};

var flattenObject = function (obj, str='{') {
  Object.keys(obj).forEach(function(key) {
    str += `${key}: ${flattenText(obj[key])}, `
  })
  return `${str.slice(0, str.length - 2)}}`
};

var flattenText = function(item,key) {
  if(key=="y") console.log(item, typeof item);
  var str = ''
  if (item && typeof item === 'object' && item.length == undefined) {
    str += flattenObject(item)
  } else if (item && typeof item === 'object' && item.length !== undefined) {
    str += '['
    item.forEach(function(k2) {
      str += `${flattenText(k2)}, `
    })
    if(item.length>0) str = str.slice(0, str.length - 2)
    str += ']'
  } else if(typeof item === 'string' && item.slice(0, 8) === 'function') {
    str += `${item}`
  } else if(typeof item === 'string') {
    str += `\"${item.replace(/"/g, '\\"')}\"`
  } else {
    str += `${item}`
  }
  return str
};

var styles = StyleSheet.create({
  full: {
    flex:1,
    backgroundColor:'transparent'
  }
});

export default ChartWeb;
