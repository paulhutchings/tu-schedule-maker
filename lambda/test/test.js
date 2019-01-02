// const aws = require('aws-sdk');
// const doc_client = new aws.DynamoDB.DocumentClient();
const fs = require('fs');
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const { Throttle, 
        QueueStream,
        ArrayStream 
    } = require('../loadClassData/modules/streams/streams');
const RequestStream = require('../loadClassData/modules/streams/request');
const ExtractStream = require('../loadClassData/modules/streams/data');
const { DatabasePrepStream, 
        DatabaseWriteStream 
    } = require('../loadClassData/modules/streams/database');
const {Writable} = require('stream');

const REFER = 'https://prd-wlssb.temple.edu/prod8/bwckgens.p_proc_term_date';
const TERM = 201903;
const URL = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_get_crse_unsec';
const SUBJECTS_TABLE = 'subjects-test';
const COURSE_TABLE = 'tusm-test';
const sizeof = require('object-sizeof');
const AWSDynamoDBThrottle = require('./throttle-test');
const process = require('process');

// exports.handler = main;

class Writer extends Writable {
    constructor(){
        super({objectMode: true});
    }

    _write(chunk, encoding, callback){
        console.log(chunk);
        console.log(`Size of request: ${sizeof(chunk) / 1000}KB`);
        callback();
        // fs.appendFile('./lambda/test/classes.json', JSON.stringify(chunk[1]), (err) => {
        //     if (err){
        //         console.log(err);
        //     }
        //     callback();
        // });
    }
}

main();

//The main function of the program
async function main(){
    try {
        //Read the subjects from the database
        console.log('Loading subjects...');
        // var params = {
        //     TableName: SUBJECTS_TABLE
        // };
        // var readDB = doc_client.scan(params).promise();

        //initialize streams
        const Queue = new QueueStream();
        const HttpThrottle = new Throttle();
        const DatabaseThrottle = new AWSDynamoDBThrottle(5);
        const HttpStream = new RequestStream(URL, REFER, TERM);
        const DataStream = new ExtractStream();
        const PrepStream = new DatabasePrepStream();
        const writer = new Writer();
        // const DBWriteStream = new DatabaseWriteStream(COURSE_TABLE, doc_client);
        
        // var data = await readDB;
        // var items = data.Items.map(item => item['subject']);
        var items = JSON.parse(await readFile('./lambda/test/subjects.json'));
        const start = process.hrtime();
        const InputStream = new ArrayStream(items);
        //set up stream chaining
        InputStream
            .pipe(HttpThrottle)
            .pipe(HttpStream)
            .pipe(DataStream)
            .pipe(PrepStream)
            .pipe(Queue)
            // .pipe(DatabaseThrottle)
            .pipe(writer);

        await new Promise(resolve => writer.on('finish', resolve));
        console.log('Complete');
        const end = process.hrtime(start);
        console.log(`Application took ${end[0]}s`);

    } catch (error){
        console.log(`Error: ${error}`);
    }
}