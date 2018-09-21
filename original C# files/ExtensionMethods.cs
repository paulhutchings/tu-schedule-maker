using System;
using System.Collections.Generic;
using System.Text;
using HtmlAgilityPack;
using System.Linq;

namespace ScheduleMaker
{
    public static class ExtensionMethods 
    {
        //EXTENSIONS FOR HTMLNODE CLASS
        //for these extensions, I define ROWS (uppercase) as the ones in the overall HTML table on the webpage
        //since there are 2 ROWS for each section listing, there are always an even number of ROWS in the table, so we can split it into ODD and EVEN ROWS
        //oddRows are the ROWS in the webpage that have the course name, title, and CRN in the header
        //evenRow is the ROW below each ODD ROW that holds the table containing the class data
        //tableRows are the rows of the table within each evenRow that hold the class data

        public static bool IsOpen(this HtmlNode oddRow) //determines whether a section is open based on the number of seats available
        {
            var text = oddRow.NextRow().SelectSingleNode(".//td/b").NextSibling.InnerText; //the seat count is a text node sandwiched inbetween the other nodes, however, we cannot use its XPath directly because the number of text nodes may change. Therefore, we find only "b" node in the evenRow, select its NextSibling (the text node we want), then the InnerText
            int openSeats = Int32.Parse(text); //parse the InnerText to get the number of seats available
            return openSeats > 0; //if the number of seats available isn't zero, then we can extract this section
        }

        public static string GetTitle(this HtmlNode oddRow)
        {
            string title = oddRow.SelectSingleNode(".//th/a").InnerText; //selects header text that contains course name, title, and section crn             
            return title.Remove(title.IndexOf(" -")); //we can chop off everything in the string after the first dash since the course title comes first
        }       

        public static string GetName(this HtmlNode oddRow)
        {
            string name = oddRow.SelectSingleNode(".//th/a").InnerText; //selects header text that contains course name, title, and section crn
            name = name.Remove(name.LastIndexOf(" -")); //trim the string by removing everything after the dashes
            return name.Substring(name.LastIndexOf("- ") + 2); //now we can grab the course name since there's only 2 dashs in the string now. Offset of 2 in the index so that it starts after the space
        }

        public static int GetCrn(this HtmlNode oddRow)
        {
            string crn = oddRow.SelectSingleNode(".//th/a").InnerText; //selects header text that contains course name, title, and section crn
            crn = crn.Remove(crn.LastIndexOf(" -")); //trim the string by removing everything after the dashes
            crn = crn.Remove(crn.LastIndexOf(" -")); //since there are 3 dashes, do this twice
            return Int32.Parse(crn.Substring(crn.IndexOf("- ") + 2)); //now we can grab the crn since there's only 1 dash in the string now. Offset of 2 in the index so that it starts after the space
        }
        public static string GetTime(this HtmlNode tableRow)
        {
            return tableRow.SelectSingleNode(".//td[2]").InnerText; //selects the 2nd column in the tableRow which contains the time
        }

        public static string GetDays(this HtmlNode tableRow) 
        {
            return tableRow.SelectSingleNode(".//td[3]").InnerText; ///selects the 3rd column in the tableRow which contains the days
        }

        public static string GetLocation(this HtmlNode tableRow)
        {
            return tableRow.SelectSingleNode(".//td[4]").InnerText; //selects the 4th column in the tableRow which contains the location
        }

        public static string GetInstructor(this HtmlNode tableRow)
        {
            string instructor = tableRow.SelectSingleNode(".//td[7]").InnerText; //selects the 7th column in the tableRow which contains the intructor's name
            if (instructor.Contains("(P)")) //professor names have "(P)" at the end to denote they are the professor
            {
                return instructor.Remove(instructor.Length-4); //removes the "(P)" from the end of professors' names
            }
            else
            {
                return instructor;
            }
        }       

        public static HtmlNode NextRow(this HtmlNode row) //used to get the next row of whatever table. Used both to get the evenRow for each oddRow, and to get tableRows
        {
            return row.NextSibling.NextSibling; //need to use NextSibling twice since using it once gives you the end tag
        }

        public static HtmlNode GetDataTable(this HtmlNode oddRow) //selects the interior table of the evenRow
        {
            return oddRow.NextRow().SelectSingleNode(".//td/table/tbody/tr[2]"); //navigates straight to the 2nd tableRow of the table. We don't care about the first tableRow since it's just the column headers
        }

        public static bool HasLabRec(this HtmlNode oddRow)
        {
            if (oddRow.GetDataTable().NextRow() == null) //if the 2nd tableRow is the last, then there is no lab or recitation in the tableRow below
            {
                return false;
            }
            else return true; //otherwise there is lab/recitation data in the tableRow below
        }

        public static ClassTime CreateClassTime(this HtmlNode tableRow) //creates ClassTime object from data in the current tableRow
        {
            return new ClassTime(tableRow.GetDays(), tableRow.GetTime(), tableRow.GetInstructor(), tableRow.GetLocation());
        }

        public static Section CreateSection(this HtmlNode oddRow) //used for courses with just a lecture
        {
            var tableRow = oddRow.GetDataTable(); //gets the 2nd tableRow from the evenRow                             
            return new Section(oddRow.GetCrn(), tableRow.CreateClassTime()); //creates Section object using the CRN from the oddRow header, and ClassTime object from tableRow
        }

        public static Section CreateSectionWithLab(this HtmlNode oddRow) //used for courses with a lab/recitation
        {
            var tableRow = oddRow.GetDataTable(); //gets the 2nd tableRow from the evenRow    
            return new Section(oddRow.GetCrn(), tableRow.CreateClassTime(), tableRow.NextRow().CreateClassTime()); //also creates a ClassTime object for the lab from the 3rd tableRow
        }

        //OTHER EXTENSIONS
        public static bool ConflictsWithTemp(this Section section, ICollection<Section> temp) //temp is the temporary schedule being built by the TestSections algorithm
        {
            foreach (Section item in temp)
            {
                if(section.HasTimeConflict(item))
                {
                    return true; //if the section has any time conflicts with the sections in the temp schedule, then it cannot be added
                }
            }
            return false;
        }

        public static Dictionary<string, Section> Clone(this Dictionary<string, Section> dict) //this method clones the temp schedule in the TestSections algorithm before inserting it into the final list of possibilities
        {
            var dictClone = new Dictionary<string, Section>();
            foreach(KeyValuePair<string, Section> item in dict)
            {
                dictClone.Add(item.Key, item.Value); //the objects in temp schedule are not copied, only references. We are essentially creating a copy of the temp schedule in its "current state" in the algorithm
            }
            return dictClone;
        }   
        
        public static List<char> GetDays(this Dictionary<string, Section> dict)
        {
            var list = new List<char>();
            foreach (var section in dict.Values)
            {
                foreach (var classTime in section.ClassTimes)
                {
                    foreach (var chr in classTime.Days)
                    {
                        list.Add(chr);
                    }
                }
            }
            return list;
        }

        public static bool TooManyClasses(this Dictionary<string, Section> dict, int maxNumClassesPerDay)
        {
            foreach (var chr in dict.GetDays())
            {
                if (dict.GetDays().Count(ch => ch.Equals(chr)) > maxNumClassesPerDay)
                {
                    return true;
                }
            }
            return false;
        }
    }
}
