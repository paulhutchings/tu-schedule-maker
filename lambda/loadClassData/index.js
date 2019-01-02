const aws = require('aws-sdk');
const doc_client = new aws.DynamoDB.DocumentClient();
const { Throttle, 
        QueueStream 
    } = require('./modules/streams/streams');
const RequestStream = require('./modules/streams/request');
const ExtractStream = require('./modules/streams/data');
const { DBPrepStream, 
        DatabaseWriteStream 
    } = require('./modules/streams/database');
const {Readable} = require('stream');

/**
 * @function Main - The entry point for the lambda function
 * @param {object} event 
 * @param {object} context - The AWS Lambda context object
 * @param {function} callback - The function to be invoked once completed
 */
async function main(event, context, callback){
    try {
        //Read the subjects from the database
        console.log('Loading subjects...');
        var params = {
            TableName: process.env.SUBJECTS_TABLE
        };
        var readSubjects = doc_client.scan(params).promise();

        //initialize streams
        const InputStream = new Readable();
        const DBQueue = new QueueStream();
        const HttpThrottle = new Throttle(25);
        const DBWriteStream = new DatabaseWriteStream(process.env.COURSE_TABLE, doc_client);
        
        var data = await readSubjects;
        data.Items.forEach(item => InputStream.push(item.abbreviation));
        InputStream.push(null);

        //set up stream chaining
        InputStream
            .pipe(HttpThrottle)
            .pipe(RequestStream)
            .pipe(ExtractStream)
            .pipe(DBPrepStream)
            .pipe(DBQueue)
            .pipe(DBWriteStream);

        await new Promise(resolve => DBWriteStream.on('finish', resolve));
        console.log('Complete');
        callback(null, 'Success');
    } catch (error){
        console.log(`Error: ${error}`);
        callback(error);
    }
}

exports.handler = main;