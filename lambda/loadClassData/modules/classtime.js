class ClassTime {
    constructor(days, startTime, endTime, instructor, location, building){
        this.days = days;
        //Start and end times are stored as 24-hour time based numbers (0-2400) to allow easy comparison
        this.startTime = startTime;
        this.endTime = endTime;
        this.instructor = instructor;
        this.location = location;
        this.building = building;
    }

    //Tests the current Classtime instance against another and determines whether they have any days in common
    onSameDay(someClass){
        var combined = this.days + someClass.days; //Add all of the characters together
        return (/([a-zA-Z]).*?\1/).test(combined); //Regex will match any duplicates, therefore the 2 classes share days
    }

    //Tests the current Classtime instance against another and determines whether they have a time conflict
    hasTimeConflict(someClass){
        if (!this.onSameDay(someClass)){ //If both classes are not on the same day, we don't need to check the times
            return false;
        }

        //See if the start or end time falls in between someClass's start and end times
        var startConflict = this.startTime >= someClass.startTime && this.startTime <= someClass.endTime;
        var endConflict = this.endTime >= someClass.startTime && this.endTime <= someClass.endTime;

        return startConflict || endConflict;
    }
}

module.exports = ClassTime;