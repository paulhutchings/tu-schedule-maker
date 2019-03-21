const Banner = require('./modules/banner');
const {S3Util, DynamoDBUtil} = require('./modules/aws-utils');
const {TransformAsync, QueueStream, Throttle, streamify, streamifyAsync, ArrayStream} = require('./modules/streams');
const {Transform} = require('stream');
const env = process.env;

const dbOptions = {};
if (env.mode === 'test'){
    dbOptions.endpoint = `${env.url}:${env.dynamo}`;
    dbOptions.region = env.region;
}

//initialize aws objects
const dynamo = new DynamoDBUtil(env.table, dbOptions);
const s3 = new S3Util(env.bucket);

const files = env.json.split(' ');
var [campus, profs, subjects] = [s3.read(files[0]), s3.read(files[2]), s3.read(files[3])];

const banner = new Banner({'term':env.term, 'campus': campus, 'profs': profs});

//initialize streams
const queue = new QueueStream();
const throttle = new Throttle(env.delay);
const prep = new Transform({objectMode: true, transform: streamify(dynamo.wrapSections, dynamo)});
const write = new TransformAsync({objectMode: true, task: streamifyAsync(dynamo.batchWrite, dynamo)});
const request = new TransformAsync({objectMode: true, task: streamifyAsync(banner.classSearch, banner)});

const pr = require('process');
async function main(event, context, callback){
    const start = pr.hrtime();
    try {
        const input = new ArrayStream(JSON.parse(await subjects).map(s => s.id));
        input.pipe(throttle)
            .pipe(request)
            .pipe(prep)
            .pipe(queue)
            .pipe(write);
    } catch (error) {
        console.log(error);
        callback(error);
    }
    // await new Promise(resolve => write.on('finish', resolve));
    write.on('end', () => {
        console.log(dynamo.stats());
        const end = pr.hrtime(start);
        console.log(end);
    });  
    callback('success');
}


exports.handler = main;