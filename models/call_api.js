var async = require('async');
var dbUtil=require('../util/db');
var sd=require('silly-datetime');
var mapList=require('../data/china');

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
  }
};

module.exports=callApi;
