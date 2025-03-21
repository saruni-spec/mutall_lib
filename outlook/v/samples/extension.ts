/*
Use case: Tabulating exam scores with headers. 
Concepts:
    - extending a heterozone
    - path/get_file_contents
*/ 

import {homozone, heterozone, driver_source} from "../zone/zone.js";
//
export class score extends heterozone{
    //
    //The datanase name to use is the school
    public dbname:string = 'school';
    //
    //The body homozone
    public score:homozone;
    //
    //The header
    public subject:homozone;
    //
    //The leftie
    public student:homozone;
    //
    constructor(public base_sql:string){
        //
        super();
        //
        //Set the student
        this.score = this.create_score()
        this.student = this.create_student();
        this.subject = this.create_subject()
        //
        //Set the default empty layout to one that is appropriate for
        //score tabulation
        this.plan = [
            [this.subject.get_leftie(), new homozone(), this.subject],
            [new homozone(), this.student.get_header(),new homozone()], 
            [new homozone(undefined, {io_type:'checkbox'}), this.student, this.score]
        ]    
    }
    //
    //Creates the scores homozone
    create_score():homozone{
        //
        //The name of the column that provides the data that defines the row axes
        const row:string = 'student';
        //
        //The name of the column that provides the data that defines the col axes
        const col:string = 'subject';
        //
        //The count column define the data to be tabulated as cell values
        const basic_value = 'score.value';   
        //
        //Extend the base ctes to formulate the score sql
        const sql:string = `
            ${this.base_sql}
            select * from score`; 
        //
        //Let ds be the source of the data that drives the tabulation
        const ds:driver_source = {type:'sql.long',sql,  row, col, basic_value, dbname:this.dbname};
        //
        return new homozone(ds);
    }

    //Creates the subject
    create_subject():homozone{
        //
        //The name of the column that provides the data that defines the row axes
        const row_index:string = 'subject';
        //
        //Extend the base ctes to formulate the subject sql
        const sql:string = `
            ${this.base_sql}
            select * from subject`; 
        //
        //Let ds be the source of the data that drives the tabulation
        const ds:driver_source = {type:'sql',sql,  row_index, dbname:this.dbname};
        //
        //Create a transposed homozone
        return new homozone(ds, {transposed:true});
    }

    //Creates the student homozne. Transposing is important
    create_student():homozone{
        //
        //The name of the column that provides the data that defines the row axes
        const row_index:string = 'student';
        //
        //Extend the base ctes to formulate the subject sql
        const sql:string = `
            ${this.base_sql}
            select * from student`; 
        //
        //Let ds be the source of the data that drives the tabulation
        const ds:driver_source = {type:'sql',sql,  row_index, dbname:this.dbname};
        //
        //Use the transposed driver source to reate the subject heterozone
        return new homozone(ds);
    }
}
