class ClassTime{
    constructor(days, time, instructor, location){
        this.days = days;
        this.instructor = instructor;
        this.location = location;
        this.building = location.slice(0, location.lastIndexOf(" ")); //The building name comes before the last space

        //Create numbers in 24-hour time to represent the time of day. A hyphen separates the start and end times in the string
        this.startTime = ClassTime.createTimeOfDay(time.slice(0, time.indexOf("-") - 1)); //Account for the space before the hyphen
        this.endTime = ClassTime.createTimeOfDay(time.slice(time.indexOf("-") + 2)); //Start index is inclusive so +2 instead of +1
    }

    //Converts a string into a Date object representing just the time of day
    static createTimeOfDay(time){
        var hour = time.contains("pm") ? parseInt(time.slice(0, 2)) + 12 : parseInt(time.slice(0, 2)); //Convert hours to military time
        var minute = parseInt(time.slice(3, 5)); //Extract the minutes from the string

        //Set the time of day using the hour and minute values we extracted. We need to parse the number back out of a string to ensure it's read properly
        //The return type must also be a number since it is used for comparisons in the functions below
        return parseInt(`${hour}${minute}`);
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

module.exports = ClassTime;