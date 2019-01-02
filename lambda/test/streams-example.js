const { Transform,
        Writable,
        Readable } = require('stream');

/**
 * Implements a transform stream with an asynchronous _transform() function.
 * This allows the stream to receive data as it comes in and write it when the task is complete
 */
class TransformAsync extends Transform {
    /**
     * @constructor
     * Creates a new instance of a TransformAsync stream with (optionally) the given options.
     * @param {function} task - A function returning a promise that does the actual transforming of the data
     * @param {object} options - Options to be passed to the super constructor (i.e. objectMode)
     */
    constructor(task, options){
        super(options);
        /** @member {array} pending - An queue holding all pending tasks on data that has entered the stream */
        this.pending = [];
        /** @member {function} task - The task function to be used for transforming the data */
        this._task = task;
    }

    /**
     * @implements 
     * Implements the _transform() function as required by the Transform interface. 
     * Creates a promise using the chunk, and adds it to the pending queue, then initiates the callback to allow
     * the next chunk. When the task is done, it pushes the result into the stream. It does not push results which
     * are null or undefined into the stream.
     * @param {*} chunk - The chunk of data to be transformed by the _task() function
     * @param {string} encoding - The encoding to be used. Should be passed to _task() if working with strings
     * @param {function} callback - The callback function to execute once the transformation on the chunk is complete
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
            console.log(`Error: ${error}`);
        } 
    }

    /**
     * @abstract
     * The task function performs the actual data processing/transformation, decoupling it from 
     * the transform function.This function should be overridden by subclasses, or provided via the 
     * constructor. The default simply echoes back the chunk.
     * @param {*} chunk - The chunk of data to be processed
     * @return {*} - The new data that has been processed from the chunk.
     */
    async _task(chunk){
        return chunk;
    }

    /**
     * Called when there is no more data from the receiving stream. Waits until all of the tasks in the pending
     * queue have completed, before signalling END.
     */
    async _final(){
        await Promise.all(this.pending);
        this.push(null);
    }
}

/**
 * @example - Simulate asynchronous tasks with a random delay.
 */
const {promisify} = require('util');
const delay = promisify(setTimeout);

async function task(chunk){
    await delay(Math.random() * 1000);
    return chunk;
}

var delayStream = new TransformAsync(task, {objectMode:true});

var out = new Writable({
    objectMode: true,
    write: (chunk, encoding, callback) => {
        console.log(chunk);
        callback();
    }
});

var input = new Readable({objectMode: true});

input.pipe(delayStream).pipe(out);
var numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
numbers.forEach(x => input.push(x));
input.push(null);

//Should output the numbers in a random order

