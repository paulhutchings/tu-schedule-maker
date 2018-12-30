const HTTPS = require('https');
const CHEERIO = require('cheerio');
const AWS = require('aws-sdk');

const DB = new AWS.DynamoDB.DocumentClient();
const URL = 'https://bulletin.temple.edu/courses/';
const SELECTOR = 'a.sitemaplink';


exports.handler = main;

//FUNCTIONS

//The main function of the program
function main(){ 
    console.log('Sending GET request...');
    HTTPS.get(URL, (res) => {
        console.log(res.statusCode);
        var body;
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            var subjects = parseSubjects(body);
            writeItems(subjects);       
        });
    }).on('error', (err) => console.log(err.message));
}

//Extracts the subject abbreviations from the HTML
function parseSubjects(data){
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
function writeItems(items){
    console.log('Writing to database...');
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
        
        DB.batchWrite(params, (err, data) => {
            if (err){
                console.log(err);
            } else {
                console.log(`Failed items: ${Object.entries(data.UnprocessedItems).length}`);
            }
        });        
    }  
}