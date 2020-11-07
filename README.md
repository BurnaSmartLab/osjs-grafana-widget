# osjs-grafana-widget
A widget to show Grafana data in multiple types of charts

![Screenshot from 2020-11-02 10-45-21](https://user-images.githubusercontent.com/70196035/97840561-7a58b380-1cf9-11eb-8d3b-9e6e02ca15c4.png)
## Introduction
OS.js Widget is a module of OS.js web desktop platform, which we utilize it to develop a widget named **GrafanaWidget**. 
This widget shows [Grafana](https://grafana.com/) data in different types of charts. </br></br>
You need to clone [official OS.js repository](https://github.com/os-js/OS.js) and install [OS.js Widget module](https://github.com/os-js/osjs-widgets), prior to installing GrafanaWidget.
## Installation
#### 1. Installation by by using source code:
1- Navigate to the following directory of OS.js project <br /><br />
`cd src/client` <br /><br />
2- Clone GrafanaWidget in this directory <br /><br />
`git clone https://github.com/BurnaSmartLab/osjs-grafana-widget.git` <br /><br />
3- Then navigate to osjs-grafana-widget directory <br /><br />
`cd osjs-grafana-widget` <br /><br />
5- Run following command in the current directory to install dependencies <br /><br />
`npm install` <br /><br />
#### 2. Installion by using npm dependency manager: <br /><br />
Just execute the following command:<br /><br />
`@burna/osjs-grafana-widget`

## Usage
1- Add following lines to the `src/client/index.js` file
```js
// import GrafanaWidget from its directory
// use following line, if the first approach for installation has been used
import GrafanaWidget  from './osjs-grafana-widget';
// use following line, if the second approach for installation has been used
import GrafanaWidget from '@burna/osjs-grafana-widget'

// register GrafanaWidget
  osjs.register(WidgetServiceProvider, {
    args: {
      registry: {
        GrafanaWidget
      }
    }
  });
``` 

2- Add following lines to the `src/server/config.js` file
```js
 // replace 'http://localhost:12345' and 'GRAFANA API KEY' with your valid grafana server address and its Authorization key
  proxy: [{
    source: '/grafana',
    destination: 'http://localhost:12345',
    options: {
      proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
        proxyReqOpts.headers = {
           'Authorization': 'GRAFANA API KEY',
        };
        return proxyReqOpts;
      }
    }
  }]
  ```
  ## Links
 [OS.js](https://github.com/os-js/OS.js) </br>
 [OS.js Widget](https://manual.os-js.org/tutorial/widget/) </br>
 [Grafana](https://grafana.com/)