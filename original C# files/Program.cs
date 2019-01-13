using System;
using System.Collections.Generic;
using System.Linq;
using HtmlAgilityPack;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json;
using System.IO;
using System.Diagnostics;

namespace ScheduleMaker
{
    class Program
    {
        //https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched public URL for class search

        static void Main(string[] args)
        {           

            Stopwatch sw = Stopwatch.StartNew(); //used for timing
            JObject input = JObject.Parse(File.ReadAllText(@"classes.json")); //in AWS lambda this becomes the input parameter
            //JSON object needs to contain the following:
            //"html" - HTML text from the resulting class search webpage
            //"classes" - the course names and titles that the user inputted
            //"commitments" - any other time comitments that the user gave, these need to follow the format of the Course->Section->ClassTime classes in order to be integrated 
            //"maxperday" - the maximum number of classes that the user wants on any given day (should we decide to implement this)

            Console.WriteLine("Loaded JSON");

            //load HTML from JSON
            var document = new HtmlDocument();
            //document.LoadHtml(input["html"].Value<string>());
            document.Load(@"classes.html");

            Console.WriteLine("Loaded HTML");

            //extract the classes from JSON and put them into a dictionary for scraping/testing
            var classSearch = new Dictionary<string, Course>(); //all courses and sections scraped get added here. For each dictionary entry, the Key is the course name (ex CIS 1068) and the Value is the Course object
            foreach (var item in input["classes"].Children<JProperty>())
            {
                classSearch.Add(item.Name, new Course(item.Name, item.Value.ToString())); //creates Course objects in classSearch to hold scraped HTML data
            }
            var band = new Course("MUSC", "Wind Symphony");
            band.AddSection(new Section(123, new ClassTime("MW", "1:00 pm - 3:30 pm", "", "")));
            classSearch.Add("Wind Symphony", band);
            

            Console.WriteLine("Loaded classSearch dictionary");

            ParseSearchResults(document, classSearch); //collects class data from HTML. The webpage would also be passed in from the user interface, along with any other parameters
            var schedules = GenerateSchedules(classSearch.Values.ToList()); //creates the possible schedules. Since classSearch is a dictionary, its Values are converted to a list, since the Key (course title) isn't needed for testing

            Console.WriteLine("Filter schedules based on max classes per day");

            int maxClassesPerDay = 4; //would be passed in from JSON
            schedules.RemoveAll(schedule => schedule.TooManyClasses(maxClassesPerDay));

            foreach (var item in schedules)
            {
                foreach (var element in item)
                {
                    Console.WriteLine(element.Key);
                    Console.Write(element.Value.CRN);
                }
                Console.WriteLine();
            }

            Console.WriteLine("Complete");
            Console.WriteLine(sw.Elapsed);
            //return schedules.Count;
        }

        static void ParseSearchResults(HtmlDocument document, Dictionary<string, Course> classSearch)  //will be webpage instead of document
        {
            Console.WriteLine("Parsing HTML");

            string XPath = "/html/body/div[3]/table[1]/tbody"; //this is the XPath for the overall table (taken from FireFox inspector)
            var mainTable = document.DocumentNode.SelectSingleNode(XPath); //selects the overall table node

            foreach (HtmlNode oddRow in mainTable.SelectNodes(".//tr")
                .Where(row => row.SelectNodes(".//th[@class='ddtitle']") != null) //filters evenRows since only oddRows have "th" nodes with class "ddtitle"
                .Where(section => section.IsOpen()) //filters sections that are closed
                .Where(section => section.GetDataTable().GetTime() != "TBA") //filters out sections/classes (such as online) that don't have a specified time, since we can't test against those
                .Where(course => classSearch.ContainsKey(course.GetName()))) //filters out oddRows that aren't courses the user wants
            {
                Course thisCourse = classSearch[oddRow.GetName()];

                if (oddRow.HasLabRec()) //compares against the row below for associated class data
                {
                    thisCourse.AddSection(oddRow.CreateSectionWithLab());
                }
                else
                {
                    thisCourse.AddSection(oddRow.CreateSection());
                }
            }

            Console.WriteLine("HTML parsed successfully");
        }

        static List<Dictionary<string, Section>> GenerateSchedules(List<Course> classSearch) //returns the list of schedules (Dictionary objects) given the list of Course objects. Currently only tests for time conflicts between sections but other parameters can be added to limit possibilities
        {
            Console.WriteLine("Generating schedules");

            var tempSched = new Dictionary<string, Section>(); //used for building temporary schedule during TestSections. Sections are added until either a full schedule is created, or no compatible sections are found, in which case the last section is removed to try other sections in the course 
            var schedules = new List<Dictionary<string, Section>>(); //final list of all schedule possibilites

            foreach (Section item in classSearch.First().Sections) //start with the first course in the list. In the case of "special" classes, such as music ensembles, sports practices, etc, those would be first
            {
                tempSched.Add(classSearch.First().Name, item); //add the current section of the first course to the temp schedule

                Console.WriteLine("Testing sections");

                TestSections(tempSched, classSearch, schedules, 1); //initial call of TestSections. index of 1 increments it to the next course in the list
                tempSched.Remove(classSearch.First().Name); //removes the section of the course from temp schedule in order to try other sections
            }

            Console.WriteLine("Successfully generated schedules");

            return schedules;
        }

        static void TestSections(Dictionary<string, Section> tempSched, List<Course> classSearch, List<Dictionary<string, Section>> schedules, int index) //recursive method that builds a temporary schedule while testing for time conflicts. Any other parameters would also be passed in
        {
            if (tempSched.Count < classSearch.Count) //if tempSched has been built up with as many courses as needed, this will end the recursion
            {
                foreach (Section item in classSearch[index].Sections //as index increases, each course in the list is evaluated
                    .Where(section => section.ConflictsWithTemp(tempSched.Values) == false)) //filters conflicting sections by calling the extension method to test them against the current temp schedule
                {
                    tempSched.Add(classSearch[index].Name, item); //the section is added to the temp schedule
                    TestSections(tempSched, classSearch, schedules, index + 1); //calls TestSections recursively. Increase index by 1 to move to the next course in the list
                }
            }

            if (tempSched.Count == classSearch.Count) //if the temp schedule has the required number of courses in it
            {
                schedules.Add(tempSched.Clone()); //add temp to the list of possible schedules. (note: tempSched must be cloned in its current state into a new list to keep the correct Section object references
            }
            tempSched.Remove(tempSched.Keys.Last()); //removes the last section in the temp schedule so that any remaining sections inthe course can be tested
        }
    }  
}
