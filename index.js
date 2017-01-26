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
            if (typeof(userData[sender]) === 'undefined') {
                userData[sender] = {};
                userData[sender].state = "SET_LOCATION";
                sendWelcomeMessage(sender);
            } else if (event.message.attachments[0].payload.coordinates) {
                // handle LOCATION messages
                console.log("location received");
                switch (userData[sender].state) {
                    case "SET_LOCATION":
                        userData[sender].lat = event.message.attachments[0].payload.coordinates.lat;
                        userData[sender].lng = event.message.attachments[0].payload.coordinates.long;
                        getWeather(sender, userData[sender].lat, userData[sender].lng);
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

function getWeather(sender, lat, lng) {
    url = 'https://api.darksky.net/forecast/' + apiKey + '/' + lat + ',' + lng;
    console.log(url);
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
            return checkRain(sender, weatherData);
        }
    })
 };

 function checkRain(sender, weatherData){
     var rainTimes = [];
     var rainMsg = 'undefined';
     var precipitating = false;
     var intensity = 0;
     var probability = 0;
     var n = 0;
     for (var i = 0; i < 24; i++){
         let hour = weatherData.hourly.data[i];
         let time = "";
         let ampm = i < 12 ? " AM" : " PM";;
         time = i % 12;
         time = time ? time : 12;
         time += ampm;
         if (hour.precipIntensity && !precipitating) {
             // rain begin
             precipitating = true;
             rainTimes.push(hour.precipType);
             console.log(i);
             rainTimes.push(" from " + time);
         } else if (!hour.precipIntensity && precipitating) {
             // rain end
             precipitating = false;
             console.log(i);
             rainTimes.push(" to " + time);
         } else if (i == 23 && hour.precipIntensity && precipitating) {
             // raining already, will still rain
             console.log(i);
             rainTimes.push(" and continue through the night");
         } else if (i == 23 && hour.precipIntensity && !precipitating) {
             // starts raining at 11, wasn't raining yet
             console.log(i);
             rainTimes.push(hour.precipType);
             rainTimes.push(" from 11 ");
             rainTimes.push(" and continue through the night");
         }
         if (precipitating) {
             intensity += hour.precipIntensity;
             probability += hour.precipProbability;
             n++;
         }
     }
     intensity /= parseFloat(n);
     probability /= parseFloat(n);
     for (var i = 0; i < rainTimes.length; i++){
         console.log(rainTimes[i]);
     }
     if (probability < 0.25) {
         rainMsg = "There is a small chance that it will "
     } else if (probability < 0.5) {
         rainMsg = "It might "
     } else {
         rainMsg = "It will "
     }
     if (rainTimes.length == 0) {
         rainMsg = "It will not rain today!"
     } else if (rainTimes.length == 3) {
         rainMsg += rainTimes[0] + " today" + rainTimes[1] + rainTimes[2] + ". ";
     } else if (rainTimes.length == 6) {
         if (rainTimes[0] == rainTimes[3]) {
             rainMsg += rainTimes[0] + " today" + rainTimes[1] + rainTimes[2] + " and" + rainTimes[4] + rainTimes[5] + ".";
         } else {
             rainMsg += rainTimes[0] + " today" + rainTimes[1] + rainTimes[2] + " and" + rainTimes[3] + rainTimes[4] + rainTimes[5] + ".";
         }
     } else {
         rainMsg = "Today it will " + rainTimes[0] + rainTimes[1] + rainTimes[2] + ",";
         for (var i = 3; i < rainTimes.length - 3; i += 3) {
             if (rainTimes[i] != rainTimes[i - 3]) {
                 rainMsg += rainTimes[i];
             }
             rainMsg += rainTimes[i + 1] + rainTimes[i + 2] + ",";
         }
         rainMsg += " and"
         if (rainTimes[rainTimes.length - 3] != rainTimes[rainTimes.length - 6]) {
             rainMsg += rainTimes[rainTimes.length - 3];
         }
         rainMsg += rainTimes[rainTimes.length - 2] + rainTimes[rainTimes.length - 1];
     }
     return sendTextMessage(sender, rainMsg);
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

function sendWelcomeMessage(recipientId) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: {text: "Hi, I'm WeatherBot. Let's get started!"}
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        } else {
            return promptLocation(recipientId);
        }
    });
}

function sendTextMessage(recipientId, text) {
    sendMessage(recipientId, {text:text});
};

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
