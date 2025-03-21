//Example of how we could use the zone library for to help in Updating of database entities
//We aim to plot a table of the attributes of the selected entity and the possible options that a
//user could modify on the given attribute.We then will collect this information from the table and
//effect the new entity structure
//
//Import the various functionality from the zone library(Functionality to help in ploting the table)
import { homo, driver_source, obj, hetero, plan, cell } from '../../../outlook/v/zone/zone.js';
//
//TO infuluenct the collection of the attribute type
import { select } from '../../../schema/v/code/io.js';
//
//For error reporting and type defination of any simple datatype
import { basic_value, mutall_error } from '../../../schema/v/code/mutall.js';
//
//For ease in working with html documents
import { view } from '../../../schema/v/code/schema.js';
//
//To avoid repeated calling of methods such as get_ctypes every time a cell is created
//Organize this code in a class and call the method once then save the results for repeated use
//This will also help to avoid doing most html manipulations form first principles
export class edit extends view {
    //
    //Possible column types supported by mysql
    public ctypes?: Array<string>;
    //
    constructor() {
        //
        //Initialize the parent class
        super();
    }
    //
    //This is where we give life to the html page(make the page interactive).
    //We are also going to get the column types form the information schema at this point and store
    //the informtation retrieved for later use.
    public async show(): Promise<void> {
        //
        //Get the circle trpresenting the entity
        const entity: HTMLElement = this.get_element('entity');
        //
        //Add an event listener that will produce the edit dialog on click
        entity.addEventListener('click', () => this.edit());
        //
        //Get and store the possible column types that mysql can support
        this.ctypes = await this.get_ctypes();
    }
    //
    //Plot the table that will be used for data collection on the editing operation of the entity
    //We will utilize the zone library to produce this tabulation
    private async plot(): Promise<void> {
        //
        //The data source as an obj<basic_value>
        //TODO: Work on getting this data from either metavisuo or the information schema
        const data: obj<basic_value> = {
            year: { Type: 'INT', Length: '', 'Is Null': true, Default: null, Comments: '' },
            university: {
                Type: 'VARCHAR',
                Length: 100,
                'Is Null': true,
                Default: null,
                Comments: '',
            },
            surname: {
                Type: 'VARCHAR',
                Length: 50,
                'Is Null': false,
                Default: 'None',
                Comments: '',
            },
            start_date: {
                Type: 'DATE',
                Length: '',
                'Is Null': false,
                Default: 'None',
                Comments: '',
            },
            qualification: {
                Type: 'VARCHAR',
                Length: 100,
                'Is Null': true,
                Default: null,
                Comments: '',
            },
            name: { Type: 'VARCHAR', Length: 100, 'Is Null': false, Default: 'None', Comments: '' },
            initials: {
                Type: 'VARCHAR',
                Length: 2,
                'Is Null': false,
                Default: 'None',
                Comments: '',
            },
            image: { Type: 'VARCHAR', Length: 256, 'Is Null': true, Default: null, Comments: '' },
            end_date: {
                Type: 'DATE',
                Length: '',
                'Is Null': '',
                Default: '9999-12-31',
                Comments: '',
            },
        };
        //
        //Define the driver source as a matrix
        const driver_source: driver_source = { type: 'obj', obj: data };
        //
        //Create a zone of basic values usin the options
        const zone = new homo.zone(driver_source, {
            oncell_init: this.customize_cells,
        });
        //
        //Define a suitable layout to show the table alongside the horizontal and vertical labels
        const plan: plan = [
            [new homo.zone(), zone.get_header()],
            [zone.get_leftie(), zone],
        ];
        //
        //Create a heterozone to help in addition of the labels along the horizontal and vertical
        //axis
        const heterozone = new hetero.zone(plan, undefined, {
            anchor: '#fields',
        });
        //
        //Now show the zone
        await heterozone.show();
    }
    //
    //Query the information schema to get all the possible column types for a mysql column
    private async get_ctypes(): Promise<Array<string>> {
        //
        //Formulate the query to get the list of datatypes from the mysql information schema
        //
        //TODO:Work out how to express the enums and sets????????
        //
        //We are going through all the columns in the infromation schema and extracting all the distinct
        //cases of types used.We also are excluding  the enum and set types for now .In the case of varchar
        //we will also remove the length since we want only the datatype
        const sql: string = `
            SELECT DISTINCT CASE
                WHEN DATA_TYPE IN ('ENUM', 'SET') THEN NULL
                ELSE SUBSTRING_INDEX(COLUMN_TYPE, '(', 1)
            END AS COLUMN_TYPE
            FROM 
                INFORMATION_SCHEMA.COLUMNS
            ORDER BY COLUMN_TYPE;`;
        //
        //Execute the query with the help of the exec and get results
        const results: Array<{ column_type: string }> = await this.exec_php(
            'database',
            ['information_schema'],
            'get_sql_data',
            [sql]
        );
        //
        //Convert the results to an array of string and return the list of options
        return results.map((result) => result.column_type);
    }
    //
    //Target the columns and customize them with the appropriate iotype
    private async customize_cells(cell: cell): Promise<void> {
        //
        switch (cell.index[1]) {
            //
            //The io of the cells located in the first column should be select
            case 'Type': {
                //
                //Create an io of type select
                const select_io = new select(cell.td, undefined, { choices: this.ctypes });
                //
                //Ensure that the value contained in the particular cell is selected by default
                //
                //Finally append the io to the cell
                cell.io = select_io;
            }
            //
            //The second column is of io type number and is only applicable when the cell in column
            //is a varchar
            case 'Length': {
                //
                //Read the value of the type that was selected
                //
                //If the value is varchar then the io type of the length cell is a number
                //otherwise do nothing
            }
            //
            //The next column that is column 3 should be a checkbox
            case 'Is Null': {
                //
                //Create a checkbox io
                //
                //Replace the cell io with the checkbox just created
            }
            //
            //The 4th column should be a input that depends on the type selected in the first column and
            //it should only be applicable in non-null
            case 'Default': {
                console.log('default');
            }
            //
            //Finally the last column should be a text area
            case 'Comments': {
                console.log('length');
            }
        }
    }
    //
    //Open the dialog box once an entity is clicked on
    //The dialog box will be used to collect the proposed modifications on the entity
    private edit(): void {
        //
        //Draw the table
        this.plot();
        //
        //Get the dialog element from the document
        const dlg = <HTMLDialogElement>this.get_element('dialog');
        //
        //Now show the daialog box
        dlg.showModal();
    }
}
