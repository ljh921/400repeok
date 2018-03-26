var express=require('express');

var api=require('../models/setting_api');
var router=express.Router();

//新增用户
router.post('/user',function(req,res,next){
  api.createUser(req,res,next);
});

module.exports=router;