// import * as ClassTime from "./modules/classtime"
// import * as Section from "./modules/section"
// import * as Course from "./modules/course"

const fs = require('fs');
const https = require('https');
const queryString = require('querystring');
const cheerio = require('cheerio');
const process = require('process');

//MAIN

console.log('Loading subjects...');

//Read the subjects from the file created by updateSubjects
fs.readFile('subjects.json', 'UTF-8', (err, data) => {
    if (err) console.log(err);

    //Take the subjects loaded from the file and create the request headers, body, and options
    //Send the POST request to the server to get the class data
    sendPost(createReqParams(JSON.parse(data)));
});

//MAIN FUNCTIONS

//Encapsulates the POST request
function sendPost(params){
    var options = params[0];
    var postData = params[1];   
    
    //Start timing how long the response takes
    var resStart = process.hrtime();
    console.log('Sending POST request...');
    const req = https.request(options, (res) => {
        //Print status, headers, and set response encoding
        console.log('Response recieved');
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('UTF-8');
    
        //Variable to store response
        var resData = '';
        res.on('data', (chunk) => {
            // console.log(chunk);
            resData += chunk;
        });
        res.on('end', () => {
            //Log end time of response
            var resEnd = process.hrtime(resStart);
            console.log('Request complete');
            console.log(`Response took ${resEnd[0] / 60}m, ${resEnd[0] % 60}s`);

            //Get the class data from the HTML
            extract(resData);
        });
    });
        
    //Log any errors
    req.on('error', (err) => {
        console.error(`Problem with request: ${err}`);
    });
        
    //Write data to request body
    req.write(postData);
    req.end();
}

//Encapsulates the main processing functions
function extract(data){
    //Log start time of HTML processing
    var procStart = process.hrtime();
    var courses = new Map();

    const selector = 'table.datadisplaytable th.ddtitle a';

    console.log('Loading HTML...');
    const html = cheerio.load(data);

    console.log('HTML loaded, querying DOM...');
    var listings = html(selector);  

    console.log('Query complete, creating sections...');
    listings.each((i, element) => createSection(html, element, courses));
    console.log(courses.size);
    console.log('Section creation complete, writing to file...');

    // fs.writeFile('./test/classes.json', `${JSON.stringify(Array.from(courses.values()))}`, 'UTF-8', (err) => {
    //     if (err) console.log(err);
    // });

    // console.log("File saved");
    //Log the end time of the processing
    var procEnd = process.hrtime(procStart);
    console.log(`Processing took ${procEnd[0]}s ${procEnd[1] / 1000000}ms`);

    console.log('Sending put to AWS...');
    const opt = {
        hostname: "62xcf1gi98.execute-api.us-east-2.amazonaws.com",
        path: "/test/TUScheduleMakerTest",
        method: 'PUT'
    }
    
    courses.forEach(x => {
        const dbreq = https.request(opt, (res) => {
            //Print status, headers, and set response encoding
            console.log('Response recieved');
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            res.setEncoding('UTF-8');
    
            //Log any errors
            dbreq.on('error', (err) => {
                console.error(`Problem with request: ${err}`);
            });
            
            var body = JSON.stringify(x);
            body += JSON.stringify("TableName: tusm-test");
    
            //Write data to request body
            dbreq.write(body);
            dbreq.end();
        });
    });
    
}

//TESTING

//Use HTML file for testing purposes since HTTP request takes several minutes
// console.log('Reading file');
// fs.readFile('./test/classes.html', 'UTF-8', function(err, data){
//     if (err) console.log(err);

//     extract(data);    
// });

//UTILITY FUNCTIONS

//Creates the headers, request body, and options
function createReqParams(subjects){
    const URL = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_get_crse_unsec';
    const host = 'prd-wlssb.temple.edu';
    const path = '/prod8/bwckschd.p_get_crse_unsec';
    const term = 201903;

    const body = queryString.stringify({
        term_in: term,
        sel_subj: subjects,
        sel_day: 'dummy',
        sel_schd: 'dummy',
        sel_insm: ['dummy', '%'],
        sel_camp: ['dummy', '%'],
        sel_levl: 'dummy',
        sel_sess: ['dummy', '%'],
        sel_instr: ['dummy', '%'],   
        sel_ptrm: ['dummy', '%'],
        sel_attr: ['dummy', '%'],
        sel_divs: ['dummy', '%'],
        sel_crse: '',
        sel_title: '',
        sel_from_cred: '',
        sel_to_cred: '',
        begin_hh: 0,
        begin_mi: 0,
        begin_ap: 'a',
        end_hh: 0,
        end_mi: 0,
        end_ap: 'a'  
    });
    
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': URL
    }
    
    const options = {
        hostname: host,
        path: path,
        method: 'POST',
        headers: headers
    }

    return [options, body];
}

//Creates a new section for a course given the entry row and the document
function createSection(html, element, courses){
    var rowItems = parseEntry(html(element).text());
    var name = rowItems[0];
    var title = rowItems[1];
    var crn = rowItems[2];

    var table = getTable(html, element);
    var classTimes = [];   
    for (let index = 2; index <= table.length; index++) {
        classTimes.push(createClassTime(table, index));       
    }

    var sec = new Section(crn, classTimes);

    if (!courses.has(name)) {
        courses.set(name, new Course(name, title));           
    }
    courses.get(name).addSection(sec);
}

//Parses the string in the entry row and extracts the CRN, class name, and class title
function parseEntry(text){
    words = text.split(' - ');
    var name = words.length === 4 ? words[2] : words[3];
    var title = words.length === 4 ? words[0] : `${words[0]} - ${words[1]}`;
    var crn = words.length === 4 ? Number(words[1]) : Number(words[2]);

    return [name, title, crn];
}

//Gets the associated data table for the given entry element
function getTable(html, element){
    return html(element
        .parent
        .parent
        .next
        .next)
        .find('table.datadisplaytable tr');
}

//Creates a new ClassTime object given a data table element and the index of the row of the table to extract the data from
function createClassTime(table, index){
    const selector = `tr:nth-child(${index}) td.dddefault:nth-child`;

    var times = parseTime(table
        .find(`${selector}(2)`)
        .text()
        .trim()
        .split(' - '));       
    var startTime = times[0];
    var endTime = times[1]; 

    var days = table
        .find(`${selector}(3)`)
        .text()
        .trim();
    var location = table
        .find(`${selector}(4)`)
        .text()
        .trim();
    var building = location === "TBA" ? null : location
        .slice(0, location
            .lastIndexOf(' '));
    var instructor = cleanInsString(table
        .find(`${selector}(7)`)
        .text());
    
    return new ClassTime(days, startTime, endTime, instructor, location, building);
}

//Cleans up the Instructor field string
function cleanInsString(str){
    return str.replace(/\s+/g, ' ')
        .replace("(P)", '')
        .replace(/\s+,/g, ',')
        .trim();
}

//Takes the array of time strings from the tie column, and converts each to a 24 hour format number
function parseTime(timeStrings){
    return timeStrings.map(x => {
        var time = Number(String(x).replace(/[apm:]/g,''));
        if (String(x).includes("pm")) {
            if (time < 1200) {
                time += 1200;
            }
        }
        return time;
    });
}

//CLASSES

class ClassTime{
    constructor(days, startTime, endTime, instructor, location, building){
        this.days = days;
        this.startTime = startTime;
        this.endTime = endTime;
        this.instructor = instructor;
        this.location = location;
        this.building = building;
    }

    //Takes 2 ClassTime objects and returns whether they have any days in common
    static onSameDay(class1, class2){
        var combined = class1.days + class2.days; //Add all of the characters together
        return (/([a-zA-Z]).*?\1/).test(combined); //Regex will match any duplicates, therefore the 2 classes share days
    }

    //Takes 2 ClassTime objects and returns whether they have a time conflict
    static hasTimeConflict(class1, class2){
        if (!ClassTime.onSameDay(class1, class2)){ //If both classes are not on the same day, we don't need to check the times
            return false;
        }

        //See if the start or end time for class1 falls in between class2's start and end times
        var startConflict = class1.startTime >= class2.startTime && class1.startTime <= class2.endTime;
        var endConflict = class1.endTime >= class2.startTime && class1.endTime <= class2.endTime;

        return startConflict || endConflict;
    }
}

class Section{
    constructor(crn, classtimes){
        this.crn = crn;
        this.classtimes = classtimes;
        this.hasLabRec = this.classtimes.length > 1 ? true : false;                  
    }

    //Takes in 2 Section objects and returns whether or not they have any days in common
    static onSameDay(section1, section2){
        //Go through each ClassTime object, and see if they share any days
        section1.classtimes.forEach(x =>{
            section2.classtimes.forEach(y =>{
                if (ClassTime.onSameDay(x, y)){
                    return true;
                }
            })
        });

        return false;
    }

    //Takes in 2 Section objects and returns whether or not they have a time conflict
    static hasTimeConflict(section1, section2){
        //First test if any days are shared. If not, than no need to test the times
        if(!Section.onSameDay(section1, section2)){
            return false;
        }

        //Go through each ClassTime object. If any of them have a time conflict, than the section as a whole has a time conflict
        section1.classtimes.forEach(x =>{
            section2.classtimes.forEach(y =>{
                if (ClassTime.hasTimeConflict(x, y)){
                    return true;
                }
            })
        });

        return false;
    }
}

class Course{
    constructor(name, title){
        this.name = name; //ex: CIS 1068
        this.title=title; //ex: "Program Design and Abstraction"
        this.sections = [];
    }

    addSection(section) {
        this.sections.push(section);
    }
}