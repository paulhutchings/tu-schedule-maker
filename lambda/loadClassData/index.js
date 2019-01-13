
const { Throttle, 
        QueueStream 
    } = require('./modules/streams');
const RequestStream = require('./modules/streams/request');
const ExtractStream = require('./modules/streams/data');
const { DBPrepStream, 
        DatabaseWriteStream 
    } = require('./modules/streams/database');
const {Readable} = require('stream');
const aws = require('aws-sdk');
const doc_client = new aws.DynamoDB.DocumentClient();

/**
 * @function Main - The entry point for the lambda function
 * @param {object} event - The event that invoked the lambda function, containing any event data, if applicable
 * @param {object} context - The AWS Lambda context object
 */
async function main(event, context){
    try {
        //Read the subjects from the database
        console.log('Loading subjects...');
        var params = {
            TableName: process.env.SUBJECTS_TABLE
        };
        var readSubjects = doc_client.scan(params).promise();

        //initialize streams
        const InputStream = new Readable();
        const DBQueue = new QueueStream();
        const HttpThrottle = new Throttle(25);
        const DBWriteStream = new DatabaseWriteStream(process.env.COURSE_TABLE, doc_client);
        
        var data = await readSubjects;
        data.Items.forEach(item => InputStream.push(item.abbreviation));
        InputStream.push(null);

        //set up stream chaining
        InputStream
            .pipe(HttpThrottle)
            .pipe(RequestStream)
            .pipe(ExtractStream)
            .pipe(DBPrepStream)
            .pipe(DBQueue)
            .pipe(DBWriteStream);

        await new Promise(resolve => DBWriteStream.on('finish', resolve));
        console.log('Complete');
        return 'Success';
    } catch (error){
        console.log(`Error: ${error}`);
        return error;
    }
}

exports.handler = main;
=======
const Section = require('./modules/section');
const Course = require('./modules/course');
const ClassTime = require('./modules/classtime');

const QUERYSTRING = require('querystring');
const PROCESS = require('process');
const HTTPS = require('https');
const CHEERIO = require('cheerio');
const AWS = require('aws-sdk');

const DB = new AWS.DynamoDB.DocumentClient();
const URL = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_get_crse_unsec';
const REFER = 'https://prd-wlssb.temple.edu/prod8/bwckgens.p_proc_term_date';

exports.handler = main;

//The main function of the program
function main(){
    //Read the subjects from the database
    console.log('Loading subjects...');
    var params = {
        TableName: 'subjects-test'
    };

    DB.scan(params, (error, data) => {
        if (error){
            console.log(error);
        } else {
            data.Items.forEach(item => sendPost(item['subject']));
        } 
    });   
}

//Encapsulates the POST request to the server
async function sendPost(subject){ 
    var [options, data] = await createReqParams(subject);
    //Log the start time of the request 
    console.log(`Sending POST request for ${subject}...`);
    const reqStart = PROCESS.hrtime();
    const req = HTTPS.request(options, (res) => {
        console.log(res.statusCode);
        let body;
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            //Log the end time of the request.
            const reqEnd = PROCESS.hrtime(reqStart);
            console.log(`Request for ${subject} took ${reqEnd[0]}s`);

            //Get the class data from the HTML
            extractData(body);        
        });
    });
    req.on('error', (err) => console.log(err));
    req.write(data);
    req.end();
}

//Creates the request body and headers
async function createReqParams(subject){
    const term = 201903;
    const host = 'prd-wlssb.temple.edu';
    const path = '/prod8/bwckschd.p_get_crse_unsec';

    const postData =  QUERYSTRING.stringify({
        term_in: term,
        sel_subj: ['dummy', subject],
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
        'Referer': REFER
    };

    const options = {
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
    await writeItems(Array.from(courses.values()));

    console.log("Database entry complete");
    //Log the end time of the processing
    const procEnd = PROCESS.hrtime(procStart);
    console.log(`Processing took ${procEnd[0]}s`);

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

        DB.batchWrite(params, (err, data) => console.log(err ? `Error: ${err}` : `Success: ${data}`));      
    }
}

