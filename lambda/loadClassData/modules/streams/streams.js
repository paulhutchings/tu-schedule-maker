const { Duplex, 
        Transform,
        Readable 
    } = require('stream');

//1KB = 1 Capacity unit
const UNIT_SIZE = 1000;

//Throttles the stream to avoid throttled read/write requests on the DynamoDB table
//I intend to make this function based on the capacity units of the table in the future
class Throttle extends Duplex {

    constructor(ms=50) {
      super({objectMode: true});
      this.delay = ms;
    }
  
    _write(chunk, encoding, callback) { 
        this.push(chunk);
        setTimeout(callback, this.delay);
    }
  
    _read() {

    }

    _final(){
        this.push(null);
    }
  }

//Processes the data chunks asynchronously. Allows more data to be piped to transform() 
//before the current chunk has been processed
class AsyncTransform extends Transform {
    constructor(){
        super({objectMode: true});
        this.pending = [];
        this.flushcb = undefined;
    }

    async _transform(chunk, encoding, callback){
        try {
            var task = this._task(chunk);
            this.pending.push(task);
            callback();
            var result = await task;
            if (result !== undefined) {
                this.push(result);
            }                  
        } catch (error) {
            console.log(`Error: ${error}`)
        } 
    }

    //blank task function to be overridden by implementing streams
    async _task(chunk){
        return chunk;
    }

    async _final(){
        await Promise.all(this.pending);
        this.push(null);
    }
}

//collects items into a queue of the given size
class QueueStream extends Transform {
    constructor(size=25){
        super({objectMode: true});
        this.size = size;
        this.queue = [];
        this.total = 0;
    }

    _transform(chunk, encoding, callback){
        this.total += 1;
        this.queue.push(chunk);
        if (this.queue.length === this.size){
            this.push(this.queue);
            this.queue = [];
        }

        callback();
    }

    _flush(callback){
        //push the remaining items before signalling END
        this.push(this.queue);
        console.log(`Total number of courses queued: ${this.total}`);
        callback();
    }
}

class ArrayStream extends Readable {
    constructor(array) {
        super({ objectMode: true });
        this.array = array;
        this.index = 0;
    }

    _read() {
        if (this.index < this.array.length) {
            this.push(this.array[this.index]);
            this.index += 1;
        } else {
            this.push(null);
        }
    }
}

module.exports = { Throttle, AsyncTransform, QueueStream, ArrayStream };