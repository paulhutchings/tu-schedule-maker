using System;
using System.Collections.Generic;

namespace ScheduleMaker
{
    public class Section
    {
        //FIELDS
        private int crn;
        private ClassTime lecture;
        private ClassTime labRec;
        private List<ClassTime> classTimes; //both the Lecture object and the LabRec object (if exists) are stored in this list to allow for easy iteration during testing for time conflicts

        //CONSTRUCTORS
        public Section()
        {

        }

        public Section(int crn, ClassTime lecture, ClassTime labRec) //this constructor is used when the section contains a lab or recitation
        {
            this.crn = crn;
            this.lecture = lecture;
            this.labRec = labRec;
            this.classTimes = new List<ClassTime>()
            {
                {lecture},
                {labRec}
            };
        }

        public Section(int crn, ClassTime lecture) //this constructor is used when there is just a lecture
        {
            this.crn = crn;
            this.lecture = lecture;
            this.classTimes = new List<ClassTime>()
            {lecture}; //LabRec is not added to ClassTimes list to avoid NullException during testing
        }

        //ACCESSORS
        public int CRN
        {
            get { return this.crn; }
            set { this.crn = value; }
        }

        public ClassTime Lecture
        {
            get { return this.lecture; }
            set { this.lecture = value; }
        }

        public ClassTime LabRec
        {
            get { return this.labRec; }
            set { this.labRec = value; }
        }

        public List<ClassTime> ClassTimes
        {
            get { return this.classTimes; }
            set { this.classTimes = value; }
        }

        //METHODS
        public bool OnSameDay(Section ASection)
        {
            foreach (ClassTime item in this.classTimes) 
            {
                foreach (ClassTime element in ASection.ClassTimes)
                {
                    if (item.OnSameDay(element)) //call OnSameDay method for each ClassTime object
                    {
                        return true; //if any of the ClassTime objects in ASection have any days in common with any ClassTime objects in this
                    }
                }
            }
            return false; //if the Section object passes the foreach loops, none of the ClassTime objects in it have any days in common
        }

        public bool HasTimeConflict(Section ASection)
        {
            if (!(this.OnSameDay(ASection)))
            {
                return false; //if none of the ClassTime objects share a day, no need to check the times
            }

            foreach (ClassTime item in this.classTimes)
            {
                foreach (ClassTime element in ASection.ClassTimes)
                {
                    if (item.HasTimeConflict(element))
                    {
                        return true; //test all ClssTime objects in each section for time conflicts
                    }
                }
            }
            return false; //if the Section object passes all the foreach loops, then it is compatible
        }
    }
}
