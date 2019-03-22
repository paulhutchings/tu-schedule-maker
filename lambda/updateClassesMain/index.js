/**
 * @description - Main Lambda that delegates each subject to a worker lambda
 */
const {S3Util} = require('./modules/aws-utils');
const AWS = require('aws-sdk');
const env = process.env;

//Create Lambda object if it doesn't exist from a previous invocation
if (!lambda){
    var lambda = new AWS.Lambda();
}

//Declare subjects array if it doesn't exist from a previous invocation
if (!subjects){
    var subjects = null; //Initialized in handler
}

/**
 * @exports
 */
exports.handler = async(event) => {   
    try {
        //Load list of subjects
        if (!subjects){
            subjects = await load_subjects();
        }
        let pending = subjects.map(subject => delegate(subject.id)); //will hold pending lambda invocations
        await Promise.all(pending);
        return 'Success';
    } catch (error) {
        return error;
    }
};

/**
 * @async
 * @function delegate - Invokes the worker lambda to process process the given subject
 * @param {string} subject 
 */
async function delegate(subject){
    const params = {
        'FunctionName': env.lambda,
        'InvocationType': 'Event',
        'Payload': JSON.stringify({
            'subject': subject
        })
    };
    try {
        //invoke worker lambda
        return await lambda.invoke(params).promise();
    } catch (error) {
        return error;
    }
}

/**
 * @async
 * @function load_subjects - Reads the subjects.json file from s3
 * @returns {[object]}
 */
async function load_subjects(){
    //initialize s3 and read subjects.JSON
    const s3 = new S3Util(env.bucket);
    return JSON.parse(await s3.read(env.subjectsJSON));
}