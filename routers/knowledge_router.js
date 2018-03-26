var express = require('express');

var api = require('../models/knowledge_api');

var router = express.Router();

//知识库文件夹获取
router.get('/folderList', function (req, res, next) {
  api.folderList(req, res, next);
});

//知识库文件夹添加
router.post('/addFolder', function (req, res, next) {
  api.addFolder(req, res, next);
});

//知识库文件夹删除
router.delete('/deleteFolder', function (req, res, next) {
  api.deleteFolder(req, res, next);
});

//知识库文件夹修改
router.patch('/patchFolder', function (req, res, next) {
  api.patchFolder(req, res, next);
});

//知识库文件获取
router.get('/fileList', function (req, res, next) {
  api.fileList(req, res, next);
});

//知识库全文件获取
router.get('/allFileList',function(req,res,next){
  api.allFileList(req,res,next);
});

//知识库文件删除
router.delete('/deleteFile', function (req, res, next) {
  api.deleteFile(req, res, next);
});

//知识库文件修改
router.patch('/patchFile', function (req, res, next) {
  api.patchFile(req, res, next);
});

//知识库文件上传
router.post('/fileSend',function(req,res,next){
  api.fileSend(req,res,next);
});

//知识库文件下载
router.get('/fileDownload',function(req,res,next){
  api.fileDownload(req,res,next);
});

//知识库常用标签获取
router.get('/labelList',function(req,res,next){
  api.labelList(req,res,next);
});

//知识库文件查询
router.post('/fileSearch',function(req,res,next){
  api.fileSearch(req,res,next);
});

//知识库二模块文件夹获取
router.get('/kfolderList', function (req, res, next) {
  api.kfolderList(req, res, next);
});

//知识库二模块文件夹添加
router.post('/kaddFolder', function (req, res, next) {
  api.kaddFolder(req, res, next);
});

//知识库二模块文件夹删除
router.delete('/kdeleteFolder', function (req, res, next) {
  api.kdeleteFolder(req, res, next);
});

//知识库二模块文件夹修改
router.patch('/kpatchFolder', function (req, res, next) {
  api.kpatchFolder(req, res, next);
});

//知识库二模块文档获取（包括全文档及查询功能）
router.post('/kfileList', function (req, res, next) {
  api.kfileList(req, res, next);
});

//知识库二模块文档添加（包括附件）
router.post('/kaddFile', function (req, res, next) {
  api.kaddFile(req, res, next);
});

//知识库二模块文档附件下载
router.post('/kfileDownload', function (req, res, next) {
  api.kfileDownload(req, res, next);
});

//知识库二模块文档删除
router.delete('/kdeleteFile', function (req, res, next) {
  api.kdeleteFile(req, res, next);
});

//知识库二模块文档附件删除
router.delete('/kdeleteAttachment', function (req, res, next) {
  api.kdeleteAttachment(req, res, next);
});

//知识库二模块文档修改（包括新附件添加）
router.patch('/kpatchFile', function (req, res, next) {
  api.kpatchFile(req, res, next);
});

//知识库二模块常用标签获取
router.get('/klabelList',function(req,res,next){
  api.klabelList(req,res,next);
});

module.exports = router;
