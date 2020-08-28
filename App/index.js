import React, { Component, PropTypes, } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Platform,
  Text,
  View,
  Image,
  Dimensions
} from 'react-native';

import {WebView} from "react-native-webview";


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
            (function(){

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
                             console.log("sending message " + msgObj.targetFunc);

                             promises[msgObj.msgId] = {resolve: resolve, reject: reject};
                             callbacks[msgObj.msgId] = {
                                 onsuccess: success,
                                 onerror: error
                             };

                             window.ReactNativeWebView.postMessage(msg);
                         })
                     }).catch(function (e) {
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
                         callbacks[message.msgId].onsuccess.apply(null, message.args);
                     }
                     else {
                         callbacks[message.msgId].onerror.apply(null, message.args);
                     }
                     delete callbacks[message.msgId];
                 }

             });
         };

         init();
      }());
      </script>
      <script>
           ;(function () {
              Highcharts.chart('container',${config});
           }());
          </script>
    </body>
  </html>
  `
);



const win = Dimensions.get('window');
class ChartWeb extends Component {

  onWebViewMessage = (event) => {
    let eventData = event.nativeEvent.data;
    if(Platform.OS === "ios"){
      // IOS returns the data url encoded/percent-encoding twice
      // unescape('%257B') -> %7B
      // unescape(%7B) -> {
      eventData = unescape(unescape(eventData));
    }
    // post back reply as soon as possible to enable sending the next message
    this.myWebView.postMessage(eventData);
    let msgData;
    try {
      msgData = JSON.parse(eventData);
    }    catch (err) {
      console.warn(err);
      return;
    }

    const value = msgData.data.mydata;
    if (this.props.updateStore) {
      this.props.updateStore(value);
    }

    // invoke target function
    const response = this[msgData.targetFunc].apply(this, [msgData]);
    // trigger success callback
    msgData.isSuccessfull = true;
    msgData.args = [response];
    this.myWebView.postMessage(JSON.stringify(msgData));
  };

  testFunc = () => {
    return null;
  }

  render() {
    let config = JSON.stringify(this.props.config, function (key, value) {//create string of json but if it detects function it uses toString()
      return (typeof value === 'function') ? value.toString() : value;
    });


    config = JSON.parse(config);

    let concatHTML = generateHTML(flattenObject(config));

    return (
        <WebView
            ref={(webview) => {
              this.myWebView = webview;
            }}
            onLayout={this.reRenderWebView}
            style={styles.full}
            source={{ html: concatHTML, baseUrl: 'http://test.com', }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            scrollEnabled={false}
            onMessage={this.onWebViewMessage}
            automaticallyAdjustContentInsets={true}
            {...this.props}
        />
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
