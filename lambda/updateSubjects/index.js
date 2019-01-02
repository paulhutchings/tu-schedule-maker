const cheerio = require('cheerio');
const aws = require('aws-sdk');
const axios = require('axios');
const doc_client = new aws.DynamoDB.DocumentClient();

const BATCHWRITE_MAX = 25;

/**
 * @function Main - The entry point for the lambda function
 * @param {object} event - The event that invoked the lambda function, containing any event data, if applicable
 * @param {object} context - The AWS Lambda context object
 */
async function main(event, context){ 
    try {
        console.log('Sending GET request...');
        var response = await axios.get(process.env.URL);
        var subjects = await parseSubjects(response.data);
        console.log(`${subjects.length} subjects found`);
        await writeItems(subjects);
        console.log('Complete');
        return 'Success';
    } catch (error) {
        console.log(error);
        return error;
    }  
}

/**
 * @function parseSubjects - Extracts the subject abbreviations from the HTML
 * @param {string} data - The HTML response
 * @return {Map<string, string>} - The subjects extracted (abbreviation and name)
 */
async function parseSubjects(data){
    try {
        console.log('Loading response data into HTML...');
        var $ = cheerio.load(data);
        var subjectList = $(process.env.SELECTOR);
        var subjects = new Map();

        console.log('Extracting subjects...');
        subjectList.each((i, element) => {
            var entry = $(element).text();
            const split = entry.lastIndexOf('(');
            var abbrv = entry.slice(
                    split + 1, 
                    entry.length - 1);
            var name = entry.slice(0, split);
            subjects.set(abbrv, name);
        });

        return subjects;
    } catch (error) {
        console.log(error); 
    }
}

/**
 * @function writeItems - Wraps each item in a PUT request, then writes to the DynamoDB table in batches of 25
 * @param {Map<string, string>} items - Map of subjects (abbreviation and name) to write to the table
 */
async function writeItems(items){
    try {
        const pairs = Array.from(items.entries());
        var requests = pairs.map(pair => {
            return {
                PutRequest: {
                    Item: {
                        abbreviation: pair[0],
                        name: pair[1]
                    }
                }
            }
        });

        var totalOut = items.length;

        for (let index = 0; index < requests.length; index += BATCHWRITE_MAX) {
            var subset = requests.slice(index, 
                    (index + BATCHWRITE_MAX) > requests.length 
                    ? requests.length 
                    : index + BATCHWRITE_MAX);
            var params = {
                RequestItems: {
                    [process.env.SUBJECTS_TABLE]: subset
                }
            };

            var response = await doc_client.batchWrite(params).promise();     
            var failedItems = Object.entries(response.UnprocessedItems).length;
            if (failedItems > 0) {
                totalOut -= failedItems;
                console.log(`Failed items: ${failedItems}`);
            } else {
                console.log('BatchWrite succeeded');
            }
        } 
        
        console.log(`Total items received: ${items.length}`);
        console.log(`Total items written to database: ${totalOut}`);
        console.log(`Total failed items: ${items.length - totalOut}`);
    } catch (error) {
        console.log(error); 
    }
}

exports.handler = main;