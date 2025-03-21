import { view } from '../code/view';
//
//A quiz generally represents a data collection page for instance a form a quiz is a collection of one
//or more io's.
//In the quiz we have methods that work with a group of ios as a collective
export class quiz extends view {
    //
    constructor() {
        //
        super();
    }
    //
    //Do final preparation to the entire data collection form befor showing it to the users.
    //The preparation includes, but is not limited to, the follwing:-
    //...
    show_panels() { }
    //
    //Here we control the entire data collection process from reading the values to doing validation
    //checks on the collected input and finally returning or saving the data that was collected
    administer() { }
}
//
//Generally an io is a collection of two things the data/ value that we are trying to collect and
//metadata about the data we are collecting. Metadata is data that describes or gives context to the data.
//An io can have a label and a value. The value is the data that is to be colelected
//whereas the label is the metadata. Data without metadata looses its meaning so we need
//to keep track of the metadata as well as the data
/*
The visual representation of the io (proxy) could be as follows:-
    Example1:-
        <label data-field="cname">
            <span>Name:</span>
            <input type="text" id="example"/>
            <span class ="error"></span>
        </label>

    The above example is in label format. The label element will be considerd as our io
    The Name will be the metadata/ the label in our case and the input will be the value
    we also have a span tag that will be usefull in targeted error reporting

    Example2:
        +---------------+-------------------+--------------+
        |    Name       |     age           |   gender     |
        +---------------+-------------------+--------------+
        |    james      |        20         |       M      |
        +---------------+-------------------+--------------+
        |   jane doe    |        25         |       F      |
        +---------------+-------------------+--------------+
        |   john doe    |        40         |       M      |
        +---------------+-------------------+--------------+
        |               |                   |              |
        +---------------+-------------------+--------------+

        The above example is in tabular format
        In the above case take for instance the age column  the age header is metadata
        for the entire column and the individual cells represent the values
*/
//
// The goal of this class is to provide input output functionalities with the
// following objectives in mind:-
// Good user experience(easy to use)
// Good quality data
// Ease of extraction and saving of the infomation collected to a database by programmers
//
// IO will utilize the primary data collection elements
// (input, select, textarea) provided by html and try to organize
// the elemenents in a way that realizes the above objectives.
//
//This is not a stand alone but an extension of the library
//This class also is an abstraction meaning we dont provide the implementation of everything
//in that there are methods that have diferent implementations for different cases.
export class io extends view {
    anchor;
    metadata;
    val;
    //
    //Proxy - Visual representation of the io ?????????
    proxy;
    //
    constructor(
    //
    //The anchor where the io resides
    anchor, 
    //
    //This generaly holds information about the data we are going to collect
    //The metadata could be provided 3 different forms:-
    //  -Friendly
    //  -id
    //  -name
    //  -subject
    //  -len
    //  -io type
    //Check at the type defination above to get explanation on the above metadata types
    metadata, 
    //
    //The value if it is known in advance
    val) {
        //
        super();
        this.anchor = anchor;
        this.metadata = metadata;
        this.val = val;
        //
        //Create the label that will house the actual data collection element
        this.proxy = new label(); //????
    }
    //
    //Given the options and the quiz which the particular io belongs to
    //Check on how to create io form a databasea column
    static create(metadata, parent) { }
}
//
//This class is responsible for handling all the input ios
class input extends io {
    //
    //Acctual input element that will be used for data collection
    input;
    //
    //This will contain the value enterd in the input and is shown when the io is in display mode
    output;
    //
    //The element that tries to enlighten the user on the data that is required
    label;
    //
    //This methods are to aid in the read and populate procedures of  a quiz
    get value() {
        //
        //Return the value that was retrieved from the input element
        //Make sure that the additional white spaces are removed
        return this.input.value.trim();
    }
    set value(input) {
        //
        //Save the original value
        //
        //Given a value be it from a database fill/ populate the input element with the value provided
        this.input.value = String(input);
        //
        //Also reflect the same value in the display mode
        this.output.textContent = String(input);
    }
    //
    constructor(
    //
    //Information that will be helpful in construction of the io
    metadata, 
    //
    //This is information that helps us to know where an io belongs and is to be attached to
    anchor, 
    //
    //The value to associate with the io if it is known in advance
    value) {
        //
        super(anchor, metadata, value);
        //
        //The element that tries to explain the data in a more user friendly form
        this.label = this.document.createElement('span');
        //
        //Create the input element
        this.input = this.document.createElement('input');
        //
        //Create the output element
        this.output = this.document.createElement('span');
    }
    //
    //Using the metadata that was provided by the user complete the creation of 
    //the input and output elements and show them with regard to the display 
    //mode that is selectd
    //
    //We will utilize the metadta provided to influence the rendering
    //The relevant metadata at this stage is as follows:-
    //
    //  -Friendly - if supplied we will use it otherwise we will fetch the 
    //  corresponding comment for the database column associated with the 
    //  particular input
    //  
    //  -subject - This metadata will be used to fetch additional infomation 
    //  from the database that will be helpful in expaining to the user about 
    //  the type of data required and will also influece the rendering process. 
    //  It will also proove to be helpful when saving user input to the database
    //  
    //  -len - If the length of the data is known we will use it to infulence 
    //  both the max size and the size of the io. If it is not present we will 
    //  get this infomation straight from the database
    //  
    // -required - This will influence wether an io should collect mandatory 
    // data or optional data this information could also be accessed from the 
    // database if it is not provided After preparing the input element to the 
    // best of our ability we will then use the provideddisply mode to determine 
    // which element is rendered at which given time
    async render() {
        //
        //If the subject is avilable get the data from the database just in 
        //case the use did not supply all information
        //
        //Start with the friendly. If the friendly was not supplied use the 
        //comments form the database
        //
        //Display the friendly or the comments at the appropriate place(label)
        //
        //Using the len ensure that the correct max size and size is reflected 
        //in the input element If the len is not present use the results form 
        //the database
        //
        //Finally using the information provided to indicate wether the information
        //is mandatory or optional. If that metadata was not provided collecti it
        //form the db information schema
        //
        //Based on the display mode render the appropriate elements
    }
    //
    //We need to take care of what happens whenever the user looses focus
    onblur() { }
    //
    //We need also to be able to transfer focus to this particular input
    focus() {
        this.input.focus();
    }
}
//
//Text area
class textarea extends io {
    //
    //This methods are to aid in the read and populate procedures of  a quiz
    get value() {
        throw new Error('Method not implemented.');
    }
    set value(input) {
        throw new Error('Method not implemented.');
    }
    //
    constructor(metadata, parent) {
        //
        super(metadata, parent);
    }
    //
    //
    render() {
        throw new Error('Method not implemented.');
    }
}
//
//Select
class select extends io {
    //
    //This methods are to aid in the read and populate procedures of  a quiz
    get value() {
        throw new Error('Method not implemented.');
    }
    set value(input) {
        throw new Error('Method not implemented.');
    }
    //
    constructor(metadata, parent) {
        //
        super(metadata, parent);
    }
    //
    //
    render() {
        throw new Error('Method not implemented.');
    }
}
//
//file
class file extends input {
    //
    constructor(metadata, parent) {
        //
        super(metadata, parent);
    }
    //
    //
    render() {
        throw new Error('Method not implemented.');
    }
}
//
//Checkbox
//
class checkbox extends input {
    //
    constructor(metadata, parent) {
        //
        super(metadata, parent);
    }
    //
    //
    render() {
        throw new Error('Method not implemented.');
    }
}
