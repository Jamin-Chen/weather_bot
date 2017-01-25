var express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    path = require('path'),
    yql = require('yql');
var app = express();

var userData = {};
var weatherData;
var apiKey = 'bbadefd60b9bac38f09923a97dc42316';

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));

var APPID = '';	// Your Yahoo Application ID
var DEG = 'c';	// c for celsius, f for fahrenheit

app.get('/', function (request, response) {
    // boot boot
    response.send('This is weather bot.');
});

app.get('/webhook', function (request, response) {
    // verification function
    if (request.query['hub.verify_token'] === 'weatherbot_verify_token') {
        response.send(request.query['hub.challenge']);
    } else {
        response.send('Invalid verify token');
    }
});

// handler receiving messages
app.post('/webhook', function (req, res) {
    var events = req.body.entry[0].messaging;
    for (i = 0; i < events.length; i++) {
        let event = events[i];
        let sender = event.sender.id;
        if (event.message) {
            if (event.message.text) {
                if (typeof(userData[sender][state]) === 'undefined') {
                    sendTextMessage(sender, "Hi, I'm WeatherBot. Let's get started!");
                    promptLocation(sender);
                    userData[sender][state] = "SET_LOCATION";
                }
            } else if (event.message.attachments[0].payload.coordinates) {
                // handle LOCATION messages
                console.log("location received");
                switch (userState[sender]) {
                    case "SET_LOCATION":
                        userData[sender].lat = event.message.attachments[0].payload.coordinates.lat;
                        userData[sender].lng = event.message.attachments[0].payload.coordinates.long;
                        sendTextMessage(sender, checkRain(getWeather(userData[sender].lat, userData[sender].lng)));
                        break;
                    }
            } else {
                console.log("error, undefined message");
                sendTextMessage(sender, "Sorry, I couldn't quite understand you.");
            }
        }
    }
    res.sendStatus(200);
});

function getWeather(lat, lng) {
    url = 'https://api.darksky.net/forecast/' + apiKey + '/' + lat + ',' + lng;
    request({
        url: url,
        method: 'GET',
    }, function (error, response, body) {
        if (error) {
            return console.log('Error:', error);
        } else if (response.statusCode !== 200) {
            return console.log('Invalid status code:', response.statusCode)
        } else {
            var weatherData = JSON.parse(body);
            return weatherData;
        }
    })
 };

 function checkRain(weatherData){
     var rainTimes = [];
     var rainMsg = 'undefined';
     var precipitating = false;
     for (var i = 0; i < 23; i++){
         let hour = weatherData.hourly.data[i];
         if (hour.precipIntensity && !precipitating) {
             precipitating = true;
             rainTimes.push(hour.precipType);
             i = i % 12;
             i = i ? i : 12;
             i = (i < 10) ? "0" + i : i;
             rainTimes.push(string(i));
         } else if (raining) {
             precipitating = false;
             i = i % 12;
             i = i ? i : 12;
             i = (i < 10) ? "0" + i : i;
             rainTimes.push(string(i));
         }
     }
     if (rainTimes.length() == 3) {
         rainMsg = "It will " + rainTimes[0] + " today between " + rainTimes[1] + " and " + rainTimes[2] + ". ";
     } else if (rainTimes.length() == 6) {
         if (rainTimes[0] == rainTimes[3]) {
             rainMsg = "It will " + rainTimes[0] + " today from " + rainTimes[1] + " to " + rainTimes[2] + " and " + rainTimes[4] + " to " + rainTimes[5] + ".";
         } else {
             rainMsg = "It will " + rainTimes[0] + " today from " + rainTimes[1] + " to " + rainTimes[2] + " and " + rainTimes[3] + " from " + rainTimes[4] + " to " + rainTimes[5] + ".";
         }
     } else {
         rainMsg = "Today it will " + rainTimes[0] + " from " + rainTimes[1] + " to " + rainTimes[2] + ", ";
         for (var i = 3; i < rainTimes.length(); i += 3) {
             if (rainTimes[i] != rainTimes[i - 3]) {
                 rainMsg += rainTimes[i] + " from ";
             }
             rainMsg += rainTimes[i + 1] + " to " + rainTimes[i + 2];
         }
     }
     return rainMsg;
 }

// generic function sending messages
function sendMessage(recipientId, message) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

function sendTextMessage(recipientId, text) {
    sendMessage(recipientId, {text:text});
};

function createGreeting() {
    request({
        url: 'https://graph.facebook.com/v2.6/me/thread_settings',
        qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: {
            "setting_type":"call_to_actions",
              "thread_state":"new_thread",
              "call_to_actions":[
                {
                  "payload":"USER_DEFINED_PAYLOAD"
                }
              ]
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error creating greeting: ', error);
        } else {
            console.error('Error: ', response.body.error);
        }
    });
}

function promptLocation(recipientId) {
    sendMessage(recipientId, {
        "text":"Where are you located?",
        "quick_replies":[
          {
            "content_type":"location",
          }
        ]
    });
};
