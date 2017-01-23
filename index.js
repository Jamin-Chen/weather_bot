var express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    path = require('path');
var app = express();

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

            }
        }
    }
    res.sendStatus(200);
});

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

function createGreeting(data) {
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
        "text":"Where would you like to set the new location?",
        "quick_replies":[
          {
            "content_type":"location",
          }
        ]
    });
};
