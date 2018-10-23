const HTTP = require('http');
const CHEERIO = require('cheerio');
const AWS = require('aws-sdk');
const SUBJECTS_URL = 'http://bulletin.temple.edu/courses/';
const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();

exports.handler = () => {
    var subjects = [];

    console.log('Sending GET request...');
    HTTP.get(SUBJECTS_URL, (res) => {
        const { statusCode } = res;
      
        if (statusCode !== 200) {
            console.log('Request Failed.', 'Status Code: ${statusCode}');
            res.resume(); //Consume response to save memory
        } 

        console.log('Request successful');
        res.setEncoding('UTF-8');
        let resBody = '';

        console.log('Reading data...');
        res.on('data', (chunk) => resBody += chunk);

        res.on('end', () => {
            subjects = parseSubjects(resBody);
            console.log('Writing to database...');
            writeItems(subjects);
        });   
    }).on('error', (err) => console.log(err));
};

//UTILITY FUNCTIONS

//Parses the subjects out of the HTML
function parseSubjects(data){
    console.log('Loading response data into HTML...');
    var $ = CHEERIO.load(data);
    var subjectList = $('a.sitemaplink');

    console.log('Extracting subjects...');
    var abbrvs = ['dummy'];
    subjectList.each((i, element) => {
        var entry = $(element).text();
        var subj = entry.slice(entry.lastIndexOf('(') + 1, entry.length - 1);
        abbrvs.push(subj);
    });
    return abbrvs;
}

//Puts items to DynamoDB
function writeItems(items){
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
        var subset = requests.slice(index, (index + 25) > requests.length ? requests.length : index + 25);
        var params = {
            RequestItems: {
                'subjects-test': subset
            }
        };
        DOC_CLIENT.batchWrite(params, (err, data) => console.log(err ? `Error: ${err}` : `Sucess: ${data}`));        
    }  
}