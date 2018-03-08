var async = require('async');
var dbUtil=require('../util/db');
var sd=require('silly-datetime');

var callApi={
  callDetail: function (req,res,next){
    let tel=req.query.telphone;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT A.NAME,A.NUMBER,A.ADDRESS,A.CALLER_AREA,A.TYPE,A.INDUSTRY,A.ESTABLISHER,A.ESTABLISH_TIME,B.ID,B.NAME AS STAFF_NAME,B.MOBILE_TELPHONE,B.JOB,B.LANDLINE_TELPHONE,B.E_MAIL FROM COMPANY_INFO A INNER JOIN CONTACT_INFO B ON A.ID=B.COMPANY_ID WHERE B.LANDLINE_TELPHONE=?';
      conn.query(sql,[tel],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          if(result!=''){
	        let obj={};
	        obj.name=result[0].NAME;
	        obj.number=result[0].NUMBER;
            obj.address=result[0].ADDRESS;
	        obj.callerArea=result[0].CALLER_AREA;
	        obj.type=result[0].TYPE;
	        obj.industry=result[0].INDUSTRY;
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
