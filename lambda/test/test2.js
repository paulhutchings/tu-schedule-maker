const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const {promisify} = require('util');
const writeFile = promisify(fs.writeFile);

const URL = 'https://bulletin.temple.edu/courses/';
const SELECTOR = 'a.sitemaplink';

main();

async function main(){ 
    try {
        console.log('Sending GET request...');
        var response = await axios.get(URL);
        var subjects = await parseSubjects(response.data);
        console.log(`${subjects.length} subjects found`);
        await writeFile('./lambda/test/subjects.json', JSON.stringify(Array.from(subjects.keys())));
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
