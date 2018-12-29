// import * as ClassTime from "./modules/classtime"
// import * as Section from "./modules/section"
// import * as Course from "./modules/course"

// const FS = require('fs');
const QUERYSTRING = require('querystring');
const PROCESS = require('process');
const HTTPS = require('https');
const  { promisify } = require ('util');
const get = promisify(HTTPS.get);
const request = promisify(HTTPS.request);
const CHEERIO = require('cheerio');
const AWS = require('aws-sdk');

const DB = new AWS.DynamoDB.DocumentClient();
const URL = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_get_crse_unsec';

//Test using JSON files
// FS.readFile('./lambda/test/subjects.json', 'utf8', (err, data) =>{
//     if (err) console.log(err);

//     JSON.parse(data).forEach(item => sendPost(createReqParams(item), item.toString()));
// });

exports.handler = main();

//The main function of the program
async function main(){
    try {
        //Read the subjects from the database
        console.log('Loading subjects...');
        var params = {
            TableName: 'subjects-test'
        };

        var subjects = await DB
            .scan(params)
            .items;
        subjects.forEach(subject => 
            sendPost(
                createReqParams(subject), 
                subject.toString()));
    } catch (error) {
        console.log(error);
    }
}

//Web request functions

//Encapsulates the POST request to the server
async function sendPost(config, subject){ 
    try {
        const options, data = config;
        //Log the start time of the request 
        console.log(`Sending POST request for ${subject}...`);
        const reqStart = PROCESS.hrtime();
        const response = await request(options, data); 

        //Get the class data from the HTML
        extractData(response.data);
        //Log the end time of the request. Since extractData is not awaited this will execute immediately after
        const reqEnd = PROCESS.hrtime(reqStart);
        console.log(`Request for ${subject} took ${reqEnd[0]}s`); 
    } catch (error) {
        console.log(error);
    }  
}

//Creates the request body and headers
function createReqParams(subject){
    const term = 201903;
    const subjects = ['dummy', subject];
    const host = 'prd-wlssb.temple.edu';
    const path = '/prod8/bwckschd.p_get_crse_unsec';

    var postData =  QUERYSTRING.stringify({
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
    
    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
        'Referer': URL
    };

    var options = {
        hostname: host,
        port: 443,
        path: path,
        method: 'POST',
        headers: headers
    };

    return [options, postData];
}

//Content extraction functions

//Extracts the courses and sections from the HTML. The function also logs the time taken to 
//parse the HTML, extract the sections, and write them to the database;
async function extractData(data){ 
    var courses = new Map();
    const selector = 'table.datadisplaytable th.ddtitle a';

    //Log start time of HTML processing
    const procStart = PROCESS.hrtime();
    console.log('Loading HTML...');
    const $ = CHEERIO.load(data);

    var listings = $(selector);  
    console.log('Creating sections...');
    listings.each((i, result) => createSection($, result, courses));
    console.log(`${courses.size} courses extracted`);
    
    console.log('Section creation complete, writing to database...');
    // await writeItems(Array.from(courses.values()));
    FS.writeFile('./lambda/test/classes.json', JSON.stringify(courses.values()), (err) => {if (err) console.log(err)});

    console.log("Database entry complete");
    //Log the end time of the processing
    const procEnd = PROCESS.hrtime(procStart);
    console.log(`Processing took ${procEnd[0]}s ${procEnd[1] / 1000000}ms`);

    // var used = PROCESS.memoryUsage();
    // console.log(`Memory used:\n ${JSON.stringify(used)}`);
    // console.log('Complete'); 
}

//Creates a new section for a course given the entry row and the document root
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

//Creates a new ClassTime object given a data table element and the index of the row of the table to extract the data from
function createClassTime(table, index){
    const selector = `tr:nth-child(${index}) td.dddefault:nth-child`;

    var times = parseTime(table
        .find(`${selector}(2)`)
        .text()
        .trim()
        .split(' - '));       
    var startTime = Number.isNaN(times[0]) 
        ? -1 
        : times[0];
    var endTime = times.length > 1 
        ? times[1] 
        : -1;

    var days = table
        .find(`${selector}(3)`)
        .text()
        .trim();
    days = days === "" 
        ? null 
        : days;
    var location = table
        .find(`${selector}(4)`)
        .text()
        .trim();
    var building = location === "TBA" 
        ? null 
        : location
        .slice(0, location.lastIndexOf(' '));
    var instructor = cleanInstructorString(table
        .find(`${selector}(7)`)
        .text());
    
    return new ClassTime(days, startTime, endTime, instructor, location, building);
}

//Parses the string in the entry row and extracts the CRN, class name, and class title
function parseEntry(text){
    var words = text.split(' - ');
    var name = words.length === 4 
        ? words[2] 
        : words[3];
    var title = words.length === 4 
        ? words[0] 
        : `${words[0]} - ${words[1]}`;
    var crn = words.length === 4 
        ? Number(words[1]) 
        : Number(words[2]);

    return [name, title, crn];
}

//Gets the associated data table for the given entry element
function getTable($, listing){
    return getAdjEntry($, listing).find('table.datadisplaytable tr');
}

//Gets the HTML table adjacent to the entry, which contains the class description, information, etc
function getAdjEntry($, listing){
    return $(listing)
        .parent()
        .parent()
        .next();
}

//Returns whether a section is open based on the available seats #
function isOpen($, listing){
    var td = getAdjEntry($, listing).find('td.dddefault');
    var seats = $(td)
        .contents()
        .filter(function(){ //Lambda doesn't work
            return this.type == 'text' 
                && this.prev != null 
                && this.prev.name == 'b';
        })
        .text()
        .trim();
    return Number(seats) > 0;
}

//Cleans up the Instructor field string
function cleanInstructorString(str){
    return str.replace(/\s+/g, ' ')
        .replace("(P)", '')
        .replace(/\s+,/g, ',')
        .trim();
}

//Takes the array of time strings from the time column, and converts each to a 24 hour format number
function parseTime(timeStrings){
    return timeStrings.map(x => {
        var time = Number(String(x).replace(/[apm:]/g,''));
        if (String(x).includes("pm") && time < 1200) {
            time += 1200;
        }
        return time;
    });
}

//Database functions

//Wraps each item in a PUT request, then writes to the DynamoDB table in batches of 25
async function writeItems(items){
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
        var subset = requests.slice(index, 
            (index + 25) > requests.length 
            ? requests.length 
            : index + 25
        );
        var params = {
            RequestItems: {
                'tusm-test': subset
            }
        };

        console.log(await DB.batchWrite(params));       
    }
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