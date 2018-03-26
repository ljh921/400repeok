var async = require('async');
var dbUtil=require('../util/db');
var sd=require('silly-datetime');
var formidable=require('formidable');
var fs=require('fs');
var filepath=require('path');

var konwledgeApi={
  folderList: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT ID,P_ID,NAME,CREATE_TIME,UPDATE_TIME,`DESCRIBE` FROM FILE_DIRECTORY';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let pMap={};
          let iMap=[];
          for(let i=0;i<result.length;i++){
            let flag=0;
            let tmp=result[i];
            let id=tmp.ID;
            let pid=tmp.P_ID;
            let name=tmp.NAME;
            let createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            let updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
            let describe=tmp.DESCRIBE;

            let tmpObj=pMap[id];
            if(!tmpObj){
              tmpObj={
                id:id,
                pid:pid,
                name:name,
                createTime:createTime,
                updateTime:updateTime,
                describe:describe,
                data:[]
              }
            }
            pMap[id]=tmpObj;

            let pObj=pMap[pid];
            if(!pObj){
              iMap.push(tmpObj);
              continue;
            }
            for(let j=0;j<pObj.data.length;j++){
              if(pObj.data[j].id==tmpObj.id){
                flag++;
              }
            }
            if(flag==0){
              pObj.data.push(tmpObj);
            }
          }
          res.send({
            code:200,
            rows:iMap
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  addFolder: function (req,res,next){
    let p_id=Number(req.body.p_id);
    let folderName=req.body.folderName;
    let describe=req.body.describe;
    let variables=[];

    if(!folderName){
      res.send({
        code:400,
        msg:'lack folderName'
      });
      return;
    }
    variables.push(folderName);

    let sql='insert into FILE_DIRECTORY(NAME';
    let val=' values(?';
    if(p_id){
      sql+=',P_ID';
      val+=',?';
      variables.push(p_id);
    }
    if(describe){
      sql+=',`DESCRIBE`';
      val+=',?';
      variables.push(describe);
    }
    sql+=')';
    val+=')';
    let isql=sql+val;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      conn.query(isql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'folder insert failed'
            });
            callback(new Error('folder insert failed'),conn);
          }
        }
      });
    },function(conn,callback){
      let sql='SELECT LAST_INSERT_ID() AS LASTID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let newFolderId=result[0].LASTID;
          res.send({
            code:200,
            newFolderId:newFolderId,
            msg:'文件夹添加成功！'
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  deleteFolder: function (req,res,next){
    let directoryId=Number(req.body.directoryId);

    if(!directoryId||isNaN(directoryId)){
      res.send({
        code:400,
        msg:'lack directoryId'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select ID from FILE_DIRECTORY where FIND_IN_SET(ID,getChildList(?))';
      conn.query(sql,[directoryId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let val='(';
          if(result!=''){
            for(let i=0;i<result.length;i++){
              if(i==result.length-1){
                val+=result[i].ID+')';
              }else{
                val+=result[i].ID+',';
              }
            }
            callback(null,conn,val);
          }else{
            res.send({
              code:400,
              total:0,
              rows:[]
            });
            callback(new Error('ID is not exist'),conn);
          }
        }
      });
    },function (conn,val,callback) {
      let sql='delete from FILE_DIRECTORY where ID in'+val;
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows>=1){
            res.send({
              code:200,
              msg:'文件夹删除成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文件夹删除失败！'
            });
            callback(new Error('folder delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  patchFolder: function (req,res,next){
    let directoryId=Number(req.body.directoryId);
    let folderName=req.body.folderName;
    let describe=req.body.describe;

    if(!directoryId||isNaN(directoryId)||!folderName){
      res.send({
        code:400,
        msg:'lack condition'
      });
      return;
    }
    if(!describe){
      describe='未描述';
    }
    let nowTime=new Date();
    nowTime.setHours(nowTime.getHours()+8);
    let nameTime=sd.format(nowTime,'YYYY-MM-DD HH:mm:ss');
    let variables=[folderName,nameTime,describe,directoryId];

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='update FILE_DIRECTORY set NAME=?,UPDATE_TIME=?,`DESCRIBE`=? where ID=?';
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'文件夹修改成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文件夹修改失败！'
            });
            callback(new Error('folder patch failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  fileList: function (req,res,next){  
    let directoryId=Number(req.query.directoryId);

    if(isNaN(directoryId)||!directoryId){
      res.send({
        code:400,
        msg:'lack directoryId or directoryId isNaN'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select ID from FILE_DIRECTORY where FIND_IN_SET(ID,getChildList(?))';
      conn.query(sql,[directoryId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let val='(';
          if(result!=''){
            for(let i=0;i<result.length;i++){
              if(i==result.length-1){
                val+=result[i].ID+')';
              }else{
                val+=result[i].ID+',';
              }
            }
            callback(null,conn,val);
          }else{
            res.send({
              code:400,
              total:0,
              rows:[]
            });
            callback(new Error('ID is not exist'),conn);
          }
        }
      });
    },function (conn,val,callback) {
      let sql='SELECT A.ID,A.FILE_NAME,A.FILE_SIZE,B.USERNAME,A.DOWNLOAD_COUNT,A.CREATE_TIME,A.UPDATE_TIME,A.PERMISSION_RCED FROM FILE_INFO A INNER JOIN USER B ON A.UPLOADER=B.ID WHERE A.DIRECTORY_ID in'+val;
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            let tmp=result[i];
            obj.id=tmp.ID;
            obj.fileName=tmp.FILE_NAME;
            obj.fileSize=tmp.FILE_SIZE;
            obj.uploader=tmp.USERNAME;
            obj.downloadCount=tmp.DOWNLOAD_COUNT;
            obj.createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            obj.updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
            tmp.PERMISSION_RCED=tmp.PERMISSION_RCED.toString(2);
            for(let k=tmp.PERMISSION_RCED.length;k<4;k++){
              tmp.PERMISSION_RCED='0'+tmp.PERMISSION_RCED;
            }
            obj.permission_rced=tmp.PERMISSION_RCED;
            obj.label=[];

            rows.push(obj);
          }
          callback(null,conn,rows);
        }
      });
    },function (conn,rows,callback) {
      let sql='SELECT A.ID,A.FILE_INFO_ID,B.NAME FROM FILE_LABEL A INNER JOIN LABEL_INFO B ON A.FILE_LABEL_ID=B.ID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<rows.length;i++){
            for(let j=0;j<result.length;j++){
              let tmp=result[j];
              let obj={};
              obj.id=tmp.ID;
              obj.fileInfoId=tmp.FILE_INFO_ID;
              obj.name=tmp.NAME;
              if(obj.fileInfoId==rows[i].id){
                rows[i].label.push(obj);
              }
            }
          }
          res.send({
            code:200,
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
  allFileList: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT A.ID,A.FILE_NAME,A.FILE_SIZE,B.USERNAME,A.DOWNLOAD_COUNT,A.CREATE_TIME,A.UPDATE_TIME,A.PERMISSION_RCED FROM FILE_INFO A INNER JOIN USER B ON A.UPLOADER=B.ID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            let tmp=result[i];
            obj.id=tmp.ID;
            obj.fileName=tmp.FILE_NAME;
            obj.fileSize=tmp.FILE_SIZE;
            obj.uploader=tmp.USERNAME;
            obj.downloadCount=tmp.DOWNLOAD_COUNT;
            obj.createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            obj.updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
            tmp.PERMISSION_RCED=tmp.PERMISSION_RCED.toString(2);
            for(let k=tmp.PERMISSION_RCED.length;k<4;k++){
              tmp.PERMISSION_RCED='0'+tmp.PERMISSION_RCED;
            }
            obj.permission_rced=tmp.PERMISSION_RCED;
            obj.label=[];

            rows.push(obj);
          }
          callback(null,conn,rows);
        }
      });
    },function (conn,rows,callback) {
      let sql='SELECT A.ID,A.FILE_INFO_ID,B.NAME FROM FILE_LABEL A INNER JOIN LABEL_INFO B ON A.FILE_LABEL_ID=B.ID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<rows.length;i++){
            for(let j=0;j<result.length;j++){
              let tmp=result[j];
              let obj={};
              obj.id=tmp.ID;
              obj.fileInfoId=tmp.FILE_INFO_ID;
              obj.name=tmp.NAME;
              if(obj.fileInfoId==rows[i].id){
                rows[i].label.push(obj);
              }
            }
          }
          res.send({
            code:200,
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
  deleteFile: function (req,res,next){
    let fileId=Number(req.body.fileId);

    if(!fileId||isNaN(fileId)){
      res.send({
        code:400,
        msg:'lack fileId'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='delete from FILE_INFO where ID=?';
      conn.query(sql,[fileId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'文件删除成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文件删除失败！'
            });
            callback(new Error('file delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  patchFile: function (req,res,next){
    let fileId=Number(req.body.fileId);
    let fileName=req.body.fileName;
    let permission_rced=req.body.permission_rced;
    permission_rced=parseInt(permission_rced,2);
    let label=req.body.label;

    if(!fileId||isNaN(fileId)){
      res.send({
        code:400,
        msg:'lack fileId'
      });
      return;
    }

    if(!fileName||!permission_rced||isNaN(permission_rced)||!label){
      res.send({
        code:400,
        msg:'lack condition'
      });
      return;
    }
    
    let path=filepath.resolve(__dirname,'..')+'/files/';
    let newPath=path+fileName;
    let nowTime=new Date();
    nowTime.setHours(nowTime.getHours()+8);
    let nameTime=sd.format(nowTime,'YYYY-MM-DD HH:mm:ss');

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select FILE_NAME from FILE_INFO where ID=?';
      conn.query(sql,[fileId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            let oldName=result[0].FILE_NAME;
            let oldNameAry=oldName.split('.');
            let oldPath=path+oldName;
            let newFileName=fileName+'.'+oldNameAry[oldNameAry.length-1];
            newPath=newPath+'.'+oldNameAry[oldNameAry.length-1];

            callback(null,conn,oldPath,newFileName,newPath);
          }else{
            res.send({
              code:400,
              msg:'no file with this ID'
            });
            callback(new Error('file patch failed'),conn);
          }
        }
      });
    },function(conn,oldPath,newFileName,newPath,callback){
      let sql='select ID from FILE_INFO where FILE_NAME=?';
      conn.query(sql,[newFileName],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            res.send({
              code:200,
              msg:'文件库已有同名文件，修改失败！'
            });
            callback(new Error('file patch failed'),conn);
          }else{
            fs.rename(oldPath,newPath,function(err){
              if(err){
                res.send({
                  code:400,
                  msg:'文件修改失败！'
                });
                callback(new Error('file patch failed'),conn);
              }else{
                callback(null,conn,newFileName);
              }
            });
          }
        }
      });
    },function(conn,newFileName,callback){
      let variables=[newFileName,nameTime,permission_rced,fileId];
      let sql='update FILE_INFO set FILE_NAME=?,UPDATE_TIME=?,PERMISSION_RCED=? where ID=?';
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文件修改失败！'
            });
            callback(new Error('file patch failed'),conn);
          }
        }
      });
    },function(conn,callback){
      let sql='delete from FILE_LABEL where FILE_INFO_ID=?';
      conn.query(sql,[fileId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          callback(null,conn);
        }
      });
    },function(conn,callback){
      let labelIdAry=[];
      let labelAry=label.split(',');

      for(let i=0;i<labelAry.length;i++){
        let sql='select ID from LABEL_INFO where NAME=?';
        conn.query(sql,[labelAry[i]],function(err, result){
          if (err) { 
            callback(err,conn);
          }else{
            if(result!=''){
              labelIdAry.push(result[0].ID);

              if(i==labelAry.length-1){
                callback(null,conn,labelIdAry);
              }
            }else{
              let sql='insert into LABEL_INFO(NAME) values(?)';
              conn.query(sql,[labelAry[i]],function(err,result){
                if(err){
                  callback(err,conn);
                }else{
                  let sql='SELECT LAST_INSERT_ID() AS LASTID';
                  conn.query(sql,[],function(err,result){
                    if(err){
                      callback(err,conn);
                    }else{
                      if(result!=''){
                        labelIdAry.push(result[0].LASTID);
                      }

                      if(i==labelAry.length-1){
                        callback(null,conn,labelIdAry);
                      }
                    }
                  });
                }
              });
            }
          }
        });
      }
    },function(conn,labelIdAry,callback){
      for(let i=0;i<labelIdAry.length;i++){
        let sql='insert into FILE_LABEL(FILE_LABEL_ID,FILE_INFO_ID) values(?,?)';
        conn.query(sql,[labelIdAry[i],fileId],function(err,result){
          if(err){
            callback(err,conn);
          }else{
            if(i==labelIdAry.length-1){
              res.send({
                code:200,
                msg:'文件修改成功！'
              });
              callback(null,conn);
            }
          }
        });
      }
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  fileSend: function (req,res,next){
    //文件上传，表单方式
    let form=new formidable.IncomingForm();
    form.encoding='utf-8';
    form.uploadDir=filepath.resolve(__dirname,'..')+'/files/';
    form.keepExtensions=true;
    form.maxFieldsSize=1024*1024*1024;

    form.parse(req,function(err,fields,files){
      if(err){
        console.log(err);
        res.send({
          code:400,
          msg:'上传失败！'
        });
      }else{
        if(JSON.stringify(files)=='{}'){
          res.send({
            code:400,
            msg:'请选择需要上传的文件，文件自身参数名必填！'
          });
          return;
        }else{
          let target;
          for(a in files){
            target=a;
          }

          let nowTime=new Date();
          nowTime.setHours(nowTime.getHours()+8);
          let nameAry=files[target].name.split('.');
          let nameTime=sd.format(nowTime,'YYYYMMDDHHmmss');
          let newFileName='';
          for(let i=0;i<nameAry.length-1;i++){
            if(i==nameAry.length-2){
              newFileName+=nameAry[i]+'-'+nameTime+'.';
            }else{
              newFileName+=nameAry[i];
            }
          }
          newFileName+=nameAry[nameAry.length-1];

          let oldpath=files[target].path;
          let newpath=form.uploadDir+newFileName;

          fs.rename(oldpath,newpath,function(err){
            if(err){
              console.log(err);
              res.send({
                code:400,
                msg:'上传失败！'
              });
            }

            let file_uploader=1;
            let file_name=newFileName;
            let file_size=Math.ceil(files[target].size/1024)+'KB';
            let create_time=sd.format(nowTime,'YYYY-MM-DD HH:mm:ss');
            let directory_id=fields.directoryId;
            let permission_rced=fields.permission_rced;
            permission_rced=parseInt(permission_rced,2);
            let label=fields.label;

            if(!directory_id||isNaN(permission_rced)||!label){
              res.send({
                code:400,
                msg:'lack condition or condition is wrong'
              });
            }

            if(!file_uploader||!file_name||!file_size){
              res.send({
                code:400,
                msg:'bad fileabout'
              });
              return;
            }
            if(create_time=='Invalid Date'){
              res.send({
                code:400,
                msg:'bad time'
              });
            }
            let variables=[file_name,file_size,file_uploader,create_time,directory_id,permission_rced];

            async.waterfall([dbUtil.poolTask,function(conn,callback){
              let sql='delete from FILE_INFO where FILE_NAME=? AND DIRECTORY_ID=?';
              conn.query(sql,[file_name,directory_id],function(err, result){
                if (err) { 
                  callback(err,conn);
                }else{
                  callback(null,conn);
                }
              });
            },function (conn,callback) {
              let sql='insert into FILE_INFO(FILE_NAME,FILE_SIZE,UPLOADER,CREATE_TIME,DIRECTORY_ID,PERMISSION_RCED) values(?,?,?,?,?,?)';
              conn.query(sql,variables,function(err, result){
                if (err) { 
                  callback(err,conn);
                }else{
                  callback(null,conn);
                }
              });
            },function(conn,callback){
              let sql='SELECT LAST_INSERT_ID() AS LASTID';
              conn.query(sql,[],function(err, result){
                if (err) { 
                  callback(err,conn);
                }else{
                  let newFileId=result[0].LASTID;
                  callback(null,conn,newFileId);
                }
              });
            },function(conn,newFileId,callback){
              let labelAry=label.split(',');
              let labelId=[];
              let newCount=0;
              for(let i=0;i<labelAry.length;i++){
                let sql='select ID from LABEL_INFO where NAME=?';
                conn.query(sql,[labelAry[i]],function(err, result){
                  if (err) { 
                    callback(err,conn);
                  }else{
                    if(result!=''){
                      labelId.push(result[0].ID);
                      if(i==labelAry.length-1){
                        let sql='SELECT LAST_INSERT_ID() AS LASTID';
                        conn.query(sql,[],function(err, result){
                          if (err) { 
                            callback(err,conn);
                          }else{
                            for(let j=0;j<newCount;j++){
                              labelId.push(result[0].LASTID-j);
                            }
                            callback(null,conn,labelId,newFileId);
                          }
                        });
                      }
                    }else{
                      newCount++;
                      let sql='insert into LABEL_INFO(NAME) values(?)';
                      conn.query(sql,[labelAry[i]],function(err, result){
                        if (err) { 
                          callback(err,conn);
                        }else{
                          if(i==labelAry.length-1){
                            let sql='SELECT LAST_INSERT_ID() AS LASTID';
                            conn.query(sql,[],function(err, result){
                              if (err) { 
                                callback(err,conn);
                              }else{
                                for(let j=0;j<newCount;j++){
                                  labelId.push(result[0].LASTID-j);
                                }
                                callback(null,conn,labelId,newFileId);
                              }
                            });
                          }
                        }
                      });
                    }
                  }
                });
              }
            },function(conn,labelId,newFileId,callback){
              for(let i=0;i<labelId.length;i++){
                let sql='insert into FILE_LABEL(FILE_LABEL_ID,FILE_INFO_ID) values(?,?)';
                conn.query(sql,[labelId[i],newFileId],function(err, result){
                  if (err) { 
                    callback(err,conn);
                  }else{
                    if(i==labelId.length-1){
                      res.send({
                        code:200,
                        msg:'上传成功！',
                        newId:newFileId
                      });
                      callback(null,conn);
                    } 
                  }
                });
              }
            }],function(err,conn){
              dbUtil.finalTask(err,conn,next);
            });
          });
        }
      }
    });
  },
  fileDownload: function (req,res,next){
    //获取文件ID
    let fileId=Number(req.query.fileId);

    if(!fileId||isNaN(fileId)){
      res.send({
        code:400,
        msg:'fileId is Invalid'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      //获取文件名及文件存储地址
      let sql='select FILE_NAME from FILE_INFO where ID=?';

      conn.query(sql,[fileId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          if(result!=''){
            let name=result[0].FILE_NAME;
            let path='./files/'+name;

            callback(null,path,name,conn);
          }else{
            res.send({
              code:400,
              msg:'no file founded with this fileId'
            });
          }
        }
      });
    },function(path,name,conn,callback){
      //文件下载，默认下载量+1
      let sql='update FILE_INFO set DOWNLOAD_COUNT=DOWNLOAD_COUNT+1 where ID=?';

      conn.query(sql,[fileId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          callback(null,path,name,conn);
        }
      });
    },function(path,name,conn,callback){
      //下载命令
      res.download(path,name,function(err){
        if(err){
          if(!res.headersSent){
            callback(err,conn);
          }
        }else{
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  labelList: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='select FILE_LABEL_ID,count(FILE_LABEL_ID) as total from FILE_LABEL group by FILE_LABEL_ID order by total desc limit 5';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            let labelId='(';
            for(let i=0;i<result.length;i++){
              if(i==result.length-1){
                labelId=labelId+result[i].FILE_LABEL_ID+')';
                callback(null,conn,labelId);
              }else{
                labelId=labelId+result[i].FILE_LABEL_ID+',';
              }
            }
          }else{
            res.send({
              code:400,
              msg:'无可用标签'
            });
            callback(new Error('have no label used'),conn);
          }
        }
      });
    },function(conn,labelId,callback){
      let sql='select NAME from LABEL_INFO where ID in'+labelId;
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.name=result[i].NAME;
            rows.push(obj);
          }
          res.send({
            code:200,
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
  fileSearch: function (req,res,next){
    let keyword=req.body.keyword;
    let directoryId=req.body.directoryId;
    let label=req.body.label;
    let fileNameAry='(';
    let whereClause=' where 1=1';

    if(keyword){
      whereClause+=' and (A.FILE_NAME like \'%'+keyword+'%\' or B.USERNAME like \'%'+keyword+'%\')';
    }

    if(directoryId){
      whereClause+=' and A.DIRECTORY_ID in';
    }

    if(label){
      let labelAry=label.split(',');
      for(let i=0;i<labelAry.length;i++){
        if(i==labelAry.length-1){
          fileNameAry=fileNameAry+'\''+labelAry[i]+'\')';
        }else{
          fileNameAry=fileNameAry+'\''+labelAry[i]+'\',';
        }
      }
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      if(directoryId){
        let sql='select ID from FILE_DIRECTORY where FIND_IN_SET(ID,getChildList(?))';
        conn.query(sql,[directoryId],function(err, result){
          if (err) { 
            callback(err,conn);
          }else{
            let val='(';
            if(result!=''){
              for(let i=0;i<result.length;i++){
                if(i==result.length-1){
                  val+=result[i].ID+')';
                }else{
                  val+=result[i].ID+',';
                }
              }
              callback(null,conn,val);
            }else{
              res.send({
                code:400,
                msg:'ID is not exist',
                total:0,
                rows:[]
              });
              callback(new Error('ID is not exist'),conn);
            }
          }
        });
      }else{
        let val='';
        callback(null,conn,val);
      }
    },function (conn,val,callback) {
      if(label){
        let sql='select A.FILE_INFO_ID from FILE_LABEL A inner join LABEL_INFO B on A.FILE_LABEL_ID=B.ID where B.NAME in'+fileNameAry;
        conn.query(sql,[],function(err, result){
          if (err) { 
            callback(err,conn);
          }else{
            if(result!=''){
              let fileIdAry='(';
              for(let i=0;i<result.length;i++){
                if(i==result.length-1){
                  fileIdAry=fileIdAry+result[i].FILE_INFO_ID+')';
                }else{
                  fileIdAry=fileIdAry+result[i].FILE_INFO_ID+',';
                }
              }
              callback(null,conn,fileIdAry,val);
            }else{
              res.send({
                code:400,
                msg:'label is not exist',
                total:0,
                rows:[]
              });
              callback(new Error('label is not exist'),conn);
            }
          }
        });
      }else{
        let fileIdAry='';
        callback(null,conn,fileIdAry,val);
      }
    },function(conn,fileIdAry,val,callback){
      let sql;
      if(fileIdAry==''){
        sql='select A.ID,A.FILE_NAME,A.FILE_SIZE,B.USERNAME,A.DOWNLOAD_COUNT,A.CREATE_TIME,A.UPDATE_TIME,A.PERMISSION_RCED from FILE_INFO A inner join USER B on A.UPLOADER=B.ID'+whereClause+val;
      }else{
        sql='select A.ID,A.FILE_NAME,A.FILE_SIZE,B.USERNAME,A.DOWNLOAD_COUNT,A.CREATE_TIME,A.UPDATE_TIME,A.PERMISSION_RCED from FILE_INFO A inner join USER B on A.UPLOADER=B.ID'+whereClause+val+' and A.ID in'+fileIdAry;
      }
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let tmp=result[i];
            let obj={};
            obj.id=tmp.ID;
            obj.fileName=tmp.FILE_NAME;
            obj.fileSize=tmp.FILE_SIZE;
            obj.username=tmp.USERNAME;
            obj.downloadCount=tmp.DOWNLOAD_COUNT;
            obj.createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            obj.updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
            tmp.PERMISSION_RCED=tmp.PERMISSION_RCED.toString(2);
            for(let k=tmp.PERMISSION_RCED.length;k<4;k++){
              tmp.PERMISSION_RCED='0'+tmp.PERMISSION_RCED;
            }
            obj.permission_rced=tmp.PERMISSION_RCED;
            obj.label=[];

            rows.push(obj);
          }

          callback(null,conn,rows);
        }
      });
    },function (conn,rows,callback) {
      let sql='SELECT A.ID,A.FILE_INFO_ID,B.NAME FROM FILE_LABEL A INNER JOIN LABEL_INFO B ON A.FILE_LABEL_ID=B.ID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<rows.length;i++){
            for(let j=0;j<result.length;j++){
              let tmp=result[j];
              let obj={};
              obj.id=tmp.ID;
              obj.fileInfoId=tmp.FILE_INFO_ID;
              obj.name=tmp.NAME;
              if(obj.fileInfoId==rows[i].id){
                rows[i].label.push(obj);
              }
            }
          }
          res.send({
            code:200,
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
  kfolderList: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='SELECT ID,P_ID,NAME,CREATE_TIME,UPDATE_TIME,`DESCRIBE` FROM KNOWLEDGE_DIRECTORY';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let pMap={};
          let iMap=[];
          for(let i=0;i<result.length;i++){
            let flag=0;
            let tmp=result[i];
            let id=tmp.ID;
            let pid=tmp.P_ID;
            let name=tmp.NAME;
            let createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            let updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
            let describe=tmp.DESCRIBE;

            let tmpObj=pMap[id];
            if(!tmpObj){
              tmpObj={
                id:id,
                pid:pid,
                name:name,
                createTime:createTime,
                updateTime:updateTime,
                describe:describe,
                data:[]
              }
            }
            pMap[id]=tmpObj;

            let pObj=pMap[pid];
            if(!pObj){
              iMap.push(tmpObj);
              continue;
            }
            for(let j=0;j<pObj.data.length;j++){
              if(pObj.data[j].id==tmpObj.id){
                flag++;
              }
            }
            if(flag==0){
              pObj.data.push(tmpObj);
            }
          }
          res.send({
            code:200,
            rows:iMap
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kaddFolder: function (req,res,next){
    let p_id=Number(req.body.p_id);
    let folderName=req.body.folderName;
    let describe=req.body.describe;
    let variables=[];

    if(!folderName){
      res.send({
        code:400,
        msg:'lack folderName'
      });
      return;
    }
    variables.push(folderName);

    let sql='insert into KNOWLEDGE_DIRECTORY(NAME';
    let val=' values(?';
    if(p_id){
      sql+=',P_ID';
      val+=',?';
      variables.push(p_id);
    }
    if(describe){
      sql+=',`DESCRIBE`';
      val+=',?';
      variables.push(describe);
    }
    sql+=')';
    val+=')';
    let isql=sql+val;

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      conn.query(isql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'folder insert failed'
            });
            callback(new Error('folder insert failed'),conn);
          }
        }
      });
    },function(conn,callback){
      let sql='SELECT LAST_INSERT_ID() AS LASTID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let newFolderId=result[0].LASTID;
          res.send({
            code:200,
            newFolderId:newFolderId,
            msg:'文件夹添加成功！'
          });
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kdeleteFolder: function (req,res,next){
    let directoryId=Number(req.body.directoryId);

    if(!directoryId||isNaN(directoryId)){
      res.send({
        code:400,
        msg:'lack directoryId'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='select ID from KNOWLEDGE_DIRECTORY where FIND_IN_SET(ID,getChildList2(?))';
      conn.query(sql,[directoryId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let val='(';
          if(result!=''){
            for(let i=0;i<result.length;i++){
              if(i==result.length-1){
                val+=result[i].ID+')';
              }else{
                val+=result[i].ID+',';
              }
            }
            callback(null,conn,val);
          }else{
            res.send({
              code:400,
              msg:'ID is not exist',
              total:0,
              rows:[]
            });
            callback(new Error('ID is not exist'),conn);
          }
        }
      });
    },function (conn,val,callback) {
      let sql='delete from KNOWLEDGE_DIRECTORY where ID in'+val;
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows>=1){
            res.send({
              code:200,
              msg:'文件夹删除成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文件夹删除失败！'
            });
            callback(new Error('folder delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kpatchFolder: function (req,res,next){
    let directoryId=Number(req.body.directoryId);
    let folderName=req.body.folderName;
    let describe=req.body.describe;

    if(!directoryId||isNaN(directoryId)||!folderName){
      res.send({
        code:400,
        msg:'lack condition'
      });
      return;
    }
    if(!describe){
      describe='未描述';
    }
    let nowTime=new Date();
    nowTime.setHours(nowTime.getHours()+8);
    let nameTime=sd.format(nowTime,'YYYY-MM-DD HH:mm:ss');
    let variables=[folderName,nameTime,describe,directoryId];

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='update KNOWLEDGE_DIRECTORY set NAME=?,UPDATE_TIME=?,`DESCRIBE`=? where ID=?';
      conn.query(sql,variables,function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'文件夹修改成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文件夹修改失败！'
            });
            callback(new Error('folder patch failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kfileList: function (req,res,next){  
    let keyword=req.body.keyword;
    let directoryId=req.body.directoryId;
    let label=req.body.label;
    let fileNameAry='(';
    let whereClause=' where 1=1';

    if(keyword){
      whereClause+=' and (A.DOCUMENT_NAME like \'%'+keyword+'%\' or B.USERNAME like \'%'+keyword+'%\')';
    }

    if(directoryId){
      whereClause+=' and A.DIRECTORY_ID in';
    }

    if(label){
      let labelAry=label.split(',');
      for(let i=0;i<labelAry.length;i++){
        if(i==labelAry.length-1){
          fileNameAry=fileNameAry+'\''+labelAry[i]+'\')';
        }else{
          fileNameAry=fileNameAry+'\''+labelAry[i]+'\',';
        }
      }
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      if(directoryId){
        let sql='select ID from KNOWLEDGE_DIRECTORY where FIND_IN_SET(ID,getChildList2(?))';
        conn.query(sql,[directoryId],function(err, result){
          if (err) { 
            callback(err,conn);
          }else{
            let val='(';
            if(result!=''){
              for(let i=0;i<result.length;i++){
                if(i==result.length-1){
                  val+=result[i].ID+')';
                }else{
                  val+=result[i].ID+',';
                }
              }
              callback(null,conn,val);
            }else{
              res.send({
                code:400,
                msg:'ID is not exist',
                total:0,
                rows:[]
              });
              callback(new Error('ID is not exist'),conn);
            }
          }
        });
      }else{
        let val='';
        callback(null,conn,val);
      }
    },function (conn,val,callback) {
      if(label){
        let sql='select A.KNOWLEDGE_INFO_ID from KNOWLEDGE_LABEL A inner join LABEL2_INFO B on A.KNOWLEDGE_LABEL_ID=B.ID where B.NAME in'+fileNameAry;
        conn.query(sql,[],function(err, result){
          if (err) { 
            callback(err,conn);
          }else{
            if(result!=''){
              let fileIdAry='(';
              for(let i=0;i<result.length;i++){
                if(i==result.length-1){
                  fileIdAry=fileIdAry+result[i].KNOWLEDGE_INFO_ID+')';
                }else{
                  fileIdAry=fileIdAry+result[i].KNOWLEDGE_INFO_ID+',';
                }
              }
              callback(null,conn,fileIdAry,val);
            }else{
              res.send({
                code:400,
                msg:'label is not exist',
                total:0,
                rows:[]
              });
              callback(new Error('label is not exist'),conn);
            }
          }
        });
      }else{
        let fileIdAry='';
        callback(null,conn,fileIdAry,val);
      }
    },function (conn,fileIdAry,val,callback) {
      let sql;
      if(fileIdAry==''){
        sql='SELECT A.ID,A.DOCUMENT_NAME,B.USERNAME,A.CREATE_TIME,A.UPDATE_TIME,A.PERMISSION_RCED,A.TITLE,A.CONTENT,A.`DESCRIBE` FROM KNOWLEDGE_INFO A INNER JOIN USER B ON A.UPLOADER=B.ID'+whereClause+val;
      }else{
        sql='SELECT A.ID,A.DOCUMENT_NAME,B.USERNAME,A.CREATE_TIME,A.UPDATE_TIME,A.PERMISSION_RCED,A.TITLE,A.CONTENT,A.`DESCRIBE` FROM KNOWLEDGE_INFO A INNER JOIN USER B ON A.UPLOADER=B.ID'+whereClause+val+' and A.ID in'+fileIdAry;
      }
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            let tmp=result[i];
            obj.id=tmp.ID;
            obj.uploader=tmp.USERNAME;
            obj.createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
            obj.updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
            tmp.PERMISSION_RCED=tmp.PERMISSION_RCED.toString(2);
            for(let k=tmp.PERMISSION_RCED.length;k<4;k++){
              tmp.PERMISSION_RCED='0'+tmp.PERMISSION_RCED;
            }
            obj.permission_rced=tmp.PERMISSION_RCED;
            obj.title=tmp.TITLE;
            obj.content=tmp.CONTENT;
            obj.describe=tmp.DESCRIBE;
            obj.label=[];
            obj.attachment=[];

            rows.push(obj);
          }
          callback(null,conn,rows);
        }
      });
    },function (conn,rows,callback) {
      let sql='SELECT A.ID,A.KNOWLEDGE_INFO_ID,B.NAME FROM KNOWLEDGE_LABEL A INNER JOIN LABEL2_INFO B ON A.KNOWLEDGE_LABEL_ID=B.ID';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          for(let i=0;i<rows.length;i++){
            for(let j=0;j<result.length;j++){
              let tmp=result[j];
              let obj={};
              obj.id=tmp.ID;
              obj.knowledgeInfoId=tmp.KNOWLEDGE_INFO_ID;
              obj.name=tmp.NAME;
              if(obj.knowledgeInfoId==rows[i].id){
                rows[i].label.push(obj);
              }
            }
          }
          callback(null,conn,rows);
        }
      });
    },function(conn,rows,callback){
      let sql='select C.*,D.USERNAME from(select A.ID,A.KNOWLEDGE_INFO_ID,B.ID AS ATTACHMENT_ID,B.ATTACHMENT_NAME,B.ATTACHMENT_SIZE,B.UPLOADER,B.CREATE_TIME,B.UPDATE_TIME,B.DOWNLOAD_COUNT,B.PERMISSION_RCED from KNOWLEDGE_ATTACHMENT A inner join ATTACHMENT_INFO B on A.ATTACHMENT_INFO_ID=B.ID)C inner join USER D on C.UPLOADER=D.ID';
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          for(let i=0;i<rows.length;i++){
            for(let j=0;j<result.length;j++){
              let tmp=result[j];
              let obj={};
              obj.id=tmp.ID;
              obj.knowledgeInfoId=tmp.KNOWLEDGE_INFO_ID;
              obj.attachmentId=tmp.ATTACHMENT_ID;
              obj.attachmentName=tmp.ATTACHMENT_NAME;
              obj.attachmentSize=tmp.ATTACHMENT_SIZE;
              obj.uploader=tmp.USERNAME;
              obj.createTime=sd.format(tmp.CREATE_TIME,'YYYY-MM-DD HH:mm:ss');
              obj.updateTime=tmp.UPDATE_TIME?sd.format(tmp.UPDATE_TIME,'YYYY-MM-DD HH:mm:ss'):null;
              obj.downloadCount=tmp.DOWNLOAD_COUNT;
              tmp.PERMISSION_RCED=tmp.PERMISSION_RCED.toString(2);
              for(let k=tmp.PERMISSION_RCED.length;k<4;k++){
                tmp.PERMISSION_RCED='0'+tmp.PERMISSION_RCED;
              }
              obj.permission_rced=tmp.PERMISSION_RCED;
              if(obj.knowledgeInfoId==rows[i].id){
                rows[i].attachment.push(obj);
              }
            }
          }
          res.send({
            code:200,
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
  kaddFile: function (req,res,next){
    //文件上传，表单方式
    let form=new formidable.IncomingForm();
    form.encoding='utf-8';
    form.uploadDir=filepath.resolve(__dirname,'..')+'/attachments/';
    form.keepExtensions=true;
    form.maxFieldsSize=1024*1024*1024;

    form.parse(req,function(err,fields,files){
      if(err){
        console.log(err);
        res.send({
          code:400,
          msg:'上传失败！'
        });
        return;
      }else{
        let document_name=fields.title;
        let document_uploader=1;
        let document_directoryId=fields.directoryId;
        let all_permissionRced=fields.all_permission_rced;
        all_permissionRced=parseInt(all_permissionRced,2);
        let document_title=fields.title;
        let document_content=fields.content;
        let document_describe=fields.describe;
        let document_label=fields.label;

        if(!document_directoryId||isNaN(all_permissionRced)||!document_label){
          res.send({
            code:400,
            msg:'lack condition or condition is wrong'
          });
          return;
        }

        if(!document_name||!document_title||!document_content||!document_describe){
          res.send({
            code:400,
            msg:'bad fileabout'
          });
          return;
        }
        let variables=[document_name,document_uploader,document_directoryId,all_permissionRced,document_title,document_content,document_describe];

        async.waterfall([dbUtil.poolTask,function(conn,callback){
          let sql='delete from KNOWLEDGE_INFO where DOCUMENT_NAME=? and DIRECTORY_ID=?';
          conn.query(sql,[document_name,document_directoryId],function(err, result){
            if (err) { 
              callback(err,conn);
            }else{
              callback(null,conn);
            }
          });
        },function (conn,callback) {
          let sql='insert into KNOWLEDGE_INFO(DOCUMENT_NAME,UPLOADER,DIRECTORY_ID,PERMISSION_RCED,TITLE,CONTENT,`DESCRIBE`) values(?,?,?,?,?,?,?)';
          conn.query(sql,variables,function(err, result){
            if (err) { 
              callback(err,conn);
            }else{
              callback(null,conn);
            }
          });
        },function(conn,callback){
          let sql='SELECT LAST_INSERT_ID() AS LASTID';
          conn.query(sql,[],function(err, result){
            if (err) { 
              callback(err,conn);
            }else{
              let newFileId=result[0].LASTID;
              callback(null,conn,newFileId);
            }
          });
        },function(conn,newFileId,callback){
          let labelAry=document_label.split(',');
          let labelId=[];
          let newCount=0;
          for(let i=0;i<labelAry.length;i++){
            let sql='select ID from LABEL2_INFO where NAME=?';
            conn.query(sql,[labelAry[i]],function(err, result){
              if (err) { 
                callback(err,conn);
              }else{
                if(result!=''){
                  labelId.push(result[0].ID);
                  if(i==labelAry.length-1){
                    let sql='SELECT LAST_INSERT_ID() AS LASTID';
                    conn.query(sql,[],function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        for(let j=0;j<newCount;j++){
                          labelId.push(result[0].LASTID-j);
                        }
                        callback(null,conn,labelId,newFileId);
                      }
                    });
                  }
                }else{
                  newCount++;
                  let sql='insert into LABEL2_INFO(NAME) values(?)';
                  conn.query(sql,[labelAry[i]],function(err, result){
                    if (err) { 
                      callback(err,conn);
                    }else{
                      if(i==labelAry.length-1){
                        let sql='SELECT LAST_INSERT_ID() AS LASTID';
                        conn.query(sql,[],function(err, result){
                          if (err) { 
                            callback(err,conn);
                          }else{
                            for(let j=0;j<newCount;j++){
                              labelId.push(result[0].LASTID-j);
                            }
                            callback(null,conn,labelId,newFileId);
                          }
                        });
                      }
                    }
                  });
                }
              }
            });
          }
        },function(conn,labelId,newFileId,callback){
          for(let i=0;i<labelId.length;i++){
            let sql='insert into KNOWLEDGE_LABEL(KNOWLEDGE_LABEL_ID,KNOWLEDGE_INFO_ID) values(?,?)';
            conn.query(sql,[labelId[i],newFileId],function(err, result){
              if (err) { 
                callback(err,conn);
              }else{
                if(i==labelId.length-1){
                  callback(null,conn,newFileId);
                } 
              }
            });
          }
        },function(conn,newFileId,callback){
          if(JSON.stringify(files)=='{}'){
            res.send({
              code:200,
              newFileId:newFileId,
              msg:'文档保存成功！'
            });
            callback(true,conn);
          }else{
            let count1=0;
            let count2=0;
            for(i in files){
              count1++;
            }

            for(key in files){
              let nowTime=new Date();
              nowTime.setHours(nowTime.getHours()+8);
              let nameAry=files[key].name.split('.');
              let nameTime=sd.format(nowTime,'YYYYMMDDHHmmss');
              let newFileName='';
              for(let i=0;i<nameAry.length-1;i++){
                if(i==nameAry.length-2){
                  newFileName+=nameAry[i]+'-'+nameTime+'.';
                }else{
                  newFileName+=nameAry[i];
                }
              }
              newFileName+=nameAry[nameAry.length-1];
              let attachment_size=Math.ceil(files[key].size/1024)+'KB';

              let oldpath=files[key].path;
              let newpath=form.uploadDir+newFileName;

              fs.rename(oldpath,newpath,function(err){
                if(err){
                  console.log(err);
                  res.send({
                    code:400,
                    msg:'附件上传失败！'
                  });
                  return;
                }else{
                  let uploader=1;
                  let attachment_name=newFileName;
                  let create_time=sd.format(nowTime,'YYYY-MM-DD HH:mm:ss');

                  let variables=[attachment_name,attachment_size,uploader,create_time,all_permissionRced];

                  async.waterfall([dbUtil.poolTask,function (conn,callback) {
                    let sql='insert into ATTACHMENT_INFO(ATTACHMENT_NAME,ATTACHMENT_SIZE,UPLOADER,CREATE_TIME,PERMISSION_RCED) values(?,?,?,?,?)';
                    conn.query(sql,variables,function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        callback(null,conn);
                      }
                    });
                  },function(conn,callback){
                    let sql='SELECT LAST_INSERT_ID() AS LASTID';
                    conn.query(sql,[],function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        let newAttachmentId=result[0].LASTID;
                        callback(null,conn,newAttachmentId);
                      }
                    });
                  },function(conn,newAttachmentId,callback){
                    let sql='insert into KNOWLEDGE_ATTACHMENT(ATTACHMENT_INFO_ID,KNOWLEDGE_INFO_ID) values(?,?)';
                    conn.query(sql,[newAttachmentId,newFileId],function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        count2++;
                        if(count2==count1){
                          res.send({
                            code:200,
                            msg:'文档保存成功！'
                          });
                          callback(null,conn);
                        }else{
                          callback(null,conn);
                        }
                      }
                    });
                  }],function(err,conn){
                    dbUtil.finalTask(err,conn,next);
                  });
                }
              });
            }
            callback(null,conn);
          }
        }],function(err,conn){
          dbUtil.finalTask(err,conn,next);
        });
      }
    });
  },
  kfileDownload: function (req,res,next){
    //获取附件文件ID
    let fileId=Number(req.body.fileId);

    if(!fileId||isNaN(fileId)){
      res.send({
        code:400,
        msg:'fileId is Invalid'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      //获取文件名及文件存储地址
      let sql='select ATTACHMENT_NAME from ATTACHMENT_INFO where ID=?';

      conn.query(sql,[fileId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          if(result!=''){
            let name=result[0].ATTACHMENT_NAME;
            let path='./attachments/'+name;

            callback(null,path,name,conn);
          }else{
            res.send({
              code:400,
              msg:'no file founded with this fileId'
            });
          }
        }
      });
    },function(path,name,conn,callback){
      //文件下载，默认下载量+1
      let sql='update ATTACHMENT_INFO set DOWNLOAD_COUNT=DOWNLOAD_COUNT+1 where ID=?';

      conn.query(sql,[fileId],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          callback(null,path,name,conn);
        }
      });
    },function(path,name,conn,callback){
      //下载命令
      res.download(path,name,function(err){
        if(err){
          if(!res.headersSent){
            callback(err,conn);
          }
        }else{
          callback(null,conn);
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kdeleteFile: function (req,res,next){
    let fileId=Number(req.body.fileId);

    if(!fileId||isNaN(fileId)){
      res.send({
        code:400,
        msg:'lack fileId'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='delete from KNOWLEDGE_INFO where ID=?';
      conn.query(sql,[fileId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'文档删除成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'文档删除失败！'
            });
            callback(new Error('document delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kdeleteAttachment: function (req,res,next){
    let fileId=Number(req.body.fileId);

    if(!fileId||isNaN(fileId)){
      res.send({
        code:400,
        msg:'lack fileId'
      });
      return;
    }

    async.waterfall([dbUtil.poolTask,function(conn,callback){
      let sql='delete from ATTACHMENT_INFO where ID=?';
      conn.query(sql,[fileId],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result&&result.affectedRows===1){
            res.send({
              code:200,
              msg:'附件删除成功！'
            });
            callback(null,conn);
          }else{
            res.send({
              code:400,
              msg:'附件删除失败！'
            });
            callback(new Error('attachment file delete failed'),conn);
          }
        }
      });
    }],function(err,conn){
      dbUtil.finalTask(err,conn,next);
    });
  },
  kpatchFile: function (req,res,next){
    //文件上传，表单方式
    let form=new formidable.IncomingForm();
    form.encoding='utf-8';
    form.uploadDir=filepath.resolve(__dirname,'..')+'/attachments/';
    form.keepExtensions=true;
    form.maxFieldsSize=1024*1024*1024;

    form.parse(req,function(err,fields,files){
      if(err){
        console.log(err);
        res.send({
          code:400,
          msg:'上传失败！'
        });
        return;
      }else{
        let document_uploader=1;
        let document_id=fields.fileId;
        let document_name=fields.title;
        let all_permissionRced=fields.all_permission_rced;
        all_permissionRced=parseInt(all_permissionRced,2);
        let document_title=fields.title;
        let document_content=fields.content;
        let document_describe=fields.describe;
        let document_label=fields.label;

        if(isNaN(all_permissionRced)||!document_label){
          res.send({
            code:400,
            msg:'lack condition or condition is wrong'
          });
          return;
        }

        if(!document_name||!document_title||!document_content||!document_describe){
          res.send({
            code:400,
            msg:'bad fileabout'
          });
          return;
        }
        let variables=[document_name,document_uploader,all_permissionRced,document_title,document_content,document_describe,document_id];

        async.waterfall([dbUtil.poolTask,function(conn,callback){
          let sql='update KNOWLEDGE_INFO set DOCUMENT_NAME=?,UPLOADER=?,PERMISSION_RCED=?,TITLE=?,CONTENT=?,`DESCRIBE`=? where ID=?';
          conn.query(sql,variables,function(err, result){
            if (err) { 
              callback(err,conn);
            }else{
              callback(null,conn);
            }
          });
        },function(conn,callback){
          let labelAry=document_label.split(',');
          let labelId=[];
          let newCount=0;
          for(let i=0;i<labelAry.length;i++){
            let sql='select ID from LABEL2_INFO where NAME=?';
            conn.query(sql,[labelAry[i]],function(err, result){
              if (err) { 
                callback(err,conn);
              }else{
                if(result!=''){
                  labelId.push(result[0].ID);
                  if(i==labelAry.length-1){
                    let sql='SELECT LAST_INSERT_ID() AS LASTID';
                    conn.query(sql,[],function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        for(let j=0;j<newCount;j++){
                          labelId.push(result[0].LASTID-j);
                        }
                        callback(null,conn,labelId);
                      }
                    });
                  }
                }else{
                  newCount++;
                  let sql='insert into LABEL2_INFO(NAME) values(?)';
                  conn.query(sql,[labelAry[i]],function(err, result){
                    if (err) { 
                      callback(err,conn);
                    }else{
                      if(i==labelAry.length-1){
                        let sql='SELECT LAST_INSERT_ID() AS LASTID';
                        conn.query(sql,[],function(err, result){
                          if (err) { 
                            callback(err,conn);
                          }else{
                            for(let j=0;j<newCount;j++){
                              labelId.push(result[0].LASTID-j);
                            }
                            callback(null,conn,labelId);
                          }
                        });
                      }
                    }
                  });
                }
              }
            });
          }
        },function(conn,labelId,callback){
          let sql='delete from KNOWLEDGE_LABEL where KNOWLEDGE_INFO_ID=?';
          conn.query(sql,[document_id],function(err,result){
            if(err){
              callback(err,conn);
            }else{
              callback(null,conn,labelId);
            }
          });
        },function(conn,labelId,callback){
          for(let i=0;i<labelId.length;i++){
            let sql='insert into KNOWLEDGE_LABEL(KNOWLEDGE_LABEL_ID,KNOWLEDGE_INFO_ID) values(?,?)';
            conn.query(sql,[labelId[i],document_id],function(err, result){
              if (err) { 
                callback(err,conn);
              }else{
                if(i==labelId.length-1){
                  callback(null,conn);
                } 
              }
            });
          }
        },function(conn,callback){
          if(JSON.stringify(files)=='{}'){
            res.send({
              code:200,
              document_id:document_id,
              msg:'文档修改成功！'
            });
            callback(true,conn);
          }else{
            let count1=0;
            let count2=0;
            for(i in files){
              count1++;
            }

            for(key in files){
              let nowTime=new Date();
              nowTime.setHours(nowTime.getHours()+8);
              let nameAry=files[key].name.split('.');
              let nameTime=sd.format(nowTime,'YYYYMMDDHHmmss');
              let newFileName='';
              for(let i=0;i<nameAry.length-1;i++){
                if(i==nameAry.length-2){
                  newFileName+=nameAry[i]+'-'+nameTime+'.';
                }else{
                  newFileName+=nameAry[i];
                }
              }
              newFileName+=nameAry[nameAry.length-1];
              let attachment_size=Math.ceil(files[key].size/1024)+'KB';

              let oldpath=files[key].path;
              let newpath=form.uploadDir+newFileName;

              fs.rename(oldpath,newpath,function(err){
                if(err){
                  console.log(err);
                  res.send({
                    code:400,
                    msg:'附件上传失败！'
                  });
                  return;
                }else{
                  let uploader=1;
                  let attachment_name=newFileName;
                  let create_time=sd.format(nowTime,'YYYY-MM-DD HH:mm:ss');

                  let variables=[attachment_name,attachment_size,uploader,create_time,all_permissionRced];

                  async.waterfall([dbUtil.poolTask,function (conn,callback) {
                    let sql='insert into ATTACHMENT_INFO(ATTACHMENT_NAME,ATTACHMENT_SIZE,UPLOADER,CREATE_TIME,PERMISSION_RCED) values(?,?,?,?,?)';
                    conn.query(sql,variables,function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        callback(null,conn);
                      }
                    });
                  },function(conn,callback){
                    let sql='SELECT LAST_INSERT_ID() AS LASTID';
                    conn.query(sql,[],function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        let newAttachmentId=result[0].LASTID;
                        callback(null,conn,newAttachmentId);
                      }
                    });
                  },function(conn,newAttachmentId,callback){
                    let sql='insert into KNOWLEDGE_ATTACHMENT(ATTACHMENT_INFO_ID,KNOWLEDGE_INFO_ID) values(?,?)';
                    conn.query(sql,[newAttachmentId,document_id],function(err, result){
                      if (err) { 
                        callback(err,conn);
                      }else{
                        count2++;
                        if(count2==count1){
                          res.send({
                            code:200,
                            msg:'文档修改成功！'
                          });
                          callback(null,conn);
                        }else{
                          callback(null,conn);
                        }
                      }
                    });
                  }],function(err,conn){
                    dbUtil.finalTask(err,conn,next);
                  });
                }
              });
            }
            callback(null,conn);
          }
        }],function(err,conn){
          dbUtil.finalTask(err,conn,next);
        });
      }
    });
  },
  klabelList: function (req,res,next){

    async.waterfall([dbUtil.poolTask,function (conn,callback) {
      let sql='select KNOWLEDGE_LABEL_ID,count(KNOWLEDGE_LABEL_ID) as total from KNOWLEDGE_LABEL group by KNOWLEDGE_LABEL_ID order by total desc limit 5';
      conn.query(sql,[],function(err, result){
        if (err) { 
          callback(err,conn);
        }else{
          if(result!=''){
            let labelId='(';
            for(let i=0;i<result.length;i++){
              if(i==result.length-1){
                labelId=labelId+result[i].KNOWLEDGE_LABEL_ID+')';
                callback(null,conn,labelId);
              }else{
                labelId=labelId+result[i].KNOWLEDGE_LABEL_ID+',';
              }
            }
          }else{
            res.send({
              code:400,
              msg:'无可用标签'
            });
            callback(new Error('have no label used'),conn);
          }
        }
      });
    },function(conn,labelId,callback){
      let sql='select NAME from LABEL2_INFO where ID in'+labelId;
      conn.query(sql,[],function(err,result){
        if(err){
          callback(err,conn);
        }else{
          let rows=[];
          for(let i=0;i<result.length;i++){
            let obj={};
            obj.name=result[i].NAME;
            rows.push(obj);
          }
          res.send({
            code:200,
            total:rows.length,
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

module.exports=konwledgeApi;
