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

module.exports = ClassTime;