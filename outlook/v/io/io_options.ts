//
//This is a model of the various optios a user has to influence a given io
//The io optios are just but an extension of the view options
//
import {
    basic_value,
    //
    //To access database column metadata that is stored in the mysql information schema
    //(class representation of a database column)
    column,
    //
    //Set of options that influences/dictates how a view is setup.
    option as view_option,
} from '../../../schema/v/code/schema.js';
//
//Additional identifier to distinguish records when working with the questionaaire system
import { alias } from '../../../schema/v/code/questionnaire';
//
//This is metadata that will help us map a particular io to a database column
//This information will come in handy when writting the value of the io to the database automatically
type subject = [
    //
    //???????
    //
    //The table/entity where the value will be saved
    ename: string,
    //
    //The column where the value belongs
    cname: string,
    //
    //This is useful in distingushing between two records going to the same entity and column
    //The alias prevents records from being ovewritten
    alias: alias,
    //
    //The database to save the data
    dbname: string
];
//
//This structure will be responsible for holding options that are general to all ios
interface option extends view_option {
    //
    //This are the labels that are user friendly and self explanatory and are to displayed before
    //the input element to guid the user on what data to enter to the io.
    caption: string;
    //
    //This is an identifier that is used to retrieve the entire io from the document
    id: string;
    //
    //This type of identifier is essntial when passing the data from the io to a remote server.
    //The name given to the input elements are normaly the keys used to access the value at the
    //$_POST global variable
    name: string;
    //
    //This is much more formal defination of a database column.
    subject: subject;
    //
    //We need to know the type of the io that is desired,e.g., select, password, email, etc
    io_type: io_type;
    //
    //The mode of display that the particular io will be renderd in
    //The edit is when the io is in data capture mode and the normal is to display the captured data
    display: 'edit' | 'normal';
    //
    //Is the value optional or mandatory
    required: boolean;
    //
    //The database schema column to support crud services
    //TODO: A column could either be a column or in terms of a subject???????? think about it.....
    col: column;
}
//
//various variants of an input element
export type input_type =
    | 'text'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'time'
    | 'email'
    | 'password'
    | 'checkbox' // multiple choice
    | 'radio' //Single choice
    | 'color' //Defines a color picker
    | 'hidden' //A hidden input field
    | 'button'
    | 'submit'
    | 'tel'
    | 'range'
    | 'select'
    | 'textarea'
    | 'url'; // slider range control
//
//Since input elements have some attributes that apply to all the input elements we will group the
//common atributes then try to make more specialized inputs out of this by extension
interface Input {
    type: input_type;
    value: basic_value;
    //
    //Prevents interaction or form submission with the input
    disabled: boolean;
}
//
//This is the data required to plot a simple text input.
interface text extends Input {
    type: 'text';
    //
    //The Physical length and number of characters a text input could allow
    length: number;
    //
    //To add a datalist that will be associated with the given input for autocomplete sugesstions
    list: Array<basic_value>;
}
//
//A number input
//The name int was forced since number is alredy a javascript keyword
interface int extends Input {
    type: 'number';
    //
    //When dealing with input of type number we have the option to specify a range in which we
    //can collect the numbers from
    //
    //Upper bound of the range
    max: number;
    //
    //The lower bound of the range
    min: number;
}
//
//Date ,datetime and a time inputs all have simmilar attributes. The only difference is in the format
//of the values one supplies
//In the case of a date the value supplied for the max, min and value should be a string of the format
//YYYY-MM-DD
//If the input is of type datetime-local the format for the string supplied is YYYY-MM-DDTHH:MM:SS.sss
//whereby the seconds and mili seconds are optional
//
//Finnaly for time the format of the string is HH:MM:SS
interface date_time extends Input {
    type: 'date' | 'datetime-local' | 'time';
    //
    //The earliest selectable date in the input field
    min: string;
    //
    //Defines the latest selectable date
    max: string;
}
//
//For a text area they tend to approach the size in a different way. The text area has a maxLength
//attribute for controling the maximum number of characters it can allow simmilar to a tex input
//but also we have a cols and rows attribute to regulate the physical size of the text area
interface textarea extends Input {
    type: 'textarea';
    //
    //The number of characters that can be typed
    length: number;
    //
    //The number of characters that can be typed in a single line
    cols: number;
    //
    //The vertical size of the text area
    rows: number;
}
//
//This infomation  is usefull for informing the io system on the element that will be used for data
//collection along side other information required to create the element
//TODO: Investigate wether if we say Input it accomodates all the extensions
type io_type = Input | text | int | date_time;
