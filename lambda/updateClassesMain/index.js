//main Lambda that delegates each subject to a worker lambda
const {S3Util} = require('./modules/aws-utils');
const AWS = require('aws-sdk');
const Lambda = new AWS.Lambda();
const env = process.env;

//initialize s3 and read subjects.JSON
const s3 = new S3Util(env.bucket);
const subjectsPromise = s3.read(env.subjectsJSON);
let subjects = null; //declare here so that it persists between invocations

exports.handler = async(event) => {   
    try {
        subjects = await subjectsPromise;
        let pending = subjects.map(subject => delegate(subject)); //will hold pending lambda invocations
        await Promise.all(pending);
        return 'Success';
    } catch (error) {
        return error;
    }
};

//invokes the worker lambda to process process the given subject
async function delegate(subject){
    const params = {
        'FunctionName': env.lambda,
        'InvocationType': 'Event',
        'Payload': JSON.stringify({
            'subject': subject.id
        })
    };
    try {
        //invoke worker lambda
        return await Lambda.invoke(params).promise();
    } catch (error) {
        return error;
    }
}