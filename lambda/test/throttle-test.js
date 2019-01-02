const sizeof = require('object-sizeof');
const process = require('process');
const {Duplex} = require('stream');
const UNIT_SIZE = 1000; //1KB = 1 capacity unit

class AWSDynamoDBThrottle extends Duplex {

    constructor(cap) {
        super({objectMode: true});
        this.limit = cap * UNIT_SIZE;
        this.lastReqTime = 0;
        this.prevSize = 0;
    }
  
    _write(chunk, encoding, callback) { 
        var chunkSize = sizeof(chunk);
        //get the amount of time between this request and the previous request
        var diff = this.lastReqTime === 0 ? process.hrtime() : process.hrtime(this.lastReqTime);
        /*if it has been less than a second since the last request AND the total amount of data 
        being sent between this request and the last one is greater than the limit, hold for the
        difference between the request times and 1 second */
        if (diff[0] < 1 && this.prevSize + chunkSize >= this.limit){
            setTimeout(() => {
                this.push(chunk);
                this.prevSize = chunkSize;
                callback();
            }, 1000 - diff[0] * 1000);
        }
        //otherwise we're within the limit and can push the next chunk along
        else {
            this.push(chunk);
            this.prevSize = chunkSize;
            callback();
        }
    }
  
    _read() {

    }

    _final(){
        this.push(null);
    }
  }

  module.exports = AWSDynamoDBThrottle;