var async = require('async');
var dbUtil=require('../util/db');
var sd=require('silly-datetime');
var mapList=require('../data/china');
var feedbackList=require('../data/feedback');

var contactApi={
  dataList: function (req,res,next){
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    
    if(!pageIndex||isNaN(pageIndex)||pageIndex<1||!pageSize||isNaN(pageSize)||pageSize<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COUNT(*) AS COUNT FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rawTotal=result[0].COUNT;
          callback(null,conn,rawTotal);
        }
      });
    },function (conn,rawTotal,callback) {
      let sql='SELECT E.*,F.NAME AS TYPENAME FROM(SELECT D.* FROM(SELECT @rownum := @rownum+1 AS ROWNUM,C.* FROM(SELECT @rownum:=0)r,(SELECT B.ID,A.NUMBER,A.NAME,B.NAME AS STAFF_NAME,B.MOBILE_TELPHONE,B.LANDLINE_TELPHONE,A.TYPE,A.CALLER_AREA,A.CALLER_PROVINCE FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID)C)D WHERE ROWNUM BETWEEN ? AND ?)E INNER JOIN COMPANY_TYPE F ON E.TYPE=F.ID';
      let variables=[startIndex,endIndex];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.rownum=result[i].ROWNUM;
            obj.id=result[i].ID;
            obj.number=result[i].NUMBER;
            obj.name=result[i].NAME;
            obj.staffName=result[i].STAFF_NAME;
            obj.mobileTelphone=result[i].MOBILE_TELPHONE;
            obj.landlineTelphone=result[i].LANDLINE_TELPHONE;
            obj.type=result[i].TYPENAME;

            for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
              let mapObj=mapList.chinaMap.provincesList[j];
              if(mapObj.Id==result[i].CALLER_PROVINCE){
                obj.callerProvince=mapObj.Name;
                obj.callerArea=mapObj.Citys[result[i].CALLER_AREA-1].Name;
                break;
              }
              obj.callerProvince=null;
              obj.callerArea=null;
            }

            rows.push(obj);
          }
          res.send({
            code:200,
            rawTotal:rawTotal,
            total:result.length,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  dataSearch: function (req,res,next){
    let keyword=req.body.keyword;
    let startTime=new Date(req.body.startTime);
    let endTime=new Date(req.body.endTime);
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    
    if(!pageIndex||isNaN(pageIndex)||pageIndex<1||!pageSize||isNaN(pageSize)||pageSize<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;

    let whereClause=' where 1=1';
    if(startTime!='Invalid Date'){
      let timeStr=sd.format(startTime,'YYYY-MM-DD HH:mm:ss');
      whereClause+=' and A.ESTABLISH_TIME >=\''+timeStr+'\'';
    }
    if(endTime!='Invalid Date'){
      let timeStr=sd.format(endTime,'YYYY-MM-DD HH:mm:ss');
      whereClause+=' and A.ESTABLISH_TIME <=\''+timeStr+'\'';
    }
    if(keyword){
      whereClause+=' and (A.NUMBER LIKE \'%'+keyword+'%\' OR A.NAME LIKE \'%'+keyword+'%\' OR B.NAME LIKE \'%'+keyword+'%\' OR B.MOBILE_TELPHONE LIKE \'%'+keyword+'%\' OR B.LANDLINE_TELPHONE LIKE \'%'+keyword+'%\' OR A.TYPE LIKE \'%'+keyword+'%\' OR A.CALLER_AREA LIKE \'%'+keyword+'%\')';
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COUNT(*) AS COUNT FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID'+whereClause;
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rawTotal=result[0].COUNT;
          callback(null,conn,rawTotal);
        }
      });
    },function (conn,rawTotal,callback) {
      let sql='SELECT E.*,F.NAME AS TYPENAME FROM(SELECT D.* FROM(SELECT @rownum := @rownum+1 AS ROWNUM,C.* FROM(SELECT @rownum:=0)r,(SELECT B.ID,A.NUMBER,A.NAME,B.NAME AS STAFF_NAME,B.MOBILE_TELPHONE,B.LANDLINE_TELPHONE,A.TYPE,A.CALLER_AREA,A.CALLER_PROVINCE FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID'+whereClause+')C)D WHERE ROWNUM BETWEEN ? AND ?)E INNER JOIN COMPANY_TYPE F ON E.TYPE=F.ID';
      let variables=[startIndex,endIndex];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.rownum=result[i].ROWNUM;
            obj.id=result[i].ID;
            obj.number=result[i].NUMBER;
            obj.name=result[i].NAME;
            obj.staffName=result[i].STAFF_NAME;
            obj.mobileTelphone=result[i].MOBILE_TELPHONE;
            obj.landlineTelphone=result[i].LANDLINE_TELPHONE;
            obj.type=result[i].TYPENAME;

            for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
              let mapObj=mapList.chinaMap.provincesList[j];
              if(mapObj.Id==result[i].CALLER_PROVINCE){
                obj.callerProvince=mapObj.Name;
                obj.callerArea=mapObj.Citys[result[i].CALLER_AREA-1].Name;
                break;
              }
              obj.callerProvince=null;
              obj.callerArea=null;
            }
            rows.push(obj);
          }
          res.send({
            code:200,
            rawTotal:rawTotal,
            total:result.length,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  dataDetail: function (req,res,next){
    let ID=req.query.id;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      var sql='SELECT C.*,D.NAME AS TYPENAME FROM(SELECT A.NAME,A.NUMBER,A.ADDRESS,A.CALLER_AREA,A.CALLER_PROVINCE,A.TYPE,A.ESTABLISHER,A.ESTABLISH_TIME,B.NAME AS STAFF_NAME,B.MOBILE_TELPHONE,B.JOB,B.LANDLINE_TELPHONE,B.E_MAIL FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID WHERE B.ID=?)C INNER JOIN COMPANY_TYPE D ON C.TYPE=D.ID';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
            let obj={};
            obj.name=result[0].NAME;
            obj.number=result[0].NUMBER;
            obj.address=result[0].ADDRESS;

            for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
              let mapObj=mapList.chinaMap.provincesList[j];
              if(mapObj.Id==result[0].CALLER_PROVINCE){
                obj.callerProvince=mapObj.Name;
                obj.callerArea=mapObj.Citys[result[0].CALLER_AREA-1].Name;
                break;
              }
              obj.callerProvince=null;
              obj.callerArea=null;
            }

            obj.type=result[0].TYPENAME;
            obj.establisher=result[0].ESTABLISHER;
            obj.establishTime=sd.format(result[0].ESTABLISH_TIME,'YYYY-MM-DD HH:mm:ss');
            obj.staffName=result[0].STAFF_NAME;
            obj.mobileTelphone=result[0].MOBILE_TELPHONE;
            obj.job=result[0].JOB;
            obj.landlineTelphone=result[0].LANDLINE_TELPHONE;
            obj.eMail=result[0].E_MAIL;
            rows.push(obj);
          }

          res.send({
            code:200,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  addData: function (req,res,next){
    let COMPANY_NAME=req.body.company_name;
    let NUMBER=req.body.number;
    let ADDRESS=req.body.address;
    let CALLER_AREA=req.body.area;
    let CALLER_PROVINCE=req.body.province;

    for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
      let mapObj=mapList.chinaMap.provincesList[j];
      if(mapObj.Name==CALLER_PROVINCE){
        CALLER_PROVINCE=Number(mapObj.Id);
        for(k=0;k<mapObj.Citys.length;k++){
          if(mapObj.Citys[k].Name==CALLER_AREA){
            CALLER_AREA=Number(mapObj.Citys[k].Id);
            break;
          }
        }
        break;
      }
    }

    if(isNaN(CALLER_AREA)||isNaN(CALLER_PROVINCE)){
      res.send({
        code:400,
        msg:'province or city is wrong'
      });
      return;
    }

    let TYPE=req.body.type;
    let ESTABLISHER=req.body.establisher;
    let ESTABLISH_TIME=req.body.time;

    let STAFF_NAME=req.body.staff_name;
    let MOBILE_TELPHONE=req.body.mobile_telphone;
    let JOB=req.body.job;
    let LANDLINE_TELPHONE=req.body.landline_telphone;
    let E_MAIL=req.body.e_mail;

    if(!COMPANY_NAME||!NUMBER||!ADDRESS||!CALLER_AREA||!TYPE||!CALLER_PROVINCE||!ESTABLISHER||!ESTABLISH_TIME||!STAFF_NAME||!MOBILE_TELPHONE||!JOB||!LANDLINE_TELPHONE||!E_MAIL){
      res.send({
        code:400,
        msg:'lack keyword'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='SELECT ID,NAME FROM COMPANY_TYPE';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<result.length;i++){
            if(result[i].NAME==TYPE){
              TYPE=Number(result[i].ID);
              break;
            }
          }
          if(isNaN(TYPE)){
            callback(new Error('type is wrong'),conn);
          }else{
            callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='SELECT NAME FROM CONTACT_INFO WHERE LANDLINE_TELPHONE=?';
      conn.query(sql,[LANDLINE_TELPHONE],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            res.send({
              code:400,
              msg:'the landline_telphone of company has existed'
            });
            callback(new Error('company has existed'),conn);
          }else{
            callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='SELECT NAME FROM COMPANY_INFO WHERE NUMBER=?';
      conn.query(sql,[NUMBER],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            res.send({
              code:400,
              msg:'the number of company has existed'
            });
            callback(new Error('company has existed'),conn);
          }else{
            callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      let variables=[COMPANY_NAME,NUMBER,ADDRESS,CALLER_AREA,TYPE,CALLER_PROVINCE,ESTABLISHER,ESTABLISH_TIME];
      let sql='INSERT INTO COMPANY_INFO(NAME,NUMBER,ADDRESS,CALLER_AREA,TYPE,CALLER_PROVINCE,ESTABLISHER,ESTABLISH_TIME) VALUES(?,?,?,?,?,?,?,?)';
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'company insert failed'
            });
            callback(new Error('company insert failed'),conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='SELECT LAST_INSERT_ID() AS LASTID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let LASTID=result[0].LASTID;
          callback(null,conn,LASTID);
        }
      });
    },function (conn,LASTID,callback) {
      let sql='INSERT INTO CONTACT_INFO(NAME,MOBILE_TELPHONE,JOB,LANDLINE_TELPHONE,E_MAIL,COMPANY_ID) VALUES(?,?,?,?,?,?)';
      let variables=[STAFF_NAME,MOBILE_TELPHONE,JOB,LANDLINE_TELPHONE,E_MAIL,LASTID];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'contact insert failed'
            });
            callback(new Error('contact insert failed'),conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='SELECT LAST_INSERT_ID() AS LASTID2';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let LASTID2=result[0].LASTID2;
          res.send({
            code:200,
            msg:'insert success',
            id:LASTID2
          });
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  deleteData: function (req,res,next){
    let ID=req.body.id;
    if(!ID){
      res.send({
        code:400,
        msg:'lack id'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COMPANY_ID FROM CONTACT_INFO WHERE ID=?';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result==''||!result){
            res.send({
              code:400,
              msg:'staff has not existed'
            });
            callback(new Error('staff has not existed'),conn);
          }else{
            let company_id=result[0].COMPANY_ID;
            callback(null,conn,company_id);
          }
        }
      });
    },function (conn,company_id,callback) {
      let sql='DELETE FROM COMPANY_INFO WHERE ID=?';
      conn.query(sql,[company_id],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'delete success'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'delete failed'
            });
            callback(new Error('delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  deleteAllData: function (req,res,next){
    let ID=req.body.id;
    if(!ID||!(ID instanceof Array)){
      res.send({
        code:400,
        msg:'id error'
      });
      return;
    }

    let IDgroup='(';
    for(let i=0;i<ID.length;i++){
      if(i==ID.length-1){
        IDgroup+=ID[i]+')';
      }else{
        IDgroup+=ID[i]+',';
      }
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COMPANY_ID FROM CONTACT_INFO WHERE ID IN'+IDgroup;
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result==''||!result){
            res.send({
              code:400,
              msg:'staff has not existed'
            });
            callback(new Error('staff has not existed'),conn);
          }else{
            let ary='(';
            for(let i=0;i<result.length;i++){
              if(i==result.length-1){
                ary+=result[i].COMPANY_ID+')';
              }else{
                ary+=result[i].COMPANY_ID+',';
              }
            }
            callback(null,conn,ary);
          }
        }
      });
    },function (conn,ary,callback) {
      let sql='DELETE FROM COMPANY_INFO WHERE ID IN'+ary;
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows>=1){
            res.send({
              code:200,
              msg:'delete success'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'delete failed'
            });
            callback(new Error('delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  patchData: function (req,res,next){
    let ID=req.body.id;
    if(!ID){
      res.send({
        code:400,
        msg:'lack id'
      });
      return;
    }

    let COMPANY_NAME=req.body.company_name;
    let NUMBER=req.body.number;
    let ADDRESS=req.body.address;
    let CALLER_AREA=req.body.area;
    let CALLER_PROVINCE=req.body.province;

    for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
      let mapObj=mapList.chinaMap.provincesList[j];
      if(mapObj.Name==CALLER_PROVINCE){
        CALLER_PROVINCE=Number(mapObj.Id);
        for(k=0;k<mapObj.Citys.length;k++){
          if(mapObj.Citys[k].Name==CALLER_AREA){
            CALLER_AREA=Number(mapObj.Citys[k].Id);
            break;
          }
        }
        break;
      }
    }

    if(isNaN(CALLER_AREA)||isNaN(CALLER_PROVINCE)){
      res.send({
        code:400,
        msg:'province or city is wrong'
      });
      return;
    }

    let TYPE=req.body.type;
    let ESTABLISHER=req.body.establisher;
    let ESTABLISH_TIME=req.body.time;

    let STAFF_NAME=req.body.staff_name;
    let MOBILE_TELPHONE=req.body.mobile_telphone;
    let JOB=req.body.job;
    let LANDLINE_TELPHONE=req.body.landline_telphone;
    let E_MAIL=req.body.e_mail;

    if(!COMPANY_NAME||!NUMBER||!ADDRESS||!CALLER_AREA||!TYPE||!CALLER_PROVINCE||!ESTABLISHER||!ESTABLISH_TIME||!STAFF_NAME||!MOBILE_TELPHONE||!JOB||!LANDLINE_TELPHONE||!E_MAIL){
      res.send({
        code:400,
        msg:'lack keyword'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='SELECT ID,NAME FROM COMPANY_TYPE';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<result.length;i++){
            if(result[i].NAME==TYPE){
              TYPE=Number(result[i].ID);
              break;
            }
          }
          if(isNaN(TYPE)){
            callback(new Error('type is wrong'),conn);
          }else{
            callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='SELECT COMPANY_ID FROM CONTACT_INFO WHERE ID=?';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result==''||!result){
            res.send({
              code:400,
              msg:'staff has not existed'
            });
            callback(new Error('staff has not existed'),conn);
          }else{
            let company_id=result[0].COMPANY_ID;
            callback(null,conn,company_id);
          }
        }
      });
    },function (conn,company_id,callback) {
      let sql='SELECT ID FROM COMPANY_INFO WHERE NUMBER=?';
      conn.query(sql,[NUMBER],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result==''||result[0].ID==company_id){
            callback(null,conn,company_id);
          }else{
            res.send({
              code:400,
              msg:'number must be unique'
            });
            callback(new Error('number must be unique'),conn);
          }
        }
      });
    },function (conn,company_id,callback) {
      let sql='SELECT COMPANY_ID FROM CONTACT_INFO WHERE LANDLINE_TELPHONE=?';
      conn.query(sql,[LANDLINE_TELPHONE],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result==''||result[0].COMPANY_ID==company_id){
            callback(null,conn,company_id);
          }else{
            res.send({
              code:400,
              msg:'landline_telphone must be unique'
            });
            callback(new Error('landline_telphone must be unique'),conn);
          }
        }
      });
    },function (conn,company_id,callback) {
      let sql='UPDATE COMPANY_INFO SET NAME=?,NUMBER=?,ADDRESS=?,CALLER_AREA=?,TYPE=?,CALLER_PROVINCE=?,ESTABLISHER=?,ESTABLISH_TIME=? WHERE ID=?';
      let variables=[COMPANY_NAME,NUMBER,ADDRESS,CALLER_AREA,TYPE,CALLER_PROVINCE,ESTABLISHER,ESTABLISH_TIME,company_id];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'company update failed'
            });
            callback(new Error('company update failed'),conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='UPDATE CONTACT_INFO SET NAME=?,MOBILE_TELPHONE=?,JOB=?,LANDLINE_TELPHONE=?,E_MAIL=? WHERE ID=?';
      let variables=[STAFF_NAME,MOBILE_TELPHONE,JOB,LANDLINE_TELPHONE,E_MAIL,ID];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'update success'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'contact update failed'
            });
            callback(new Error('contact update failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  feedbackList: function (req,res,next){
    let ID=req.body.id;
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    
    if(!pageIndex||isNaN(pageIndex)||pageIndex<1||!pageSize||isNaN(pageSize)||pageSize<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COUNT(*) AS COUNT FROM FEEDBACK_INFO WHERE CONTACT_ID=? ORDER BY CREATE_TIME DESC';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rawTotal=result[0].COUNT;
          callback(null,conn,rawTotal);
        }
      });
    },function (conn,rawTotal,callback) {
      let sql='SELECT D.* FROM(SELECT @rownum := @rownum+1 AS ROWNUM,C.* FROM(SELECT @rownum:=0)r,(SELECT A.ID,A.CREATE_TIME,A.SERVICE_STAGE,A.PROBLEM_ID,B.NAME AS PROBLEM_NAME,A.URGENCY,A.DETAIL,A.SOLVE_SITUATION FROM FEEDBACK_INFO A INNER JOIN PROBLEM_TYPE B ON A.PROBLEM_ID=B.ID WHERE A.CONTACT_ID=? ORDER BY A.CREATE_TIME DESC)C)D WHERE ROWNUM BETWEEN ? AND ?';
      conn.query(sql,[ID,startIndex,endIndex],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
            for(let i=0;i<result.length;i++){
              let obj={};
              obj.rownum=result[i].ROWNUM;
              obj.id=result[i].ID;
              obj.createTime=sd.format(result[i].CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
              obj.stage=feedbackList.serviceStage[result[i].SERVICE_STAGE];
              obj.problem=result[i].PROBLEM_NAME;
              obj.urgency=feedbackList.urgency[result[i].URGENCY];
              obj.detail=result[i].DETAIL;
              obj.solveSituation=result[i].SOLVE_SITUATION;
              rows.push(obj);
            }
          }
          res.send({
            code:200,
            rawTotal:rawTotal,
            total:rows.length,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  feedbackSearch: function (req,res,next){
    let ID=req.body.id;
    let keyword=req.body.keyword;
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    
    if(!pageIndex||isNaN(pageIndex)||pageIndex<1||!pageSize||isNaN(pageSize)||pageSize<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;

    let whereClause=' where A.CONTACT_ID=?';
    if(keyword){
       whereClause+=' and (B.NAME LIKE \'%'+keyword+'%\' OR A.DETAIL LIKE \'%'+keyword+'%\')';
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COUNT(*) AS COUNT FROM FEEDBACK_INFO A INNER JOIN PROBLEM_TYPE B ON A.PROBLEM_ID=B.ID'+whereClause+' ORDER BY A.CREATE_TIME DESC';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rawTotal=result[0].COUNT;
          callback(null,conn,rawTotal);
        }
      });
    },function (conn,rawTotal,callback) {
      let sql='SELECT D.* FROM(SELECT @rownum := @rownum+1 AS ROWNUM,C.* FROM(SELECT @rownum:=0)r,(SELECT A.ID,A.CREATE_TIME,A.SERVICE_STAGE,A.PROBLEM_ID,B.NAME AS PROBLEM_NAME,A.URGENCY,A.DETAIL,A.SOLVE_SITUATION FROM FEEDBACK_INFO A INNER JOIN PROBLEM_TYPE B ON A.PROBLEM_ID=B.ID'+whereClause+' ORDER BY A.CREATE_TIME DESC)C)D WHERE ROWNUM BETWEEN ? AND ?';
      conn.query(sql,[ID,startIndex,endIndex],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
            for(let i=0;i<result.length;i++){
              let obj={};
              obj.rownum=result[i].ROWNUM;
              obj.id=result[i].ID;
              obj.createTime=sd.format(result[i].CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
              obj.stage=feedbackList.serviceStage[result[i].SERVICE_STAGE];
              obj.problem=result[i].PROBLEM_NAME;
              obj.urgency=feedbackList.urgency[result[i].URGENCY];
              obj.detail=result[i].DETAIL;
              obj.solveSituation=result[i].SOLVE_SITUATION;
              rows.push(obj);
            }
          }
          res.send({
            code:200,
            rawTotal:rawTotal,
            total:rows.length,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  addFeedback: function (req,res,next){
    let ID=req.body.id;
    let STAGE=req.body.stage;
    let PROBLEM=req.body.problem;
    let URGENCY=req.body.urgency;
    let DETAIL=req.body.detail;
    
    if(!ID||!STAGE||!PROBLEM||!URGENCY||!DETAIL){
      res.send({
        code:400,
        msg:'lack condition'
      });
      return;
    }

    for(let key in feedbackList.serviceStage){
      let stageList=feedbackList.serviceStage;
      if(stageList[key]==STAGE){
        STAGE=Number(key);
        break;
      }
    }

    for(let key in feedbackList.urgency){
      let urgencyList=feedbackList.urgency;
      if(urgencyList[key]==URGENCY){
        URGENCY=Number(key);
        break;
      }
    }

    if(isNaN(STAGE)||isNaN(URGENCY)){
      res.send({
        code:400,
        msg:'stage or urgency is wrong'
      });
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='SELECT ID,NAME FROM PROBLEM_TYPE';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<result.length;i++){
            if(result[i].NAME==PROBLEM){
              PROBLEM=result[i].ID;
            }
          }
          if(isNaN(PROBLEM)){
            callback(new Error('problem is wrong'),conn);
          }else{
            callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='INSERT INTO FEEDBACK_INFO(CONTACT_ID,SERVICE_STAGE,PROBLEM_ID,URGENCY,DETAIL) VALUES(?,?,?,?,?)';
      conn.query(sql,[ID,STAGE,PROBLEM,URGENCY,DETAIL],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'feedback insert failed'
            });
            callback(new Error('FEEDBACK insert failed'),conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='SELECT LAST_INSERT_ID() AS LASTID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let LASTID=result[0].LASTID;
          res.send({
            code:200,
            id:LASTID,
            msg:'feedback insert success'
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  deleteFeedback: function (req,res,next){
    let ID=req.body.id;
    
    if(!ID){
      res.send({
        code:400,
        msg:'lack id'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='DELETE FROM FEEDBACK_INFO WHERE ID=?';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'feedback delete success'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'feedback delete failed or id has not exist'
            });
            callback(new Error('FEEDBACK delete failed or id has not exist'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  patchFeedback: function (req,res,next){
    let ID=req.body.id;
    let STAGE=req.body.stage;
    let PROBLEM=req.body.problem;
    let URGENCY=req.body.urgency;
    let DETAIL=req.body.detail;
    
    if(!ID){
      res.send({
        code:400,
        msg:'lack id'
      });
    }

    for(let key in feedbackList.serviceStage){
      let stageList=feedbackList.serviceStage;
      if(stageList[key]==STAGE){
        STAGE=Number(key);
        break;
      }
    }

    for(let key in feedbackList.urgency){
      let urgencyList=feedbackList.urgency;
      if(urgencyList[key]==URGENCY){
        URGENCY=Number(key);
        break;
      }
    }

    if(isNaN(STAGE)||isNaN(URGENCY)){
      res.send({
        code:400,
        msg:'stage or urgency is wrong'
      });
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='SELECT ID,NAME FROM PROBLEM_TYPE';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<result.length;i++){
            if(result[i].NAME==PROBLEM){
              PROBLEM=result[i].ID;
            }
          }
          if(isNaN(PROBLEM)){
            callback(new Error('problem is wrong'),conn);
          }else{
            callback(null,conn);
          }
        }
      });
    },function (conn,callback) {
      let sql='UPDATE FEEDBACK_INFO SET SERVICE_STAGE=?,PROBLEM_ID=?,URGENCY=?,DETAIL=? WHERE ID=?';
      conn.query(sql,[STAGE,PROBLEM,URGENCY,DETAIL,ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'feedback patch success'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'feedback patch failed or id has not exist or nothing has changed'
            });
            callback(new Error('FEEDBACK patch failed or id has not exist or nothing has changed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  contractList: function (req,res,next){
    let ID=req.body.id;
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    
    if(!pageIndex||isNaN(pageIndex)||pageIndex<1||!pageSize||isNaN(pageSize)||pageSize<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COMPANY_ID FROM CONTACT_INFO WHERE ID=?';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            company_id=result[0].COMPANY_ID;
            callback(null,conn,company_id);
          }else{
            res.send({
              code:400,
              msg:'id error'
            });
          }
        }
      });
    },function (conn,company_id,callback) {
      let sql='SELECT CONTRACT_ID,DETAIL,CREATE_TIME FROM MAINTENANCE_LOG ORDER BY CREATE_TIME DESC';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let log=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.contractId=result[i].CONTRACT_ID;
            obj.logDetail=result[i].DETAIL;
            obj.createTime=sd.format(result[i].CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            log.push(obj);
          }
          callback(null,conn,log,company_id);
        }
      });
    },function (conn,log,company_id,callback) {
      let sql='SELECT COUNT(*) AS COUNT FROM CONTRACT_INFO WHERE COMPANY_ID=?';
      conn.query(sql,[company_id],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rawTotal=result[0].COUNT;
          callback(null,conn,log,rawTotal,company_id);
        }
      });
    },function (conn,log,rawTotal,company_id,callback) {
      let sql='SELECT B.* FROM(SELECT @rownum := @rownum+1 AS ROWNUM,A.* FROM(SELECT @rownum:=0)r,(SELECT ID,CREATE_TIME,NAME,UNDER_WARRANTY,BUYER,OPRATER,INSPECTER,DETAIL,MAINTENANCE FROM CONTRACT_INFO WHERE COMPANY_ID=? ORDER BY CREATE_TIME DESC)A)B WHERE ROWNUM BETWEEN ? AND ?';
      let variables=[company_id,startIndex,endIndex];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.rownum=result[i].ROWNUM;
            obj.id=result[i].ID;
            
            let time=result[i].CREATE_TIME;
              obj.createTime=sd.format(time,'YYYY-MM-DD HH:mm:ss');
              let day=time.getDate();
              time.setDate(day+Number(result[i].UNDER_WARRANTY));
              obj.endTime=sd.format(time,'YYYY-MM-DD HH:mm:ss');

            obj.name=result[i].NAME;
            obj.underWarranty=result[i].UNDER_WARRANTY+'天';
            obj.buyer=result[i].BUYER;
            obj.oprater=result[i].OPRATER;
            obj.inspecter=result[i].INSPECTER;
            obj.contractDetail=result[i].DETAIL;
            obj.maintenance=result[i].MAINTENANCE;
            obj.maintenanceLog=[];
            rows.push(obj);
          }
          for(let i=0;i<rows.length;i++){
            for(let j=0;j<log.length;j++){
              if(rows[i].id==log[j].contractId){
                rows[i].maintenanceLog.push(log[j]);
              }
            }
          }
          }
          res.send({
            code:200,
            rawTotal:rawTotal,
            total:result.length,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  contractSearch: function (req,res,next){
    let ID=req.body.id;
    let keyword=req.body.keyword;
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    
    if(!pageIndex||isNaN(pageIndex)||pageIndex<1||!pageSize||isNaN(pageSize)||pageSize<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;

    let whereClause=' where COMPANY_ID=?';
    if(keyword){
      whereClause+=' and (NAME LIKE \'%'+keyword+'%\' OR UNDER_WARRANTY LIKE \'%'+keyword+'%\' OR BUYER LIKE \'%'+keyword+'%\' OR OPRATER LIKE \'%'+keyword+'%\' OR INSPECTER LIKE \'%'+keyword+'%\')';
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT COMPANY_ID FROM CONTACT_INFO WHERE ID=?';
      conn.query(sql,[ID],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            company_id=result[0].COMPANY_ID;
            callback(null,conn,company_id);
          }else{
            res.send({
              code:400,
              msg:'id error'
            });
          }
        }
      });
    },function (conn,company_id,callback) {
      let sql='SELECT CONTRACT_ID,DETAIL,CREATE_TIME FROM MAINTENANCE_LOG ORDER BY CREATE_TIME DESC';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let log=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.contractId=result[i].CONTRACT_ID;
            obj.logDetail=result[i].DETAIL;
            obj.createTime=sd.format(result[i].CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            log.push(obj);
          }
          callback(null,conn,log,company_id);
        }
      });
    },function (conn,log,company_id,callback) {
      let sql='SELECT COUNT(*) AS COUNT FROM CONTRACT_INFO'+whereClause;
      conn.query(sql,[company_id],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rawTotal=result[0].COUNT;
          callback(null,conn,log,rawTotal,company_id);
        }
      });
    },function (conn,log,rawTotal,company_id,callback) {
      let sql='SELECT B.* FROM(SELECT @rownum := @rownum+1 AS ROWNUM,A.* FROM(SELECT @rownum:=0)r,(SELECT ID,CREATE_TIME,NAME,UNDER_WARRANTY,BUYER,OPRATER,INSPECTER,DETAIL,MAINTENANCE FROM CONTRACT_INFO'+whereClause+' ORDER BY CREATE_TIME DESC)A)B WHERE ROWNUM BETWEEN ? AND ?';
      let variables=[company_id,startIndex,endIndex];
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
            for(let i=0;i<result.length;i++){
              let obj={};
              obj.rownum=result[i].ROWNUM;
              obj.id=result[i].ID;

              let time=result[i].CREATE_TIME;
              obj.createTime=sd.format(time,'YYYY-MM-DD HH:mm:ss');
              let day=time.getDate();
              time.setDate(day+Number(result[i].UNDER_WARRANTY));
              obj.endTime=sd.format(time,'YYYY-MM-DD HH:mm:ss');

              obj.name=result[i].NAME;
              obj.underWarranty=result[i].UNDER_WARRANTY+'天';
              obj.buyer=result[i].BUYER;
              obj.oprater=result[i].OPRATER;
              obj.inspecter=result[i].INSPECTER;
              obj.contractDetail=result[i].DETAIL;
              obj.maintenance=result[i].MAINTENANCE;
              obj.maintenanceLog=[];
              rows.push(obj);
            }
            for(let i=0;i<rows.length;i++){
              for(let j=0;j<log.length;j++){
                if(rows[i].id==log[j].contractId){
                  rows[i].maintenanceLog.push(log[j]);
                }
              }
            }
          }
          res.send({
            code:200,
            rawTotal:rawTotal,
            total:result.length,
            rows:rows
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  citys: function (req,res,next){
    let rows=mapList.chinaMap.provincesList;
    res.send({
      code:200,
      total:rows.length,
      rows:rows
    });
  },
  problems: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='select id,name from PROBLEM_TYPE';
      conn.query(sql,[],function(err, result){
        if(err){
          callback(err,conn);
        }else{
          res.send({
            code:200,
            total:result.length,
            rows:result
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  companies: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='select id,name from COMPANY_TYPE';
      conn.query(sql,[],function(err, result){
        if(err){
          callback(err,conn);
        }else{
          res.send({
            code:200,
            total:result.length,
            rows:result
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  otherDatas: function (req,res,next){
    let serviceStage=feedbackList.serviceStage;
    let serviceStageAry=[];
    for(let key in serviceStage){
      let obj={};
      obj.id=key;
      obj.name=serviceStage[key];
      serviceStageAry.push(obj);
    }
    let urgency=feedbackList.urgency;
    let urgencyAry=[];
    for(let key in urgency){
      let obj={};
      obj.id=key;
      obj.name=urgency[key];
      urgencyAry.push(obj);
    }
    let rows={};
    rows.serviceStage=serviceStageAry;
    rows.urgency=urgencyAry;
    res.send({
      code:200,
      rows:rows
    });
  }
};

module.exports=contactApi;
