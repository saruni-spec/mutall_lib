import {
    mutall_error, view, fuel, basic_value, view_options
} from "../../../schema/v/code/schema.js";

//
//Modelling a tree as the container of node collection
export abstract class tree extends view{
    //
    abstract collection:Array<node>;
    //
    constructor(parent?:view, options?:view_options){
        super(parent, options);
    }
}

export abstract class node extends view{
    //
    //row_index is the name of the column used for indexing the (visual) records of a 
    // node. When a node selection is made, it is the record that manifests it.
    abstract  row_index:string
    //
    //The record that is current
    public record?:record;
    //
    //The sql for displaying data in this node
    public display:sql;
    //
    constructor(public tree:tree, display:sql, parent?: node){
        super(parent);
        //
        this.display = display;
    }
    //
    //Clear a node's selection, or better still, mark the top left glade region
    abstract clear_selection():void;
    //
    //
    //Use an appropriate bsql to retrieve a record of this node with the requested
    //primary key
    abstract get_record(key:basic_value):Promise<record|undefined>;
    //
    abstract highlight():void;
    //
    //We should be able to identify a node
    abstract toString():string;
    
    //Selecting a node siply highlights the current record
    select():void {
        //
        if (this.record) this.record.select();
    }

    //
    //Implement the on click interaction -- the gist of this module
    //The primary key of the reference record drives his agenda.
    async onclick(ref:record, evt?:MouseEvent):Promise<void>{
        //
        //Do a self selection
        this.highlight();
        //
        //Select the relatives
        for(const relative of this.relatives(ref)) relative.select();
    }

    *relatives(ref:record):Generator<relatives.relative>{
        //
        //Collect siblings by utilising the leaf and branch classes
        yield *this.siblings(ref);
        //
        //Collect ancestors by looking at a node's parent and grand parents
        yield *this.ancestors(ref);
        //
        //
        //Collect descendants by looking an a node's children and grand children
        yield *this.descendants(ref);
        
    }

    //A leaf has no siblings; a branch does
    abstract siblings(ref:record):Generator<relatives.sibling>;

    //Collect ancestors by looking at a node's parent and grand parents
    *ancestors(ref:record):Generator<relatives.ancestor>{
        //
        //The immediate parent of this node is an acestor
        const parent:view|undefined = this.parent;
        //
        //If the paremt is a node, then...
        if (parent instanceof node){
            //
            //...collect it as an acestor...
            yield new relatives.ancestor(parent, ref);
            //
            //...then used it to climb the ancestral tree
            yield *parent.ancestors(ref);
        }
    }

    //
    //Collect descendants by looking an a node's children and grand children
    *descendants(ref:record):Generator<relatives.descendant>{
        //
        //Consider all the all the nodes in the collection for descendancy
        for(const child of this.tree.collection){
            //
            //Get the parent of this node
            const parent:view|undefined =child.parent;
            //
            //If the of parent the child is this node...
            if (parent instanceof node && parent===this){
                //
                //...then the child is a descendant of this node
                yield new relatives.descendant(parent, ref);
                //
                //Use the child to continue searching for descendants
                yield *child.descendants(ref);
            } 
        }
    }
        
    
    
        
}

export abstract class leaf extends node{
    //
    constructor(tree:tree, display:sql, parent?: node){
        super(tree, display, parent)
    }

    //A leaf has  no siblings
    *siblings(ref:record):Generator<relatives.sibling>{}
}

//The difference between a lean and a branch is the member collection
export abstract class branch extends node{
    //
    constructor(tree:tree, display:sql, public members:Array<node>, parent?: node){
        super(tree, display, parent)
    }
    //
    //The siblings of a branch are the members
    *siblings(ref:record):Generator<relatives.sibling>{
        //
        for(const member of this.members) yield new relatives.sibling(member, ref);
    }
}


//Record is the class targeted by a selection. It is associated with a primary
//key
export abstract class record extends view {
    //
    //The parent of a record is a node
    declare parent:node;
    //
    constructor(parent:node, public pk:number){
        super(parent)
    }
    
    //Higlght a record as selected
    abstract select():void;
    //
    //Formulate the condition to support a selector
    get where():string{
        //
        //Get the node and the primary key value that defined a record
        const {parent, pk} = this;
        //
        //Compile and return the condition
        return `${parent.row_index} = ${pk}`
    }
}

export namespace relatives{

    export abstract class relative extends view{
        //
        //
        //Descendants by definition can be more than one. Only one should be 
        // shown in a selection. In all other cases, this resttriction is not 
        // required
        public limit:string='';

        //
        //Ancestors of a node are derived from the records of the currentnt  node.
        //So, there  is bound to be obvious repetition. Pick the distinct cases only.
        // There should be be only one. In all other cases, the qualifier is not needed
        public distinct:string = '';
        //
        //Selector is teh query that suppprts selection of this relative
        public selector = new selector(this, this);
        //
        //The reference record that characterises a relative
        constructor(public node:node, public ref:record){ref
            super(node)
        }

        //A relative can be selected
        async select():Promise<void>{
            //
            //Execute the sql to to get a marker
            const key:basic_value = await this.selector.get_row_index_value();
            //
            //If the key is not defined then remove any selection from the node
            if (!key) {this.node.clear_selection(); return} 
            //
            //Use teh reference record tetrieve the desired record from the 
            // underlying node
            const record:record|undefined = await this.node.get_record(key);
            //
            //Then select it
            if (record) record.select();
        }
        //
        //Handle the case of no selector data. Ancestors do not expect it
        handle_no_data():basic_value{
            //
            //The basic value associated with no selection is a null
            return null;
        }        

    }

    export class ancestor extends relative{
        //
        constructor(node:node, ref:record){
            super(node, ref);
            //
            //Ancestors of a node are derived from the records of the currentnt  
            // node. So, there  is bound to be obvious repetition. Pick the 
            // distinct cases only. There should be be only one. 
            // In all other cases, the qualifier is not needed
            this.distinct = 'distinct';
        }

        //
        //Handle the case of no selector data. Ancestors do not expect it
        handle_no_data():basic_value{
            //
            //The basic value associated with no selection is a null
            throw new mutall_error(`No ancestor found of this node, '${this.node}',  is found`);
        }
        
    }

    //Descend
    export  class descendant extends relative{
        //
        constructor(node:node, ref:record){
            super(node, ref);
            //
            //Descendants by definition can be more than one. Only one should be 
            // shown in a selection. In all other cases, this resttriction is not 
            // required
            this.limit = 'limit 1';

        }

    }

    export class sibling extends relative{
        //
        constructor(node:node, ref:record){
            super(node, ref)
        }
    }
}


//Attempt to model sql to support the tree operation 
export abstract class sql extends view{
    //
    abstract distinct:string;
    abstract limit:string;
    //
    constructor(
        public fields:string,
        public from:string,
        public where:Array<string>,
        parent:view
    ){
        super(parent)
    }
    //
    //Executning an sql returns fuel or a scalar
    async exec():Promise<Array<fuel>>{
        //
        //Search the view hierarchy for the dbname
        const dbname:string = this.get_dbname();
        //
        //eexcute teh sql
        return await this.exec_php(
            'database',
            [dbname, false],
            'get_sql_data',
            [this.to_str()]
        )
    }

    //Convert an sql to a string
    to_str():string{
        //
        const str = `
        select ${this.distinct}
            ${this.fields}
        from
            ${this.from}
        where
            #If there os no condition, then at least true will be the result
            ${[...this.where, 'true'].join(' and ')}
        ${this.limit}        
        ` ;
        //
        return str;
    }

    
}

//A selector is a query which when executed returns a single value that
//drives a selector
export class selector extends sql {
    //
    //The distinct selection is important for ancecstors
    public distinct:string;
    public limit:string;
    
    //
    constructor(public relative:relatives.relative, parent:view){
        //
        //Destructire a relative to reveal the 2 key properties of a relative
        const {ref, node} = relative
        /*
            from: string,
            where: Array<string>
        */
        //A selector has only one field -- the row index of the relative node
        const fields:string = node.row_index;
        //
        //The selector's from clause is the same as that of node's display
        //query
        const from:string = node.display.from;
        //
        //The where clause is formed from constraing that of the display with
        //that of the reference record
        const where:Array<string> = [...node.display.where, ref.where];
        //
        //Initialize the parent version 
        super(fields, from, where, parent);
        //
        //Use the relative to define the distinct and limit clauses
        this.distinct = this.relative.distinct;
        this.limit = this.relative.limit;
    }
    //
    //Executinng an sql returns to get the row index value
    async get_row_index_value():Promise<basic_value>{
        //
        //Execute the selector normally
        const result:Array<fuel> = await this.exec();
        //
        //Handle the result, depending on the number of members
        switch(result.length){
            //
            //Handle no selection: ancestors do not expect this
            case 0:return this.relative.handle_no_data();
            //
            //Return the only record    
            case 1:
                //
                //Get teh only row of data
                const row:fuel = result[0];
                //
                //Get the only field value
                const value:basic_value = Object.values(row)[0];
                //
                //Return the value
                return value;
            //Result is more than 1 row: that's an issue    
            default:
                throw new mutall_error(`${result.length} vales resulted from a selector. Thats unexpected`)
        }
    }
}