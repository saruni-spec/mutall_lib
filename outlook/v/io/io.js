//
//This is code written with the aim of collecting data in a more user friendly and less error-prone
//manner using a much more sophisticated input element build from the simple elements provided by
//html
//
import { 
//
//To work with html documents much ease and reduce boiler plate code
view, } from '../../../schema/v/code/schema.js';
//
//Generally an io is a collection of two things the data/ value that we are trying to collect and
//metadata about the data we are collecting. Metadata is data that describes or gives context to the data.
//Data without metadata loose its meaning so we need to keep track of the metadata as well as the data
/*
The html that represents the io is as follows:-
    Example1:-
        <label data-subject=$subject data-id=$id>
            <span>$annotation</span>
            <input type=$io_type name=$name size=$len maxlength=$len required/>
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
    metadata;
    anchor;
    val;
    //
    //This will contain the value entered in the input and  is shown when the io is in display mode
    output;
    //
    //The element that will be used for data collection from the user
    element;
    //
    //The targeted error reporting section of the io
    error;
    //
    constructor(
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
    //The anchor where the io resides
    anchor, 
    //
    //The value if it is known in advance
    val) {
        //
        super(anchor?.parent, metadata);
        this.metadata = metadata;
        this.anchor = anchor;
        this.val = val;
    }
    //
    //TODO:Imporve on the comments
    //Different ios are displayed in a different ways. Since we do not have a general display catering
    //for all the ios We will try to address the common elements that all the ios must have and
    //leave  the specifics to the various ios for implementation. When doing the rendering of an io
    //we also need to consider the mode which the io should be viewed in.
    //Ios generaly have a display and an edit mode.
    //We also need to ensure that the output content are in sync with whatever is entered on the
    //input element.
    async render() {
        //
        //Use the avilable metadata to set the db column
        this.metadata.col = await this.set_column();
        //
        //Create the label that will house the individual components that make up the io
        this.proxy = await this.label_create();
        //
        //Create the output element
        this.output = this.create_element('output', this.proxy);
        //
        //Create the section that will be used for targeted error reporting
        this.error = this.create_element('span', this.proxy, { className: 'error' });
        //
        //Attach the listener to toggle between input and normal mode
        this.proxy.addEventListener('click', () => this.toggle_visibility());
        //
        //Prevent the element from propagating the click event to the proxy
        //found it much common when implementing the input io
        this.element.addEventListener('click', (event) => event.stopPropagation());
        //
        //When the user looses focus shift back to display mode
        this.element.addEventListener('blur', () => this.toggle_visibility());
        //
        //Add a listener that will ensure that the input and the output are always in sync
        this.element.addEventListener('input', () => (this.output.textContent = String(this.value)));
    }
    //
    //Use the metadata to try and set the db column among the metadata options
    async set_column() {
        //
        //Destructure the metadata to get the relevant bits and pieces
        const { col, subject } = this.metadata;
        //
        //If the column was provided return it as it is
        if (col)
            return col;
        //
        //If the subject is present get_the column
        if (subject) {
            //
            //The stucture of the subject destructure the subject
            //type subject = [ename: string,cname: string,alias: alias,dbname: string]
            const [ename, cname, , dbname] = subject;
            //
            //Use the subject info to produce a db column
            return await this.get_column(ename, cname, dbname);
        }
        //
        //When we get here we have no infomation to link this particular io to a db column so return
        //undefined
        return;
    }
    //
    //Create the label element that will house the specific elements to be associated by an io
    //TODO:Best action when you want to destructure an object that possibly could be undefined
    async label_create() {
        //
        //Destructure the anchor to get its individual components
        //const { element, parent } = this.anchor;
        //
        //Look for the anchor where the label is to be placed
        //If the anchor is not there we look to see if the parent is provided and use its proxy otherwise
        //use the document body as an anchor
        const anchor = this.anchor?.element
            ? this.anchor.element
            : this.anchor?.parent
                ? this.anchor.parent.proxy
                : this.document.body;
        //
        //Create a label element attached at the most appropriate section ( depending on infomation
        //given)
        const label = this.create_element('label', anchor);
        //
        //Add the data-subject and data-id to the label element
        //
        //Data subject - Formal defination that maps this io element to a database column
        //Conversion is nessesary since the subject is a tuple
        if (this.metadata.subject)
            label.setAttribute('data-subject', JSON.stringify(this.metadata.subject));
        //
        //A custom identification attribute tat could be used to retrieve this particular io
        if (this.metadata.id)
            label.setAttribute('data-id', this.metadata.id);
        //
        //Look for the user friendly label amongest the options provided. If it is not explicitly
        //given use the other metadata to try and deduce the most sensible annotation for the given
        //io
        const annotation = await this.label_get_annotation();
        //
        //Create the span to hold the friendly label
        //TODO:Investigate why innerHTML is interpreated as an attribute when you assign undefined
        this.create_element('span', label, {
            textContent: annotation ? `${annotation.toUpperCase()}: ` : '',
        });
        //
        //Since the label will be the proxy of the io return it for saving
        return label;
    }
    //
    //Check the provided options for the user friendly label that will be appended next to the
    //input element in the label. If the friendly option is not provided use other additional
    //options to provide an appropriate friendly label from the io
    //TODO: Make a desicion on what to do if none of the metadata provided could give a suitable
    // name???
    async label_get_annotation() {
        //
        //Desturcture the metadata to get the useful componets required at this point
        const { col } = this.metadata;
        //
        //Check the option to see if the friendly label was provided
        if (this.metadata.annotation)
            return this.metadata.annotation;
        //
        //When we get here we know that the friendly label was not provided by the user
        //so look through the rest of the metadata provided to decide which is the best label to use
        //
        //With a subject or a db column we could try and get information stored at the column level
        //such as the comment or possibly the column name. If either of the two are provided use this
        // avenue to try and formulate a user friendly annotation/ label for the io
        if (col)
            return col.comment ?? col.name;
        //
        //If the subject is not there use the specified id or name
        //TODO:Investigate if the construction bellow will work???????
        return this.metadata.id ?? this.metadata.name;
    }
    //
    //Get the relevant information to signify if an io is optional or mandatory
    async is_required() {
        //
        //Destructure the metadata
        const { required, col } = this.metadata;
        //
        //Confirm from the metadata provided if the given input is required or mandatory
        if (required)
            return required;
        //
        //If that information was not provided we have to deduce it from the database column
        if (col)
            return col.is_nullable === 'YES' ? false : true;
        //
        //The default is to make that field optional
        return false;
    }
    //
    //Get the maximum length of characters a particular input could accomodate. This value is either
    //Provided explicitly via the options used to create this io or we could infer the most suitable
    //length from the database. In the column we mostly have length constraints in columns with
    //the data type of varchar
    async get_length() {
        //
        //Destructure the metadata to get the important bits for this work
        const { len, col } = this.metadata;
        //
        //If the length was explicitly provided by the user in the options return it as is
        if (len)
            return len;
        //
        //We have to deduce the length from the dbase column since the value was not explicitly given
        if (col)
            return col.data_type === 'varchar' || col.data_type === 'text' ? col.length : undefined;
        //
        //Use the elements default settings
        return undefined;
    }
    //
    //Use the metadata to try and produce the most sensible name that will be useful in uploding of
    //the data to the server
    async get_name() {
        //
        //Destructure the metadata
        const { name, col, id } = this.metadata;
        //
        //If the name is provided use it as it is
        if (name)
            return name;
        //
        //use the column name if the name is not present
        if (col)
            return col.name;
        //
        //The id could also be used if none of the above was found
        if (id)
            return id;
        //
        //If none of the above was provided return nothing
        return;
    }
    //
    //This is a listener that acts on the entire io and helps us to toggle between edit and normal
    //mode by showing the relevant element depending on the mode
    toggle_visibility() {
        //
        //Toggle to either hide or show the input element
        this.element.classList.toggle('hidden');
        //
        //Toggle the visibility of the output element to either show or hide it
        this.output?.classList.toggle('hidden');
    }
}
//
//This class is responsible for handling all input output operations that are done using the input
//html element.
//TODO: Further tests are required
export class input extends io {
    //
    //This methods are to aid in the read and populate procedures of  a quiz
    //This method will help us retrieve whatever value the input contains
    get value() {
        //
        //Return the value that was retrieved from the input element
        //Make sure that the additional white spaces are removed
        return this.element.value.trim();
    }
    //
    //Given a value the io should reflect the value. This is helpful when you have some data and want
    //the user to modify the data
    set value(input) {
        //
        //Save the original value
        //
        //Given a value be it from a database fill/ populate the input element with the value provided
        this.element.value = String(input);
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
        super(metadata, anchor, value);
        //
        //Create the input element
        this.element = this.document.createElement('input');
    }
    //
    //TODO: In the case of a number io we do not need to set the size and only need to limit the max
    //and min - some sort of range where the number could fall between
    //
    //Here we will be adding the various attributes to the input element depending on the metadata
    //the user provided.
    //The attributes we will be adding are:-
    //- type
    //- required
    //- size
    //- maxLength
    //- name
    //- hidden - coordination of which element we need to show depending on the display mode(edit or normal)
    //          when in edit mode we show the input element and when we are in normal mode we show
    //          the output element displaying whatever was entered
    //After adding all this attributes we populate the input element if this io was created with some
    //default value in mind.
    async render() {
        //
        //Ensure that the aspects of the io that are to be taken care at the io level are done
        //The parent will create the proxy of the io which will house the various elements in the io
        await super.render();
        //
        //Create the specified type of input by default the input is a basic text input
        this.element.type = await this.get_iotype();
        //
        //Indicate if the data is mandatory or optional
        if (await this.is_required())
            this.element.required = true;
        //
        //Display the maxlength and size of the input element
        //
        //Get the length
        const length = await this.get_length();
        //
        //We only set the length if something is available
        if (length) {
            //
            //maxlength of characters the input element will allow to be typed by the user
            this.element.maxLength = length;
            //
            //physical size of the input element
            this.element.size = length;
        }
        //
        //finally set the approprite name to the input element
        this.element.name = (await this.get_name())
            ? (await this.get_name())
            : '';
        //
        //Render the io in the either edit or normal mode dependig on what the options dictate
        //The default rendering is normal mode
        this.metadata.display == 'edit'
            ? this.output?.classList.add('hidden')
            : this.element.classList.add('hidden');
        //
        //If an initial value was provided update the input and output to reflect the value provied
        //TODO:What is the best time to set the value we came with ???????
        //TODO: It is not that simple and straight forward?????
        if (this.val)
            this.value = this.val;
        //
        //When an io is required and the user looses focus without adding anything to the io
        //alert them that the particular io is mandatory
        this.element.addEventListener('blur', () => this.onblur());
        //
        //When the user start to input we need to clear the error
        this.element.addEventListener('input', () => (this.error.textContent = ''));
        //
        //THis step can only be called during the rendering process since at this point even the
        //proxy of the parent element has not yet been created...
        //Insert the input element just before the output element
        this.proxy.insertBefore(this.element, this.output);
    }
    //
    //Using the avilable metadata try to get the most accurate type of input.
    //TODO:Are text and number the only input types????
    //TODO: This section needs to be thought out more critically
    async get_iotype() {
        //
        //Destructure the options to get the most relevant bits that will support this work
        const { col, io_type } = this.metadata;
        //
        //If the type is explicitly given amongest the options respect it and return it as is
        if (io_type)
            return io_type;
        //
        //If no database column is provided then set the input type to be text
        if (!col)
            return 'text';
        //
        //When we get here we resort to using the other options provided by the user to try and deduce
        //the most appropriate iotype.
        switch (col.data_type) {
            case 'varchar':
            case 'text':
                return 'text';
            case 'float':
            case 'double':
            case 'int':
            case 'decimal':
            case 'serial':
            case 'bit':
            case 'mediumInt':
            case 'real':
                return 'number';
            default:
                return 'text';
        }
    }
    //
    //We need to take care of what happens whenever the user looses focus
    //TODO: For now i will use this function to produce an error message if the io is mandatory and
    //the user provided nothig
    onblur() {
        if (this.element.required && this.value === '')
            this.error.textContent = 'This field is required. Please fill it out.';
    }
    //
    //We need also to be able to transfer focus to this particular input
    focus() {
        this.element.focus();
    }
}
//
//The text area class is an io extension of a simple input to allow
//us to capture large amounts of text in an expandable box.
//TODO:Yet to test
export class textarea extends io {
    //
    //This methods are to aid in the read and populate procedures of  a quiz
    get value() {
        //
        //Return the value that was retrieved from the textarea element
        //Make sure that the additional white spaces are removed
        return this.element.value.trim();
    }
    //
    //Given a value the io should reflect the value. This is helpful when you have some data and want
    //the user to modify the data
    set value(val) {
        //
        //Save the original value
        //
        //Given a value be it from a database fill/ populate the textarea element with the value provided
        this.element.value = String(val);
        //
        //Also reflect the same value in the display mode
        this.output.textContent = String(val);
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
        super(metadata, anchor, value);
        //
        //Create the Text area element that will be used for data collection
        this.element = this.document.createElement('textarea');
    }
    //
    //Create the textarea element that will be used by this instance for data collection
    async render() {
        //
        //Ensure that the aspects of the io that are to be taken care at the io level are done
        //The parent will create the proxy of the io which will house the various elements in the io
        await super.render();
        //
        //Indicate if the data is mandatory or optional
        this.element.required = await this.is_required();
        //
        //Ensure that the text area allows the required number of characters and is of the specified
        //physical size. The length will be used as the maximum number of charactes the text area
        //can allow and it is either specified or it is deduced from the database column if any was
        //provided. if no length was provided or deduced we will not set this attribute. The physical
        //size of a text area is controlled by the rows and cols attribute we could read them from
        //the user defined options but if they are not specified we will try to infer an appropriate
        //size based on the number of characters the text area is to allow. If we are not able to infer
        //we will leave the text area with the default settings
        //
        //Get the length
        const length = await this.get_length();
        //
        //set the Maximum number of characters the textarea element will allow to be typed by the user
        //only if the length was specified or deduced from the database column
        if (length)
            this.element.maxLength = length;
        //
        //Use the available information to suggest the most sensible rows and columns
        const size = this.get_size(length);
        //
        //We will only set the size if we have it
        if (size) {
            //
            //Destructure the size into its row and column components
            const [rows, cols] = size;
            //
            //Update the rows and cols attributes of the textarea element
            if (rows)
                this.element.rows = rows;
            if (cols)
                this.element.cols = cols;
        }
        //
        //Set the approprite name to the text area .This name will be useful when retrieving data
        //posted to the server via the forms default submit behaviour
        this.element.name = (await this.get_name())
            ? (await this.get_name())
            : '';
        //
        //Render the io in the either edit or normal mode dependig on what the options dictate
        //The default rendering is normal mode
        this.metadata.display == 'edit'
            ? this.output?.classList.add('hidden')
            : this.element?.classList.add('hidden');
        //
        //If an initial value was provided update the text area and output to reflect the value provied
        if (this.val)
            this.value = this.val;
        //
        //Insert the text area element just before the output element
        this.proxy.insertBefore(this.element, this.output);
    }
    //
    //Determine the physical size of a text area element in terms of rows and columns
    //return the rows and cols as a tuple if they were supplied by the user in the metadata and
    //if the user never supplied them we try to deduce the most appropriate size using the number
    //of characters the text area is to allow. We will make the asumption that a single row allows
    // 50 characters
    get_size(length) {
        //
        //Destructure the options to get the most relevant bits that will support this work
        const { cols, rows } = this.metadata;
        //
        //If the columns and rows are provided use them as they are
        if (cols && rows)
            return [rows, cols];
        //
        //If one of the two attributes are provided also return them
        //TODO:How will we handle a situation whereby one of the two is missing???????
        if (cols)
            return [undefined, cols];
        if (rows)
            return [rows, undefined];
        //
        //if the length is present decide on the number of rows and colums to return
        //round up to ensure all characters will be visible
        if (length)
            return [Math.ceil(length / 50), 50];
        return;
    }
}
//
//TODO:THink more about selections there are 3types of selections
//1. Radio based
//2. Checkbox based
//3. Dropdown based
//
//Although the radio and the checkbox are inputs it makes sense to have them as selections since
//it is very rare to find only one radio button in use. This shows that you could have 5 radio buttons
//but one io. This selection class is aimed to handle this situation. Although you could have a simple
//checkbox io that could be used to collect boolean values you could also have an io with more than
//one checkbox.
//
