const aws = require('aws-sdk');
const doc_client = new aws.DynamoDB.DocumentClient();
const { Throttle, 
        QueueStream,
        ArrayStream 
    } = require('./modules/streams/streams');
const RequestStream = require('./modules/streams/request');
const ExtractStream = require('./modules/streams/data');
const { DatabasePrepStream, 
        DatabaseWriteStream 
    } = require('./modules/streams/database');

const REFER = 'https://prd-wlssb.temple.edu/prod8/bwckgens.p_proc_term_date';
const TERM = 201903;
const URL = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_get_crse_unsec';
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
        var readDB = doc_client.scan(params).promise();

        //initialize streams
        const Queue = new QueueStream();
        const HttpThrottle = new Throttle();
        const DatabaseThrottle = new Throttle();
        const HttpStream = new RequestStream(URL, REFER, TERM);
        const DataStream = new ExtractStream();
        const PrepStream = new DatabasePrepStream();
        const DBWriteStream = new DatabaseWriteStream(COURSE_TABLE, doc_client);
        
        var data = await readDB;
        var items = data.Items.map(item => item['subject']);
        const InputStream = new ArrayStream(items);
        //set up stream chaining
        InputStream
            .pipe(HttpThrottle)
            .pipe(HttpStream)
            .pipe(DataStream)
            .pipe(PrepStream)
            .pipe(Queue)
            .pipe(DatabaseThrottle)
            .pipe(DBWriteStream);

        await new Promise(resolve => DBWriteStream.on('finish', resolve));
        console.log('Complete');

    } catch (error){
        console.log(`Error: ${error}`);
    }
}