const { Duplex, 
        Transform,
        Readable
    } = require('stream');

/**
 * @function streamify - "Streamifies" a function, allowing the ability to use standalone functions in transform streams
 * @param {function} func - The function to "streamify". For async functions use streamifyAsync()
 * @param {object} context - An optional context to invoke the function with. Used if the function is a class method that
 * utilizes some resource member of the class
 * @returns {function} A new function compatible for using in transform streams.
 */
function streamify(func, context, args) {
    if (context){
        return function (chunk, encoding, callback){
            this.push(func.call(context, chunk));
            callback();
        }
    }
    else return function (chunk, encoding, callback) {
        this.push(func(chunk));
        callback();
    }
}

/**
 * @function streamifyAsync - Serves the same purpose as streamify(), but for async functions.
 * @param {function} asyncFunc - Async function to "streamify". For syncronous functions, use streamify().
 * @param {object} context - An optional context to invoke the function with. Used if the function is a class method that
 * utilizes some resource member of the class
 * @returns {function} An async function compatible for use in Async Transform streams.
 */
function streamifyAsync(asyncFunc, context, args) {
    if (context){
        return async function (chunk){
            return asyncFunc.call(context, chunk);
        }
    }
    else return async function (chunk) {
        return asyncFunc(chunk);
    }
}

/**
 * @class
 * Throttles the stream by implementing a delay between writes. 
 */
class Throttle extends Duplex {
    /**
     * @constructor - Creates a new instance of the Throttle stream.
     * @param {number} ms - The length of the delay in milliseconds, defaults to 50
     * @param {object} options - Options to pass to the super constructor (i.e. objectMode)
     */
    constructor(ms=50, options) {
      super(options);
      this.delay = ms;
    }
  
    /**
     * @method
     * @implements - Pushes a chunk of data through, then waits for the duration of the delay
     * before pushing the next chunk
     * @param {*} chunk - The chunk of data to be pushed
     * @param {function} callback - The callback function to be invoked once the delay is finished
     */
    _write(chunk, encoding, callback) { 
        this.push(chunk);
        setTimeout(callback, this.delay);
    }
  
    /**
     * @method
     * @implements - The _read() function is required to be implemented, but does nothing in this context 
     */
    _read() {

    }

    /**
     * @method
     * Signals END when there is no more data coming through the throttle 
     */
    _final(){
        this.push(null);
    }
  }

/**
 * @class
 * Implements a transform stream with an asynchronous _transform() function.
 * This allows the stream to receive data as it comes in and write it when the task is complete
 */
class TransformAsync extends Transform {
    /**
     * @constructor
     * Creates a new instance of a TransformAsync stream with (optionally) the given stream options.
     * @param {object} options - Options to be passed to the super constructor (i.e. objectMode)
     * The task function can also be passed to the constructor via the options argument
     */
    constructor(options){
        if (arguments.length > 1){
            throw new Error('Too many arguments');
        }
        else if (options){
            super(options);
            if (options.task){
                /** 
                 * @member {function} _task - The function that performs the actual 
                 * transformation on the data 
                 */
                this._task = options.task;
            }
            else this._task = undefined;
        }
        else {
            super();
            this._task = undefined;
        }
        /** 
         * @member {[Promise]} pending - An queue holding all pending tasks on data that 
         * has entered the stream 
         */
        this.pending = [];      
    }

    /**
     * @method
     * @implements 
     * Implements the _transform() function as required by the Transform interface. 
     * Creates a promise using the chunk, and adds it to the pending queue, then initiates the callback to allow
     * the next chunk. When the task is done, it pushes the result into the stream. It does not push results which
     * are null or undefined into the stream.
     * @param {*} chunk - The chunk of data to be transformed by the _task() function
     * @param {string} encoding - The encoding to be used. Should be passed to _task() if working with strings
     * @param {function} callback - The callback function to be invoked once the transformation is finished
     */
    async _transform(chunk, encoding, callback){
        try {
            var task = this._task(chunk);
            this.pending.push(task);
            callback();
            var result = await task;
            if (result !== undefined && result !== null) {
                this.push(result);
            }                  
        } catch (error) {
            console.log(error)
        } 
    }

    /**
     * @method
     * Called when there is no more data from the receiving stream. Waits until all of the tasks in the pending
     * queue have completed, before signalling END.
     */
    async _final(callback){
        await Promise.all(this.pending);
        this.push(null);
        callback();
    }
}

/**
 * @class
 * Implements a queue that collects items into an array of given size,
 * then pushes them downstream when the queue is full
 */
class QueueStream extends Transform {
    /**
     * @constructor - Creates a new instance of the QueueStream witht the given size
     * @param {number} size - The number of items to collect into the queue before pushing downstream
     * Defaults to 25
     */
    constructor(size=25){
        super({objectMode: true});
        this.size = size;
        this.queue = [];
        /**
         * @member {number} total - Keeps track of the total number of items that have been through the queue
         */
        this.total = 0;
    }

    /**
     * @method
     * @implements - Adds a single item or array of items to the queue, then pushes the items in the queue if it is full
     * @param {*} chunk - The data to add to the queue
     * @param {*} encoding 
     * @param {function} callback - The callback function to be invoked when finished
     */
    _transform(chunk, encoding, callback){
        //check if the item being passed is an array of non-zero size
        if (typeof chunk === 'object' && chunk.length > 0){
            this.total += chunk.length;
            this.queue = this.queue.concat(chunk);
        }
        else if (typeof chunk === 'object' && chunk.length === 0){
            //empty array - do nothing
        }
        else { //otherwise this is a normal item
            this.total += 1;
            this.queue.push(chunk);
        }

        //check if the queue is full, and if we exceeded the queue size when adding an array, push the appropriate
        //number of items downstream
        if (this.queue.length === this.size){
            this.push(this.queue);
            this.queue = [];
        }
        else while (this.queue.length > this.size){
            this.push(this.queue.slice(0, this.size - 1));
            this.queue = this.queue.slice(this.size);
        }
        
        callback();
    }

    /**
     * @method
     * @implements - Pushes remaining items in the queue before closing the stream
     * @param {function} callback - The callback function to be executed once all remaining items have been flushed
     */
    _flush(callback){
        if (this.queue.length > 0){
            this.push(this.queue);
        }  
        console.log(`Total number of items queued: ${this.total}`);
        callback();
    }
}

/**
 * @class ArrayStream 
 * Creates a readable stream from an array-like input
 */
class ArrayStream extends Readable {
    constructor(array){
        if (!array){
            throw new Error('Must provide an array input source');
        }
        super({objectMode: true});
        this.array = array;
        this.index = 0;
    }

    _read(){
        if(this.index < this.array.length){
            this.push(this.array[this.index]);
            this.index += 1;
        }
        else this.push(null);
    }
}

module.exports = { streamify, streamifyAsync, Throttle, TransformAsync, QueueStream, ArrayStream };