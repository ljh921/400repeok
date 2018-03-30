var async = require('async');
var dbUtil=require('../util/db');
var sd=require('silly-datetime');
var mapList=require('../data/china');
var feedbackList=require('../data/feedback');

var callApi={
  callDetail: function (req,res,next){
    let tel=req.query.telphone;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT C.*,D.NAME AS TYPENAME FROM(SELECT A.NAME,A.NUMBER,A.ADDRESS,A.CALLER_AREA,A.CALLER_PROVINCE,A.TYPE,A.ESTABLISHER,A.ESTABLISH_TIME,B.ID,B.NAME AS STAFF_NAME,B.MOBILE_TELPHONE,B.JOB,B.LANDLINE_TELPHONE,B.E_MAIL FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID WHERE (B.LANDLINE_TELPHONE=? or B.MOBILE_TELPHONE=?))C INNER JOIN COMPANY_TYPE D ON C.TYPE=D.ID';
      conn.query(sql,[tel,tel],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
	          let obj={};
	          obj.name=result[0].NAME;
	          obj.number=result[0].NUMBER;
            obj.address=result[0].ADDRESS;

            for(let i=0;i<mapList.chinaMap.provincesList.length;i++){
              let mapObj=mapList.chinaMap.provincesList[i];
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
	          obj.id=result[0].ID;
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
  addCalledLog: function (req,res,next){
    let tel=req.body.telphone;
    if(!tel){
      res.send({
        code:400,
        msg:'lack telphone'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='insert into CALLED_LOG(CALLED_NUMBER) values(?)';
      conn.query(sql,[tel],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'insert into called_log failed'
            });
            callback(new Error('insert into called_log failed'),conn);
          }
        }
      });
    },function(conn,callback){
      let sql='SELECT LAST_INSERT_ID() AS LASTID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let newId=result[0].LASTID;
          callback(null,conn,newId);
        }
      });
    },function(conn,newId,callback){
      let sql='update CALLED_LOG set VIRTUAL_ID=? where ID=?';
      conn.query(sql,[newId,newId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn,newId);
          }else{
            res.send({
              code:400,
              msg:'insert into called_log failed'
            });
            callback(new Error('insert into called_log failed'),conn);
          }
        }
      });
    },function(conn,newId,callback){
      let sql='insert into COMPANY_INFO_TEMPORARY(ID,VIRTUAL_ID) values(?,?)';
      conn.query(sql,[newId,newId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn,newId);
          }else{
            res.send({
              code:400,
              msg:'insert into COMPANY_INFO_TEMPORARY failed'
            });
            callback(new Error('insert into COMPANY_INFO_TEMPORARY failed'),conn);
          }
        }
      });
    },function(conn,newId,callback){
      let sql='insert into CONTACT_INFO_TEMPORARY(ID,COMPANY_ID) values(?,?)';
      conn.query(sql,[newId,newId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn,newId);
          }else{
            res.send({
              code:400,
              msg:'insert into CONTACT_INFO_TEMPORARY failed'
            });
            callback(new Error('insert into CONTACT_INFO_TEMPORARY failed'),conn);
          }
        }
      });
    },function(conn,newId,callback){
      let sql='insert into FEEDBACK_INFO_TEMPORARY(ID,CONTACT_ID) values(?,?)';
      conn.query(sql,[newId,newId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'通话记录添加成功！',
              newId:newId
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'insert into FEEDBACK_INFO_TEMPORARY failed'
            });
            callback(new Error('insert into FEEDBACK_INFO_TEMPORARY failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  addCalledLogDetail: function (req,res,next){
    let id=Number(req.body.id);
    let calledTime=req.body.calledTime;
    let duration=Number(req.body.duration);

    let COMPANY_NAME=req.body.company_name;
    let NUMBER=req.body.number;
    let ADDRESS=req.body.address;
    let CALLER_AREA=req.body.area;
    let CALLER_PROVINCE=req.body.province;
    if(CALLER_PROVINCE){
      for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
        let mapObj=mapList.chinaMap.provincesList[j];
        if(mapObj.Name==CALLER_PROVINCE){
          CALLER_PROVINCE=Number(mapObj.Id);
          if(CALLER_AREA){
            for(k=0;k<mapObj.Citys.length;k++){
              if(mapObj.Citys[k].Name==CALLER_AREA){
                CALLER_AREA=Number(mapObj.Citys[k].Id);
                break;
              }
            }
          }
          break;
        }
      }
    }
    let TYPE=req.body.type;
    let ESTABLISHER=req.body.establisher;

    let STAFF_NAME=req.body.staff_name;
    let MOBILE_TELPHONE=req.body.mobile_telphone;
    let JOB=req.body.job;
    let LANDLINE_TELPHONE=req.body.landline_telphone;
    let E_MAIL=req.body.e_mail;

    let STAGE=req.body.stage;
    let PROBLEM=req.body.problem;
    let URGENCY=req.body.urgency;
    let DETAIL=req.body.detail;
    let SOLVE=req.body.solve;

    if(!id||isNaN(id)){
      res.send({
        code:400,
        msg:'lack id'
      });
      return;
    }

    let sql1='update CALLED_LOG set VIRTUAL_ID=?';
    variables1=[id];
    let sql2='update COMPANY_INFO_TEMPORARY set VIRTUAL_ID=?';
    variables2=[id];
    let sql3='update CONTACT_INFO_TEMPORARY set COMPANY_ID=?';
    variables3=[id];
    let sql4='update FEEDBACK_INFO_TEMPORARY set CONTACT_ID=?';
    variables4=[id];

    if(calledTime){
      sql1+=',CALLED_TIME=?';
      variables1.push(calledTime);
    }
    if(duration){
      sql1+=',DURATION=?';
      variables1.push(duration);
    }

    if(COMPANY_NAME){
      sql2+=',NAME=?';
      variables2.push(COMPANY_NAME);
    }
    if(NUMBER){
      sql2+=',NUMBER=?';
      variables2.push(NUMBER);
    }
    if(ADDRESS){
      sql2+=',ADDRESS=?';
      variables2.push(ADDRESS);
    }
    if(CALLER_AREA){
      sql2+=',CALLER_AREA=?';
      variables2.push(CALLER_AREA);
    }
    if(CALLER_PROVINCE){
      sql2+=',CALLER_PROVINCE=?';
      variables2.push(CALLER_PROVINCE);
    }
    if(ESTABLISHER){
      sql2+=',ESTABLISHER=?';
      variables2.push(ESTABLISHER);
    }

    if(STAFF_NAME){
      sql3+=',NAME=?';
      variables3.push(STAFF_NAME);
    }
    if(MOBILE_TELPHONE){
      sql3+=',MOBILE_TELPHONE=?';
      variables3.push(MOBILE_TELPHONE);
    }
    if(JOB){
      sql3+=',JOB=?';
      variables3.push(JOB);
    }
    if(LANDLINE_TELPHONE){
      sql3+=',LANDLINE_TELPHONE=?';
      variables3.push(LANDLINE_TELPHONE);
    }
    if(E_MAIL){
      sql3+=',E_MAIL=?';
      variables3.push(E_MAIL);
    }

    if(STAGE){
      for(let key in feedbackList.serviceStage){
        let stageList=feedbackList.serviceStage;
        if(stageList[key]==STAGE){
          STAGE=Number(key);
          break;
        }
      }
      if(isNaN(STAGE)){
        res.send({
          code:400,
          msg:'stage is wrong'
        });
        return;
      }
      sql4+=',SERVICE_STAGE=?';
      variables4.push(STAGE);
    }
    if(URGENCY){
      for(let key in feedbackList.urgency){
        let urgencyList=feedbackList.urgency;
        if(urgencyList[key]==URGENCY){
          URGENCY=Number(key);
          break;
        }
      }
      if(isNaN(URGENCY)){
        res.send({
          code:400,
          msg:'urgency is wrong'
        });
        return;
      }
      sql4+=',URGENCY=?';
      variables4.push(URGENCY);
    }
    if(DETAIL){
      sql4+=',DETAIL=?';
      variables4.push(DETAIL);
    }
    if(SOLVE){
      if(SOLVE=='未解决'){
        SOLVE=0;
      }else if(SOLVE=='已解决'){
        SOLVE=1;
      }else{
        res.send({
          code:400,
          msg:'SOLVE is wrong'
        });
        return;
      }
      sql4+=',SOLVE_SITUATION=?';
      variables4.push(SOLVE);
    }

    sql1+=' where ID=?';
    variables1.push(id);
    sql3+=' where ID=?';
    variables3.push(id);

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      if(TYPE){
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
            sql2+=',TYPE=?';
            variables2.push(TYPE);
            sql2+=' where ID=?';
            variables2.push(id);
            if(isNaN(TYPE)){
              callback(new Error('type is wrong'),conn);
            }else{
              callback(null,conn);
            }
          }
        });
      }else{
        sql2+=' where ID=?';
        variables2.push(id);
        callback(null,conn);
      }
    },function(conn,callback){
      if(PROBLEM){
        let sql='SELECT ID,NAME FROM PROBLEM_TYPE';
        conn.query(sql,[],function(err, result){
          if (err) { 
            callback(err,conn);
          }else{
            for(let i=0;i<result.length;i++){
              if(result[i].NAME==PROBLEM){
                PROBLEM=Number(result[i].ID);
                break;
              }
            }
            sql4+=',PROBLEM_ID=?';
            variables4.push(PROBLEM);
            sql4+=' where ID=?';
            variables4.push(id);
            if(isNaN(PROBLEM)){
              callback(new Error('problem is wrong'),conn);
            }else{
              callback(null,conn);
            }
          }
        });
      }else{
        sql4+=' where ID=?';
        variables4.push(id);
        callback(null,conn);
      }
    },function (conn,callback) {
      conn.query(sql1,variables1,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'update called_log failed'
            });
            callback(new Error('update called_log failed'),conn);
          }
        }
      });
    },function(conn,callback){
      conn.query(sql2,variables2,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'update company_info_temporary failed'
            });
            callback(new Error('update company_info_temporary failed'),conn);
          }
        }
      });
    },function(conn,callback){
      conn.query(sql3,variables3,function(err,result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'update contact_info_temporary failed'
            });
            callback(new Error('update contact_info_temporary failed'),conn);
          }
        }
      });
    },function(conn,callback){
      conn.query(sql4,variables4,function(err,result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result){
            res.send({
              code:200,
              msg:'添加通话潜在客户信息成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'update feedback_info_temporary failed'
            });
            callback(new Error('update feedback_info_temporary failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  addNotCalledLog: function (req,res,next){
    let tel=req.body.telphone;
    let calledTime=req.body.calledTime;
    let hangUpTime=req.body.hangUpTime;

    if(!tel||!calledTime||!hangUpTime){
      res.send({
        code:400,
        msg:'lack telphone message'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='insert into NOT_CALLED_LOG(CALLED_NUMBER,CALLED_TIME,HANGUP_TIME) values(?,?,?)';
      conn.query(sql,[tel,calledTime,hangUpTime],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'添加未接来电信息成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'insert into not_called_log failed'
            });
            callback(new Error('insert into not_called_log failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  getAllCalledLog: function (req,res,next){
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    let pageIndex2=Number(req.body.pageIndex2);
    let pageSize2=Number(req.body.pageSize2);
    
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
    if(!pageIndex2||isNaN(pageIndex2)||pageIndex2<1||!pageSize2||isNaN(pageSize2)||pageSize2<1){
      res.send({
        code:400,
        msg:'bad paging parameters'
      });
      return;
    }
    if(pageSize2>100){
      res.send({
        code:400,
        msg:'pageSize can not be larger than 100'
      });
      return;
    }
    
    let startIndex=(pageIndex-1)*pageSize+1;
    let endIndex=pageIndex*pageSize;
    let startIndex2=(pageIndex2-1)*pageSize2+1;
    let endIndex2=pageIndex2*pageSize2;

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select id,name from COMPANY_TYPE';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn)
        }else{
          let companyType=result;
          callback(null,conn,companyType);
        }
      })
    },function(conn,companyType,callback){
      let sql='select id,name from PROBLEM_TYPE';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn)
        }else{
          let problemType=result;
          callback(null,conn,companyType,problemType);
        }
      })
    },function(conn,companyType,problemType,callback){
      let sql='select COUNT(*) AS COUNT from FEEDBACK_INFO_TEMPORARY E inner join (select C.called_number as calledNumber,C.called_time as calledTime,C.duration,D.* from CALLED_LOG C inner join (select A.ID,A.name AS companyName,A.number,A.address,A.caller_area as callerArea,A.caller_province as callerProvince,A.type,A.establisher,A.establish_time as establishTime,B.name as staffName,B.mobile_telphone as mobileTelphone,B.job,B.landline_telphone as LANDLINE_TELPHONE,B.e_mail as eMail from COMPANY_INFO_TEMPORARY A inner join CONTACT_INFO_TEMPORARY B on A.ID=B.company_id)D on C.ID=D.ID)F on E.ID=F.ID';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let calledRawtotal=result[0].COUNT;
          callback(null,conn,companyType,problemType,calledRawtotal);
        }
      });
    },function (conn,companyType,problemType,calledRawtotal,callback) {
      let sql='select H.* from(select @rownum := @rownum+1 AS ROWNUM,G.* from(select @rownum:=0)r,(select F.*,E.service_stage as serviceStage,E.problem_id as problem,E.urgency,E.detail,E.solve_situation as solveSituation from FEEDBACK_INFO_TEMPORARY E inner join (select C.called_number as calledNumber,C.called_time as calledTime,C.duration,D.* from CALLED_LOG C inner join (select A.ID,A.name AS companyName,A.number,A.address,A.caller_area as callerArea,A.caller_province as callerProvince,A.type,A.establisher,A.establish_time as establishTime,B.name as staffName,B.mobile_telphone as mobileTelphone,B.job,B.landline_telphone as LANDLINE_TELPHONE,B.e_mail as eMail from COMPANY_INFO_TEMPORARY A inner join CONTACT_INFO_TEMPORARY B on A.ID=B.company_id)D on C.ID=D.ID)F on E.ID=F.ID)G)H where ROWNUM between ? and ?';
      conn.query(sql,[startIndex,endIndex],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<result.length;i++){
            result[i].calledTime=result[i].calledTime?sd.format(result[i].calledTime,'YYYY-MM-DD HH:mm:ss'):null;
            result[i].establishTime=result[i].establishTime?sd.format(result[i].establishTime,'YYYY-MM-DD HH:mm:ss'):null;
          
            if(result[i].solveSituation==0){
              result[i].solveSituation='未解决';
            }else if(result[i].solveSituation==1){
              result[i].solveSituation='已解决';
            }
            for(let j=0;j<companyType.length;j++){
              if(result[i].type==companyType[j].id){
                result[i].type=companyType[j].name;
                break;
              }
            }
            for(let j=0;j<problemType.length;j++){
              if(result[i].problem==problemType[j].id){
                result[i].problem=problemType[j].name;
                break;
              }
            }
            for(let key in feedbackList.serviceStage){
              let stageList=feedbackList.serviceStage;
              if(key==result[i].serviceStage){
                result[i].serviceStage=stageList[key];
                break;
              }
            }
            for(let key in feedbackList.urgency){
              let urgencyList=feedbackList.urgency;
              if(key==result[i].urgency){
                result[i].urgency=urgencyList[key];
                break;
              }
            }
            for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
              let mapObj=mapList.chinaMap.provincesList[j];
              if(mapObj.Id==result[i].callerProvince){
                result[i].callerProvince=mapObj.Name;
                result[i].callerArea=mapObj.Citys[result[i].callerArea-1].Name;
                break;
              }
            }
            if(!isNaN(result[i].callerProvince)){
              result[i].callerProvince=null;
            }
            if(!isNaN(result[i].callerArea)){
              result[i].callerArea=null;
            }
          }
          let calledData=result;
          callback(null,conn,calledData,calledRawtotal);
        }
      });
    },function(conn,calledData,calledRawtotal,callback){
      let sql='select COUNT(*) AS COUNT from NOT_CALLED_LOG';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let notCalledRawtotal=result[0].COUNT;
          callback(null,conn,calledData,calledRawtotal,notCalledRawtotal);
        }
      });
    },function(conn,calledData,calledRawtotal,notCalledRawtotal,callback){
      let sql='select B.* from(select @rownum := @rownum+1 AS ROWNUM,A.* from(select @rownum:=0)r,(select id,called_number as calledNumber,called_time as calledTime,hangup_time as hangUpTime from NOT_CALLED_LOG)A)B where ROWNUM between ? and ?';
      conn.query(sql,[startIndex2,endIndex2],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          for(let i=0;i<result.length;i++){
            result[i].calledTime=result[i].calledTime?sd.format(result[i].calledTime,'YYYY-MM-DD HH:mm:ss'):null;
            result[i].hangUpTime=result[i].hangUpTime?sd.format(result[i].hangUpTime,'YYYY-MM-DD HH:mm:ss'):null;
          }
          res.send({
            calledRawtotal:calledRawtotal,
            calledTotal:calledData.length,
            called:calledData,
            notCalledRawtotal:notCalledRawtotal,
            notCalledTotal:result.length,
            notCalled:result
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  getCalledLog: function (req,res,next){
    let tel=req.body.telphone;

    if(!tel){
      res.send({
        code:400,
        msg:'lack telphone'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select id,name from COMPANY_TYPE';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn)
        }else{
          let companyType=result;
          callback(null,conn,companyType);
        }
      })
    },function(conn,companyType,callback){
      let sql='select id,name from PROBLEM_TYPE';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn)
        }else{
          let problemType=result;
          callback(null,conn,companyType,problemType);
        }
      })
    },function (conn,companyType,problemType,callback) {
      let sql='select C.called_number as calledNumber,C.called_time as calledTime,C.duration,D.* from CALLED_LOG C inner join (select A.ID,A.name AS companyName,A.number,A.address,A.caller_area as callerArea,A.caller_province as callerProvince,A.type,A.establisher,A.establish_time as establishTime,B.name as staffName,B.mobile_telphone as mobileTelphone,B.job,B.landline_telphone as landlineTelphone,B.e_mail as eMail from COMPANY_INFO_TEMPORARY A inner join CONTACT_INFO_TEMPORARY B on A.ID=B.company_id)D on C.ID=D.ID where C.called_number=? order by D.establishTime desc limit 1';
      conn.query(sql,[tel],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            for(let i=0;i<result.length;i++){
              result[i].calledTime=result[i].calledTime?sd.format(result[i].calledTime,'YYYY-MM-DD HH:mm:ss'):null;
              result[i].establishTime=result[i].establishTime?sd.format(result[i].establishTime,'YYYY-MM-DD HH:mm:ss'):null;
            
              for(let j=0;j<companyType.length;j++){
                if(result[i].type==companyType[j].id){
                  result[i].type=companyType[j].name;
                  break;
                }
              }
              for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
                let mapObj=mapList.chinaMap.provincesList[j];
                if(mapObj.Id==result[i].callerProvince){
                  result[i].callerProvince=mapObj.Name;
                  result[i].callerArea=mapObj.Citys[result[i].callerArea-1].Name;
                  break;
                }
              }
              if(!isNaN(result[i].callerProvince)){
                result[i].callerProvince=null;
              }
              if(!isNaN(result[i].callerArea)){
                result[i].callerArea=null;
              }
            }
            let log1=result;
            callback(null,conn,log1,problemType);
          }else{
            res.send({
              code:200,
              rows:[]
            });
            callback(true,conn);
          }
        }
      });
    },function(conn,log1,problemType,callback){
      let sql='select ID from CALLED_LOG where CALLED_NUMBER=?';
      conn.query(sql,[tel],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let feedbackIdAry='(';
          for(let i=0;i<result.length;i++){
            if(i==result.length-1){
              feedbackIdAry=feedbackIdAry+result[i].ID+')';
            }else{
              feedbackIdAry=feedbackIdAry+result[i].ID+',';
            }
          }
          callback(null,conn,log1,feedbackIdAry,problemType);
        }
      });
    },function(conn,log1,feedbackIdAry,problemType,callback){
      let sql='select SERVICE_STAGE as serviceStage,PROBLEM_ID as problem,urgency,detail,CREATE_TIME as createTime,SOLVE_SITUATION as solveSituation from FEEDBACK_INFO_TEMPORARY where ID in'+feedbackIdAry+' order by CREATE_TIME desc';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          log1[0].feedbackAry=[];
          let log2=log1[0].feedbackAry;
          for(let i=0;i<result.length;i++){
            result[i].createTime=result[i].createTime?sd.format(result[i].createTime,'YYYY-MM-DD HH:mm:ss'):null;
            if(result[i].solveSituation==0){
              result[i].solveSituation='未解决';
            }else if(result[i].solveSituation==1){
              result[i].solveSituation='已解决';
            }
            for(let key in feedbackList.serviceStage){
              let stageList=feedbackList.serviceStage;
              if(key==result[i].serviceStage){
                result[i].serviceStage=stageList[key];
                break;
              }
            }
            for(let key in feedbackList.urgency){
              let urgencyList=feedbackList.urgency;
              if(key==result[i].urgency){
                result[i].urgency=urgencyList[key];
                break;
              }
            }
            for(let j=0;j<problemType.length;j++){
              if(result[i].problem==problemType[j].id){
                result[i].problem=problemType[j].name;
                break;
              }
            }
            log2.push(result[i]);
          }
          res.send({
            code:200,
            rows:log1
          });
          callback(null,conn);
        }
      })
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  searchCalledLog: function (req,res,next){
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    let startTime=new Date(req.body.startTime);
    let endTime=new Date(req.body.endTime);
    let keyword=req.body.keyword;
    let whereClause=' where 1=1';

    if(startTime!='Invalid Date'){
      let timeStr=sd.format(startTime,'YYYY-MM-DD HH:mm:ss');
      whereClause+=' and F.calledTime >=\''+timeStr+'\'';
    }
    if(endTime!='Invalid Date'){
      let timeStr=sd.format(endTime,'YYYY-MM-DD HH:mm:ss');
      whereClause+=' and F.calledTime <=\''+timeStr+'\'';
    }
    if(keyword){
      whereClause+=' and (F.calledNumber like \'%'+keyword+'%\' or F.companyName like \'%'+keyword+'%\' or F.staffName like \'%'+keyword+'%\')';
    }
    
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

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select id,name from COMPANY_TYPE';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn)
        }else{
          let companyType=result;
          callback(null,conn,companyType);
        }
      })
    },function(conn,companyType,callback){
      let sql='select id,name from PROBLEM_TYPE';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn)
        }else{
          let problemType=result;
          callback(null,conn,companyType,problemType);
        }
      })
    },function(conn,companyType,problemType,callback){
      let sql='select COUNT(*) AS COUNT from FEEDBACK_INFO_TEMPORARY E inner join (select C.called_number as calledNumber,C.called_time as calledTime,C.duration,D.* from CALLED_LOG C inner join (select A.ID,A.name AS companyName,A.number,A.address,A.caller_area as callerArea,A.caller_province as callerProvince,A.type,A.establisher,A.establish_time as establishTime,B.name as staffName,B.mobile_telphone as mobileTelphone,B.job,B.landline_telphone as LANDLINE_TELPHONE,B.e_mail as eMail from COMPANY_INFO_TEMPORARY A inner join CONTACT_INFO_TEMPORARY B on A.ID=B.company_id)D on C.ID=D.ID)F on E.ID=F.ID'+whereClause;
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let calledRawtotal=result[0].COUNT;
          callback(null,conn,companyType,problemType,calledRawtotal);
        }
      });
    },function (conn,companyType,problemType,calledRawtotal,callback) {
      let sql='select H.* from(select @rownum := @rownum+1 AS ROWNUM,G.* from(select @rownum:=0)r,(select F.*,E.service_stage as serviceStage,E.problem_id as problem,E.urgency,E.detail,E.solve_situation as solveSituation from FEEDBACK_INFO_TEMPORARY E inner join (select C.called_number as calledNumber,C.called_time as calledTime,C.duration,D.* from CALLED_LOG C inner join (select A.ID,A.name AS companyName,A.number,A.address,A.caller_area as callerArea,A.caller_province as callerProvince,A.type,A.establisher,A.establish_time as establishTime,B.name as staffName,B.mobile_telphone as mobileTelphone,B.job,B.landline_telphone as LANDLINE_TELPHONE,B.e_mail as eMail from COMPANY_INFO_TEMPORARY A inner join CONTACT_INFO_TEMPORARY B on A.ID=B.company_id)D on C.ID=D.ID)F on E.ID=F.ID'+whereClause+' order by F.calledTime desc)G)H where ROWNUM between ? and ?';
      conn.query(sql,[startIndex,endIndex],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            for(let i=0;i<result.length;i++){
              result[i].calledTime=result[i].calledTime?sd.format(result[i].calledTime,'YYYY-MM-DD HH:mm:ss'):null;
              result[i].establishTime=result[i].establishTime?sd.format(result[i].establishTime,'YYYY-MM-DD HH:mm:ss'):null;
            
              if(result[i].solveSituation==0){
                result[i].solveSituation='未解决';
              }else if(result[i].solveSituation==1){
                result[i].solveSituation='已解决';
              }
              for(let j=0;j<companyType.length;j++){
                if(result[i].type==companyType[j].id){
                  result[i].type=companyType[j].name;
                  break;
                }
              }
              for(let j=0;j<problemType.length;j++){
                if(result[i].problem==problemType[j].id){
                  result[i].problem=problemType[j].name;
                  break;
                }
              }
              for(let key in feedbackList.serviceStage){
                let stageList=feedbackList.serviceStage;
                if(key==result[i].serviceStage){
                  result[i].serviceStage=stageList[key];
                  break;
                }
              }
              for(let key in feedbackList.urgency){
                let urgencyList=feedbackList.urgency;
                if(key==result[i].urgency){
                  result[i].urgency=urgencyList[key];
                  break;
                }
              }
              for(let j=0;j<mapList.chinaMap.provincesList.length;j++){
                let mapObj=mapList.chinaMap.provincesList[j];
                if(mapObj.Id==result[i].callerProvince){
                  result[i].callerProvince=mapObj.Name;
                  result[i].callerArea=mapObj.Citys[result[i].callerArea-1].Name;
                  break;
                }
              }
              if(!isNaN(result[i].callerProvince)){
                result[i].callerProvince=null;
              }
              if(!isNaN(result[i].callerArea)){
                result[i].callerArea=null;
              }
            }
            let calledData=result;
            res.send({
              code:200,
              rawTotal:calledRawtotal,
              total:calledData.length,
              rows:calledData
            });
            callback(null,conn);
          }else{
            res.send({
              code:200,
              rawTotal:0,
              total:0,
              rows:[]
            });
            callback(null,conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  searchNotCalledLog: function (req,res,next){
    let pageIndex=Number(req.body.pageIndex);
    let pageSize=Number(req.body.pageSize);
    let startTime=new Date(req.body.startTime);
    let endTime=new Date(req.body.endTime);
    let keyword=req.body.keyword;
    let whereClause=' where 1=1';

    if(startTime!='Invalid Date'){
      let timeStr=sd.format(startTime,'YYYY-MM-DD HH:mm:ss');
      whereClause+=' and CALLED_TIME >=\''+timeStr+'\'';
    }
    if(endTime!='Invalid Date'){
      let timeStr=sd.format(endTime,'YYYY-MM-DD HH:mm:ss');
      whereClause+=' and CALLED_TIME <=\''+timeStr+'\'';
    }
    if(keyword){
      whereClause+=' and (CALLED_NUMBER like \'%'+keyword+'%\')';
    }
    
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

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select COUNT(*) AS COUNT from NOT_CALLED_LOG';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let notCalledRawtotal=result[0].COUNT;
          callback(null,conn,notCalledRawtotal);
        }
      });
    },function(conn,notCalledRawtotal,callback){
      let sql='select B.* from(select @rownum := @rownum+1 AS ROWNUM,A.* from(select @rownum:=0)r,(select id,called_number as calledNumber,called_time as calledTime,hangup_time as hangUpTime from NOT_CALLED_LOG'+whereClause+' order by CALLED_TIME desc)A)B where ROWNUM between ? and ?';
      conn.query(sql,[startIndex,endIndex],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          if(result!=''){
            for(let i=0;i<result.length;i++){
              result[i].calledTime=result[i].calledTime?sd.format(result[i].calledTime,'YYYY-MM-DD HH:mm:ss'):null;
              result[i].hangUpTime=result[i].hangUpTime?sd.format(result[i].hangUpTime,'YYYY-MM-DD HH:mm:ss'):null;
            }
            res.send({
              code:200,
              rawTotal:notCalledRawtotal,
              total:result.length,
              rows:result
            });
            callback(null,conn);
          }else{
            res.send({
              code:200,
              rawTotal:0,
              total:0,
              rows:[]
            });
            callback(null,conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  }
};

module.exports=callApi;
