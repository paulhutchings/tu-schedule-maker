using System;
using System.Linq;

namespace ScheduleMaker
{
    public class ClassTime
    {
        //FIELDS
        private string location, instructor, days, building;
        private DateTime startTime, endTime; //DateTime allows for comparing times

        //CONSTRUCTORS
        public ClassTime()
        {

        }

        public ClassTime(string days, string time, string instructor, string location)
        {
            this.location = location;
            //this.building = location.Remove(location.LastIndexOf(' ')); //removes the room number and leaves just the building name. Used by Laith for calculating distance
            this.instructor = instructor;
            this.days = days;
            this.startTime = DateTime.Parse(time.Remove(time.IndexOf(" -"))); //removes everything after the dash
            this.endTime = DateTime.Parse(time.Substring(time.IndexOf("- ")+1)); //starts after the dash. Index offset by 1 to make it start after the space
        }

        //ACCESSORS
        public DateTime StartTime
        {
            get { return this.startTime; }
            set { this.startTime = value; }
        }

        public DateTime EndTime
        {
            get { return this.endTime; }
            set { this.endTime = value; }
        }

        public string Location
        {
            get { return this.location; }
            set { this.location = value; }
        }

        public string Days
        {
            get { return this.days; }
            set { this.days = value; }
        }

        public string Instructor
        {
            get { return this.instructor; }
            set { this.instructor = value; }
        }

        public string Building
        {
            get { return this.building; }
            set { this.building = value; }
        }

        public String GetStartTime() //should only be used for displaying the data to the user. StartTime accessor should be used for time comparisons
        {
            return this.startTime.ToShortTimeString();
        }

        public String GetEndTime() //should only be used for displaying the data to the user. EndTime accessor should be used for time comparisons
        {
            return this.endTime.ToShortTimeString();
        }


        //METHODS
        public bool OnSameDay(ClassTime AClass)
        {
            foreach (char chr in this.days) //test all chars in the days shorthand
            {
                if (AClass.Days.Contains(chr)) 
                {
                    return true; //if AClass and this have any day(s) in common
                }
            }
            return false; //if it passes the entire foreach loop, then AClass and this have no days in common
        }

        public bool HasTimeConflict(ClassTime AClass)
        {
            if ((AClass.StartTime.TimeOfDay >= this.startTime.TimeOfDay) && (AClass.StartTime.TimeOfDay <= this.endTime.TimeOfDay)) 
            {
                return true; //if the start time for AClass is in between the start and end times for this, then there is a time conflict
            }
            else if ((AClass.EndTime.TimeOfDay >= this.startTime.TimeOfDay) && (AClass.EndTime.TimeOfDay <= this.endTime.TimeOfDay))
            {
                return true; //if the end time for AClass is in between the start and end times for this, then there is a time conflict
            }
            else return false; //only if the start and end times don't conflict is there no time conflict
        }
    }
}
