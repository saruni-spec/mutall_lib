import {
  homozone,
  heterozone,
  driver_source,
  table_options,
  plan,
  table_option_interface,
  cell,
  root,
  grid,
} from "../../../outlook/v/zone/zone.js";

import {
  view,
  mutall_error,
  view_options,
  fuel,
} from "../../../schema/v/code/schema.js";
//
//Options for controlling  pannels
export interface panel_option_interface extends table_option_interface {
  //
  //Should the data source be transposed or not
  transposed: boolean;
  //
  //Show field in update mode
  updateable: boolean;
}
export type panel_options = Partial<panel_option_interface>;

//A page is a container of homozone based panels
export abstract class page extends view {
  //
  //A property that will dictate what to show on default settings
  public fi: number = 1;
  //
  //This represents the selected value by default
  public row_index: string = "2";
  //
  //The zone based panels that make up a school management system page
  public panels: Array<panel> = [];
  //
  constructor(
    //
    //To implement the view has-a hierarchy
    public parent?: view,
    //
    //The options for controlling a view
    public options?: view_options
  ) {
    super(parent, options);
  }
  //
  //Show all the panels of a page
  async show(): Promise<void> {
    await Promise.all(this.panels.map((panel) => panel.show()));
  }
}
//
//The homozone based panel that make up a page
export abstract class panel extends homozone {
  //
  //This is the primary key of the first item to be highlighted
  // public fi:string='1';
  //
  //The name of the Column that has cell that we want selected
  public selection_column: string = "name";
  //
  // check this and try to implement the ideas on my own ???
  // abstract fi:string;
  //
  //This heterozone is needed so so hat this homozone is displayed with headers
  public heterozone: heterozone;
  //
  //Tell typescript that the parent of a panel is a page (not just a view)
  declare parent: page;
  //
  constructor(
    driver_source: driver_source,
    options: panel_options,
    parent: page
  ) {
    //
    super(driver_source, options, parent);
    //
    //Create a heterozone using the this one as the body, so that the headers
    //can be displayed
    //
    //The plan of the heterozone is based on this homozone
    const plan: plan = [
      [new homozone(), this.get_header()],
      [this.get_leftie(), this],
    ];
    //
    //The option of a heterozone
    const heteroptions: table_options = {
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
  async show(): Promise<void> {
    //
    //Show the panel naturally
    await this.heterozone.show();
    //
    // Highlighting the first cell in the top most of the heterozone
    await this.highlight();
  }
  //
  //Getting the top most part of a panel and highlight it
  async highlight(): Promise<void> {
    //
    // Top most part of the heterozone???forcing it to be homozone because we know its a homozone
    // What are the scenarios that this is important??
    const zone: root.zone = this.heterozone.plan![0][0];
    //
    // Testing if this trully a homozone
    if (!(zone instanceof homozone))
      throw new mutall_error("homozone expected");
    //
    //Find the only cell in the homozone
    const cell: cell = zone.cells_relative![0][0];
    //
    //Get the homozone
    cell.select();
  }
  //
  //Responding to the cell
  async onclick(cell: cell, evt?: MouseEvent): Promise<void> {
    //
    //overriding the on click method and doing more with it
    await super.onclick(cell, evt);
    //
    //
    // alert(cell.io?.value);
  }
  //
  //Redefine the search to search the table option interface
  search_option<i extends keyof panel_option_interface>(
    key: i
  ): panel_option_interface[i] | undefined {
    //
    return <panel_option_interface[i]>(
      super.search_option(<keyof table_option_interface>key)
    );
  }
  //
  // Select the top most part of the panel
  select_corner(): void {
    //
    // access the first homozone in a heterozone
    const homo: root.zone = this.heterozone.plan![0][0];
    //
    // Ensure that the zone is a homozone before proceeding
    if (!(homo instanceof homozone)) throw new mutall_error("Not a homozone");
    //
    // Get the first cell
    const cell: cell = homo.cells_relative![0][0];
    //
    // Highlight  the cell
    cell.select();
    //
    //Scroll into view
    cell.td.scrollIntoView({ block: "center" });
  }
}
