const http = require('http');
const cheerio = require('cheerio');
const fs = require('fs');

const subjURL = 'http://bulletin.temple.edu/courses/';
var subjects = [];

console.log('Sending course GET request...');
http.get(subjURL, (res) => {
    const { statusCode } = res;
  
    if (statusCode !== 200) {
        console.log(`Request Failed.\nStatus Code: ${statusCode}`);
        res.resume(); //Consume response to save memory
        return;
    } 
    console.log('Request successful');
    res.setEncoding('UTF-8');
    let rawData = '';
    console.log('Reading data...');
    res.on('data', (chunk) => rawData += chunk);
    res.on('end', () => {
        subjects = parseSubjects(rawData);
        // console.log(subjects);
        console.log('Writing to file...');
        fs.writeFile('subjects.json', JSON.stringify(subjects), 'UTF-8', (err) => {
            if (err){
                console.log(err);
            }

            console.log('File saved');
        });
    });

    console.log('Complete');
}).on('error', (err) => console.error(err));

//UTILITY FUNCTIONS

//Parses the subjects out of the HTML
function parseSubjects(data){
    console.log('Loading response data into HTML...')
    var html = cheerio.load(data);
    var subjectList = html('a.sitemaplink');
    console.log('Extracting subjects...');
    var abbrvs = ['dummy'];
    subjectList.each((i, element) => {
        var text = html(element).text();
        var subj = text.slice(text.lastIndexOf('(') + 1, text.length - 1);
        // console.log(subj);
        abbrvs.push(subj);
    });
    // console.log(abbrvs);
    return abbrvs;
}