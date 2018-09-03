/*****************************************************/
/*Attaching the required NPM PACKAGES                */
/*****************************************************/

var request = require('request');           // HTTP
var express = require('express');           // Web framework
var app = express();
var bodyParser = require('body-parser');    //Allows parse
var path = require('path');                 //Discover path for file references

/*****************************************************/
/*Desired server host IP and port                    */
/*****************************************************/

host = '192.168.100.107';
port = 4444;

/*****************************************************/
/*body parser dependencies and serving static files  */
/*****************************************************/

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'files')));

/*****************************************************/
/*JSON variable for frontend                         */
/*****************************************************/

var plcData={};
plcData.time="00000";
plcData.activityStatus="None";
plcData.eventCounts=0;
plcData.outputs={"op0":"Ivory","op1":"Ivory","op2":"Ivory","op3":"Ivory","op4":"Ivory","op5":"Ivory","op6":"Ivory","op7":"Ivory"};

/*****************************************************/
/*HTTP request options                               */
/*****************************************************/

var options_req = {
    body: {"destUrl":"http://192.168.100.107:4444"}, // Javascript object payload to tell PLC about the source of incoming request
    json: true,
    url: "",
    headers: {
        'Content-Type': 'application/json'
    }
};

/*****************************************************/
/*Generic function for HTTP post                     */
/*****************************************************/

function post_request() {
    request.post(options_req, function (err, res, body) {
        if (err) {
            console.log('Error :', err);
            return;
        }
        //console.log(' RESPONSE OF POST REQUEST :', JSON.stringify(body)); // Console log of the response - For diagnostics
    });
};

/*****************************************************/
/*function to call delete request - Explored but not used
/*****************************************************/
/*function delete_request() {
    request.delete(options_req, function (err, res, body) {
        if (err) {
            console.log('Error :', err);
            return;
        }
        console.log(' RESPONSE OF DELETE REQUEST :', JSON.stringify(body)); // Just printing the return message as we post req.
    });
};
options_req.url="http://192.168.100.106/rest/events/time/notifs";
delete_request();                                                   // delete request if subscriptions already exists
*/

options_req.url="http://192.168.100.106/rest/events/time/notifs";   // Initial request to subscribe for iterative notifications from PLC
post_request();

options_req.url="http://192.168.100.106/rest/services/startEvents";
post_request();                                                     //  Initial trigger event to start the notifications

/**********************************************************************************************************************************/
/*GET request handler from server's root address - Enables the Home site to be accessed through a web browser by server ip:port address  */
/**********************************************************************************************************************************/

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/" + "files/Home.html");
    //console.log("METHOD: GET");                                   // For diagnostics
});

/*****************************************************/
/*GET request handler (from ajax, front end)         */
/*****************************************************/

app.get('/frontend', function(req, res){
    var obj = {};
    res.send(plcData);                                          // Sends a JSON object with data to front end for visualization
    /*
    console.log('GET REQ. FROM AJAX ');                         // For diagnostics
    console.log('body: ' + JSON.stringify(req.body))            // For diagnostics
    console.log('RESPONSE PAYLOAD TO THE AJAX REQ.\N',plcData); // For diagnostics
    */
});

/*****************************************************/
/*POST request (from PLC) handler                    */
/*****************************************************/
app.post('/', function (req, res) {
    plcData.eventCounts+=1;                                 // received POST request event counter
    var body = req.body;
    var receivedTime=body.payload.timeStamp;                // Extracting timeStamp
    plcData.time=receivedTime;
    var timeSec=receivedTime[17]+receivedTime[18];          // extracting the 'seconds' of the timeStamp
    var out=d2b_array(timeSec);                             // binary outputs framing from time 'seconds'
    res.writeHead(200, {'Content-Type': 'text/html'});      // response back to the 'POST' request from the PLC
    res.end();
    /*****************************************************/
    /*SOAP POST REQUEST                                  */
    /*****************************************************/
    request.post({                                                  // REST post request to change the outputs of the PLC
        headers: {                                                  // header as per instructions
            'accept': 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
            'accept-encoding': 'none',
            'accept-charset': 'utf-8',
            'connection': 'close',
            'host': '192.168.100.107:80',
            'content-type': 'application/xml'
        },
        url: "http://192.168.100.106:80/dpws/WS01",                 // uri of the soap destination
        body: "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n" + // soap xml request body
        "<s12:Envelope\n" +
        "\txmlns:s12=\"http://www.w3.org/2003/05/soap-envelope\"\n" +
        "\txmlns:wsa=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\">\n" +
        "<s12:Header>\n" +
        "<wsa:Action>http://www.tut.fi/fast/Assignment/UpdateOutputs_Request</wsa:Action>\n" +
        "</s12:Header>\n" +
        "<s12:Body xmlns:tns=\"http://www.tut.fi/fast/Assignment\">\n" +    // targetNameSpace
        "\t\t<tns:Outputs>\n" +
        "<tns:output0>"+out[0]+"</tns:output0>\n" +
        "<tns:output1>"+out[1]+"</tns:output1>\n" +
        "<tns:output2>"+out[2]+"</tns:output2>\n" +
        "<tns:output3>"+out[3]+"</tns:output3>\n" +
        "<tns:output4>"+out[4]+"</tns:output4>\n" +
        "<tns:output5>"+out[5]+"</tns:output5>\n" +
        "<tns:output6>"+out[6]+"</tns:output6>\n" +
        "<tns:output7>"+out[7]+"</tns:output7>\n" +
        "</tns:Outputs>\n" +
        "</s12:Body>\n" +
        "</s12:Envelope>"                                           // soap message payload end
    }, function (err) {
        if (err) {
            console.log('Error :', err);
            return;
        }
        //console.log(' SOAP POST REQUEST`S RESPONSE :', JSON.stringify(body)); // Just printing the return message as we post req. - For diagnostics
    });
});

/*****************************************************/
/*Server listener                                    */
/*****************************************************/

app.listen(port, host, function () {
    console.log('Server is listening on http://192.168.100.107:4444\n')});

/***********************************************************************************************************/
/*Function to convert 'seconds' on integer to binary vector and re format from '1/0' to 'true/false' and
'GreenYellow/Ivory' for the PLC and HTML style interface respectively
/***********************************************************************************************************/

function d2b_array(dec)
{
    var bin=[];
    var binHTML=[];
    for(i=0;i<8;i++)
    {
        var a=dec&1;    // '&' (logical and) is better to use then '&' for modulus of positive binary numbers.
        if(a==1)
        {
            bin[7-i]=true;
            binHTML[7-i]="GreenYellow ";
        }
        else
        {
            bin[7-i]=false;
            binHTML[7-i]="Ivory";
        }
        dec=dec/2;
    }
    i=0;                //Javascript object for LED 'color' HTML style for front end
    for (var key in plcData.outputs) {
        if (plcData.outputs.hasOwnProperty(key)) {
            plcData.outputs[key]=binHTML[7-i];
            i++;
        }
    }
    return bin;
}

/************************************************************************************/
/*HTTP Get request to PLC at regular interval to monitor the PLC status*/
/************************************************************************************/

setInterval(function () {
    options_req.url="http://192.168.100.106/rest/events/time/notifs";   // get request to subscribe to notifications
    options_req.timeout=900;                                            // small  post request timeout for quick disconnection detection
    request.get(options_req, function (error, response, Body) {
        if (error) {                                                    // no response
            plcData.activityStatus="PLC not available";
            //console.log('Error :', error); // For diagnostics
            return;
        }
        if(JSON.stringify(Body.children)==='{}') {                      // Empty - No response
            plcData.activityStatus="Subscribing...";
            options_req.url="http://192.168.100.106/rest/events/time/notifs";   // Attempt to re subscribe again
            post_request();
            options_req.url="http://192.168.100.106/rest/services/startEvents"; // Triggers events
            post_request();
        }
        if(JSON.stringify(Body.children)!=='{}') {
            plcData.activityStatus="PLC active";
        }
        //console.log('DEVICE STATUS:', JSON.stringify(Body)); // Just printing the return message as we post req. - For diagnostics
    });
},1000); // Update rate of HTML front end: 1 second