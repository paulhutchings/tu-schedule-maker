const AWS = require('aws-sdk');
const DB = new AWS.DynmoDB.DocumentClient();
const { Throttle, 
        QueueStream,
        ArrayStream 
    } = require('./modules/streams/streams');
const { RequestStream } = require('./modules/streams/request');
const { ExtractStream } = require('./modules/streams/data');
const { DatabasePrepStream, 
        DatabaseWriteStream 
    } = require('./modules/streams/database');

const REFER = 'https://prd-wlssb.temple.edu/prod8/bwckgens.p_proc_term_date';
const TERM = 201903;
const HOST = 'prd-wlssb.temple.edu';
const PATH = '/prod8/bwckschd.p_get_crse_unsec';
const SUBJECTS_TABLE = 'subjects-test';
const COURSE_TABLE = 'tusm-test';

exports.handler = main;

//The main function of the program
async function main(){
    try {
        //Read the subjects from the database
        console.log('Loading subjects...');
        var params = {
            TableName: SUBJECTS_TABLE
        };
        var readDB = DB.scan(params).promise();

        //initialize streams
        const Queue = new QueueStream();
        const HttpThrottle = new Throttle();
        const DatabaseThrottle = new Throttle();
        const HttpStream = new RequestStream(HOST, PATH, REFER, TERM);
        const DataStream = new ExtractStream();
        const PrepStream = new DatabasePrepStream();
        const DBWriteStream = new DatabaseWriteStream(COURSE_TABLE);
        
        var data = await readDB;
        const InputStream = new ArrayStream(data.Items);
        //set up stream chaining
        InputStream
            .pipe(HttpThrottle)
            .pipe(HttpStream)
            .pipe(DataStream)
            .pipe(PrepStream)
            .pipe(Queue)
            .pipe(DatabaseThrottle)
            .pipe(DBWriteStream);

        DBWriteStream.on('END', () => console.log('Complete'));

    } catch (error){
        console.log(`Error: ${error}`);
    }
}