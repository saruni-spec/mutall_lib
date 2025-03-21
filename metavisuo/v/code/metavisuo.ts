//Import schema as a namespace (rather than the individual components) so that
//we can define extended versions of the same components in a separate (metavisuo)
//namespace
import * as schema from '../../../schema/v/code/schema.js';
import { page } from '../../../outlook/v/code/outlook.js';
import { exec } from '../../../schema/v/code/server.js';
import { label } from '../../../schema/v/code/questionnaire.js';
import { myerror, foreign, primary, mutall_error } from '../../../schema/v/code/schema.js';
import { myalert } from '../../../schema/v/code/mutall.js';
//
// Define the namespace needed to create svg elements. This is needed by the
//metavisuo system. Its defined here to prevent cluttering the mataviouo namespace
export const svgns = 'http://www.w3.org/2000/svg';
//
//Define the structure of an attribute metadata
type metadata = { comments?: SVGTextElement; data_types?: SVGTextElement };
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

//The metavisouo application class
export class metavisuo extends page {
    //
    //The key in the local storage to retrieve and store the last viewd db
    static db_key: string = 'last_dbase';
    //
    //This database is set when???
    protected current_db?: database;
    //
    //A database selector
    private selector?: HTMLSelectElement;
    //
    //class constructor.
    constructor(public cwd: string, public db?: string) {
        super();
    }
    //
    //Generate the structure from the given named database among the list of all
    //available databases and draw its visual structure
    async create_metadb(dbname: string): Promise<database> {
        //
        //Generate an Idatabase structure for the selected database. Ensure that
        //a complete database is generated and that no exceptions should be
        //thrown if the datanase has a problem
        const structure: schema.Idatabase = await exec(
            'database',
            [dbname, true, false],
            'export_structure',
            [],
            this.cwd
        );
        //
        //Use the generated schema.Idatabase to generate a database structure
        const dbase = new schema.database(structure);
        //
        //Get the element where to hook the svg element
        const content = this.get_element('content');
        //
        //Create the database structure to visualize
        return new database(content, dbase, this.cwd);
    }
    //
    //Display the errors that are in the current selected entity
    public show_errors(): void {
        //
        // Get the selected entity
        const entity: entity = this.get_selected_entity();
        //
        //Get the error report
        const report: string = this.get_report(entity);
        //
        //Show the report
        myalert(report);
    }
    //
    //Get the error report from the currenty selected entity in this
    //metavisuo appliction
    private get_report(entity: entity): string {
        //
        // Get the entity errors
        const myerrors: Array<myerror> = entity.errors;
        //
        // If there is no error return with appropriate message
        if (myerrors.length === 0) return 'No errors found.';
        //
        //Compile the errors in a detail/summary arrangement, separated by line breaks
        const report: string = myerrors
            .map(
                (error) => `
        <details>
            <summary>${error.message}</summary>
            ${error.stack}
        </details>
    `
            )
            .join('<br/>');
        //
        // Return the report of errors
        return report;
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
    //Populate the selector designated to hold all the named databases on
    //this server and return the selector
    populate_selector(databases: Array<string>): HTMLSelectElement {
        //
        //Get the selector element
        const selector = <HTMLSelectElement>this.get_element('databases');
        //
        //For each database name create a selector option and add it to the selector
        databases.forEach((dbname) =>
            this.create_element('option', selector, {
                textContent: dbname,
                value: dbname,
            })
        );
        //
        //Return teh selector
        return selector;
    }
    //
    //Fetch all names of databases read from the MYSQL information schema
    async get_dbnames(): Promise<Array<string>> {
        //
        //Extract all database names  except mysql, performance_schema,phpmyadmin
        //sys, and information schema
        const sql: string = `
            select 
                schema_name as dbname 
            from 
                information_schema.schemata
            where
                schema_name not in (
                    'mysql',
                    'performance_schema', 
                    'sys',
                    'information_schema',
                    'phpmyadmin'
                )
            order by schema_name    
            `;
        //
        //Retrieve the names
        const dbases: Array<{ dbname: string }> = await exec(
            'database',
            ['information_schema'],
            'get_sql_data',
            [sql],
            this.cwd
        );
        //
        //Compile and return the list
        return dbases.map((db) => db.dbname);
    }
    //
    //Show the panels of metavisuo
    //On load, get all databases on this server, populate the selector and pick
    //the first database
    public async show_panels(): Promise<void> {
        //
        //Get all the names of the databases available on this server
        const dbnames: Array<string> = await this.get_dbnames();
        //
        //Alert the user (and discontinue this show) if there are no databases
        if (dbnames.length === 0) {
            alert('No databases are found');
            return;
        }
        //
        //Populate the database selector
        this.selector = this.populate_selector(dbnames);
        //
        //Add a listener to show a selected database
        this.selector.onchange = async () => await this.show_dbase();
        //
        //Select the last database
        //
        //If a db was supplied  at the constructor level do as follows
        if (this.db) {
            //
            //Find out if the requested database exist. If it does set it as the selected dbase
            //since the ploting is done based on the selection
            if (dbnames.includes(this.db)) this.selector.value = this.db;
            //
            //TODO:What to do if the requested db is not fount in the system??????
            throw new schema.mutall_error('The requested database was not found in the system!!');
        }
        //
        //If no desired database was passed check the local storage for a database that was shown last
        else if (localStorage[metavisuo.db_key])
            this.selector.value = localStorage[metavisuo.db_key];
        //
        //If there is no last database in the local storage use the first db in the system
        else this.selector.value = dbnames[1];
        //
        //Show the selected database
        await this.show_dbase();
        //
        //Add the functionality to show/hide the datatypes
        this.get_element('data_types').onclick = () => this.toggle_metadata('data_type');
        //
        //Do a simmilar thing for the comments
        this.get_element('comments').onclick = () => this.toggle_metadata('comment');
    }

    //On selecting a database, show it; then save it to the local storage for
    //use as the next databse when we refresh the page
    private async show_dbase(): Promise<void> {
        //
        //Remove the current database, if any
        if (this.current_db !== undefined) this.current_db.hook.removeChild(this.current_db.proxy);
        //
        //Get the selected database name. For you to get here, there must be one.
        const dbname: string = this.get_selected_value('databases');
        //
        //Save the selected database to the local storage for future references
        window.localStorage[metavisuo.db_key] = dbname;
        //
        //Get the named metavisuo database -- an extension of the schema.database --
        //and make it the current one.
        this.current_db = await this.create_metadb(dbname);
        //
        //Show all the the entities and their relationships
        await this.current_db.show();
    }
    //
    //Get the selected value from the identified selector.
    //There must be a selected value.
    public get_selected_value(id: string): string {
        //
        //Get the Select Element identified by the id.
        const select = this.get_element(id);
        //
        //Ensure that the select is a HTMLSelectElement.
        if (!(select instanceof HTMLSelectElement))
            throw new mutall_error(`The element identified by '${id}' is not a HTMLSelectElement.`);
        //
        //Ensure that the select element value is set.
        if (select.value === '')
            throw new mutall_error(
                `The value of the select element identified by '${id}' is not set.`
            );
        //
        //Return the selected value
        return select.value;
    }
    //
    // Get the selected entity
    get_selected_entity(): entity {
        //
        // Get the current database
        const database: database | undefined = this.current_db;
        //
        //If there is none, abort this procedure and alert the user
        if (!database) throw new schema.mutall_error('Please select a database');
        //
        // Get the entities in the datanase
        const entities: { [index: string]: entity } = database.entities;
        //
        //Get the selected entity element
        const element: HTMLElement | null = this.document.querySelector('.selected');
        //
        //Abort this process if there is no selection
        if (!element) throw new schema.mutall_error('Please select an entity');
        //
        //The selected entity has an id tha matches the entity name
        const ename: string = element.id;
        //
        // Get the named entity entity
        const entity: entity | undefined = entities[ename];
        //
        //If no such name entoty is found, alert the user
        if (!entity) throw new schema.mutall_error(`No entity is found by id '${ename}'`);
        //
        return entity;
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
        //
        //Deselect the entity
        selected.proxy.classList.remove('selected');
    }
}
//
//A metavisual database extends the schema version
export class database extends schema.database {
    //
    //The key to where the database initialization settings are stored
    public static key: string = 'db_init';
    //
    //The entities of the current application database.
    public entities: { [index: string]: entity };
    //
    //Collection of (unindexed) relatons for between all the entities
    public relations: Array<relation>;
    //
    //Set the view box properties.
    //
    //Set the panning attributes of a view box.
    public panx: number = 0;
    public pany: number = 0;
    //
    //Set the scaling attributes of a view box.
    public zoomx: number = 128;
    public zoomy: number = 64;

    //Change the proxy data type to svg element
    public get proxy(): SVGElement {
        return <SVGElement>super.proxy;
    }
    public set proxy(p: SVGElement) {
        super.proxy = p;
    }
    //
    //The database name that holds the metadata; its either this database -- if
    //the metadata is embeded, or the standalone metavisuo database
    get meta_dbname(): string {
        //
        //Set the database that contains the metata. It's either this one, if
        //the metadata subsystem are embedded, or the external one, metavisuo
        return this.entities['dbase'] === undefined ? 'metavisuo' : this.name;
    }
    //
    //class constructor.
    constructor(
        //The HTML tag where to hook the svg element for this database
        public hook: HTMLElement,
        //
        //The schema database that is the extension of this meta-visuo version is
        //the one to which
        public dbase: schema.database,
        //
        //Reference to the directory where the program was launched form
        public cwd: string
    ) {
        //A database is the highest object in the matavisuo hierarchy and
        //therefore has no parent
        super(dbase.static_dbase);
        //
        //Prepare to set the SVG element
        //
        //Create the svg element in our content element in the html file.
        //N.B. The schema class uses a getter to make this element available
        //to all the children of a database, i.e., entities, attrbutes and relations
        this.proxy = this.document.createElementNS(svgns, 'svg');
        //
        //Attach the svg to the hook.
        hook.appendChild(this.proxy);
        //
        //Add an event listener for moving the entity group to the double clicked position.
        this.proxy.ondblclick = (ev) => this.entity_move(ev);
        //
        //Add the view box attribute, based on the zoom and pan settings.
        this.proxy.setAttribute('viewBox', `${[this.panx, this.pany, this.zoomx, this.zoomy]}`);
        //
        //Add the zooom out event listener to the zoom_out button
        this.get_element('zoom_out').onclick = () => this.zoom('out');
        this.get_element('zoom_in').onclick = () => this.zoom('in');
        //
        //Add the pan_left,pan_right,pan_up and pan_down event listener button.
        this.get_element('pan_left').onclick = () => this.pan('left');
        this.get_element('pan_right').onclick = () => this.pan('right');
        this.get_element('pan_up').onclick = () => this.pan('up');
        this.get_element('pan_down').onclick = () => this.pan('down');
        //
        //Get the save button for adding an event listener
        this.get_element('save').onclick = async () => await this.save();
        //
        //Pan the documents in view, depending on the selected keys
        //Add a test key press event
        onkeydown = (ev) => this.pan_with_keys(ev);
        //
        //Create the meta-visuo entities
        this.entities = this.create_entities(dbase);
        //
        //Create and collect the meta_visuo relations
        this.relations = [...this.collect_relations(dbase)];
        //
        //Create arrow markers, e.g., the crawfoot for relationships,
        this.create_markers();
        //
        //Prepare a list of all the entities to facilitate the hiding and unhidding of entities
        this.entities_list();
    }
    //
    //Collect the viewbox settings of the particular database that is displayed
    //and update the svg to reflect the saved settings
    private async load_settings(): Promise<void> {
        //
        //Get the db settings
        const setting: string | null = this.win.localStorage.getItem(database.key);
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
    //Produce a list of entities that will have functionality to toggle the visiblility of the given
    //entities
    private entities_list() {
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
            //If no entity was selected show the list all the entities.
            if (!element) section.classList.toggle('show');
            //
            //Otherwise show the entities linked to the selected one
            else this.show_closest(this.entities[element.id]);
        };
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
        const settings: string | null = this.win.localStorage.getItem(database.key);
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
    //TODO:Unhiding of entities
    //
    //The function that is responsible for hidding or unhidding of entities depending on
    //their visibility status.
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
    //Show all the entities and their relationships by moving them to their
    //respective positions. N.B. These schema objects were drawn when they were
    //constructed.
    async show(): Promise<void> {
        //
        //load the viewbox settings at this point
        this.load_settings();
        //
        //Load the position data for the entities from the database
        await this.load_x_y_positions();
        //
        //Ovrride the default zoom and pan settings with those from the database
        //await this.load_viewbox();
        //
        //Move all the entities (and their associated relations) to their
        // designated positions
        for (const ename in this.entities) this.entities[ename].move();
    }

    //Pan using the keyboard
    pan_with_keys(event: KeyboardEvent): void {
        //
        //Use the event code to pan
        switch (event.code) {
            case 'ArrowRight':
                this.pan('right');
                break;
            case 'ArrowLeft':
                this.pan('left');
                break;
            case 'ArrowUp':
                this.pan('up');
                break;
            case 'ArrowDown':
                this.pan('down');
                break;
            default:
        }
    }

    //Create arrow markers, e.g., the crawfoot for relationships,
    create_markers(): void {
        //
        //Define the marker paths
        const paths: { [key: string]: string } = {
            //
            foot_optional: 'M 30 32, L-18 32,M 10 22, L 30 22 M 10 42, L 30 42 M 10 22 L 10 42',
            //
            foot_optional_identifier:
                'M 30 32, L-18 32,M 10 22, L 30 22 M 10 42, L 30 42 M 10 22 L 10 42,M -7 16 L-16 42.6 M -32 -2 L-4.5 42.6',
            //
            foot_manda_identifier:
                'M 30 32, L-18 32,M 10 22, L 30 22 M 10 42, L 30 42 M 10 22 L 10 42,M 1 16 L1 44 M -7 16 L-16 42.6 M -32 -2 L-4.5 42.6',
            //
            foot_mandatory:
                'M 30 32, L-18 32,M 10 22, L 30 22 M 10 42, L 30 42 M 10 22 L 10 42,M 1 16 L1 44 ',
            //
            tick: 'M 30 30 L 30 44',
            //
            arrow: 'M 8 8 L 0 4 L 0 12',
        };
        //
        //Group all the markers together
        const g = <SVGElement>document.createElementNS(svgns, 'g');
        g.classList.add('markers');
        this.proxy.appendChild(g);
        //
        //Draw the marker corresponding to each path
        for (const key in paths) this.draw_marker(key, paths[key], g);
    }
    //
    //Draw the named marker using the given path
    draw_marker(key: string, path_str: string, g: SVGElement): void {
        //
        //DRAW THE LINE  MARKER
        // Create the marker element for the attributes.
        const marker: SVGMarkerElement = <SVGMarkerElement>(
            document.createElementNS(svgns, 'marker')
        );
        //
        //Attach the marker to the group tag
        g.appendChild(marker);
        //
        // Supply the marker attributes
        //
        //Define the marker view box
        const panx: number = -20;
        const pany: number = -20;
        //
        //Set the width of the viewport into which the <marker> is to be fitted when it is
        //rendered according to the viewBox
        const realx: number = 64;
        //
        //Set the height of the viewport into which the <marker> is to be fitted when it is
        //rendered according to the viewBox
        const realy: number = 64;
        //
        //Marker size (pixels)
        //Set the height of the marker
        const markerHeight: number = 5;
        //
        //Set the width of the marker
        const markerWidth: number = 5;
        //
        //Set the marker view box
        marker.setAttribute('viewBox', `${[panx, pany, realx, realy]}`);
        //
        //Set the name of the marker
        marker.setAttribute('id', key);
        //
        //Set the reference point for the marker to be the center of the viewbox
        //Define the x coordinate of the marker referencing point
        marker.setAttribute('refX', `${0.5 * realx}`);
        //
        //Define the y coordinate of the marker referencing point
        marker.setAttribute('refY', `${0.5 * realy}`);
        marker.setAttribute('markerWidth', `${markerWidth}`);
        marker.setAttribute('markerHeight', `${markerHeight}`);
        //
        marker.setAttribute('orient', 'auto-start-reverse');
        //
        //Trace the path that defines this marker
        const path_element: SVGPathElement = this.document.createElementNS(svgns, 'path');
        path_element.setAttribute('d', path_str);
        path_element.classList.add('chickenfoot');

        //Let teh marker scale with the stroke width
        //marker.setAttribute("markerUnits", "strokeWidth");
        //
        //Try this option
        marker.setAttribute('markerUnits', 'userSpaceOnUse');
        //
        // Attach the line marker to the marker element
        marker.appendChild(path_element);
    }

    //Zoming out is about increasing the zoom x an y components of this database
    //by some fixed percentage, say 10%
    zoom(dir: 'in' | 'out'): void {
        //
        //
        const sign = dir === 'in' ? +1 : -1;
        //
        //Change the database zooms
        this.zoomx = this.zoomx + (sign * this.zoomx * 10) / 100;
        this.zoomy = this.zoomy + (sign * this.zoomy * 10) / 100;
        //
        this.proxy.setAttribute('viewBox', `${[this.panx, this.pany, this.zoomx, this.zoomy]}`);
    }
    //
    //
    pan(dir: 'up' | 'left' | 'right' | 'down'): void {
        //
        //Determine x, the amount by which to pan x, as 5% of 132
        const x = (5 / 100) * 132;
        //
        //Detemine y,the amount by which to pan y, as 5% of 64
        const y = (5 / 100) * 64;
        //
        //Determine the pan direction and make the necessary pan
        //property changes
        switch (dir) {
            case 'up':
                //
                //Change the pany by some positive amount (y)
                this.pany = this.pany + y;
                //
                //Limit the diagram in view to the view,i.e., such that it is not hidden from the view
                if (this.pany > 50) {
                    //
                    //Alert the user that the document might be getting out of view
                    alert('This document is out of view, move down or zoom out to view it');
                    //
                    //Prevent the user from moving further out of view
                    return;
                }
                break;
            case 'down':
                //
                //Change pany y with some negative amount (y)
                this.pany = this.pany - y;
                //
                //Limit the diagram in view to the view,i.e., such that it is not hidden from the view
                if (this.pany < -50) {
                    //
                    //Alert the user that the document might be getting out of view
                    alert('This document is out of view, move up or zoom out to view it');
                    //
                    //Prevent the user from moving further out of view
                    return;
                }
                break;
            case 'left':
                //
                //Change the pan x with some positive amount (x)
                this.panx = this.panx + x;
                //console.log(this.panx);
                //
                //Limit the diagram in view to the view,i.e., such that it is not hidden from the view
                if (this.panx > 50) {
                    //
                    //Alert the user that the document might be getting out of view
                    alert('This document is out of view, move right or zoom out to view it');
                    //
                    //Prevent the user from moving further out of view
                    return;
                }
                break;
            case 'right':
                //Change panx with some negative amount (x)
                this.panx = this.panx - x;
                //
                //Limit the diagram in view to the view,i.e., such that it is not hidden from the view
                if (this.panx < -50) {
                    //
                    //Alert the user that the document might be getting out of view
                    alert('This document is out of view, move left or zoom out to view it');
                    //
                    //Prevent the user from moving further out of view
                    return;
                }
                // this.panx +=x;
                break;
        }
        //
        //Effect the changes
        this.proxy.setAttribute('viewBox', `${[this.panx, this.pany, this.zoomx, this.zoomy]}`);
    }

    //Create the metavisuo entiies
    create_entities(dbase: schema.database): { [index: string]: entity } {
        //
        //Start with an empty collection of entites
        const entities: { [index: string]: entity } = {};
        //
        //Loop over all schema entities and convert them to metavisuo versions, saving and
        //drawing them at the same time
        for (const ename in dbase.entities) {
            //
            //Create the meta-visuo entity (with default, i.e., random, xand y coordinates)
            const ent = new entity(this, ename);

            //Save the newly created entity to the metavisuo entities.
            entities[ename] = ent;
        }
        //
        //Return the constructed entities
        return entities;
    }
    //
    //Save the entity coordinates to the datanse for saving metadatabas. It is
    //either thie current dbase, if it suports this functionality, or the special
    //one -- metaviuo
    async save(): Promise<void> {
        //
        //Collect all the labels for saving the x and y coordinates to a database
        const layouts: Array<label> = [...this.collect_labels()];
        //
        //Execute the loading of layouts
        const result: 'Ok' | string = await exec(
            'questionnaire',
            [this.meta_dbname],
            'load_common',
            [layouts],
            this.cwd
        );
        //
        //Save to the local storage also
        this.save_local_storage();
        //
        //Report the result
        myalert(result);
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
    public async save_local_storage(): Promise<void> {
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
            this.win.localStorage.setItem(database.key, JSON.stringify(setting));
        } else {
            //
            //parse what was in the local storage
            const db_settings: init = JSON.parse(db_init);
            //
            //add the new settings
            db_settings[dbname] = info;
            //
            //Convert the db_settings into a string and save
            this.win.localStorage.setItem(database.key, JSON.stringify(db_settings));
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
    //Collect all the label layouts needed for saving the status of the this
    //database
    *collect_labels(): Generator<label> {
        //
        //The name of teh databse
        yield [this.name, 'dbase', 'name'];
        //
        //Save the current pan and zoom values to the
        yield [this.panx, 'dbase', 'pan_x'];
        yield [this.pany, 'dbase', 'pan_y'];
        yield [this.zoomx, 'dbase', 'zoom_x'];
        yield [this.zoomy, 'dbase', 'zoom_y'];
        //
        //For each entity, generate labels for saving the x/y cordinates
        for (const key in this.entities) {
            //
            //Get the entity
            const entity: entity = this.entities[key];
            //
            yield [entity.name, 'entity', 'name', [entity.name]];
            yield [entity.position.x, 'entity', 'x', [entity.name]];
            yield [entity.position.y, 'entity', 'y', [entity.name]];
        }
    }

    //
    //Draw the database entities and relations (as part of the database
    //construction)
    async draw(): Promise<void> {
        //
        //Draw the entities
        for (const ename in this.entities) this.entities[ename].draw();
        //
        //Draw the relationship asociated with this entity.
        this.relations.forEach((Relation) => Relation.draw());
    }

    //Load the entities' x and y coordinates from the metavisuo database
    async load_x_y_positions(): Promise<void> {
        //
        //Set the x and y coordinates
        //
        //Compile the sql for reading x/y cooedinates from schema dbase
        const sql: string = `select
                entity.name,
                entity.x,
                entity.y
             from
                entity
                inner join dbase on entity.dbase = dbase.dbase
             where
                dbase.name = '${this.name}'   
            `;
        //
        //Retrieve the data
        const result: Array<{ name: string; x: number; y: number }> = await exec(
            'database',
            [this.meta_dbname],
            'get_sql_data',
            [sql],
            this.cwd
        );
        //
        //Use the result to set the x and y coordinates for the matching entity
        //in this database
        result.forEach((row) => {
            //
            //Get the named entity
            const entity = this.entities[row.name];
            //
            //If the entity is not found, then the schema datanase may need
            //a clean up. In future, we will alert the user to clean the schema
            //database. For this version, we ignore the result.
            if (!entity) return;
            //
            //Continue to set the coordinates
            entity.position.x = row.x;
            entity.position.y = row.y;
        });
    }
    //
    //Loop over all metavisuo entities and focus on the foreign keys. For each
    //key that is does notpoint to an external database, collect it as a relation
    *collect_relations(dbase: schema.database): Generator<relation> {
        //
        //For each metavisuo entity step throug all her columns
        for (const ename in dbase.entities) {
            //
            //Get the named entity
            const entity: schema.entity = dbase.entities[ename];
            //
            //Get the columns of the entity as an array
            const columns: Array<schema.column> = Object.values(entity.columns);
            //
            //For each foreign key that is pointing to an entity in this database
            //external, collect it as a relatioon
            for (const col of columns) {
                //
                //Only foreign key columns are considered
                if (!(col instanceof schema.foreign)) continue;
                //
                //External relations are not considered. They will be treated
                //as special attributes
                if (col.ref.dbname !== this.dbase.name) continue;
                //
                //Get the source (home) meta_visuo.entity
                const src: entity = this.entities[ename];
                //
                //Use the foreign key to define a relation.
                yield new relation(col, src);
            }
        }
    }
    //
    //Move the selected entity to the double-clicked position
    entity_move(ev: MouseEvent): void {
        //
        //Get the selected entity
        //
        //Get the group that corresponds to the selected entity
        const group = <SVGGraphicsElement | null>this.proxy.querySelector('.selected');
        //
        //If there is no selection then discontinue the move
        if (group === null) return;
        //
        //Get the name of the entity; it is the same as the id of the group
        const ename: string = group.id;
        //
        //Get the named entity
        const entity: entity = this.entities[ename];
        //
        //Get the coordinates of the double-clicked position (in real units).
        //The grop element provided access to the CTM. Could we have gotten it
        //using this.svg Element?
        entity.position = this.entity_get_new_position(ev, group);
        //
        //Effect the move (without redrawing the entity)
        entity.move();
    }
    //
    //Get the coordinates of the double-clicked position (in real units), given
    //the event generated by the event.
    entity_get_new_position(ev: MouseEvent, element: SVGGraphicsElement): DOMPoint {
        //
        //Get the mouse coordinates (in pixels) where the clicking occured on
        //the canvas.
        const x: number = ev.clientX;
        const y: number = ev.clientY;
        //
        //Convert the mouse pixel coordinates to the real world coordinates,
        //given our current viewbox
        //
        //Use the x and y pixels to define an svg point
        const point_old: DOMPoint = new DOMPoint(x, y);
        //
        //N.B. There are 2 methods for getting Client Transformatiom Matrices,
        //viz., sceermCTM and clientCTM. After our investigaion, the screen one
        //(contrary to our expectation) gave the correct result. Why????
        const ctm: DOMMatrix | null = element.getScreenCTM();
        //
        //If the ctm is null, then something is unusual. CRUSH
        if (ctm === null) throw 'A null dom matrix was not expected';
        //
        //BUT we want pixels to real world, i.e., the inverse of the CTM
        const ctm_inverse: DOMMatrix = ctm.inverse();
        //
        //Use the inverse matrix of the CTM matrix to transform the old point to new one
        const point_new: DOMPoint = point_old.matrixTransform(ctm_inverse);
        //
        return point_new;
    }
}
//
//The components of an entity
type component = {
    //
    //The circle tha represents the entity
    circle: SVGCircleElement;
    //
    //The name of the entity
    text: SVGTextElement;
    //
    //The number of records in a given entity
    record_count: SVGTextElement;
    //
    //The attributes sub-components
    attributes: {
        //
        //The rotatable group of atribute componnets
        rotatable: SVGElement;
        //
        //The backbone with tickmarks for hooking attrobute texts
        polyline: SVGPolylineElement;
        //
        //The group of text tables whole margin can joinly be controlled
        margin: SVGElement;
    };
};
//
//The entity in the meta-visuo namespace is an extension of the schema version
export class entity extends schema.entity {
    //
    //The maximum length of an entity
    public static maximum_name_size: number = 12;
    //
    //The count of records in the entity
    public count: number | undefined = undefined;
    //
    //The position of this entity in the e-a-r drawing
    public position: DOMPoint;
    //
    //The radius of the circle that defines our entity
    radius: number = 5;
    //
    //The (slanting) angle of the attributes
    angle: number = 0;
    //
    //The attributes of this entity
    attributes: Array<attribute>;
    //
    //The place holder for collected relations connected to this entity. N.B.
    //Relations cannot be determined when an entity is being constructted.
    public __relations?: Array<relation>;
    //
    //The components of an entity
    public component: component;
    //
    //Direct access to this entity's position
    get x(): number {
        return this.position.x;
    }
    get y(): number {
        return this.position.y;
    }
    //
    //Change the proxy data type to svg element
    public get proxy(): SVGGraphicsElement {
        return <SVGGraphicsElement>super.proxy;
    }
    public set proxy(p: SVGGraphicsElement) {
        super.proxy = p;
    }
    //
    constructor(
        //
        //The metavisuo database
        public dbase: database,
        //
        //The entity name
        public name: string,
        //
        //The center of the circle that represents this entity. If the coordinates
        //are not known, random values will be used
        position?: DOMPoint
    ) {
        //
        //The (visual) parent of an entity is a database
        super(dbase, name);
        //
        // Create the entity group tag that represents its visual aspect
        this.proxy = this.document.createElementNS(svgns, 'g');
        //
        //Mark this as an entity
        this.proxy.classList.add('entity');
        //
        //Assign the id, to match the entity being created
        this.proxy.id = this.name;
        //
        //If there are errors in this  entity mark it as such
        if (this.errors.length > 0) this.proxy.classList.add('error');
        //
        //Attach this proxy to that of the database to establish the visual
        //relationship
        this.dbase.proxy.appendChild(this.proxy);
        //
        //Set the x and y value to to either the given values or a random number
        this.position =
            position ?? new DOMPoint(dbase.zoomx * Math.random(), dbase.zoomy * Math.random());
        //
        //Draw this entity's componets (before creating entities). N.B. Draw
        //happens once; move happens many times
        this.component = this.draw();
        //
        //Collect the attributes of this entity (to include foreign key that points
        //to an external database)
        this.attributes = [...this.collect_attributes()];
        //
        //Set te atttributes index, after creation. This was deferred to this
        //point so that pointers to external databases can be considerd as equal
        //attributes. Otherwise thoer positioning would be problematic
        this.attributes.forEach((attribute, i) => (attribute.index = i));
        //
        //Add an event listener such that when this entity is clicked on, the
        //selection is  removed from any other entity that is selected and this
        //one
        this.proxy.onclick = () => this.select();
        //
        //Add the name size error to the entity
        this.add_name_size_error();
        //
        //If there are errors in this  entity mark it as such
        if (this.errors.length > 0) this.proxy.classList.add('error');
    }
    //
    //Check the size of the entity name and report an error if it is longer than
    //maximum_name_size. Why 12? It is the length of the word contribution which
    //is about the longest name we should allow, the shorter the better.
    public add_name_size_error(): void {
        //
        //Determine the size of the name attribute
        const size: number = this.name.length;
        //
        //If the size is greater than maximum_name_size, we add the error to those
        //of this entity
        if (size <= entity.maximum_name_size) return;
        //
        //At this point the size is greater than 12.Compile and save the error
        const error = new Error(`Entity name size is '${size}' characters which is longer than 10`);
        //
        //Save the error
        this.errors.push(error);
    }
    //
    //The relations of this entity are those that have it --this entity--as
    //its both the source and the destination.
    *collect_relations(): Generator<relation> {
        //
        //Visit all the relations of this database
        for (const relation of this.dbase.relations) yield* this.collect_relation(relation);
    }
    //
    //Returns the relations of this entity. They are constructed only once.
    get relations(): Array<relation> {
        //
        //Return the relations if they are defined
        if (this.__relations) return this.__relations;
        //
        //Otherwise derive them from first principles
        this.__relations = [...this.collect_relations()];
        //
        return this.__relations;
    }
    //
    //Collect the given relation if this entity is either its source or its
    //destination
    *collect_relation(relation: relation): Generator<relation> {
        //
        //Collect the given relation if this entity is its source
        if (relation.src === this) yield relation;
        //
        //Collect the given relation if this entity is its destination
        if (relation.dest === this) yield relation;
    }
    //
    //Collect the attributes of this entity
    *collect_attributes(): Generator<attribute> {
        //
        ///Loop through all the columns of this entity
        for (const col of Object.values(this.columns)) {
            //
            //Consider ordinary attributes
            if (col instanceof schema.attribute) yield new attribute(this, col);
            //
            //Consider foreign key columns tha point to external entities, i.e.,
            //those that are in the same database as this entity
            if (col instanceof schema.foreign && col.ref.dbname !== col.entity.dbase.name) {
                //
                //Use tey column to create an attribute
                const attr = new attribute(this, col);
                //
                //Add a special class to the attribute
                attr.proxy.classList.add('external');
                //
                yield attr;
            }
        }
    }
    //
    //Draw this entity as a circle with its attributes slanted at some angle.
    //This is the arrange layout of the tags:-
    /*
    <g class="entity">....the proxy element
        <circle radius/>
        <text/>
        <text class = "record_count"/> - contins the number of records in the particular entity

        <!-- The attributes subsytem -->
        <g class="rotatable">
        ...
        </g>
    </g>
    */
    draw(): component {
        //
        //1. Draw the circle of the entity and return its svg element
        //
        //Create the circle element to represent an entity
        const circle: SVGCircleElement = document.createElementNS(svgns, 'circle');
        //
        // Set the circle radius.
        circle.setAttribute('r', `${this.radius}`);
        //
        //Attach the circle to the proxy
        this.proxy.appendChild(circle);
        //
        //2. Draw the entity text
        //
        // Create the text element to represent this  entity
        const text: SVGTextElement = document.createElementNS(svgns, 'text');
        //
        //Attach the text to the proxy
        this.proxy.appendChild(text);
        //
        //Create the text element that will hold the number of records in each entity
        const record_count = this.record_count();
        //
        // Center the text at at its (mvable) position
        text.setAttribute('text-anchor', 'middle');
        text.textContent = `${this.name}`;
        //
        //Draw the attributes sub-system of this entity
        const attributes = this.draw_attributes();
        //
        //Retrun the components of the attribute
        return { circle, text, attributes, record_count };
    }
    //
    //Addition of the count of records that each entity has
    private record_count(): SVGTextElement {
        //
        // Create the text element to represent the number of records the entity has
        const text = document.createElementNS(svgns, 'text');
        //
        //Attach the text to the proxy
        this.proxy.appendChild(text);
        //
        // Center the text at at its (movable) position
        text.setAttribute('text-anchor', 'middle');
        //
        return text;
    }
    //
    // Draw the rotatable attributes sub-system . It is organized as follows:-
    /*
    <g class="attributes">

        <polyline mid-marker=... end-marker=.../> 

        <g class="margin" transform="translate($left, $top)>

            ...The attribute texts are placed here

        </g
    </g>
    */
    draw_attributes(): { rotatable: SVGElement; polyline: SVGPolylineElement; margin: SVGElement } {
        //
        //A. Prepare the rotaable group of attribute components
        //
        //Create a group tag for placing all the attributes subsystem.
        const rotatable: SVGElement = this.document.createElementNS(svgns, 'g');
        //
        //Connect the attrobutes to the proxy
        this.proxy.appendChild(rotatable);
        //
        //The class is necessary for styling
        rotatable.setAttribute('class', 'attributes');
        //
        //B. Create the polyline that is the backbone of the attribute texts
        //
        //Create the polyline element
        const polyline: SVGPolylineElement = document.createElementNS(svgns, 'polyline');
        //
        //Yes, this is the attrobutes backbone
        polyline.classList.add('backbone');
        //
        //Attach the polyline to the svg element
        rotatable.appendChild(polyline);
        //
        //Attach the markers to the polyline segments, assuming that we have
        //defined a marker by the 'tick' id
        polyline.setAttribute('marker-mid', 'url(#tick)');
        polyline.setAttribute('marker-end', 'url(#tick)');
        //
        //C. Create a tag for grouping the text elements that represent the
        //attribute names, so that we can control their  positioning, especially
        //the top and bottom margins
        const margin = document.createElementNS(svgns, 'g');
        margin.classList.add('margin');
        //
        //Attach the margin group to the rotable attrobute group
        rotatable.appendChild(margin);
        //
        //Define the top and left margins of the text labels
        const left: number = 1;
        const top: number = 0.5;
        //
        // Provide top and and left margins for the attribute text labels
        margin.setAttribute('transform', `translate(${left},${top})`);
        //
        //Return the attribute group
        return { rotatable, polyline, margin };
    }

    //Move to the new entity psoition:-
    //-the components that make up this entoty
    //-the attrobutes of this entoty
    //-the relations attached to this entity
    async move(): Promise<void> {
        //
        //1. Move the components that make up this entity to the new position
        //
        //Destructure the componets
        const { circle, text, attributes, record_count } = this.component;
        //
        //Add the record count by geting the count of records in the particular entity
        await this.display_count(record_count);
        //
        //Move the circle to this entity's position
        circle.setAttribute('cx', `${this.position.x}`);
        circle.setAttribute('cy', `${this.position.y}`);
        //
        //Move the labeling text to this enties position
        text.setAttribute('x', `${this.position.x}`);
        text.setAttribute('y', `${this.position.y}`);
        //
        //Move the record count text to this enties position
        record_count.setAttribute('x', `${this.position.x}`);
        record_count.setAttribute('y', `${this.position.y + 2}`);
        //
        //Destructure the attributes component to reveal the rotable and polyline
        //elements
        const { rotatable, polyline } = attributes;
        //
        //Rotate the attributes group about the new entoty location and at
        //suggested angle.
        rotatable.setAttribute(
            'transform',
            `rotate(${this.angle},${this.position.x}, ${this.position.y})`
        );
        //
        //Move the attributes polyline
        //
        //Get the points that define the new polyline segments, in the format of e.g.,
        // ["3,40" "5,36" "9,32"]
        const points = this.attributes
            .map((attribute, i) => `${this.position.x}, ${this.position.y - this.radius - 2 * i}`)
            .join(' ');
        //
        //Set the polyline segments
        polyline.setAttribute('points', points);
        //
        //2. Move the attributes of this entity to the new location
        this.attributes.forEach((attribute) => attribute.move());
        //
        //3.Move all the relations linked to this entity so that they may
        //strat or end at this entities new position
        this.relations.forEach((relation) => relation.move());
    }
    //
    //Query the database to get the count of records in the entity then display the results in the
    //given svg element
    private async display_count(count: SVGTextElement): Promise<void> {
        //
        //Get the record count for the particular entity by querying the entity
        this.count = this.count ? this.count : await this.get_count();
        //
        //Display the number of records for the particular entity
        count.textContent = `${this.count}`;
    }
    //
    //Get the number of recors for the given entity by quering the entity with the help of the server]
    //excec method
    private async get_count(): Promise<number> {
        //
        //Formulate the sql query
        const sql: string = `
            select 
                count(*) as count 
            from 
                \`${this.name}\`
        `;
        //
        //Execute the query on the server and return the result
        const result: Array<{ count: number }> = await exec(
            'database',
            [this.dbase.name, false],
            'get_sql_data',
            [sql]
        );
        //
        return result[0].count;
    }
    //
    //Returns the top left position of this entity
    //
    //Mark this entity as selected
    select(): void {
        //
        //Get the entity that was previously selected
        const previous: HTMLElement | null = this.dbase.proxy.querySelector('.selected');
        //
        //If there is any, deselect it
        if (previous) previous.classList.remove('selected');
        //
        //Do not add the selected if the previously selected entity was the one that was clicked
        if (previous?.isEqualNode(this.proxy)) return;
        //
        //Mark the proxy of this entity as selected
        this.proxy.classList.add('selected');
    }
}

//A metavisuo attribute extends a schema column (not just a schema attribute as
//expected). This allows to represent foreign keys that point to an external
//datanase as attributes
export class attribute extends schema.column {
    //
    //Redfeine attributes to match those of metavisuo
    declare attributes: Array<attribute>;
    //
    //An attribute has an index, that helps to calculateits  position among its
    //sibblings. N.B. the invalid default position setting must be rectofoed
    //before an attribute is used. This allowa us to set it after creatting the
    //attribute
    public index: number = -1;
    //
    //Text elements that hold metadata of the attribute(comments and data types)
    public meta: metadata;
    //
    //Note how we  have generalized teh definition of a visual attrobute beyond
    //that of s schema, so that we can regard foreign keys that reference a
    //database external to this one as metavisual attribute
    constructor(public entity: entity, col: schema.column) {
        //
        //Initialize the  schema version of an attribute
        super(entity, col.static_data);
        //
        //Create a group tag for placing all our attributes.
        this.proxy = this.document.createElementNS(svgns, 'text');
        //
        //Append the proxy of this table to the given margin element of the
        //underlying entity
        entity.component.attributes.margin.appendChild(this.proxy);
        //
        //Add the comments and datatype to the attribute
        this.meta = this.append_metadata();
        //
        //Draw the attribute
        this.show();
    }
    //
    //This method is responsible for adding attribute metadata. The metadata might be a comment or
    //the datatype to help programmers understand how to work with data from the given attribute
    //The datatype will be separated using a ':' (Pascal notation) while the comment of the
    //attribute will be demacated by a //
    //In the case of varchar we also need to indicate the length that the attribute can accomodate
    private append_metadata(): metadata {
        //
        //Create a variable to hold the result
        const meta: metadata = {};
        //
        //Add The comment to the
        if (this.comment) {
            //
            //Create a text element for showing the comment
            const comment: SVGTextElement = this.create_metadata(`// ${this.comment}`, 'comment');
            //
            //Append the comment to the page
            this.entity.component.attributes.margin.appendChild(comment);
            //
            //Append the comments element to the meta
            meta.comments = comment;
        }
        //
        //The length of characters to be taken
        //In the case of a varchar get the length of characters that the attribute can accomodate
        const length: string = this.data_type === 'varchar' ? `(${this.length})` : '';
        //
        //Ensure that  the attribute datatype is present before displaying
        if (this.data_type) {
            //
            //Create a text element to display the datatype
            const dtype: SVGTextElement = this.create_metadata(
                `:${this.data_type} ${length} `,
                'data_type'
            );
            //
            //Append the text element to the page
            this.entity.component.attributes.margin.appendChild(dtype);
            //
            //Append the data type element to the meta
            meta.data_types = dtype;
        }
        //
        //Return the comments and data type text element if any were created
        return meta;
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
        //hide the comment by default
        element.classList.add('hidden', type);
        //
        return element;
    }
    //
    //Show/draw this atttribute, linking it to the margin element of the
    //containing attribute
    show(): void {
        //
        //Set the name of the label
        this.proxy.textContent = this.name;
        //
        //Get a class list to support giving this attribute different appearances
        const list: DOMTokenList = this.proxy.classList;

        //Mark attributes that have errors
        if (this.errors.length > 0) list.add('error');
        //
        //Mark attributes whose usage is mandatory
        if (this.is_nullable !== 'YES') list.add('mandatory');
        //
        //Mark attributes that are used for identification. This is difficult
        //to do using css, because svg.text is not a normal HTML attribute. Mark
        //by adding an asterisk after the name
        if (this.is_id()) this.proxy.textContent += '*';
    }

    //Move the entity to match the parent entity
    move() {
        //
        //Set the x coordinate to the fixed value of x
        this.proxy.setAttribute('x', `${this.entity.position.x}`);
        //
        //Set the y coordinate as follows:-
        const y: number =
            //
            //Start from the center of the entity
            this.entity.position.y -
            //
            //Move upwards by entoty radius units
            this.entity.radius -
            //
            //Move up 1 unit to clear the circle boundary
            1 -
            //
            //Place the label at 2 times its index
            2 * this.index;
        //
        this.proxy.setAttribute('y', String(y));
        //
        //Using the length of the name of the attribute determine the appropriate position to place
        //the comments and data types
        const len: number = this.name.length < 5 ? 6 : this.name.length < 8 ? 8 : 10;
        //
        //Set the position of the comments
        if (this.meta.comments) {
            this.meta.comments.setAttribute('x', `${this.entity.position.x + len}`);
            this.meta.comments.setAttribute('y', `${y}`);
        }
        //
        //Set the position of the data_types
        if (this.meta.data_types) {
            this.meta.data_types.setAttribute('x', `${this.entity.position.x + len}`);
            this.meta.data_types.setAttribute('y', `${y}`);
        }
    }
}

//
//A metavisuo relation is an extension of a schema foreign key column
export class relation extends schema.foreign {
    //
    //The the svg element that represents the visual aspect of this relationship
    //public proxy: SVGElement;
    //
    //The polyline that represents a relation
    public polyline: SVGPolylineElement;
    //
    //A relation is construcructed using data from a foreign key and metavisuo
    //entity that is its source
    constructor(public col: schema.foreign, public entity: entity) {
        //IF the relationship is enforced mark it with enforced class
        super(entity, col.static_data);
        //
        //Combine all errors, those derived ffrom PHP and those from Js
        this.errors = [...this.errors, ...this.collect_errors()];
        //
        //Create the visual representative of this relation. This is where the
        //polyline will be hooked
        this.proxy = this.document.createElementNS(svgns, 'g');
        //
        //Link the proxies of both this relation and the given entity. This
        //ensures that if the entity is hidden, the relation, too, will be hidden
        entity.proxy.appendChild(this.proxy);
        //
        //The class that will style the lines showing the relations.
        this.proxy.classList.add('relation');
        //
        //For enforced relationships mark them with the enforced class
        if (col.delete_rule === 'RESTRICT') this.proxy.classList.add('enforced');
        //
        //If there are errors in this relation, then mark it as such
        if (this.errors.length > 0) this.proxy.classList.add('error');
        //
        //Draw a a relation to return the plyline (which can take part in move
        //later)
        this.polyline = this.draw();
    }
    //
    //Get the source and destination entities of this relation
    get src(): entity {
        return this.entity;
    }
    get dest(): entity {
        return this.entity.dbase.entities[this.ref.ename];
    }

    //Collect additional errors found in a relation beyond this inherited from
    //the column used in its construction
    *collect_errors(): Generator<Error> {
        //
        //Cyclic definitions are invalid definitions
        const { dbname, ename } = this.col.ref;
        if (dbname === this.dest.dbase.name && ename === this.dest.name)
            yield new Error('This relation is cyclic');
        //
        //If a relation is not hierarchical and its column name does not match
        //that of the referenced entity, then this is not comformant to the
        //standar way of expressing joins, i.e., x join y on x.y==y.y will not
        //work if this rule is not observed
        if (!this.col.is_hierarchical && ename !== this.dest.name)
            yield Error('Referenced source column and destination entity names are different');
    }

    //
    //Draw the relation between the source and the destination entities. Return
    //the same relation, to support chaining
    draw(): SVGPolylineElement {
        //
        //Create the plyline component of a ralation
        const polyline = <SVGPolylineElement>this.document.createElementNS(svgns, 'polyline');
        //
        //Attach the polyline to the visual svg element
        this.proxy.appendChild(polyline);
        //
        //Attach the arrow marker to the middle point of the polyline.
        //polyline.setAttribute("marker-mid", "url(#arrow)");
        //
        //Attach a marker at the beginning of the polyline, depending on the type
        //of the relion, i.e., optional/mandatory or identifier/non-identifier.
        //N.B. Ensure that the named markers are available. How?
        //By executing the marker drawing code before this step
        polyline.setAttribute('marker-start', `url(#${this.get_marker_name()})`);
        //
        return polyline;
    }

    //Move the componnets of a ralation, notably the polyline, to match the
    //source and destinatiopn entity positions
    move(): void {
        //
        //Get the 3 points that define the relation betweeen the source  and
        //the destination entities, e.g.,
        //{start:{x:4,y:50}, mid:{x:7, y:10}, end:{x:40, y:19}}
        const { start, mid, end } = this.get_relation_points(this.src, this.dest);
        //
        //Express the points in the form required for a polyline, e.g., 4,50 7,10 40,19
        const p1 = `${start.x},${start.y}`;
        const p2 = `${mid.x}, ${mid.y}`;
        const p3 = `${end.x},${end.y}`;
        //
        //Set the polyline's points attribute
        this.polyline.setAttribute('points', `${p1} ${p2} ${p3}`);
    }

    //Returns the name of the marker, depending on the type of this relation
    get_marker_name(): string {
        //
        //Determine whether this relation is optional or not
        const optional: boolean = this.is_nullable === 'YES';
        //
        //Determine whether this relation is used for identification or not
        const id: boolean = this.is_id();
        //
        //Determine the type of chicken foot depending on the 2 the 2
        //variables:optional or id
        switch (optional) {
            case true:
                switch (id) {
                    case true:
                        return 'foot_optional_identifier';
                    case false:
                        return 'foot_optional';
                }
            case false:
                switch (id) {
                    case true:
                        return 'foot_manda_identifier';
                    case false:
                        return 'foot_mandatory';
                }
        }
    }

    //The second version of calculating the exact mid point
    //
    //There are 3 points of interest along the hypotenuse between source entity a
    //and destination entity b, viz.,start, mid and end.
    get_relation_points(a: entity, b: entity): { start: DOMPoint; mid: DOMPoint; end: DOMPoint } {
        //
        //IN MOST CASES, when the x coordinate of circle 1 is equivalent to the
        //x-coordinate of circle 2, then we have a zero difference that will be
        //carried forward to be evaluated later on, will return values of
        //infinity or zero later on.
        //
        //To prevent this from happening, if the difference, i.e., (b.y - a.y) or (b.x - a.x) is
        //zero, set it to be greater than zero,i.e., 0.1 or greater.
        //
        //
        let opposite: number;
        //
        //The 'opposite' is the y distance between a and b
        //const opposite:number= b.y - a.y;
        if (b.y - a.y !== 0) {
            opposite = b.y - a.y;
        } else {
            opposite = 0.1;
        }
        let adjacent: number;
        //
        //The 'adjacent' is the x distance between the source entity of a and destination entity b
        //const adjacent = b.x - a.x;
        if (b.x - a.x !== 0) {
            adjacent = b.x - a.x;
        } else {
            adjacent = 0.1;
        }
        //
        //The hypotenuse is the square root of the squares of the 'adjacent' and
        //the 'opposite'
        const hypotenuse = Math.sqrt(adjacent * adjacent + opposite * opposite);
        //
        //The targent of thita is calculated by 'oppposite' divided by the 'adjacent'
        const tanthita = opposite / adjacent;
        //
        //Thita is the inverse of the 'tanthita'
        const thita: number = Math.atan(tanthita);
        //
        //The angle of interest is...
        const phi = adjacent > 0 ? thita : Math.PI + thita;
        //
        //Let 'start' be the point at  the intersection of the entity centered as the source
        const start = this.get_point(a, phi, a.radius);
        //
        //Let 'mid' be the point mid way along entity source and destination hypotenuse
        const mid = this.get_point(a, phi, 0.5 * hypotenuse);
        //
        //Let 'end' be the point at the intersection of hypotenuse and the entity referred as the
        //destination
        const end = this.get_point(a, phi, hypotenuse - b.radius);
        //
        //Compile and return the desired final result
        return { start, mid, end };
    }
    //
    //Returns the coordinates of the point which is 'hypo' units from 'a' along
    //the hypotenuse of a and b (which is inclined at angle thita)
    get_point(a: entity, thita: number, hypo: number): DOMPoint {
        //
        //The 'opp' is the 'hypo' times the sine of 'thita';
        const opp: number = hypo * Math.sin(thita);
        //
        //The 'adj' is the 'hypo' times the cosine of thita where thita is the
        //angle between 'adj' and 'hypo'
        const adj = hypo * Math.cos(thita);
        //
        //The x coordinate of the mid point is 'adj' units from the center of a
        const x: number = a.position.x + adj;
        //
        //The y coordinate of the mid point is the 'opp' units from the center of a
        const y: number = a.position.y + opp;
        //
        //The desired point is at x and and y units from the origin
        return new DOMPoint(x, y);
    }
}
