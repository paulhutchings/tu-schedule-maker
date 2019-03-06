
/**
 * @class
 * Represents a component of a course section (either a lecture or a lab/recitation).
 */
class ClassTime {
    /**
     * @constructor
     * Creates a new ClassTime instance.
     * @param {string} days - A string containing the days of the week that the class takes place.
     * Can contain any combination of the following or "TBA" or null: [MTWRF]
     * @param {[number, number]} times - A tuple containing the start and end times in a 24-hour number format (0-2400)
     * @param {string} instructor - The name of the professor or TA for the component
     * @param {string} location - The building and room where the class takes place
     */
    constructor(days, times, instructor, location){
        this.days = days === "" ? null: days;
        //Start and end times are stored as 24-hour time based numbers (0-2400) to allow easy comparison
        [this.startTime, this.endTime] = times;
        this.instructor = instructor;
        this.location = location;
        this.building = this.location === "TBA"
            ? null
            : location.slice(0, location.lastIndexOf(' '));
    }

    /**
     * @method onSameDay - Tests the current ClassTime against another and determines whether 
     * they have any days in common
     * @param {ClassTime} someClass - Another ClassTime object to compare against
     * @return {boolean} True if the classtimes have any days in common, otherwise False
     */
    onSameDay(someClass){
        //null indicates an online class, so no conflicts
        if (this.days === null || someClass.days === null){
            return false;
        }
        else {
            var combined = this.days + someClass.days; //Add all of the characters together
            return (/(\w)\1+/gi).test(combined); //Regex will match any duplicates, therefore the 2 classes share days
        }
    }

    /**
     * @method hasTimeConflict - Tests the current ClassTime against another and determines whether 
     * they have a time conflict
     * @param {ClassTime} someClass - Another ClassTime object to compare against
     * @return {boolean} True if the classtimes have a time conflict, otherwise False
     */
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

/**
 * @exports ClassTime
 */
module.exports = ClassTime;