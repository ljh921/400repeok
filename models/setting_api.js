var async=require('async');
var sd=require('silly-datetime');
var dbUtil=require('../util/db');
var tool=require('../util/tool');

var api={
  createUser:function(req,res,next){
  	let loginName=req.body.loginName;
  	let password=req.body.password;
  	let nickName=req.body.name;
  	let phoneNumber=req.body.phoneNumber;
  	let email=req.body.email;
  	let roleId=req.body.roleId;
  	let departmentId=req.body.departmentId;
  	let accessPermission=Number(req.body.accessPermission);

  	if(!loginName||!password||!nickName||!phoneNumber||!email||!roleId||!departmentId||!accessPermission){
  	  res.send({
  	  	code:400,
  	  	msg:'lack element'
  	  });
  	  return;
  	}
  	let dbObject={
  	  USERNAME:loginName,
  	  PASSWORD:tool.hash(password),
  	  DEPARTMENT_ID:departmentId,
  	  NICK_NAME:nickName,
  	  PHONE_NUMBER:phoneNumber,
  	  ROLE_ID:roleId,
  	  EMAIL:email,
  	  ACCESS_PERMISSION:accessPermission
  	};
  	let sql='INSERT INTO USER (';
  	let valueStr='';
  	let variables=[];
  	for(let key in dbObject){
  	  let value=dbObject[key];
  	  if(value!==undefined&&value!==null){
  	  	sql+=key+',';
  	    valueStr+='?,';
  	    variables.push(value);
  	  }
  	}

  	async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let checkUsernameSql='SELECT ID FROM USER WHERE USERNAME=? AND IS_DELETED=0';
      let checkUsernameVaribles=[loginName];
      conn.query(checkUsernameSql,checkUsernameVaribles,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
          	res.send({
          	  code:400,
          	  msg:'该名称已被占用，请使用其他用户名注册'
          	});
          	callback(new Error('username repeat'),conn);
          }else{
          	callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      sql=sql.substring(0,sql.length-1)+') values('+valueStr.substring(0,valueStr.length-1)+')';
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows>0){
          	res.send({
          	  code:200,
          	  msg:'create success',
          	  newUsername:loginName,
          	  newPassword:password
          	});
          	callback(null,conn);
          }else{
          	res.send({
          	  code:400,
          	  msg:'create failed'
          	});
          	callback(new Error('insert failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  }
};

module.exports=api;