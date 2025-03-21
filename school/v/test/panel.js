import { homozone, heterozone, } from "../../../outlook/v/zone/zone.js";
import { view, mutall_error, } from "../../../schema/v/code/schema.js";
//A page is a container of homozone based panels
export class page extends view {
    parent;
    options;
    //
    //A property that will dictate what to show on default settings
    fi = 1;
    //
    //This represents the selected value by default
    row_index = "2";
    //
    //The zone based panels that make up a school management system page
    panels = [];
    //
    constructor(
    //
    //To implement the view has-a hierarchy
    parent, 
    //
    //The options for controlling a view
    options) {
        super(parent, options);
        this.parent = parent;
        this.options = options;
    }
    //
    //Show all the panels of a page
    async show() {
        await Promise.all(this.panels.map((panel) => panel.show()));
    }
}
//
//The homozone based panel that make up a page
export class panel extends homozone {
    //
    //This is the primary key of the first item to be highlighted
    // public fi:string='1';
    //
    //The name of the Column that has cell that we want selected
    selection_column = "name";
    //
    // check this and try to implement the ideas on my own ???
    // abstract fi:string;
    //
    //This heterozone is needed so so hat this homozone is displayed with headers
    heterozone;
    //
    constructor(driver_source, options, parent) {
        //
        super(driver_source, options, parent);
        //
        //Create a heterozone using the this one as the body, so that the headers
        //can be displayed
        //
        //The plan of the heterozone is based on this homozone
        const plan = [
            [new homozone(), this.get_header()],
            [this.get_leftie(), this],
        ];
        //
        //The option of a heterozone
        const heteroptions = {
            //
            //The heterozones will be anchored at the element that matches
            //the constructor name
            anchor: `#${this.constructor.name}`,
        };
        //
        //Presently, there are no specific options associated with the homozone
        this.heterozone = new heterozone(plan, heteroptions, parent);
    }
    //
    //Getting the heterezone and highlighting the cells
    async show() {
        //
        //Show the panel naturally
        await this.heterozone.show();
        //
        // Highlighting the first cell in the top most of the heterozone
        await this.highlight();
    }
    //
    //Getting the top most part of a panel and highlight it
    async highlight() {
        //
        // Top most part of the heterozone???forcing it to be homozone because we know its a homozone
        // What are the scenarios that this is important??
        const zone = this.heterozone.plan[0][0];
        //
        // Testing if this trully a homozone
        if (!(zone instanceof homozone))
            throw new mutall_error("homozone expected");
        //
        //Find the only cell in the homozone
        const cell = zone.cells_relative[0][0];
        //
        //Get the homozone
        cell.select();
    }
    //
    //Responding to the cell
    async onclick(cell, evt) {
        //
        //overriding the on click method and doing more with it
        await super.onclick(cell, evt);
        //
        //
        // alert(cell.io?.value);
    }
    //
    //Redefine the search to search the table option interface
    search_option(key) {
        //
        return (super.search_option(key));
    }
    //
    // Select the top most part of the panel
    select_corner() {
        //
        // access the first homozone in a heterozone
        const homo = this.heterozone.plan[0][0];
        //
        // Ensure that the zone is a homozone before proceeding
        if (!(homo instanceof homozone))
            throw new mutall_error("Not a homozone");
        //
        // Get the first cell
        const cell = homo.cells_relative[0][0];
        //
        // Highlight  the cell
        cell.select();
        //
        //Scroll into view
        cell.td.scrollIntoView({ block: "center" });
    }
}
