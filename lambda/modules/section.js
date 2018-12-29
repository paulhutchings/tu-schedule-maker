import * as ClassTime from "./classtime";

modules.export = class Section{
    constructor(crn, classtimes, isOpen){
        this.crn = crn;
        this.classtimes = classtimes;
        this.hasLabRec = this.classtimes.length > 1 ? true : false;
        this.isOpen = isOpen;                  
    }

    //Tests the current Section instance against another and determines whether they have any days in common
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

    //Tests the current Section instance against another and determines whether they have a time conflict
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