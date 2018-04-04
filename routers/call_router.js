var express = require('express');

var api = require('../models/call_api');

var router = express.Router();

//首页通话管理详情
router.get('/callDetail', function (req, res, next) {
  api.callDetail(req, res, next);
});

//添加通话记录并返回id
router.post('/addCalledLog', function (req, res, next) {
  api.addCalledLog(req, res, next);
});

//添加通话相关详细信息
router.post('/addCalledLogDetail', function (req, res, next) {
  api.addCalledLogDetail(req, res, next);
});

//添加未接来电信息
router.post('/addNotCalledLog', function (req, res, next) {
  api.addNotCalledLog(req, res, next);
});

//获取全部已接/未接来电详情
router.post('/getAllCalledLog', function (req, res, next) {
  api.getAllCalledLog(req, res, next);
});

//获取单个号码来电详情
router.post('/getCalledLog', function (req, res, next) {
  api.getCalledLog(req, res, next);
});

//已接来电详情查询
router.post('/searchCalledLog', function (req, res, next) {
  api.searchCalledLog(req, res, next);
});

//未接来电详情查询
router.post('/searchNotCalledLog', function (req, res, next) {
  api.searchNotCalledLog(req, res, next);
});

//导入excel文件(限xlsx后缀)
router.post('/importExcel', function (req, res, next) {
  api.importExcel(req, res, next);
});

//导出excel文件(限xlsx后缀)
router.get('/exportExcel', function (req, res, next) {
  api.exportExcel(req, res, next);
});

module.exports = router;
