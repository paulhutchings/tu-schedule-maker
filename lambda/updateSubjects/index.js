const HTTPS = require('https');
const CHEERIO = require('cheerio');
const AWS = require('aws-sdk');

const DB = new AWS.DynamoDB.DocumentClient();
const URL = 'https://bulletin.temple.edu/courses/';
const SELECTOR = 'a.sitemaplink';


exports.handler = main;

//FUNCTIONS

//The main method of the program
async function main(){ 
    console.log('Sending GET request...');
    HTTPS.get(URL, (res) => {
        console.log(res.statusCode);
        var body;
        res.on('data', (chunk) => body += chunk);
        res.on('end', async () => {
            var subjects = await parseSubjects(body);
            await writeItems(subjects);
            console.log('Complete');        
        });
    }).on('error', (err) => console.log(err.message));
}

//Extracts the subject abbreviations from the HTML
async function parseSubjects(data){
    console.log('Loading response data into HTML...');
    var $ = CHEERIO.load(data);
    var subjectList = $(SELECTOR);
    var subjects = [];

    console.log('Extracting subjects...');
    subjectList.each((i, element) => {
        var entry = $(element).text();
        var subject = entry.slice(
                entry.lastIndexOf('(') + 1, 
                entry.length - 1);
        subjects.push(subject);
    });

    return subjects;
}

//Wraps each item in a PUT request, then writes to the DynamoDB table in batches of 25
async function writeItems(items){
    var requests = items.map(item => {
        return {
            PutRequest: {
                Item: {
                    subject: item
                }
            }
        };  
    });

    for (let index = 0; index < requests.length; index += 25) {
        var subset = requests.slice(index, 
                (index + 25) > requests.length 
                ? requests.length 
                : index + 25);
        var params = {
            RequestItems: {
                'subjects-test': subset
            }
        };

        console.log(await DB.batchWrite(params));      
    }  
}