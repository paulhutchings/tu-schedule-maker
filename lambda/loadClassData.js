// import * as ClassTime from "./modules/classtime"
// import * as Section from "./modules/section"
// import * as Course from "./modules/course"

const fs = require('fs');
const cheerio = require('cheerio');

console.log('Reading file');
fs.readFile('./classes.html', 'UTF-8', function(err, data){
    if (err) console.log(err);

    console.log('Loading HTML');
    const html = cheerio.load(data);
    console.log('HTML loaded');
    var listings = html('table.datadisplaytable th.ddtitle a');  
    //table.datadisplaytable:nth-child(16) > tbody:nth-child(2) > tr:nth-child(5002) > td:nth-child(1) > table:nth-child(26) > tbody:nth-child(2) > tr:nth-child(2) > td:nth-child(3)
    console.log('query complete');
    var courses = new Map();
    listings.each((i, element) => {
        var text = html(element).text();
        words = text.split(' - ');
        var name = words[2];
        var title = words[0];
        var crn = words[1];

        var nextRow = element.parent.parent.next.next; //Walk up 2 levels of the DOM, then over to the next row
        var table = html(nextRow).find('table.datadisplaytable tr');
        
        var time = table.find('tr:nth-child(2) td.dddefault:nth-child(2)').text().trim();
        var days = table.find('tr:nth-child(2) td.dddefault:nth-child(3)').text().trim();
        var location = table.find('tr:nth-child(2) td.dddefault:nth-child(4)').text().trim();
        var instructor = table.find('tr:nth-child(2) td.dddefault:nth-child(7)').text().replace("(\n                                            P)",'','').trim();
        var building = location === "TBA" ? "" : location.slice(0, location.lastIndexOf(' '));
        var lecture = new ClassTime(days, time.split(' - ')[0], time.split(' - ')[1], instructor, location, building);

        if (table.length > 2) {
            var lTime = table.find('tr:nth-child(3) td.dddefault:nth-child(2)').text().trim();
            var lDays = table.find('tr:nth-child(3) td.dddefault:nth-child(3)').text().trim();
            var lLocation = table.find('tr:nth-child(3) td.dddefault:nth-child(4)').text().trim();
            var lInstructor = table.find('tr:nth-child(3) td.dddefault:nth-child(7)').text().replace(["(\n                                            P)"],'').trim();
            var lBuilding = lLocation === "TBA" ? "" : lLocation.slice(0, lLocation.lastIndexOf(' '));
        
            var labRec = new ClassTime(lDays, lTime.split(' - ')[0], lTime.split(' - ')[1], lInstructor, lLocation, lBuilding);
            var sec = new Section(crn, lecture, labRec);
        }
        else {
           var sec = new Section(crn, lecture);
        }

        if (!courses.has(name)) {
            courses.set(name, new Course(name, title));           
        }
        courses.get(name).addSection(sec);

    });
    console.log('Mapping complete');
    courses.forEach(x => {
        // console.log(x);
        fs.appendFile('classes.json', `${JSON.stringify(x)}\n\n`, "UTF-8", function(err){
            if (err) {
                console.log(err);
            }
        });
    });
    console.log("File saved");
});

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
    constructor(crn, lecture, labrec){
        this.crn = crn;
        if (arguments.length === 3){
            this.classtimes = [lecture, labrec];
            this.hasLabRec =  true;
        }
        else {
            this.classtimes = [lecture];
            this.hasLabRec = false; 
        }
                   
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