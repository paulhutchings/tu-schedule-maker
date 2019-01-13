const {Readable} = require('stream');
const AWS = require('aws-sdk');
const doc_client = new AWS.DynamoDB.DocumentClient();

/**
 * @function main - The main entry point for the lambda function
 * @param {*} event - The event that invoked the lambda function, including event data if applicable
 * @param {*} context - The AWS Lambda context object
 */
async function main(event, context){
    try {
        if (event.httpMethod === 'POST'){
            const data = JSON.parse(event.body);
        }
        else return new Error(`Unsupported method "${event.httpMethod}"`);       
    } catch (error) {
        console.log(error);
        return error;
    }
};

exports.handler = main;