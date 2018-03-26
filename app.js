var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var dbUtil=require('./util/db');
// load routers
var contactRouter = require('./routers/contact_router');
var callRouter = require('./routers/call_router');
var knowledgeRouter = require('./routers/knowledge_router');
var settingRouter = require('./routers/setting_router');

var app = express();

// configure the logger
app.use(morgan('[:date[iso] :method :url :status :response-time ms - :res[content-length]'));

// set request limit
app.use(bodyParser.json({limit:'5mb'})); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
})); // for parsing application/x-www-form-urlencoded
app.use(cors());

app.get('/400bf', function (req, res) {
  res.send('hello world');
});

if (app.get('env') == 'development') {
  // output the data for development
  app.use('/', function (req, res, next) {
    console.log(req.body);
    next();
  });
}

app.use('/400bf/contact', contactRouter);
app.use('/400bf/call', callRouter);
app.use('/400bf/knowledge', knowledgeRouter);
app.use('/400bf/setting', settingRouter);

// 404
app.use(function (req, res) {
  res.status(404).send({msg:'Not Found'});
});
// error handling
app.use(function (err, req, res, next) {
  console.log('------------error--------');
  console.log(err);
  console.log('----------end error--------');
  res.status(err.status || 500).send({
    state: err.status || 500,
    msg: err.message
  });
});

// start app
function start(port,callback){
  // init db first
  dbUtil.initDB(()=>{
    // start listening
    if(port)app.listen(port);
    // do callback
    if(callback)callback();
  });
}

exports.start=start;