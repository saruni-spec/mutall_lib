import { metavisuo } from "./metavisuo.js";

import { dialog, raw } from "./../../../mashamba/v/code/dialog.js";

import { database, entity } from "./metavisuo.js";

//Resolve references to the schema namespace
import * as schema from "../../../schema/v/code/schema.js";

//
//Report is just pice of text
type report = string;
//
// A class for reporting entity errors in metavisio class
export class metavisuo_ext extends metavisuo {
  //
  //Get the selected dbase from local storage
  public selected_dbase?: string;
  //
  //Use the library dialogbox strategy to display the errors that are in the
  //current selected entity
  async show_errors(): Promise<void> {
    //
    //Get the error report
    const Report: report = await this.get_report();
    //
    //Use the report to create a dialog box
    const dlg = new report_dialog(Report);
    //
    //Use the dialog to show the report
    await dlg.administer();
  }
  
  //Get the error report from the currenty selected entity in this
  //metavisuo appliction
  async get_report(): Promise<report> {
    //
    // Get the selected entity
    const entity: entity | undefined = this.get_selected_entity();
    //
    // Get the entity errors
    const errors: Array<Error> = entity!.errors;
    //
    //Convert the errors to a string
    const report: string = this.convert_2_str(errors);
    //
    // Return the report of errors
    return report;
  }
  //
  // Get the selected entity
  private get_selected_entity(): entity | undefined {
    //
    // Get the current database that is selected
    const database: database | undefined = this.current_db;
    //
    // Get the entitities class and id #attribute
    const entities: { [index: string]: entity } = database!.entities;
    //
    //From the entiies get the one with class selected
    // Loop through each of the entities
    for (const selected in entities) {
      //
      // Get the current entity
      const entity: entity = entities[selected];
      //
      // Check if the entity has the "selected" class
      if (entity.proxy.classList.contains("selected")) {
        return entity;
      }
    }
    //
    // If no entity with the "selected" class is found, return undefined
    return undefined;
  }
  //
  //Convert the errors to a string
  private convert_2_str(errors: Array<Error>): string {
    //
    // If there is no error return
    if (errors.length === 0) return "No errors found.";
    //
    // Use the map function to extract the error messages
    return errors
      .map(
        (error) => `
        <details>
            <summary>${error.message}</summary>
            ${error.stack}
        </details>
    `
      )
      .join("<br/>");
  }
}

class report_dialog extends dialog<report> {
  //
  //Define a class constructor
  constructor(report: report) {
    super({ url: "./show_errors.html", anchor: document.body }, report);
  }
  //
  // Saving data to a database
  async save(input: report): Promise<"ok" | Error> {
    return "ok";
  }
  //
  // Reads and returns data from a dialog
  async read(): Promise<raw<report>> {
    //
    throw new Error("Read not expected");
  }

  //Override the populate dialog option
  populate(data: report): void {
    //
    // Get the error reporting element
    const element = this.get_element("my_error_report");
    //
    // Insert the report to the element
    element.innerHTML = data;
  }
}
