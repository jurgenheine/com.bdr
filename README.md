# BDR

Homey App for thermostats from BDR Thermea group. BDR Thermea is owner of the brands Remeha, Baxi, De Dietrich, Chappee, Baymak and Brötje Heizung

The code is based on the Home assistant implementation: https://github.com/freitdav/BDRthermostatHA 

This app uses an unofficial API and needs an internet connection to function, 
if there is no internet then you can only control your devices with the mobile app. 
You have to pair your devices first with the thermostat.

## Supported devices
* Baxi Usense
* Remeha Etwist
* De Dietrich

### WIP
* Brötje IDA

## Setup device

1. Press Add device 
2. Choose BDR app
3. Choose the right thermostat
4. On the pairing page fill in the e-mail and password
5. Open the menu on your thermostat
6. Got to settings menu
7. Go to pair new device or service
8. fill in the pairing code on the pairing page
9. Press the pair button

## Manually installing app on homey
To manually install this app, you have to use the CLI method.

1. Download the [latest version](https://github.com/jurgenheine/com.bdr) from Github
Press de Clone or Download button and press Download as ZIP

2. Unpack dowloade ZIP to a folder

3.  Install Node.js
	Download Node.js from the [Node.js website](https://nodejs.org/en/). and install it on your computer.

4. Install Homey SDK
Open a command line, and install the Homey SDK by running the following command:
```
$ npm install -g homey
```

5. Log-in
In the command-line, log in with your Athom account:
```
$ homey login
```

6. Got to the folder where you unpacked the code
Install the app to Homey with the fllowing command:
```
$ homey app install
```

## License
The MIT License (MIT)

Copyright 2019 Jurgen Heine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
