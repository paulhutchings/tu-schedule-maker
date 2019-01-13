/**
 * @class
 * Represents a section of a course. Contains a CRN (Course Registration Number), whether or not the section is
 * open, and a list of all ClassTime objects associated with the section. A section can have 1 or more ClassTimes,
 * which can represent either a lecture or lab/recitation component
 */
class Section {
    /**
     * @constructor
     * Creates a new Section
     * @param {number} crn - The CRN (Course Registration Number) for the section
     * @param {[ClassTime]} classtimes - An array of ClassTime objects associated with the section
     * @param {boolean} isOpen - Whether or not the section has any open seats
     */
    constructor(crn, classtimes, isOpen){
        this.crn = crn;
        this.classtimes = classtimes;
        this.hasLabRec = this.classtimes.length > 1 ? true : false;
        this.isOpen = isOpen;                  
    }

    /**
     * @method onSameDay - Tests the current Section against another and determines whether 
     * they have any days in common
     * @param {Section} someSection - Another Section object to compare against
     * @return {boolean} True if the sections have any days in common, otherwise False
     */
    onSameDay(someSection){
        //Go through each ClassTime object, and see if they share any days
        this.classtimes.forEach(x => {
            someSection.classtimes.forEach(y => {
                if (x.onSameDay(y)){
                    return true;
                }
            })
        });

        return false;
    }

    /**
     * @method hasTimeConflict - Tests the current Section against another and determines whether 
     * they have a time conflict
     * @param {Section} someSection - Another Section object to compare against
     * @return {boolean} True if the sections have a time conflict, otherwise False
     */
    hasTimeConflict(someSection){
        //First test if any days are shared. If not, than no need to test the times
        if(!this.onSameDay(someSection)){
            return false;
        }

        //Go through each ClassTime object. If any of them have a time conflict, than the section as a whole has a time conflict
        this.classtimes.forEach(x => {
            someSection.classtimes.forEach(y => {
                if (x.hasTimeConflict(y)){
                    return true;
                }
            })
        });

        return false;
    }
}

/**
 * @exports Section
 */
module.exports = Section;