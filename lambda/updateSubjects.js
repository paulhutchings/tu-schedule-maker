const http = require('http');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');
const subjURL = 'http://bulletin.temple.edu/courses/';

exports.handler = () => {
    var subjects = [];

    console.log('Sending GET request...');
    http.get(subjURL, (res) => {
        const { statusCode } = res;
      
        if (statusCode !== 200) {
            console.log(`Request Failed.\nStatus Code: ${statusCode}`);
            res.resume(); //Consume response to save memory
        } 
        console.log('Request successful');
        res.setEncoding('UTF-8');
        let rawData = '';
        console.log('Reading data...');
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
            subjects = parseSubjects(rawData);
            console.log('Writing to file...');          
            putObjectToS3("tu-schedulemaker-test", "subjects.json", JSON.stringify(subjects));
        });
    
    }).on('error', (err) => console.log(err));
}

//UTILITY FUNCTIONS

//Parses the subjects out of the HTML
function parseSubjects(data){
    console.log('Loading response data into HTML...');
    var html = cheerio.load(data);
    var subjectList = html('a.sitemaplink');
    console.log('Extracting subjects...');
    var abbrvs = ['dummy'];
    subjectList.each((i, element) => {
        var text = html(element).text();
        var subj = text.slice(text.lastIndexOf('(') + 1, text.length - 1);
        abbrvs.push(subj);
    });
    return abbrvs;
}

//Writes the JSON file to S3
function putObjectToS3(bucket, key, data){
    var s3 = new AWS.S3();
    var params = {
        Bucket : bucket,
        Key : key,
        Body : data
    };
    
    s3.putObject(params, function(err, data) {
      if (err) console.log(err); // an error occurred
      else console.log('Success');           // successful response
    });
}