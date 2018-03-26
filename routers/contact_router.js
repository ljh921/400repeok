var express = require('express');

var api = require('../models/contact_api');

var router = express.Router();

//客户资料列表
router.post('/dataList', function (req, res, next) {
  api.dataList(req, res, next);
});

//客户资料列表查询
router.post('/dataSearch', function (req, res, next) {
  api.dataSearch(req, res, next);
});

//客户详细资料查询
router.get('/dataDetail', function (req, res, next) {
  api.dataDetail(req, res, next);
});

//添加客户
router.post('/addData', function (req, res, next) {
  api.addData(req, res, next);
});

//删除客户(单条)
router.delete('/deleteData', function (req, res, next) {
  api.deleteData(req, res, next);
});

//删除客户(多条)
router.delete('/deleteAllData', function (req, res, next) {
  api.deleteAllData(req, res, next);
});

//修改客户
router.patch('/patchData', function (req, res, next) {
  api.patchData(req, res, next);
});

//反馈信息列表
router.post('/feedbackList', function (req, res, next) {
  api.feedbackList(req, res, next);
});

//反馈信息查询
router.post('/feedbackSearch', function (req, res, next) {
  api.feedbackSearch(req, res, next);
});

//添加反馈信息
router.post('/addFeedback', function (req, res, next) {
  api.addFeedback(req, res, next);
});

//删除反馈信息
router.delete('/deleteFeedback', function (req, res, next) {
  api.deleteFeedback(req, res, next);
});

//修改反馈信息
router.patch('/patchFeedback', function (req, res, next) {
  api.patchFeedback(req, res, next);
});

//合同信息列表
router.post('/contractList', function (req, res, next) {
  api.contractList(req, res, next);
});

//合同信息查询
router.post('/contractSearch', function (req, res, next) {
  api.contractSearch(req, res, next);
});

//全省份及地级市
router.get('/citys', function (req, res, next) {
  api.citys(req, res, next);
});

//全问题类型
router.get('/problems', function (req, res, next) {
  api.problems(req, res, next);
});

//全客户类型
router.get('/companies', function (req, res, next) {
  api.companies(req, res, next);
});

//其他客服类数据
router.get('/otherDatas', function (req, res, next) {
  api.otherDatas(req, res, next);
});

module.exports = router;
