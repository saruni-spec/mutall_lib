// 
//Getting the libraries
import {driver_source,cell,table_options} from "../../../outlook/v/zone/zone.js";
import {mutall_error,fuel, view, basic_value} from "../../../schema/v/code/schema.js";
//
//This is an abstract class that was developed to care of my different panel in the school page management system
import {panel, page, panel_options} from "./panel.js";
//
//School page is the class that helps in managing school system 
export class school_page extends page{
    // 
    //Properties of the school page 
    public school:school_panel;
    public class_:class_;
    public stream:stream;
    public year:year;
    public student:student;
    //
    constructor(
        //
        //To implement the view has-a hierarchy
        public parent:view,
        
    ){  
        // 
        //Options for controlling school management system
        const options:table_options ={
            dbname:'school',
            // 
            //Makes the entire system read only 
            io_type:'read_only',
        }
        //
        //
        super(parent,options);
        // 
        //Creating instance from the classes that represent the panels 
        this.panels = [
           this.school= new school_panel(this),
           this.class_=new class_(this),
           this.stream= new stream(this),
           this.year= new year(this),
           this.student= new student(this),
        ]
    }
    //
    //Displays the entire school page
    async show(){
        // 
        await super.show();
    }
    
}
// 
//The panel that shows all the school to be managed 
class school_panel extends panel{
    //
    constructor(parent:school_page){
        //
        //Getting the sql that retrieves the schools 
        const sql =`
        select
            school as \`school.school\`,
            id as \`school.id\`,
            name as \`school.name\`
        from
            school
            `;
        //
        //Where the data is coming from  
        const ds:driver_source = {
            type:'sql',
            sql,
            row_index:'school.school'
        };
        //
        //Options for controlling school panel
        const options:table_options = {
            //
            //Schools will be shown in read-only mode
            io_type:'read_only',
        }
        //    
        super(ds,  options, parent);
    }  
    // 
    // Overidding the onclick method 
   async onclick(cell: cell, evt?: MouseEvent): Promise<void> {
    // 
    // Wait for the parent class's onclick handler to complete before continuing
    await super.onclick(cell,evt);
    // 
    // Getting the pk of the cell
    const pk:string=cell.index![0]
    // 
    // Display the first stream for the given primary key and wait for the operation to complete
    await this.display_1st_class_(pk);

    }
//   
// Displays the first stream for the class thats clicked on
async display_1st_class_(school_pk:string):Promise<void>{
    // 
    // 1.Formulate the sql(ist the one in the file)
    const sql:string= `
   select
        class.class as \`class.class\`,
        school.school as \`school.school\`,
        school.id as \`school.id\`,
        class.name as \`class.name\`
    from
        class
        inner join school on class.school=school.school
    where
        school.school=${school_pk}
    limit 1
    
   `;
    // 
    // 2.Execute the sql to get the results
    //  using the library to get the results from the database and saving the result in a variable  
    const results:Array<fuel>=await this.exec_php(
        'database', 
        ['school', false], 
        'get_sql_data', 
        [sql]);
    // 
    // If no class is present select the top most part of the class and its descedant
    if (results.length===0) {
        // 
        //select 
        //
        //4.1.1 Access the parent of the stream heterozone(We expect it to be a school page)
        const school_page:view | undefined = this.heterozone.parent;
        //
        //4.1.2 Ensure that the school page is indeed a school page
        // if(!(school_panel instanceof school_page)) 
            throw new mutall_error('school page expected');
       
        ;
        //
        // 
        const school_panel:school_panel = school_page.school_panel;
        // // 
        school_panel.select_corner();
        // // 
        // // 
        const student:student = school.student;
        // // 
        // // 
        student.select_corner();
        // // 
    }
    //
    // 3.Extract the school  primary key
    const pk:basic_value=results[0]['school.school'];
    // 
    //4.Select the entry from  student panel that has the result pk 
    // 4.1 Get the student panel
    //
    //4.1.1 Access the parent of the class heterozone(We expect it to be a school page)
    const school:view | undefined = this.heterozone.parent;
    //
    //4.1.2 Ensure that the school page is indeed a school page
    if(!(school instanceof school_page)) 
        throw new mutall_error('school page expected');
        ;
    //
    //Get the school panel
    const class_:class_ = school.class_;
    // 
    // 4.2 get the cell from the student panel that has primary key /school id coordonates
    const cell:cell = class_.cells_indexed![String(pk)]['class.name'];

    // 4.3 Select the cell
    cell.select();
    // 
    // show the selection
    cell.td.scrollIntoView({block:"center"});
   
    // 
    // select the first class
      school.display_1st_class_(String(pk));
}; 
        
       
    
}
// 
//The panel that shows the classes in  the  selected school 
class class_ extends panel{
    // 
    //Creates a new instance with reference to its parent school page
    constructor(parent:school_page)
    {
        //
        //The sql that plots all the classes
        const sql =`
        select
            class.class as \`class.class\`,
            school.school as \`school.school\`,
            school.id as \`school.id\`,
            class.name as \`class.name\`
        from
            class
            inner join school on class.school=school.school
        order by
            school.id ,
            class.name 
            `;
        //  
        //Where the data is coming from  
        const ds:driver_source = {
            type:'sql',
            sql,
            row_index:'class.class'
        };
        //
        //Allow the adusting of data when  presenting
        const options:table_options = {
            io_type:'read_only',
        }
        // 
        //Call the constructer of the parent class with the expected parametres   
        super(ds,  options, parent);
    } 
    // 
    // Overidding the onclick method 
   async onclick(cell: cell, evt?: MouseEvent): Promise<void> {
    // 
    // Wait for the parent class's onclick handler to complete before continuing
    await super.onclick(cell,evt);
    // 
    // Getting the pk of the cell
    const pk:string=cell.index![0]
    // 
    // Display the first stream for the given primary key and wait for the operation to complete
    // await this.display_1st_stream(pk)
    // 
    // display all 
    }
    //   
    // Displays the first stream for the class thats clicked on
    async display_1st_stream(class_pk:string):Promise<void>{
        // 
        // 1.Formulate the sql(ist the one in the file)
        const sql:string= `
        select
            class.class as \`class.class\`,
            school.school as \`school.school\`,
            school.id as \`school.id\`,
            class.name as \`class.name\`
        from
            class
            inner join school on class.school=school.school
        where
            class.class=${class_pk}
        limit 1
        
       `;
        // 
        // 2.Execute the sql to get the results
        //  using the library to get the results from the database and saving the result in a variable  
        const results:Array<fuel>=await this.exec_php(
            'database', 
            ['school', false], 
            'get_sql_data', 
            [sql]);
        // 
        // If no class is present select the top most part of the class and its descedant
        if (results.length===0) {
            // 
            //select 
            //
            //4.1.1 Access the parent of the stream heterozone(We expect it to be a school page)
            const school:view | undefined = this.heterozone.parent;
            //
            //4.1.2 Ensure that the school page is indeed a school page
            if(!(school instanceof school_page)) 
                throw new mutall_error('school page expected');
           
            ;
            //
            // 
            const stream:stream = school.stream;
            // // 
            // stream.select_corner();
            // // 
            // // 
            // const student:student = school.student;
            // // 
            // // 
            // student.select_corner();
            // // 
        }
        //
        // 3.Extract the class primary key
        const pk:basic_value=results[0]['class.class'];
        // 
        //4.Select the entry from  student panel that has the result pk 
        // 4.1 Get the student panel
        //
        //4.1.1 Access the parent of the class heterozone(We expect it to be a school page)
        const school:view | undefined = this.heterozone.parent;
        //
        //4.1.2 Ensure that the school page is indeed a school page
        if(!(school instanceof school_page)) 
            throw new mutall_error('school page expected');
            ;
        //
        //Get the stream panel
        const stream:stream = school.stream;
        // 
        // 4.2 get the cell from the student panel that has primary key /school id coordonates
        const cell:cell = stream.cells_indexed![String(pk)]['school.id'];

        // 4.3 Select the cell
        cell.select();
        // 
        // show the selection
        cell.td.scrollIntoView({block:"center"});
       
        // 
        // select the first year
        stream.display_1st_year(String(pk));
    }; 
}
//
//The panel that shows streams from selected classes
class stream extends panel{
    //
    //Creates a new instance with reference to its parent school page
    constructor(parent:school_page){
        //
        //The sql that plots all the streams
        const sql =`
        select
            stream.stream as \`stream.stream\`,
            school.id as\`school.id\`,
            class.name as \`class.name\`,
            stream.id as \`stream.id\`
        from
            stream
            inner join  class on stream.class=class.class
            inner join school on class.school=school.school
        order by
            school.id desc,
            class.name,
            stream.id

            `;
        // 
        //Where the data is coming from   
        const ds:driver_source = {
            type:'sql',
            sql,
            row_index:'stream.stream'
        };
        // Configure table as read-only to prevent accidental data modification
        // This provides a safer view for users examining the data without risking changes
        const options:table_options = {
            io_type:'read_only',
        }
        // 
        // Initialize the parent class with the data source, options, and parent reference
        super(ds,  options, parent);
    }  
    // 
    // Overidding the onclick method 
    async onclick(cell: cell, evt?: MouseEvent): Promise<void> {
        // 
        // Wait for the parent class's onclick handler to complete before continuing
        await super.onclick(cell,evt);
        // 
        // getting the pk of the cell thats clicked on
        const pk:string=cell.index![0]
        // 
        // Display the first year for the given primary key and wait for the operation to complete
        await this.display_1st_year(pk);
        // 
        // first student??
    }
    //   
    // Displays the first year on the clicked stream
    async display_1st_year(stream_pk:string):Promise<void>{
        // 
        // 1.Formulate the sql(ist the one in the file)
        const sql:string= `
         select
            year.year as \`year.year\`,
            year.value as \`year.value\`
        from
            school
            inner join  class on class.school=school.school
            inner join stream on stream.class=class.class
            inner join year on year.stream=stream.stream
        where
            stream.stream=${stream_pk}
        limit 1
       `;
        // 
        // Execute the sql to get the results
        //  using the library to get the results from the database and saving the result in a variable  
        const results:Array<fuel>=await this.exec_php(
            'database', 
            ['school', false], 
            'get_sql_data', 
            [sql]);
        // 
        // If no year is present select the top most part of the year and its descedant
        if (results.length===0) {
            // 
            //select 
            //
            //4.1.1 Access the parent of the stream heterozone(We expect it to be a school page)
            const school:view | undefined = this.heterozone.parent;
            //
            //4.1.2 Ensure that the school page is indeed a school page
            if(!(school instanceof school_page)) 
                throw new mutall_error('school page expected');
           
            ;
            //
            // Getting the year panel from the school page
            const year:year = school.year;
            // 
            //Calling a method that get the top most part of the homozone if no cell matches the wanted data from the panel
            year.select_corner();
            // 
            // Getting the student from the school which is the parent of the panel
            const student:student = school.student;
            // 
            // From the student panel if no year was selected call the method the select corner method 
            student.select_corner();
        }
        //
        // 3.Extract the year primary key
        const pk:basic_value=results[0]['year.year'];
        // 
        //4.Select the entry from  student panel that has the result pk 
        //4.1.1 Access the parent of the stream heterozone(We expect it to be a school page)
        const school:view | undefined = this.heterozone.parent;
        //
        //4.1.2 Ensure that the school page is indeed a school page
        if(!(school instanceof school_page)) 
            throw new mutall_error('school page expected');
            ;
        //
        //Get the year panel
        const year:year = school.year;
        // 
        // 4.2 get the cell from the student panel that has primary key /school id coordonates
        const cell:cell = year.cells_indexed![String(pk)]['school.id'];

        // 4.3 Select the cell
        cell.select();
        // 
        // show the selection
        cell.td.scrollIntoView({block:"center"});
       
        // 
        // select the first student
        year.display_1st_student(String(pk));
    }; 
        
       

}
// 
//The panel that shows the years in the school
class year extends panel{
    // 
    //Creates a new instance with reference to its parent school page
    constructor(parent:school_page){
        //
        //Formulating an sql that retrieves data that populates the year panel
        const sql =`
         select
            year.year as \`year.year\`,
            school.id as \`school.id\`,
            class.name as \`class.name\`,
            stream.id as \`stream.id\`,
            year.value as \`year.value\`
        from
            school
            inner join  class on class.school=school.school
            inner join stream on stream.class=class.class
            inner join year on year.stream=stream.stream
        order by
            year.year,
            school.id,
            class.name,
            stream.id,
            year.value
            `;
        // 
        //Where the data comes from    
        const ds:driver_source = {
            type:'sql',
            sql,
            row_index:'year.year'
        };
        //
        //Doing more with your data
        const options:table_options = {
            io_type:'read_only',
        }
        //  
        //   
        super(ds,  options, parent);
    } 
    // 
    // Overidding the on click 
    async onclick(cell: cell, evt?: MouseEvent): Promise<void> {
        // 
        //Calling the parent class onclick 
        await super.onclick(cell,evt);
       
        // 
        //Get the year pk, Save the primary key of the cell clicked on
        const pk:string=cell.index![0]
        // 
        //Calling the method    
        await this.display_1st_student(pk);
    }
    //   
    // Displays the first student in year 1
    async display_1st_student(year_pk:string):Promise<void>{
        // 
        // 1.Formulate the sql(ist the one in the file)
        const sql:string= `
        select
            progress.progress as \`progress.progress\`
        from
            student
            inner join progress on progress.student = student.student
            inner join year on progress.year = year.year
            inner join stream on year.stream = stream.stream
            inner join class on stream.class = class.class
            inner join school on class.school = school.school
        where
            year.year = ${year_pk}
            limit 1`;
        // 
        // 2.Execute the sql to get the results
        // the db name  where the sql is getting executed from 
        const results:Array<fuel>=await this.exec_php(
            'database', 
            ['school', false], 
            'get_sql_data', 
            [sql]);
        //
        // 3.Extract the student primary key
        const pk:basic_value=results[0]['progress.progress'];
        // 
        //4.Select the entry from  student panel that has the result pk 
        // 4.1 Get the student panel
        //
        //4.1.1 Access the parent of the year heterozone(We expect it to be a school page)
        const school:view | undefined = this.heterozone.parent;
        //
        //4.1.2 Ensure that the school page is indded a school page
        if(!(school instanceof school_page)) 
            throw new mutall_error('school page expected');
            ;
        //
        //Get the student pannel
        const student:student = school.student;

        // 4.2 get the cell from the student panel that has primary key /school id coordonates
        const cell:cell = student.cells_indexed![String(pk)]['school.id'];

        // 4.3 Select the cell
        cell.select();
        // 
        // show the selection
        cell.td.scrollIntoView({block:"center"});
        }; 
}
// 
//The panel that shows the year in the school
class student extends panel{
    // 
    //Creates a new instance with reference to its parent school page
    constructor(parent:school_page){
        
        //
        //the sql that plots all the students new homo.zone(),
        const sql =`
        select
            progress.progress as \`progress.progress\`,
            school.id as \`school.id\`,
            class.name as \`class.name\`,
            stream.id as \`stream.id\`,
            year.value as \`year.value\`,
            student.name as \`student.name\`

        from
            student
            inner join  progress on progress.student=student.student
            inner join year on progress.year=year.year
            inner join stream on year.stream=stream.stream
            inner join class on stream.class=class.class
            inner join school on class.school=school.school

        order by
            school.name,
            class.name,
            stream.id,
            year.value
         
        `;
        //   
        //Where the data comes from  
        const ds:driver_source = {
            type:'sql',
            sql,
            row_index:'progress.progress'
        };
        //
        //Enhancing data manipulation giving  one functionality of doing more with the data
        const options:table_options = {
            io_type:'read_only',
            
        }
        // 
        //Defining where you want your data in the panel  
        super(ds,  options, parent);
    }   
}
    



// make sure flow of the program is quite clear 
// automate the school panel
// improve on the comments 
// cross checked how sensible output is to whats expected 
// study the select corner method and how its intergration to the school management system



// every panel method to show in each level of each panel to avoid nesting  of the methods 
// secondly try see if you can get the ancestor of a panel start wht the clas panel see how the sql are 
// different firme the desedants query