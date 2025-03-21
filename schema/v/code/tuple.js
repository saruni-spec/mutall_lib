//The tuple class "extends" an entity with data for one record/tuple. It houses
//methods that are shared by all entities, e.g., save(), fetch()
//
//To support execution of PHP-based methods
import * as server from "./server.js";
//
//Access to the current database
import * as schema from "./schema.js";
//
//
//The tuple class is the root of all classes derived automatically by mapping the 
//relation to the object model. It extends a schema entity
export class tuple extends schema.entity {
    databases;
    feed;
    //
    //Convert a basic tuple structure to a ready one. The ready one is then used
    //for setting the user properties of the tuple 
    calc;
    checked;
    read;
    //
    //Convert the ready data of this tuple to a  basic version primarily for the
    //for purpose of saving it to a database. 
    written;
    //
    //The primary key field is initialized to error 
    pk = new Error('Save the data to access its prmary key');
    //
    //The foreign key columns that  drive the pointer system for this entity
    pointers = {};
    //
    //Initialize this tuple with the relevant entity schema. We can tell what
    //ename this tuple belongs to from the constructor.name. What about the name
    //of the database? Can we interrogate an instance for its parent namespace?
    //Consider passing the database name as a parameter. 
    constructor(
    //
    //Requirements for constructing a schema entity
    dbase, 
    //
    //Support for constructing pointers
    databases, name, 
    //
    //The tuple's input data feed; it is undefined for a brand new tuple
    feed) {
        //Initialize the base entity class
        super(dbase, name);
        this.databases = databases;
        this.feed = feed;
        //
        //Set the pointers for this tuple
        [...this.collect_pointers()].forEach(fkcol => this.pointers[fkcol.name] = fkcol);
        //
        //Use the given feed to populate this tuple with available data. This 
        //effectively ensures that no editable variable is null 
        this.initialize(feed);
    }
    //Use the given feed to initialize this tuple with available data. This method
    //is executed as part of the constructor, so it cannot be asynchronous.The 
    //feed, effectively allows us to have implement different ways of constructing
    //a tuple.
    initialize(feed) {
        //
        //If this is a brand new tuple, then we cannot go any further; the 
        //editable tuple properties retain thier initial value:null
        //getting ready.
        if (feed === undefined)
            return;
        //
        //Initialize the feed, depdning on its type
        switch (feed.type) {
            //
            //The only known editable property that can be deduced from the feed
            //is the primary key.
            case 'primary':
                //
                //If the primary key is an error, then this fetching is illegal.
                //Perhaps you are fetching data of an unsaved record. Report the
                //error
                if (this.pk instanceof Error)
                    throw Error;
                //
                this.pk = { value: feed.data, friend: new Error('Fetch before you can use the friend') };
                break;
            //
            //Both the primary and frendly components can be deduced from the 
            //feed's data afterfriendly string decoding the 
            case 'friend':
                this.pk = this.decode_pk_str(feed.data);
                break;
            //  
            //Convert the reader to edit data; then assign it to this tuple         
            case 'reader':
                Object.assign(this, this.convert_reader_2_edit(feed.data));
                break;
            //
            //Populate this tuple using the feed data
            case 'ready':
                Object.assign(this, feed.data);
                break;
        }
    }
    //Fetch this tuple's  properties from a database (so that users 
    //can use it locally to do their thing) and return this tuple -- just incase 
    //we need chaining.
    //This method is particulary important for expanding foreign key values to 
    //their equivalent tuples. Only tuples created with primary and friend feed 
    //types are candidates for fetch.
    async fetch() {
        //
        //If this is a brand new tuple, then there is nothing to fetch from a 
        //databasewe.
        if (this.feed === undefined)
            return this;
        //
        //Only the primary and friendly type of feeds are suitable candidates 
        //for fetching
        switch (this.feed.type) {
            //
            case 'primary':
            case 'friend':
                //
                //If the primary key is an error, then this fetching is illegal.
                //Perhaps you are fetching data of an unsaved record. Report the
                //error
                if (this.pk instanceof Error)
                    throw Error;
                //
                //Use the primary key value to retrieve the editable data
                const editable = await this.seek(this.pk.value);
                //
                //Transfer the editable data to this form
                Object.assign(this, editable);
                break;
            //
            //Fetching on any other type of feed does nothing
            default: ;
        }
        //
        //Return this tuple. This unusual construct is designed to support 
        //chaining.
        return this;
    }
    //
    //Write this tuple to the database, returning true if successful or
    //an error message, if the process failed. 
    async save() {
        //
        //Collect all the layouts of this entity
        const layouts = [...this.collect_layouts()];
        //
        //Use the layouts to write this entity the database on the server, using 
        //the (simpler) //normal method
        const result /*the error*/ = await server.exec(
        //
        //Use the questionnaire class to write the data
        'questionnaire', 
        //
        //The arguments of this method are layouts
        [layouts], 
        //
        //The method to use is the much simple common one 
        'load_common', 
        //
        //The name of the database to use depends on the entity schema
        [this.dbase.name]);
        //
        //Check and return the desired result
        return result === 'Ok' ? true : new Error(result);
    }
    //Collect all the layouts of this entity
    *collect_layouts() {
        //
        //Collect attribute base layouts
        for (const cname in this.columns) {
            yield [this.dbase.name, this.name, [], cname, this.write[cname]];
        }
        //
        //Collect pointer based layoyouts
        for (const pointer in this.pointers) {
            //
            //This yielding is conditional to the pointer having been fetched
            //
            //Yield the data source as a \mutall\capture table of the matrix type
            yield { class_name: '\mutall\capture\matrix', args: [tname, cnames, matrix] };
            //
            //Yield the destination labels.pointers
            //
        }
    }
    //
    //Get the primary key value from the given friendly/value tuple
    decode_pk_str(pk_str) {
        //
        //Decode the input string into a tuple of primary key value and its 
        //friend. Discard the frend
        const [value, friend] = JSON.parse(pk_str);
        //
        //The keys must be defined
        if ((value === undefined) || (friend === undefined))
            throw new schema.mutall_error(`String ${pk_str} is not a valid value/friend tuple`);
        //
        //The primary key must be a number
        if (typeof value !== 'number')
            throw new schema.mutall_error(`The primary key value, ${value}, must be a number`);
        // 
        //return the decoded parts
        return { value, friend };
    }
    //    
    //    //Return the pointers of the given subject searched from its own database only
    //    private static async get_pointers(subject:schema.subject):Promise<Array<schema.foreign>>{
    //        //
    //        //Check if the subject's database is registered in schema databases or not
    //        let dbase = schema.database.databases[subject.dbname];
    //        //
    //        //If it is, use it; otherwise open to register and return it.
    //        if (dbase===undefined) {
    //            //
    //            //Get the database structure
    //            const Idbase:schema.Idatabase = await server.exec(
    //                'database',
    //                [subject.dbname],
    //                'export_structure',
    //                []
    //            )
    //            //Create and register the database
    //            dbase = new schema.database(Idbase);
    //        }
    //        //Return the pointers
    //        return dbase.get_pointers(subject);
    //    }    
    //  
    //Use the given primary key to retrieve the desired (reader) record and 
    //return it in as an edit<tuple>
    //format
    async seek(value) {
        //
        //Seek scalar-based values
        const scalars = await this.seek_scalars(value);
        //
        //Convert the basic to ready
        const editable = this.convert_reader_2_edit(scalars);
        //
        //Return the result
        return editable;
    }
    //Read scalar-based data
    async seek_scalars(value) {
        //
        //Use the PHP editor class to get an sql statement, fit for editing data
        const result = await server.exec('editor', [this.name, this.dbase.name], 'describe', []);
        //
        //The sql is the 3rd member of a resulting tuple
        const sql1 = result[2];
        //
        //Add the primary key condition to the editor sql. NB. The toString()
        //method of an entity returnsthe fully spcified, fully quoted name, fit
        //for partcipatin in an sql
        const sql = `${sql1} where ${this}=${value}`;
        //
        //Execute the sql statement
        const records = await server.exec('database', [this.dbase.name], 'get_sql_data', [sql]);
        //
        //Its an error if none or more than one record is identified
        if (records.length !== 1)
            throw new schema.mutall_error(`${records.length} are identified by clause promary key ${value}`);
        //
        //Return the only retrieved record;
        return records[0];
    }
    //
    //Read the data of this entity, identified by given primary key value, from
    //a database, returing a single record that has 2 parts: scalars and matrices.
    async seek_matrices(value) {
        //
        //Collect all the pointers of the subject
        const pointers = [...this.collect_pointers()];
        //
        //Convert the pointers to matrices. Use the for each, method; the 
        //asynchronous inside a map does not seem to work as exoected
        //return pointers.map(async(pointer)=>await this.seek_matrix(value, pointer));
        //
        //Start with an empty fuel;
        const result = {};
        //
        //For aeach pointer...
        for (const pointer of pointers) {
            //
            //Add it to the fuel.
            result[pointer.name] = await this.seek_matrix(value, pointer);
        }
        //Return the complete fuel
        return result;
    }
    //Use the given primary key to read data (from the pointer's table) that 
    //matches the foreign key
    async seek_matrix(value, pointer) {
        //
        //Use the pointer's database and entity name to get an sql statement, 
        //fit for editing data
        const result = await server.exec('editor', [pointer.entity.name, pointer.entity.dbase.name], 'describe', []);
        //
        //The sql is the 3rd member of a tuple
        const sql1 = result[2];
        //
        //Compile the where clause. E.g., where `mutall_users`.`intern`.`name`=5
        const where = `${pointer}=${value}`;
        //
        //Add the where clause to the editor sql
        const sql = `${sql1} where ${where}`;
        //
        //Execute the sql statement
        const records = await server.exec('database', [pointer.entity.dbase.name], 'get_sql_data', [sql]);
        //
        //Return all teh retrievdd records
        return records;
    }
    //Collect pointers to this entity from all the available databases
    *collect_pointers() {
        //
        //For each registered database....
        for (const dbname in schema.databases) {
            //
            //Get the nameed database
            const dbase = schema.databases[dbname];
            //
            //Loop through all the entity (names) of the database
            for (const ename in dbase.entities) {
                //
                //Loop through all the columns of entity
                for (const cname in dbase.entities[ename].columns) {
                    //
                    //Get the named column
                    const col = dbase.entities[ename].columns[cname];
                    //
                    //Only foreign keys are considered
                    if (!(col instanceof schema.foreign))
                        continue;
                    //
                    //The column's reference must match the given subject
                    if (col.ref.dbname !== this.dbase.name)
                        continue;
                    if (col.ref.ename !== this.name)
                        continue;
                    //
                    //Collect this column
                    yield col;
                }
            }
        }
    }
}
//The pointer class allows us to manage lists of tuples of some type. 
export class pointer {
    databases;
    $constructor;
    away;
    //
    //The members of the home tuple; this is defined when the pointer is populated
    members;
    //
    constructor(
    //
    //The databases on this server
    databases, 
    //
    //Member constructor
    $constructor, 
    // 
    //The tuple that defines the data that is needed for initializing members 
    away) {
        this.databases = databases;
        this.$constructor = $constructor;
        this.away = away;
    }
    //
    //The foreign key column that defines this pointer
    get col() {
        //
        //Get the name of the member constructor
        const cname = this.$constructor.name;
        //
        //Get column for this pointer; it must be a foreign key
        return this.away.pointers[cname];
    }
    //
    //Populate home members of this pointer, returning the same members. This 
    //allows chaining, so that instead of the following 2 statements:-
    //if x.members===undefined awawit x.populate(); x.map(...)
    //
    //we can code it as one statement
    //
    //(await x.populate()).map(...)
    async populate() {
        //
        //Don't waste time if members are already populated
        if (this.members !== undefined)
            return this.members;
        //
        //Continue only if the away primary key (pk) is valid
        if (this.away.pk instanceof Error)
            throw Error;
        //
        //Get the primary key of the away tuple
        const value = this.away.pk.value;
        //
        //Select * from col.entity where col.name = value
        let rows = await this.away.seek_matrix(value, this.col);
        //
        //Get the home database and entity names of the foreign key for this pointer
        const dbname = this.col.entity.dbase.name;
        const ename = this.col.entity.name;
        //
        //Get the factory for constructing new members of the home entity
        const factory = this.databases[dbname][ename];
        //
        //Construct as many members as there are results of the seek and assign
        //them the members
        this.members = rows.map(row => new factory({ type: 'basic', data: row }));
        //
        //Return the mebers -- thus supporting chaining
        return this.members;
    }
    //A pointer is associated with a matrix layout for exporting its data
    get_table_layout() {
        //
        //Let the table be named after the name of the foreign key column
        const tname = this.col.name;
        //
        //There will be as many output columns as those of the home entity
        const cnames = Object.keys(this.col.entity.columns);
        //
        //The members  must be set
        if (this.members === undefined)
            throw new schema.mutall_error('Fetch member data before using them');
        //
        //There are as may body data rows as the members of the pointer
        const body = this.members.map(member => this.get_matrix(member, cnames));
        //
        //Define the matrix table we require
        let matrix = {
            class_name: 'mutall\capture\matrix',
            args: [tname, cnames, body]
        };
        //
        //Return the table
        return matrix;
    }
    //Convert a scalars object into an arrray ordered by the given columns
    get_matrix(Tuple, cnames) {
        //
        //Convert the tuple to a basic matrix for writing purpose
        const matrix = Tuple.convert_2_writer();
        //
        //Following the order of the given columns, produce an array of basic values
        const result = [];
        for (const cname in cnames) {
            result.push(matrix[cname]);
        }
        //
        return result;
    }
}
