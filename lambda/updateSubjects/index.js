const cheerio = require('cheerio');
const aws = require('aws-sdk');
const axios = require('axios');

const doc_client = new aws.DynamoDB.DocumentClient();
const URL = 'https://bulletin.temple.edu/courses/';
const SELECTOR = 'a.sitemaplink';
const TABLENAME = 'subjects-test';


exports.handler = main;

//FUNCTIONS

//The main method of the program
async function main(){ 
    try {
        console.log('Sending GET request...');
        var response = await axios.get(URL);
        var subjects = await parseSubjects(response.data);
        await writeItems(subjects);
        console.log('Complete');
    } catch (error) {
        console.log(`Error: ${error}`);
    }  
}

//Extracts the subject abbreviations from the HTML
async function parseSubjects(data){
    try {
        console.log('Loading response data into HTML...');
        var $ = cheerio.load(data);
        var subjectList = $(SELECTOR);
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
        console.log(`Error: ${error}`); 
    }
}

//Wraps each item in a PUT request, then writes to the DynamoDB table in batches of 25
async function writeItems(items){
    try {
        var requests = [];
        const pairs = items.entries();
        for (let index = 0; index < items.size; index++) {
            let pair = pairs.next().value;
            requests.push({
                PutRequest: {
                    Item: {
                        abbreviation: pair[0],
                        name: pair[1]
                    }
                }
            });   
        }

        for (let index = 0; index < requests.length; index += 25) {
            var subset = requests.slice(index, 
                    (index + 25) > requests.length 
                    ? requests.length 
                    : index + 25);
            var params = {
                RequestItems: {
                    [TABLENAME]: subset
                }
            };

            var response = await doc_client.batchWrite(params).promise();     
            var failedItems = Object.entries(response.UnprocessedItems).length;
            if (failedItems > 0) {
                console.log(`Failed items: ${failedItems}`);
            } else {
                console.log('BatchWrite succeeded');
            }
        }  
    } catch (error) {
        console.log(`Error: ${error}`); 
    }
}