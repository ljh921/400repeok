var mysql = require('mysql');
var config = require('../config/config');

var pool;

var autoCommit={
  autoCommit:true
};

// init mysql database pool
function initDB(callback){
  pool=mysql.createPool(config.mysql);
  if(callback) callback();
}

// get pool
function getPool(){
  return pool;
}

// pool task for async
function poolTask(callback) {
  // do log
  //pool._logStats();
  pool.getConnection(function (err, conn) {
    callback(err, conn);
  });
}
// final task for async with pool related
function finalTask(err,conn,next){
  if(err){
    // console.log('-----final task error------');
    // console.log(new Date(),err);
    if(err!==true&&next){
      next(err);
    }
  }
  doRelease(conn);
}
// release the connection
function doRelease(conn) {
  if(conn){
    conn.release(function (err) {
      if (err){
        // console.error(err.message);
      }
    });
  }
}

exports.getPool = getPool;
exports.poolTask = poolTask;
exports.finalTask=finalTask;
exports.initDB=initDB;
exports.autoCommit=autoCommit;
exports.doRelease=doRelease;
