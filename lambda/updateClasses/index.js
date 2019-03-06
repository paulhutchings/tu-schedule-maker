const BannerAPI = require('./modules/bannerAPI');
const {S3Proxy, DynamoDBProxy} = require('./modules/aws-utils');
const {streamify, streamifyAsync, TransformAsync, QueueStream, Throttle} = require('./modules/streams');
const {Transform} = require('stream');
const process = require('process');

const env = process.env;
const db_options = {};
if (env.mode === 'test'){
    db_options.endpoint = `${env.url}:${env.dynamo}`;
    db_options.region = env.region;
}

var profs = s3.promise(s3.read('profs.json'));
var campus = s3.promise(s3.read('campus.json'));

async function main(event, context, callback){
    const banner = new BannerAPI();
    const db = new DynamoDBProxy(db_options);
    const s3 = new S3Proxy(env.bucket);
    const bannerReq = new TransformAsync({objectMode: true, task: streamifyAsync(banner.classSearch, banner)});
    const queue = new QueueStream();
    const throttle = new Throttle(10);
    const prep = new Transform({objectMode: true, transform: streamify(db.wrapSections, db)});
    const dbStream = new TransformAsync({objectMode: true, task: streamifyAsync(db.batchWrite, db)});
    try {
        s3.stream(s3.read('subjects.json'))
            .pipe(throttle)
            .pipe(bannerReq)
            .pipe(prep)
            .pipe(queue)
            .pipe(dbStream);
    } catch (error) {
        callback(error);
    }
}

main();
// exports.handler = main;