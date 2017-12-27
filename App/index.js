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

    let concatHTML = generateHTML(flattenObject(config));

    return (
        <View style={this.props.style}>
          <WebView
              onLayout={this.reRenderWebView}
              style={styles.full}
              source={{ html: concatHTML, baseUrl: 'http://test.com', }}
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
