//
//Import the server execute method from our library
import{exec} from "../../../schema/v/code/server.js";
//
//Import the view 
import {mutall_error, view} from '../../../outlook/v/code/view.js';
//
//Import driver_source/sql
import {homozone, driver_source,heterozone, plan,options, cell, coord} from "../../../outlook/v/zone/zone.js";
//
//Package all the exam tabulation operations in the class below
export class  exam extends view {
    //
    //These are the properties that are used in making up my exam interface
    public sitting_hetero?:heterozone;
    public sitting_homo?:homozone;
    public score_heterozone?:heterozone;
    public score_homo?:homozone;
    //
    //The sql that will be used as the base sql for retrieving sitting data to be
    //tabulated
    public base_sql?:string;
    //
    //This is the basic value that shows in my score
    public basic_value:'score.value'|'percent'='percent';
    //
    //This is the sitting number for whose score you want to display
    public sitting_number:number=26;
    //
    //This will help in instance creation
    constructor(){
        //
        //Call the parent constructor
        //This done because class exam extends view 
        super();
        
    }
    //
    //Getting the sitting ,stream and exam homozones into a heterezone
    get_sitting_heterozone():heterozone{
        //
        //Plot the class table given the base sql 
        const stream:homozone=(()=>{
            //
            // 1 Formulate a query for selecting class_stream
            const class_sql:string=`
            ${this.base_sql}
            select distinct
                \`stream.stream\`,
                class_stream
            from
                all_sitting
        `;
        //
        //2 Define the source of the data that drives the tabulation for the body
        const ds:driver_source = {
            type:'sql', 
            sql:class_sql, 
            row_index:'stream.stream', 
            dbname:'school'
        };
        //
        //3 Formulate a transpose data source 
        //why are we tranposing here??
        const driver_source:driver_source={
            type:"transpose",
            source:ds
        };
        //
        //4 Define the homozone options
        const options:options = {
            driver_source,
            //
            //Make the cells read-only
            io_type:"read_only",
        }
        //
        //5 Create the year homozoneen size
        return new homozone(options)
    ; 
        })();
        //
        //Sitting date homozone  
        const date:homozone=(()=>{
            //
            //1 Define the sql for selecting distinct sitting dates
            const sql:string=`
                ${this.base_sql}
                select distinct
                    \`sitting.date\`,
                    sitting
                from
                    all_sitting   
                order by
                    \`sitting.date\`
            `;
            //
            //2 Define the data source of the (simple) sql type
            const ds:driver_source={
               type:"sql",
               sql,
               row_index:"sitting.date",
               dbname:"school"
            };
            //
            //3 Define the homozone options and driver source will be one of them
            const options:options={
                driver_source:ds
            };
            //
            //4 Use the option to create and return the homozone
            return new homozone(options,undefined,"sitting")  
        })();
        //
        //This is gets  the examination homozone.
        this.sitting_homo=(():homozone=>{
            //
            //Formulate the sql for retrieving tabulation data
            const sql:string = `
                ${this.base_sql}
                select distinct
                    \`stream.stream\`,
                    \`exam.id\`,
                    \`sitting.date\`
                from
                    all_sitting
            `;
            //
            //The name of the column that provides the data that defines the row axes
            const row:string = 'sitting.date';
            //
            //The name of the column that provides the data that defines the col axes
            const col:string = 'stream.stream';
            //
            //The count column define the data to be tabulated as cell values
            const basic_value = 'exam.id';   
            //
            //The name of the database where the tabulation data comes from
            const dbname = 'school';
            //
            //Let ds be the source of the data that drives the tabulation
            const ds:driver_source = {type:'sql.long',sql,  row, col, basic_value, dbname};
            //
            //Define the homozone options
            const options:options = {
                driver_source:ds,
                //
                //Make the cells read-only
                io_type:"read_only",
                //
                //Add a click event listener to a cell in this homozone to let us
                //display new exam results in the score heterozone
               onclick:async (cell:cell)=> await this.onclick_sitting()
            }
            //
            //Create a zone of exam names
            const zone = new homozone(options,undefined,"sitting");
            //
            return zone
        })();
        //
        //Define the heterezone plan
        const plan:plan=[
            [new homozone(),stream],
            [date,this.sitting_homo]
        ];
        //
        //Use the plan to create the heterozone
        return new heterozone(plan,undefined,undefined,"#sitting");
    }
    //
    //Getting the score ,student and subject homozones into a heterozone
    get_score_heterozone():heterozone{
        const condition=this.get_condition();
        //
        //The student scores section 
        this.score_homo=(()=>{
            //
            //1 Sql for retrieving score data that will be tabulated
            const sql:string = `
                ${this.base_sql}
                select
                    \`performance.performance\`,
                    \`candidate.candidate\`,
                    \`score.value\`,
                    \`percent\`
                from
                    student_score
                ${condition} 
            `
            //
            //2.1 The name of the column that provides the data that defines the row axes
            const row:string = 'candidate.candidate';
            //
            //2.2 The name of the column that provides the data that defines the col axes
            const col:string = 'performance.performance';
            //
            //2.4 The name of the database where the tabulation data comes from
            const dbname = 'school';
            //
            //2.5 Compile the complete driver_source 
            const driver_source:driver_source = {
                type:'sql.long',
                sql:sql,  
                row, 
                col, 
                basic_value:this.basic_value,
                dbname
            };
            //
            //3 Specify the zone options
            const options:options={
                driver_source
            }
            //
            //4 Use the options to  create the homozone of percent scores
            return new homozone(options);
        })();
        //
        //showing the students names
        const student:homozone=(()=>{
            //
            //1 Formulate the sql for ploting the students (its in the base_sql)
            const sql=`
                ${this.base_sql}
                 select distinct
                \`candidate.candidate\`,
                \`student.name\`  
            from
                student_score
            ${condition}
            `;
            //
            //2 Specify the driver of the students table; its an sql
            const driver_source:driver_source={
                type:"sql",
                sql,
                row_index:"candidate.candidate",
                dbname:"school"
            }
            //
            //3 Define the options for creating the homozone
            const options:options={driver_source};
            //
            //4 Creating a homozone
            return new homozone(options);
            
        })();
        //
        //Show the subjects name
        const subject:homozone=(()=>{
            //
            //1 Formulate the sql for ploting the subjects (its in the base_sql)
            const sql=`
                ${this.base_sql}
                select distinct
                    \`performance.performance\`,
                
                     \`subject.id\` 
                   ${this.basic_value==='percent'?'': '\`performance.out_of\`'}
                      
                from
                    student_score
                ${condition}
            `;
            //
            //2 Specify the driver of the subjects table; its an sql
            const ds:driver_source={
                type:"sql",
                sql,
                row_index:"performance.performance",
                dbname:"school"
            }
            //
            //2.1 Making sure my table displays the way i want
            const driver_source:driver_source={
                type:"transpose",
                source:ds
            }
            //
            //3 Define the options for creating the homozone
            const options:options={driver_source};
            //
            //4 Creating a homozone
            return new homozone(options);
        })();
        //
        //Retrieving the total scores per student
        //show the summaries on demand  
        const summary_right:homozone=(()=>{
            const sql=`${this.base_sql}
                select 
                    \`candidate.candidate\`,
                    sum(\`score.value\`)as total,
                    count(\`score.value\`)as count,
                    round(avg(\`score.value\`), 0) as avg
                from
                    student_score
                ${condition}
                group by
                    \`candidate.candidate\`
                `;
            //
            //???Where and type of my data
            const ds:driver_source={
                type:'sql',
                sql,
                row_index:'candidate.candidate',
                dbname:'school'
            };
            //
            //Define the drivers options for the homozone
            const options:options={driver_source:ds};
            //
            return new homozone(options);
        })();
        //
        //Retrieving the total scores of students per subjects 
        const summary_bottom:homozone=(()=>{
            const sql=`${this.base_sql}
                select 
                    \`performance.performance\`,
                    sum(\`score.value\`)as total,
                    count(\`score.value\`)as count,
                round( avg(\`score.value\`))as avg
                from
                    student_score
                ${condition}
                group by
                    \`performance.performance\`
                `;
            //
            //??
            const ds1:driver_source={
                type:'sql',
                sql,
                row_index:'performance.performance',
                dbname:'school'
            };
            //
            //??
            const ds:driver_source={
                type:'transpose',
                source:ds1
            }
            //
            //define the drivers options for the homozone
            const options:options={driver_source:ds};
            //
            return new homozone(options);

    })();
        //
        //Depending on whats tabulated different plans can be plotted'percent'|'raw'
        const plan:plan=(()=>{
            if (this.basic_value==='percent')
                return [
                   [new homozone(),subject,new homozone()],
                    [student,this.score_homo,  summary_right],
                    [new homozone(),summary_bottom,new homozone()]
                ];
            else 
                return [
                    [new homozone(),subject],
                    [ student,this.score_homo],
               ];
        })();
        //
        //Define a homozone
        return new heterozone(plan,undefined,undefined,"#score");
    }
    //
    //Plots the sitting table
    async show ():Promise<void>{
        //
        //Complete the construction of the exam results including the base sql and the sitting heterezone
        //??
        await this.init();
        //
        //Plots the sitting table
        await this.sitting_hetero!.show();
        //
        //Update the score sub_systems based on the current sitting
        this.update_scores(this.sitting_number);
    }
   //
   //Complete the exam construction by initialising the base sql and the sitting hetero
    async init(): Promise<void>{
        //
        //Read the base sql from its file
        this.base_sql=await this.get_base_sql('/school/v/zone/exam.sql');
        //
        //Set the sitting heterezone
        this.sitting_hetero = this.get_sitting_heterozone();
    }
    //
    //Initialize the seating and score sub-systems. This means 3 things:-
    //- A Get the cell that matches the sitting 
    //-B Highlight the cell by simulate the click action 
    //on the highlighted cell 
    //-C Scrolling the selection to view
    async update_scores(sitting:number):Promise<void>{
        //
        //- A Get the cell that matches the sitting 
        //
        //1 Formulate & execute the sql to get the row and column indices of a
        // sitting
        //
        //1.2 Formulate the sql
        const sql:string=`
            ${this.base_sql}
            select 
                \`stream.stream\`,
                \`sitting.date\`
            from
                all_sitting
            where
                \`sitting.sitting\`=${sitting}
        `;
        //
        //1.3 Execute the sql
        const result:Array<{[cname:string]:string}>=await exec(
            'database',
            ["school",false],
            "get_sql_data",
            [sql]
        );
        //
        // 2 Get the indexed cell from the sitting homozone
        //
        // 2.1. Get the row from the results
        const row:string=result[0]["sitting.date"];
        //
        // 2.2 Get the column from the results
        const col:string=result[0]["stream.stream"];
        //
        // 2.2 Get the indexed cell using the row/ column indices
        //
        // 2.2.2 Retrieve the cell from the exam homozone using the indices
        const cell:cell=this.sitting_homo!.cells_indexed![row][col];
        //
        // 2.2.3 Get  the td of the cell
        const td: HTMLTableCellElement=cell.td;
        //
        // -B Highlight the cell by simulate the click action
        td.click();
        //
        // -C Scrolling the selection to view
        td.scrollIntoView({behavior:'smooth',block:'center'});
        //
        //After this we  get the scores section plotted 
        //is this flow going line after line other function only execute when called ??
    }
    //
    //Display new exam results (in the score heterozone) that match the given cell
    //alert when a cell i clicked alert('cell clicked');
    async onclick_sitting():Promise<void>{
        
        //
        //Construct the score table given the constraints
        this.score_heterozone =this.get_score_heterozone(); 
        //
        //Clear the score region before doing a new tabulation
        this.get_element("score").innerHTML = "";
        //
        //show the table
        this.score_heterozone!.show();

        
    }
    //
    //Event handler for updating the score table based on the changes to the radio buttons 
    onchange_basic_value(){
        //
        //Read the selected score type from the radio buttons
        const element:HTMLInputElement|null = document.querySelector("input[type=radio]:checked");
        //  
        //When no inputs was selected we will abort this process with an alert
        if (!element)
            throw new mutall_error('Please select the score type');
        //
        //Get the checked value as a type of input
        this.basic_value=element.value;
        //
        const score:heterozone = this.get_score_heterozone();
        //
        //Clear the last score values
        this.clear_score();
        //
        score.show();
    }
    //
    //Clears the scores table that was previously displayed
    //Add a data type in the function ?? 
    clear_score(){
        //
        //Get the element where the score table is linked
        const elem = this.get_element('score');
        //
        //Emptys inner html
        //am able to have only a single score displayed in a sitting
        elem.innerHTML='';
    }
    //
    //A function that takes care of creating a new sitting
    //by this one should be able to achieve the following add a new class,new years
    sitting_create(){}
    //
    //update the existing exams sittings
    //be able to edit the various homozones 'allow edit  mode'
   update_sitting(){}
        //when a cell is clicked you turn into edit mode on the score heterezone
        //you are provide with classes and sitting dates
    //Formulate the condition if a cell is selected 
    get_condition():string{
        //
        //Nothing in the sitting homo throw a new mutall error?
        if(!this.sitting_homo)
           throw new mutall_error('The sitting homozone is not set',this);
        //
        //Get the current selected cell of the  sitting  heterozone
        const cell=this.sitting_homo.cell
        //
        //Ensure there is a selection 
        if(!cell)
            throw new mutall_error('Not  is cell selected');
        //
        //Get the sitting.date and the stream.stream values that match the current
        //cell 
        const index:coord<string> = cell.index;
        //
        //Destructure the index to reveal the sittiing date and stream primary key
        const [date, stream] = index;
        //
        //Formulate a score selection criteria
        //why are we using this style of sql ..just staing the sitting condition?
        const condition = `where \`sitting.date\` = '${date}' and \`stream.stream\`=${stream}`
        //
        return condition;
    }
    //
    //Retrieve the sql specified by the given path and stored it as a property in
    //the class exam
    async  get_base_sql(sql_path:string):Promise<string>{
        //
        //Get and store the sitting sql that is in file sittings.sql
        const sql:string= await exec(
            //
            //Name of the php class to use is database
            "path",
            //
            //Array of constructer arguments
            [sql_path,true],
            //
            //specify the name of the method to execute
            "get_file_contents",
            //
            //An array of the method arguments
            []
        );
        return sql;
    }
}
