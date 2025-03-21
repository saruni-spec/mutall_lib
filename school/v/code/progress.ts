import { homo, driver_source, table_options, hetero, plan, table_option_interface, grid 
} from "../../../outlook/v/zone/zone.js";

import { view, view_options } from "../../../schema/v/code/schema.js";
//
//
//Packaging the progress tabulation into a class.
 export class progress extends view{
    //
    //Defining how tracking of students through the years. 
    public progress_homo?:homo.zone;
    public base_sql?:string;
    //
    //Calling the parent class.
    constructor(){
        super();
    }
    //
    //Displaying the student ,years and class distrubtion over the years. 
    async show ():Promise<void>{
        //
        //Calling the base sql method and the path to the sql.
        this.base_sql= await this.get_base_sql('/school/v/code/progress.sql');
        //
        //Formulating an sql that retrieves all the data i need in tracking student progress.
        const sql:string = `
            ${this.base_sql}
            select distinct
                *
            from
                students
        `;
        //
        //Define driver source ..where the data is coming from.
        const ds:driver_source= {
            type:'sql.long',
            sql,
            row:'student_name',
            col:'year_value',
            basic_value:'class_name',
            dbname:'school'
        }
          //
        //allow the adusting of data when  presenting
        const options:table_options = {
            io_type:'read_only'
            
        }
        // 
        //   
        super(ds,  options, parent,'classes');
        // 
        //   
    
        }
        //
        //Creating the body part of the heterezone
        const body = new homo.zone(options,undefined,"progress");
        //
        //Getting the year homozone thats being used as the header 
        const years:homo.zone=(()=>{
            //
            //formulate the sql that retrieve all the years 
            const sql= `
            ${this.base_sql}
            select 
            *
            from
                all_dates
            `
            //
            //Where the data is coming from 
            const ds:driver_source= {
                type:'sql',
                sql,
                row_index:'year_value',
                dbname:'school'
            }
            //
            //Transpose the driver source
            const tds:driver_source={
                type:'transpose',
                source:ds

            }
              //
        //allow the adusting of data when  presenting
        const options:table_options = {
            io_type:'read_only'
            
        }
        // 
        //   
        super(ds,  options, parent,'classes');
            //
            // Use the options specified to create the new homozone
            return new homo.zone
        })();
        //
        //Getting the header for the csv names using the years as the header
        const years2:homo.zone=(()=>{
            //
            //Formulate the sql that retrieve all the years 
            const sql= `
            ${this.base_sql}
            select 
            *
            from
                all_dates
            `
            //
            //Where the data is coming from 
            const ds:driver_source= {
                type:'sql',
                sql,
                row_index:'year_value',
                dbname:'school'
            }
            //
            //Transpose the driver source
            const tds:driver_source={
                type:'transpose',
                source:ds

            }
            //
            //Define the options??
            const options:options={
                driver_source:tds

            }
            //
            // Use the options specified to create the new homozone
            return new homo.zone(options);
        })();
        //
        //Retrieving the csv names of the files where the class distrubtion came from 
        const body2:homo.zone=(()=>{
            //
            //Formulate the sql that retrieve all the data
            const sql= `
            ${this.base_sql}

            select distinct
             *
            from
                sources
    `;
        //
        //Define driver source ..where the data is coming from.
        const ds:driver_source= {
            type:'sql.long',
            sql,
            row:'student_name',
            col:'year_value',
            basic_value:'csv_names',
            dbname:'school'
        }
        //
        //Define the homozone options.
        const options:options = {
            driver_source:ds,
            //
            //Make the cells read-only.
            io_type:"read_only",
        }
        //
        //Creating the body part of the heterezone
    return new homo.zone(options,undefined,"progress");
        })();
        //
        //Displaying the student progress heterozone
        const plan:plan=[
            [new homo.zone(),years,years2],
            [body.leftie,body,body2]
        ]
        //
        //Define zone as a  heterezone  ??why do this
        const zone=new heterozone(plan,undefined,'progress')
        //
        //Plots the progress table.
        await zone.show();
        
    }
    //
    //Retrieve the sql specified by the given path and stored it as a property. 
    async  get_base_sql(sql_path:string):Promise<string>{
        //
        //Get and store the sitting sql that is in file sittings.sql.
        const sql:string= await exec(
            //
            //A php class that communicates with the database.
            "path",
            //
            //Array of constructer arguments.
            [sql_path,true],
            //
            //Specify the name of the method to execute.
            "get_file_contents",
            //
            //An array of the method arguments.
            []
        );
        return sql;
    }
}
// adjustments to the options to implement the new libraries
// see how its done in other projects
// refer to the new library changes ...location of various modules
// page nad panel approach
// homozones, exec
// option are doen different 
