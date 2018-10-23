// import * as ClassTime from "./modules/classtime"
// import * as Section from "./modules/section"
// import * as Course from "./modules/course"

const FS = require('fs');
const HTTPS = require('https');
const queryString = require('querystring');
const CHEERIO = require('cheerio');
const PROCESS = require('process');
const AWS = require('aws-sdk');
const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();

//MAIN

exports.handler = () => {
    console.log('Loading subjects...');

    //Read the subjects from the database
    var params = {
        TableName: 'subjects-test'
    };
    DOC_CLIENT.scan(params, (err, data) => {
        if (err) console.log(err);
    
        sendPost(createReqParams(data.Items));
    });
};

//MAIN FUNCTIONS

//Encapsulates the POST request
function sendPost(params){
    var options = params[0];
    var postData = params[1];   
    
    //Start timing how long the response takes
    var resStart = PROCESS.hrtime();
    console.log('Sending POST request...');
    const req = HTTPS.request(options, (res) => {
        //Print status, headers, and set response encoding
        console.log('Response recieved');
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('UTF-8');
    
        //Variable to store response
        var resBody = '';
        res.on('data', (chunk) => {
            // console.log(chunk);
            resBody += chunk;
        });

        res.on('end', () => {
            //Log end time of response
            var resEnd = PROCESS.hrtime(resStart);
            console.log('Request complete');
            console.log(`Response took ${resEnd[0] / 60}m, ${resEnd[0] % 60}s`);

            //Get the class data from the HTML
            extract(resBody);
        });
    });
        
    //Log any errors
    req.on('error', (err) => console.log(`Problem with request: ${err}`));
        
    //Write data to request body
    req.write(postData);
    req.end();
}

//Encapsulates the extraction
function extract(data){
    //Log start time of HTML processing
    var procStart = PROCESS.hrtime();
    var courses = new Map();

    const selector = 'table.datadisplaytable th.ddtitle a';

    console.log('Loading HTML...');
    const $ = CHEERIO.load(data);

    console.log('HTML loaded, querying DOM...');
    var listings = $(selector);  

    console.log('Query complete, creating sections...');
    listings.each((i, result) => createSection($, result, courses));
    console.log(`${courses.size} courses extracted`);
    
    console.log('Section creation complete, writing to database...');
    writeItems(Array.from(courses.values()));

    console.log("File saved");
    //Log the end time of the processing
    var procEnd = PROCESS.hrtime(procStart);
    console.log(`Processing took ${procEnd[0]}s ${procEnd[1] / 1000000}ms`);

    var used = PROCESS.memoryUsage();
    console.log(`Memory used:\n ${JSON.stringify(used)}`);
    console.log('Complete'); 
}

//Writes to DynamoDB
function writeItems(items){
    var requests = items.map(item => {
        return {
            PutRequest: {
                Item: {
                    name: item.name,
                    title: item.title,
                    sections: item.sections
                }
            }
        };
    });

    for (let index = 0; index < requests.length; index += 25) {
        var subset = requests.slice(index, (index + 25) > requests.length ? requests.length : index + 25);
        var params = {
            RequestItems: {
                'tusm-test': subset
            }
        };
        DOC_CLIENT.batchWrite(params, (err, data) => console.log(err ? `Error: ${err}` : `Sucess: ${data}`));        
    }
}

//TESTING

// Use HTML file for testing purposes since HTTP request takes several minutes
function HTMLTest(){
    console.log('Reading file');
    FS.readFile('./test/classes.html', 'UTF-8', function(err, data){
        if (err) console.log(err);

        extract(data); 
        
    });
}

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
function createSection($, listing, courses){
    var rowItems = parseEntry($(listing).text());
    var name = rowItems[0];
    var title = rowItems[1];
    var crn = rowItems[2];

    var table = getTable($, listing);
    var classTimes = [];   
    for (let index = 2; index <= table.length; index++) {
        classTimes.push(createClassTime(table, index));       
    }

    var sec = new Section(crn, classTimes, isOpen($, listing));

    if (!courses.has(name)) {
        courses.set(name, new Course(name, title));           
    }
    courses.get(name).addSection(sec);
}

//Parses the string in the entry row and extracts the CRN, class name, and class title
function parseEntry(text){
    var words = text.split(' - ');
    var name = words.length === 4 ? words[2] : words[3];
    var title = words.length === 4 ? words[0] : `${words[0]} - ${words[1]}`;
    var crn = words.length === 4 ? Number(words[1]) : Number(words[2]);

    return [name, title, crn];
}

//Extracts the # of seats available 

//Returns whether a section is open based on the available seats #
function isOpen($, listing){
    var td = getAdjEntry($, listing).find('td.dddefault');
    var seats = $(td)
        .contents()
        .filter(function(){ //Lambda doesn't work
            return this.type == 'text' && this.prev != null && this.prev.name == 'b';
        })
        .text()
        .trim();
    return Number(seats) > 0;
}

//Gets the adjacent table to entry that contains the class description, information, etc
function getAdjEntry($, listing){
    return $(listing)
        .parent()
        .parent()
        .next();
}

//Gets the associated data table for the given entry element
function getTable($, listing){
    return getAdjEntry($, listing).find('table.datadisplaytable tr');
}

//Creates a new ClassTime object given a data table element and the index of the row of the table to extract the data from
function createClassTime(table, index){
    const selector = `tr:nth-child(${index}) td.dddefault:nth-child`;

    var times = parseTime(table
        .find(`${selector}(2)`)
        .text()
        .trim()
        .split(' - '));       
    var startTime = Number.isNaN(times[0]) ? -1 : times[0];
    var endTime = times.length > 1 ? times[1] : -1;

    var days = table
        .find(`${selector}(3)`)
        .text()
        .trim();
    days = days === "" ? null : days;
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
}

class Section{
    constructor(crn, classtimes, isOpen){
        this.crn = crn;
        this.classtimes = classtimes;
        this.hasLabRec = this.classtimes.length > 1 ? true : false;  
        this.isOpen = isOpen;                
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