const { Throttle, 
        QueueStream 
    } = require('./modules/streams');
const RequestStream = require('./modules/streams/request');
const ExtractStream = require('./modules/streams/data');
const { DBPrepStream, 
        DatabaseWriteStream 
    } = require('./modules/streams/database');
const {Readable} = require('stream');
const aws = require('aws-sdk');
const doc_client = new aws.DynamoDB.DocumentClient();

/**
 * @function Main - The entry point for the lambda function
 * @param {object} event - The event that invoked the lambda function, containing any event data, if applicable
 * @param {object} context - The AWS Lambda context object
 */
async function main(event, context){
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
        return 'Success';
    } catch (error){
        console.log(`Error: ${error}`);
        return error;
    }
}

exports.handler = main;