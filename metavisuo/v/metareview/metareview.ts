import { attribute, database, entity, relation } from '../code/metavisuo.js';
import { metaerror } from '../metaerror/metaerror.js';
import { mutall_error, svgns } from '../../../outlook/v/code/view.js';
import { exec } from '../../../schema/v/code/server.js';
import {
    Idatabase,
    foreign,
    primary,
    database as schema_database,
} from '../../../schema/v/code/schema.js';
//
//Define the type to hold the viewbox settings
type vb_settings = { pan_x: number; pan_y: number; zoom_x: number; zoom_y: number };
//
//Database settings useful when constructing the erd
type info = {
    hidden: Array<string>;
} & vb_settings;
//
//Db initialization settings
type init = { [dbname: string]: info };
//
// A class to improve the review functionalities of metavisuo
export class metareview extends metaerror {
    //
    constructor() {
        //
        //Instantiate the parent class
        super();
    }
    public async show_panels(): Promise<void> {
        //
        //Carry out with showing pannels by the parent class
        await super.show_panels();
        //
        //Add the number of records each entity has
        this.record_count();
        //
        //Add all the comments and datatypes which are hidden by default
        this.add_metadata();
        //
        //Add the functionality to show/hide the datatypes
        this.get_element('data_types').onclick = () => this.toggle_metadata('data_type');
        //
        //Do a simmilar thing for the comments
        this.get_element('comments').onclick = () => this.toggle_metadata('comment');
    }
    //
    //Addition of the count of records that each entity has
    private record_count(): void {
        //
        //Ensure that the current db is present
        if (!this.current_db) throw new mutall_error('Please ensure you have selected a database!');
        //
        //Go through all the entities of the dbase doing the following
        for (const entity in this.current_db.entities) {
            //
            //Store the entity
            const e: entity = this.current_db.entities[entity];
            //
            // Create the text element to represent the number of records the entity has
            const text = document.createElementNS(svgns, 'text');
            //
            //Attach the text to the proxy
            e.proxy.appendChild(text);
            //
            // Center the text at at its (mvable) position
            text.setAttribute('text-anchor', 'middle');
            //
            //Display the number of records for the particular entity
            text.textContent = `${e.dbase.static_data.entities[entity].records}`;
            //
            //Move the labeling text to this enties position
            text.setAttribute('x', `${e.position.x}`);
            text.setAttribute('y', `${e.position.y + 2}`);
        }
    }
    //
    //Override the creation of a metavisuo database to handle the loading of the svg settings of a
    //particular database
    async create_metadb(dbname: string): Promise<database> {
        //
        //Generate an Idatabase structure for the selected database. Ensure that
        //a complete database is generated and that no exceptions should be
        //thrown if the datanase has a problem
        const structure: Idatabase = await exec(
            'database',
            [dbname, true, false],
            'export_structure',
            []
        );
        //
        //Use the generated schema.Idatabase to generate a database structure
        const dbase = new schema_database(structure);
        //
        //Get the element where to hook the svg element
        const content = this.get_element('content');
        //
        //Create the database structure to visualize
        return new db(content, dbase);
    }
    //
    //This procedure is responsible for showing or  hiding the comment or datatypes of the various
    //entities
    public toggle_metadata(selector: 'data_type' | 'comment'): void {
        //
        //Get all the containers identified by the given selector
        //These are the containers holding either comments or data types
        const metadata_elements: Array<Element> = Array.from(
            this.document.querySelectorAll('.' + selector)
        );
        //
        //Iterate over the collection of metadata elements showing /hidding the metadata
        metadata_elements.forEach((element) => element.classList.toggle('hidden'));
    }
    //
    //Get all the entities from the current database and add the corresponding comments and
    //data types for each of the attributes under the entities
    private add_metadata(): void {
        //
        //Ensure a database is selected. If thats not the case alert the user
        if (!this.current_db) throw new mutall_error('Please select a database');
        //
        //For all entities do the following
        for (const key in this.current_db.entities) {
            //
            //Since the attributes can only be accessed from an entity we need to get the entity from
            //the collection database entities
            const entity = this.current_db.entities[key];
            //
            //Go trough all attributes of the entity displaying the comments and the datatypes
            entity.attributes.forEach((attribute) => this.append_metadata(attribute));
        }
    }
    //
    //This method is responsible for adding attribute metadata. The metadata might be a comment or
    //the datatype to help programmers understand how to work with data from the given attribute
    //The datatype will be separated using a ':' (Pascal notation) while the comment of the
    //attribute will be demacated by a //
    //In the case of varchar we also need to indicate the length that the attribute can accomodate
    private append_metadata(attrib: attribute): void {
        //
        //Calculate the position along the horizontal axis of where to place the metadata
        const y: number = attrib.entity.position.y - attrib.entity.radius - 1 - 2 * attrib.index;
        //
        //The length of the attribute will help when we are determining the positioning of the
        //comment or datatype. When the name is small we need to move the metadata close and when
        //the name is lengthy we move the metadata further
        const len: number = attrib.name.length;
        //
        //Xpos depending on the length of the attribute name determine the length of displacement to show the
        //data type or the comment next to the attribute
        const xpos: number = len < 5 ? 6 : len < 8 ? 8 : 10;
        //
        //Ensure a comment is present before displaying it
        //
        //??????????Generaization of how we create the comment and the datatype text element/ containers
        if (attrib.comment) {
            //
            //Create a text element for showing the comment
            const comment: SVGTextElement = this.create_metadata(
                `// ${attrib.comment}`,
                { x: attrib.entity.position.x + xpos, y: y },
                'comment'
            );
            //
            //Append the comment to the page
            attrib.entity.component.attributes.margin.appendChild(comment);
        }
        //
        //The length of characters to be taken
        //In the case of a varchar get the length of characters that the attribute can accomodate
        const length: string = attrib.data_type === 'varchar' ? `(${attrib.length})` : '';
        //
        //Ensure that  the attribute datatype is present before displaying
        if (attrib.data_type) {
            //
            //Create a text element to display the datatype
            const dtype: SVGTextElement = this.create_metadata(
                `:${attrib.data_type} ${length} `,
                { x: attrib.entity.position.x + xpos, y: y },
                'data_type'
            );
            //
            //Append the text element to the page
            attrib.entity.component.attributes.margin.appendChild(dtype);
        }
    }
    //
    //This method will display the given text content on a specified position in a svg text element
    //By default the svg text element is hidden and will only be visible when the relevant button is clicked
    //We also get an svg text element that we will further append to the relevant section
    private create_metadata(
        //
        //The acctual content to be shown within the text element
        content: string,
        //
        //Positioning of the text element in the svg viewbox
        position: { x: number; y: number },
        //
        //An identifier of what is to be shown i.e., 'comment' or 'data_type'
        type: string
    ): SVGTextElement {
        //
        //Create an element to hold the comment
        const element: SVGTextElement = this.document.createElementNS(svgns, 'text');
        //
        //Set the value of the comment
        element.textContent = content;
        //
        //Position the element
        element.setAttribute('y', String(position.y));
        element.setAttribute('x', String(position.x));
        //
        //hide the comment by default
        element.classList.add('hidden', type);
        //
        return element;
    }
    //
    //Hide an entity that was selected also hide all the relationships to  and from that entity
    public hide(): void {
        //
        //Get the selected entity
        const selected: entity = this.get_selected_entity();
        //
        //hide the selected entity
        selected.proxy.classList.add('hidden');
        //
        //Hide all the relations of the entity
        selected.__relations?.forEach((rel: relation) => rel.proxy.classList.add('hidden'));
    }
}
//
//Create an extension of the metavisuo database to implement the following additions :-
//1.Load the viewbox settings
//2.Save and load additional database and entity information .i.e., hidden
//3.Handle the hidding and unhiding functionalities
class db extends database {
    //
    //The key to where the database initialization settings are stored
    public static key: string = 'db_init';
    //
    constructor(public hook: HTMLElement, dbase: schema_database) {
        //
        //Initalize the parent class
        super(hook, dbase);
        //
        //load the viewbox settings at this point
        this.load_settings();
        //
        //Get the section where to display the entities list
        const section: HTMLElement = this.get_element('entities');
        //
        //Populate the list of entities that will be used to show/hide the entities
        this.list_entities(section);
        //
        //Always hide the entity list when creating a dbase
        section.classList.remove('show');
        //
        //Add the functionality to show or hide the entity list
        this.get_element('show').onclick = () => {
            //
            //Get the selected entity element
            const element: HTMLElement | null = this.document.querySelector('.selected');
            //
            //If no entity was selected show the list all the entities
            if (!element) section.classList.toggle('show');
            //
            //Otherwise show the entities linked to the selected one
            else this.show_closest(this.entities[element.id]);
        };
    }
    //
    //This produces a list of all entities of the current database and a checkbox alongside
    //the entities to signify the visibility. If checked the entity is visible otherwise the entitiy
    //is hidden. This list will be visible once the user clicks on the show button
    //From this list a users can either hide  or unhide the entities  as they desire
    private list_entities(section: HTMLElement): void {
        //
        //Clear the section
        section.innerHTML = '';
        //
        //Add option to select all entities
        this.add_select_all(section);
        //
        //Get the settings stored in the local storage
        const settings: string | null = this.win.localStorage.getItem(db.key);
        //
        //From the settings get the hidden entities
        const hidden: Array<string> | undefined = settings
            ? JSON.parse(settings)[this.dbase.name]?.hidden
            : undefined;
        //
        //for each entity create an option in the list
        //
        //The layout of the option should be as follows
        /*
            <label>
                <input type="checkbox" value=key/>
                <span>key </span>
            </label>
        */
        //Once the option is created we should check if the entity was initially
        //hidden or not to make the desicion weathe the checkbox is checked or not
        for (const key in this.entities) {
            //
            //Create the label to house the checkbox and the entity name
            const env: HTMLLabelElement = this.create_element('label', section, {
                className: 'entity_checkbox',
            });
            //
            //Options to create the checkbox
            const options: any = {
                type: 'checkbox',
                value: key,
            };
            //
            //Check the checkbox only when the entity is visible
            if (!hidden || !hidden.includes(key)) options.checked = true;
            //
            //Create the checkbox
            const chkbox = this.create_element('input', env, options);
            //
            //Attach the change listener
            chkbox.onchange = () => this.change(chkbox);
            //
            //Create a label for the particular checkbox
            this.create_element('span', env, {
                textContent: key,
            });
        }
    }
    //
    //Add an option to select or disselect all the entities in the given database
    //The first step is to produce the html bellow:-
    /*
        <label>
            <input type="checkbox"/>
            <span id = "show" class="hidden">Show all</span>
            <span id = "hide" class="hidden">Hide all</span>
        </label>
        <hr/>
    */
    //The two messages should be shown whenever appropriate.
    private add_select_all(section: HTMLElement): void {
        //
        //Create a label
        const label: HTMLLabelElement = this.create_element('label', section);
        //
        //Create a checkbox to select all entities
        const chkbox: HTMLInputElement = this.create_element('input', label, {
            type: 'checkbox',
        });
        //
        //Add the labels to the checkbox
        //
        //This label displays when the checkbox is unchecked
        this.create_element('span', label, {
            textContent: 'Show all',
            id: 'show_label',
        });
        //
        //THis label is to be shown when the checkbox is checked
        this.create_element('span', label, {
            textContent: 'Hide all',
            id: 'hide',
            className: 'hidden',
        });
        //
        //Add a horizontal rule to separate the entities from the select all option
        this.create_element('hr', section);
        //
        //Add the functionality to select or deselect all the checkboxes
        chkbox.onchange = () => this.toggle_entities_visibility(chkbox, section);
    }
    //
    //This function handles hidding or unhidding all the entities of a given database
    private toggle_entities_visibility(chkbox: HTMLInputElement, section: HTMLElement): void {
        //
        //Ensure that the correct label is displayed
        if (chkbox.checked) {
            //
            //Get the label showing and hide it
            this.get_element('show_label').classList.add('hidden');
            //
            //finally show the appropriate message
            this.get_element('hide').classList.toggle('hidden');
        } else {
            //
            //Hide the label initially showing
            this.get_element('hide').classList.toggle('hidden');
            //
            //Show the appropriate message
            this.get_element('show_label').classList.toggle('hidden');
        }
        //
        //Get all the checkboxes from the given section
        const checkboxes: Array<Element> = Array.from(
            section.querySelectorAll('input[type="checkbox"]')
        );
        //
        //Go through the all the checkboxes and either check or uncheck them
        checkboxes.forEach((checkbox) => ((checkbox as HTMLInputElement).checked = chkbox.checked));
        //
        //Show or hide all the entities
        for (const entitiy in this.entities) this.toggle_visiblility(entitiy, chkbox.checked);
    }
    //
    //Save database information in the local_strorage
    //When saving use the following structure
    //type db_init = {[dbname:string]: info}
    //
    /*
    type info ={
        hidden:Array<entities>,
        pan_x: int,
        pan_y: int,
        zoom_x: int,
        zoom_y: int
    }
    */
    public async save(): Promise<void> {
        //
        //Save the data to the databse
        await super.save();
        //
        //Now save the database data to the local storage
        //
        //Get whatever was in the local storage
        const db_init: string | null = this.win.localStorage.getItem('db_init');
        //
        //Get all hidden entities
        const hidden: Array<string> = this.get_hidden();
        //
        //Organize and stringify that information
        const info: info = {
            hidden: hidden,
            pan_x: this.panx,
            pan_y: this.pany,
            zoom_x: this.zoomx,
            zoom_y: this.zoomy,
        };
        //
        //Get the db name
        const dbname: string = this.dbase.name;
        //
        //If there is no initial db initialization settings
        if (!db_init) {
            //
            //Variable to hold database settings
            const setting: init = {};
            //
            //Compile the database settings
            setting[dbname] = info;
            //
            //Save the settings in the local storage
            this.win.localStorage.setItem(db.key, JSON.stringify(setting));
        } else {
            //
            //parse what was in the local storage
            const db_settings: init = JSON.parse(db_init);
            //
            //add the new settings
            db_settings[dbname] = info;
            //
            //Convert the db_settings into a string and save
            this.win.localStorage.setItem(db.key, JSON.stringify(db_settings));
        }
    }
    //
    //Get all the hidden entities
    private get_hidden(): Array<string> {
        //
        //Create an array to hold the hidden entities
        const hidden: Array<string> = [];
        //
        //Go through all the entities of the database
        Object.values(this.entities).forEach((entity) => {
            //
            //Look for hidden class
            if (!entity.proxy.classList.contains('hidden')) return;
            //
            //We now are aware that the element is hidden so add it to the hidden collection
            hidden.push(entity.name);
        });
        //
        //Return hidden entities
        return hidden;
    }
    //
    //Collect the viewbox settings of the particular database that is displayed
    //and update the svg to reflect the saved settings
    private async load_settings(): Promise<void> {
        //
        //Get the db settings
        const setting: string | null = this.win.localStorage.getItem(db.key);
        //
        //If no settings are present discontinute the process
        if (!setting) return;
        //
        //Get the viewbox settings from the local storge
        const initialization: init = JSON.parse(setting);
        //
        //Locate the initialization settings of the particular dbase
        const db_setting: info | undefined = initialization[this.dbase.name];
        //
        //If there are no settings for the current database stop the process
        if (!db_setting) return;
        //
        //Update the viewbox settings
        this.panx = db_setting.pan_x;
        this.pany = db_setting.pan_y;
        this.zoomx = db_setting.zoom_x;
        this.zoomy = db_setting.zoom_y;
        //
        //Add the view box attribute, based on the zoom and pan settings.
        this.proxy.setAttribute('viewBox', `${[this.panx, this.pany, this.zoomx, this.zoomy]}`);
        //
        //Go through all the hidden entities and hide them
        db_setting.hidden.forEach((entity: string) => this.toggle_visiblility(entity, false));
    }
    //
    //TODO:Unhiding of entities
    //
    //The function that is responsible for hidding or unhidding of entities depending on
    //their visibility status.
    //
    private change(chkbox: HTMLInputElement): void {
        //
        //Get the value of the given chekbox
        const entity: string = chkbox.value;
        //
        //Check to see if the checkbox is currently checked or unchecked
        //If checked it means that the user want the entity that was initially hidden
        //displayed and if uncheckd the user wants to hide the entity
        //
        if (chkbox.checked) this.toggle_visiblility(entity);
        //
        //Otherwise hide the given entity
        else this.toggle_visiblility(entity, false);
    }
    //
    // Show the entities that are directly linked to the given entity
    // This method is important when explaining a database model in that you can start from a single
    // entity and progressively show more entities along the presentation
    //
    //To get all related entities to a given entity look for all the entities which
    // have a foreign key simmilar to the primary key of the entity provided. Other than that
    // We also need to take care of the fact that other relationshps to the given entity are constructed
    //using foreign keys
    public show_closest(entity: entity): void {
        //
        //Handle the case where the other entities point to this entity(Primary key)
        //
        //Go through all the relationships and if the ref points to this particular entity
        //Show it
        this.relations.forEach((relation) => {
            if (relation.ref.ename === entity.name) {
                //
                //Show the table
                this.toggle_visiblility(relation.entity.name);
                //
                //Also ensure all relations are not hidden
                relation.proxy.classList.remove('hidden');
            }
        });
        //
        //Handle the case of foreign keys
        //
        //Get all the foreign keys in the entity
        for (const column in entity.columns) {
            //
            //Get the column
            const c: foreign | attribute | primary = entity.columns[column];
            //
            //If the column is a foreign column show the entity where it came form
            if (c instanceof foreign) this.toggle_visiblility(c.ref.ename);
        }
    }
    //
    //This helps with the functionality of either hidding or showing an entity and its relations
    //We need to know the entitiy and the visibility status that is required.
    private toggle_visiblility(entity: string, is_visible: boolean = true): void {
        //
        //Identify the entity using the name
        const e: entity = this.entities[entity];
        //
        //Handle the case when the user wants the entity hidden
        if (!is_visible) {
            //
            //Hide its visual representation
            e.proxy.classList.add('hidden');
            //
            //Hide all the relationships that start and end from the hidden entity
            this.relations.forEach((relation) => {
                //
                //Get the foregin key column in the relationship
                const foreign: foreign = relation.col;
                if (foreign.ref.dbname === this.dbase.name && foreign.ref.ename === e.name)
                    relation.proxy.classList.add('hidden');
            });
            //
            // exit after hidding
            return;
        }
        //
        //When we get here we know that we are supposed to show the entity and all its relations
        //
        //The entity
        this.entities[entity].proxy.classList.remove('hidden');
        //
        //The relations of the given entity
        this.relations.forEach((relation) => {
            //
            //Get the foregin key column in the relationship
            const foreign: foreign = relation.col;
            if (foreign.ref.dbname === this.dbase.name && foreign.ref.ename === entity)
                relation.proxy.classList.remove('hidden');
        });
        //
        //exit
        return;
    }
}
