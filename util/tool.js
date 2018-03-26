var crypto=require('crypto');

var SALT='400repeok';

//do hashing

function hash(str){
  var hashStr=crypto.createHash('sha256').update(str+SALT).digest('hex');
  return hashStr;
}

exports.hash=hash;