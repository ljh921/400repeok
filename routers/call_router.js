var express = require('express');

var api = require('../models/call_api');

var router = express.Router();

//首页通话管理详情
router.get('/callDetail', function (req, res, next) {
  api.callDetail(req, res, next);
});

module.exports = router;
