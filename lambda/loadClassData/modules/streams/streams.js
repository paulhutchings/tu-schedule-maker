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
  
    async _write(chunk, callback) { 
        this.push(chunk);
        setTimeout(() => callback(), this.delay);
    }
  
    _read() {

    }
  
    _final() {
       this.push(null);
    }
  }

//Processes the data chunks asynchronously. Allows more data to be piped to transform() 
//before the current chunk has been processed
class AsyncTransform extends Transform{
    constructor(){
        super({objectMode: true});
        this.pending = 0;
        this.flushcb = undefined;
    }

    async _transform(chunk, encoding, callback){
        try {
            this.pending += 1;
            var task = this._task(chunk);          
            callback();
            var result = await task;
            if (result !== undefined){
                this.push(result);
            }
            this.pending -= 1;
            if (this.pending === 0) {
                this.flushcb();
            }
        } catch (error) {
            console.log(`Error: ${error.message}`)
        } 
    }

    //blank task function to be overridden by implementing streams
    async _task(chunk){
        return chunk;
    }

    _flush(callback){
        this.flushcb = callback;
    }
}

//collects items into a queue of the given size
class QueueStream extends Transform {
    constructor(size=25){
        super({objectMode: true});
        this.size = size;
        this.queue = [];
    }

    _transform(chunk, encoding, callback){
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
        if (this.index <= this.array.length) {
            const chunk = {
                data: this.array[this.index],
                index: this.index
            };
            this.push(chunk);
            this.index += 1;
        } else {
            this.push(null);
        }
    }
}

module.exports = { Throttle, AsyncTransform, QueueStream, ArrayStream };