//
//Import app from the outlook library.
import * as outlook from "../../../outlook/v/code/outlook.js";

import * as app from "../../../outlook/v/code/app.js";
//
import { io } from "../../../outlook/v/code/io.js";
//
//Import server
import * as server from "../../../schema/v/code/server.js";
//
//Import schema.
import * as schema from "../../../schema/v/code/schema.js";
//
//Resolve the iquestionnaire
import * as quest from "../../../schema/v/code/questionnaire.js";
//
//Resolve the reference to the journal interface
import * as mod from "../../../outlook/v/code/module.js";
//
import { basic_value } from "../../../schema/v/code/library";
//
//System for tracking assignments for employees of an organization.
//
//A column on the application database that is linked to a corresponding one
//on the user database. Sometimes this link is broken and needs to be
//re-established.
type replica = { ename: string; cname: string };
//
//
//Main application
export default class main extends app.app {
	//
	public writer: mod.writer;
	public messenger: mod.messenger;
	public accountant: mod.accountant;
	public scheduler: mod.scheduler;
	//
	//Initialize the main application.
	constructor(config: app.Iconfig) {
		super(config);
		//
		this.writer = new mod.writer();
		this.messenger = new mod.messenger();
		this.accountant = new mod.accountant();
		this.scheduler = new mod.scheduler();
	}
	//
	//Returns all the inbuilt products that are specific to
	//this application
	get_products_specific(): Array<outlook.assets.uproduct> {
		return [
			{
				id: "actions",
				title: "Actions",
				solutions: [
					{
						title: "View due assignments",
						id: "view_due_assignments",
						listener: ["event", () => this.vue_due_assignments()]
					}
				]
			},
			{
				id: "lvl2_registration",
				title: "Registration",
				solutions: [
					{
						title: "Register Intern",
						id: "register_intern",
						listener: ["event", () => this.register_intern()]
					}
				]
			}
		];
	}
	//
	//List all assignments that are due and have not been reported.
	//Ordered by Date.
	vue_due_assignments(): void {
		alert("This method is not implemented yet.");
	}
	//
	//Register an intern
	async register_intern(): Promise<void> {
		//
		//Initialize the registration
		const Intern = new register_intern(
			this,
			"../templates/register_intern.html"
		);
		//
		//Administer the registration page
		await Intern.administer();
	}
}
//
//The class for completing level 2 registration through the registration of interns
export class register_intern extends app.terminal implements mod.questionnaire {
	//
	//Access the main class and all its properties
	public declare mother: main;
	//
	constructor(mother: outlook.page, filename: string) {
		super(mother, filename);
	}
	//
	//The reporting panel containing the shown error
	public shown?: HTMLElement;
	//
	//A collection of all checkboxes in the system
	public checkboxes?: Array<HTMLInputElement>;
	//
	//Convert the given table element into a questionnaire table.
	//The structure of a questionnaire table is generally defined as:-
	// {class_name, args}
	//in particular its defined as:-
	//{class_name:"fuel", args: [tname, cnames, ifuel] }
	//where:-
	// tname is the name of the table,
	// cnames is an array of column names to be lookedup,
	// ifuel is a double array that represents the table body.
	get_table_inputs(): Array<quest.layout> {
		//
		//1. Get all tables and their elements in the registration form.
		const elements = Array.from(this.document.querySelectorAll("table"));
		//
		//2. Convert the table inputs to table layouts.
		const layouts: Array<quest.table> = elements.map(element =>
			this.get_table_layout(element)
		);
		//
		//3. Return the result.
		return layouts;
	}
	//
	//Get all the table layouts
	get_table_layout(element: HTMLTableElement): quest.table {
		//
		//A. Define the table that is the source of the data.
		//1.Get the tables class name.
		const class_name: string = "capture\\fuel";
		//
		//2. Get the required arguments, i.e., tname, cnames, ifuel
		//
		//2.1 Get the table name. It is the id of the table element
		const tname: string = element.id;
		//
		//2.2 Get the column names of the table. They will be as many
		//columns as there are th elements.
		const cnames: Array<string> = this.get_column_names(element);
		//
		//2.3 Get the body of the table as double list of string values.
		const body: Array<Array<basic_value>> = this.get_body_values(element);
		//
		//3. Compile the table layout.
		const table_layout: quest.table = {
			class_name,
			args: [tname, cnames, body]
		};
		//
		//4. Return the table layout.
		return table_layout;
	}
	//
	//Convert the given table element into a questionnaire table.
	//The structure of a questionnaire table is generally defined as:-
	// {class_name, args}
	//in particular its defined as:-
	//{class_name:"fuel", args: [tname, cnames, ifuel] }
	//where:-
	// tname is the name of the table,
	// cnames is an array of column names to be lookedup,
	// ifuel is a double array that represents the table body.
	//
	//get the column names.
	get_column_names(element: HTMLTableElement): Array<string> {
		//
		//Set the table name.
		const tname = element.id;
		//
		//1. Get all the table columns as a collection of TableCellElement.
		const elements = element.querySelectorAll("th");
		//
		//Check the nodelist to ensure the table has columns.
		if (elements === null)
			throw new schema.mutall_error(
				`There are no columns in this table ${tname}`
			);
		//
		//Convert the collection to an array.
		const cells = Array.from(elements);
		//
		//Map the array of table cell elements to column names.
		const names = cells.map(cell => {
			//
			//Get the name from the cname datalist.
			const name = cell.dataset.cname;
			//
			//Check to ensure that all the tables have column names.
			if (name === undefined)
				throw new schema.mutall_error(
					`No name found for this column in table ${tname}`
				);
			//
			//Return the name.
			return name;
		});
		//
		//Return the column.
		return names;
	}
	//
	//Compile the body rows and columns
	get_body_values(element: HTMLTableElement): Array<Array<basic_value>> {
		//
		//1. Get the input values of the table fields.
		//
		//Get the table body element.
		const tbody: HTMLTableSectionElement | null =
			element.querySelector("tbody");
		//
		//If the tbody is null, throw a new exception.
		if (tbody === null) throw new schema.mutall_error(`Table is empty`);
		//
		//Get the table rows in the form of an array
		const rows: Array<HTMLTableRowElement> = Array.from(
			tbody!.querySelectorAll("tr")
		);
		//
		//2. Get the td's of all the rows and map them to the input value
		const values: Array<Array<basic_value>> = rows.map(row => {
			//Get the inputs in the row.
			const inputs: Array<HTMLInputElement> = Array.from(
				row.querySelectorAll("input")
			);
			//
			//Map every value to a td.(use a yield method)
			const td_values: Array<basic_value> = inputs.map(cell => {
				return this.get_cell_value(cell);
			});
			//
			//Return the array of string of td.
			return td_values;
		});
		//
		//Return the body value.
		return values;
	}
	get_cell_value(cell: HTMLInputElement): any {
		//
		//Get the value of the td. As an array
		const td_val: basic_value = this.convert_to_basic(cell.value);
		//
		//Return the td.
		return td_val;
	}
	//
	//Check all inputs within a table using the properties defined in the column headings
	check_table_inputs(): boolean {
		//
		//1. Perform checks inside the table's header element, ignoring empty
		//columns
		const table_header: boolean = this.check_tableheader();
		//
		//2. Perform checks inside the table's body, ignore cells that do not
		//contain inputs of type text,date,radio, and checkbox
		const table_data: boolean = this.check_tabledata();
		//
		//Check that the both the table_header and data are defined
		const output: boolean = table_header && table_data === true ? true : false;
		//
		//Return the header and body data
		return output;
	}
	//
	//Check the table header to validate that the database,entity, and column names are provided.
	check_tableheader(): boolean {
		//
		//1. Css selector for all th's that are not empty
		const selector: string = ":where(th):not(:empty)";
		//
		//2. Retrieve the headers attributes
		const headers: Array<HTMLTableColElement> = Array.from(
			this.document.querySelectorAll(selector)
		);
		//
		//3. Check each header for the cname,dbname, and the ename.
		for (let header of headers) {
			//
			//Check for the database name
			if (header.dataset.dbname === undefined)
				throw new schema.mutall_error(
					`Database name for the column ${header.textContent} is missing`
				);
			//
			//Check for the entity name
			if (header.dataset.ename === undefined)
				throw new schema.mutall_error(
					`Entity name for the column ${header.textContent} is missing`
				);
			//
			//Check the column name
			if (header.dataset.cname === undefined)
				throw new schema.mutall_error(
					`Column name for the column  ${header.textContent} is missing`
				);
		}
		//
		return true;
	}
	//
	//Check the table body for empty inputs and retrieve inputs that have
	//values
	check_tabledata(): boolean {
		//
		//1. Retrieve the rows in the tables
		const rows: Array<HTMLTableRowElement> = Array.from(
			this.document.querySelectorAll("tbody>tr")
		);
		//
		//2. In each row, select all inputs and data elements
		for (let row of rows) {
			//
			//2.1. The selector to return all inputs that are in the table data cell
			const selector: string = `
            td>input[type="text"], 
                input[type="date"], 
                input[type="radio"]:checked, 
                input[type="checkbox"]:checked`;
			//
			//2.2. Retrieve all inputs in the row
			const inputs: Array<HTMLInputElement> = Array.from(
				row.querySelectorAll(selector)
			);
			//
			//2.3. Check the value of each input in that row
			for (let input of inputs) {
				//
				//2.3.1. Check the value provided in that row. If it is empty, throw it an exception/ mark it as an error
				if (input.value === undefined || "")
					throw new schema.mutall_error(
						`Value for the input of ${input.type} in row number ${row.rowIndex} is not provided`
					);
			}
		}
		//
		return true;
	}
	//
	//Check the simple inputs
	check_simple_inputs(): boolean {
		//
		//1 Define the css required  for retrieving the inputs
		const css: string = `
            :where(input[type="text"], 
                input[type="date"], 
                input[type="radio"]:checked, 
                input[type="checkbox"]:checked
            :checked):not(table *)`;
		//
		//2. Retrieve the inputs and convert then to an array
		const inputs: Array<HTMLInputElement> = Array.from(
			document.querySelectorAll(css)
		);
		//
		//3.Loop through all the inputs and yield a label for each of them
		for (let input of inputs) {
			//
			//Check for the dbname
			if (input.dataset.dbname === undefined)
				throw new schema.mutall_error(`Database name for ${input} is missing`);
			//
			//Check for the ename
			if (input.dataset.ename === undefined)
				throw new schema.mutall_error(`Entity name for ${input} is missing`);
			//
			//Check for the column name
			if (input.name === undefined)
				throw new schema.mutall_error(`Column name for ${input} is missing`);
			//
			//Check if the input has a required property and highlight it as an error
			if (input.required && input.value === "")
				throw new schema.mutall_error(`The value for input ${input.name} is missing
                and it is required`);
			//
			//Check whether an input is not required and if it is not provided,
			//show a warning
			if (!input.required && input.value === "")
				input.classList.add(".warning");
		}
		return true;
	}
	//
	//check the entered data and if correct return true else return false.
	//And prevents one from leaving the page.
	async check(): Promise<boolean> {
		//
		//Validate all inputs in the table
		//this.validate_inputs();
		//
		//0. Clear all the previous checks. Collect all errors and warnings and
		//remove the errors and warnings.
		//
		//
		//1. Collect and check all the data entered by the user.
		//
		//1.1 collect all the simple labels
		const simple: boolean = this.check_simple_inputs();
		//
		//1.2 collect all the tables
		const table: boolean = this.check_table_inputs();
		//
		//1.3
		if (!(simple && table)) return false;
		//
		//2. Write the data to the database.
		const save = await this.mother.writer.save(this);
		//
		return true;
	}
	//
	get_layouts(): Array<quest.layout> {
		//1. Collect all the labels associated with the simple inputs
		const inputs: Generator<quest.layout> = this.get_simple_inputs();
		//
		//2. Collect all the labels associated with tables in the questionnaire
		const tables: Array<quest.layout> = this.get_table_inputs();
		//
		//3. Combine 1 and 2 into a simple array and return it.
		return [...inputs, ...tables];
	}
	//
	//Retrieve all the label based layouts from the registration form.
	//That are outside of any table. Use the following css
	//:where(input[type="date"], input[type="text"], input[type="radio"]:checked
	//,select)
	//: not(table *)
	//The input[type="checkbox"] need to be treated differently at the labelling
	//stage in terms of the alias
	//
	//Collect the labels for all inputs outside a table
	*get_simple_inputs(): Generator<quest.label> {
		//
		//1 Define the css required  for the inputs
		const css: string = `:where(
            input[type="text"], 
            input[type="number"],
            input[type="date"], 
            input[type="radio"]:checked,
            input[type="checkbox"]:checked
        )
        :not(table *)`;
		//
		//2. Retrieve the inputs and convert then to an array
		const inputs: Array<HTMLInputElement> = Array.from(
			document.querySelectorAll(css)
		);
		//
		//3.Loop through all the inputs and yield a label for each of them
		for (let input of inputs) {
			//
			//3.1. Set the alias to take care of multiple values in checkboxes
			const alias = input.type === "checkbox" ? [input.value] : [];
			//
			//
			//3.2. Construct the label of the elements
			//NB: A label is a tuple comprising of 5 elements viz,
			//dbname,ename, [], cname, basic_value. This basic value comes from the input
			const label: quest.label = [
				//
				//The database name
				input.dataset.dbname!,
				//
				//The entity name
				input.dataset.ename!,
				//
				//The alias
				alias,
				//
				//The column name
				input.name,
				//
				//The value of the input
				input.value
			];
			//
			//Yield this label if the value is not empty
			if (input.value !== "") yield label;
		}
	}
	//
	//Check the basic value to get the data types of the values collected.
	//-empty | undefined return null
	//number return number use"parseFloat"
	//otherwise return a string.
	convert_to_basic(value: string): basic_value {
		//
		//Convert empty | undefined to return null
		if (value === "" || value === undefined) return null;
		//
		//Convert value to return a number
		if (parseFloat(value) !== NaN) return parseFloat(value);
		//
		//Convert value to boolean.
		if (value === "true") return true;
		else if (value === "false") return false;
		//
		//Otherwise return a string.
		return value;
	}
	//
	//Report the validity of the inputs by setting a custom validity on the input
	//for better error reporting to the user. Is this error reporting suitable for
	//both simple and tabular inputs????
	validate_inputs(): void {
		//
		//Validate the tabular inputs
		this.validate_table_inputs();
		//
		//Validate checkbox inputs
		this.verify_checkbox_inputs();
	}
	//
	//Verify that the checkbox inputs.HINT, all checkbox elements are always
	//grouped together using a common name,
	// i.e., '<input type="checkbox" name="something">'
	verify_checkbox_inputs() {
		//
		//0. Create a new array that will hold the name associated with
		//each input of type checkbox
		const names: Array<string> = [];
		//
		//1. Get all checkbox inputs
		const selector: string = 'label>input[type="checkbox"]';
		//
		//2. Retrieve all checkboxes
		const checkboxes: Array<HTMLInputElement> = Array.from(
			this.document.querySelectorAll(selector)
		);
		//
		//2.1. Collect the distinct name associated with the checkboxes.
		checkboxes.forEach(checkbox =>
			names.push(`${(<HTMLInputElement>checkbox).name}`)
		);
		//
		//2.2. Get the distinct names collected.
		const unique_names: Array<string> = [...new Set(names)];
		//
		//2.3. Create a holder for the unique name derived from the grouped checkbox inputs.
		let unique_name: string = "";
		//
		//3.0 Extract the checkboxes identified with the distinct name
		for (let unique of unique_names) {
			//
			//3.1. Retrieve all checkboxes associated with a unique name
			this.checkboxes = Array.from(
				this.document.querySelectorAll(`input[type="checkbox"][name=${unique}]`)
			);
			//
			//Compile the unique name associated with every type of input
			unique_name += unique;

			//
			//3.2. Listen to changes in the inputs and validate them
			this.checkbox_changes(unique_name);
		}
	}
	//
	//This function listens to the changes in the inputs of type checkbox,
	//listens to changes
	//and if none of the grouped checkboxes is selected, flag it as an error.
	checkbox_changes(unique: string) {
		console.log(this.checkboxes);
		//
		//1.Every listed checkbox should have its own listener that
		//affects the error reporting behavior.
		for (let checkbox of this.checkboxes!) {
			console.log(checkbox);
			//
			//2.Listen to changes in the checkboxes when they are checked or not.

			//
			//Validate checkbox inputs
			this.validate_checkbox_inputs(checkbox, unique);
			//
			//Change the visibility of the hidden panels
			this.set_visible(unique);
		}
	}
	//
	//Validate all the checkbox inputs provided in the form
	validate_checkbox_inputs(check: HTMLInputElement, unique: string): void {
		console.log(this.checkboxes);
		//
		//2.1. Check that at least one checkbox input is provided and collect it
		const checked: boolean = this.checkboxes!.some(checkbox => {
			return (<HTMLInputElement>checkbox).checked;
		});
		//
		//
		check.onchange = () => {
			//
			//2.2. Get the error reporting panel
			const reports: Array<HTMLDivElement> = Array.from(
				this.document.querySelectorAll(".report")
			);
			//
			//
			for (let report of reports) {
				//
				//2.2. Show the error panel if none of the grouped checkboxes is selected
				if (!checked) report.hidden = false;
				//
				//2.5. Hide the error panel if one of the checkbox inputs is selected
				else {
					report.hidden = true;
				}
			}
		};
	}
	//
	//Show the hidden div element to be visible
	set_visible(unique: string): void {
		//
		//3.0 Collect all elements that trigger the error reporting dialog when clicked.
		const show_errors: Array<HTMLElement> = Array.from(
			this.document.querySelectorAll(".report>.err_show")
		);
		//
		//Get the error reporting dialog panel
		let dialog_panel: HTMLDivElement = this.document.querySelector(".dialog")!;
		//
		//3.1. Show the dialog panel every time an error panel needs to be shown
		show_errors.forEach(show => {
			//
			//Show the panel once it is clicked
			show.onclick = async () => {
				//
				//Show the dialog element
				dialog_panel.hidden = true;
				//
				//Create the dialog box here
				dialog_panel.innerHTML = `
				<dialog class="dialog">
					<div class="header">
						<span class="close">&times;</span>
					</div>
					<div class="error_message">
					</div>
            	</dialog>
				`;
				//
				//Set the error message
				dialog_panel.querySelector(
					".dialog>.error_message"
				)!.innerHTML = `Select at least one value for the ${unique} from the ones listed above`;
				//
				//Set the dialog panel
				+dialog_panel;
			};
		});
		//
		//4.0. Collect all elements that close the error reporting dialog box
		const close_errors: Array<HTMLElement> = Array.from(
			dialog_panel.querySelectorAll(".dialog>.header>.close")
		);
		console.log(close_errors);
		//
		//4.1. Close the error message dialog when it needs to be closed
		close_errors.forEach(close => {
			//
			//Get the dialog element
			close.onclick = () => {
				//
				//Close the error dialog
				dialog_panel.innerHTML = "";
			};
		});
	}
	//
	//Show the selected inputs, that are triggered by a selected checkbox and make sure that
	//the visible element has a value provided. Otherwise,flag it as an error.
	//
	//Validate the inputs collected from a table and show a customized error report
	//for the empty inputs
	validate_table_inputs(): void {
		//
		//1. Retrieve all rows contained within the body of the table
		const rows: Array<HTMLTableRowElement> = Array.from(
			document.querySelectorAll("tbody>tr")
		);
		//
		// 2. Within each row, retrieve all inputs of type checkbox,date, radio, and text
		for (let row of rows) {
			//
			// 2.1. Formulate the selector to retrieve the aforementioned inputs
			const selector: string = `td>input[type="text"], 
                input[type="date"], 
                input[type="radio"]:checked, 
                input[type="checkbox"]:checked`;
			//
			// 2.2. Select each input cell within this row
			const inputs: Array<HTMLInputElement> = Array.from(
				row.querySelectorAll(selector)
			);
			//
			// 2.3. Find all cells with empty values in the table's row
			for (let input of inputs) {
				//
				//Validate the tabular inputs only once to prevent the propagation of multiple
				//errors
				input.addEventListener("input", () => {
					//
					//2.3.1. Get the empty values and flag them as errors
					if (input.value === "" || undefined || null) {
						//
						//report the errors
						this.report_errors(input);
						//
						//Set a custom validity on each type of input
						//this.set_custom_validity(input);
					}
					//
					//2.3.2. Validate the inputs with values
					//if (input.value !== "" || null)
					else {
						//
						//Remove the error
						input.classList.remove("error");
						//
						//Hide the error report panel
						if (input.nextSibling !== null) input.nextSibling.remove();
						//
						//Decorate the input field once it is created
						input.classList.add("done");
					}
				});
			}
		}
	}
	//
	//Report the errors identified in tabular inputs by adding buttons
	//to each invalid element
	report_errors(input: HTMLInputElement): void {
		//
		//Remove the current class list
		input.classList.remove("done");
		//
		//1. Add a border to each input element to show that its an error
		input.classList.add("error");
		//
		//2. Add the panel with buttons to show and hide the buttons
		input.parentElement!.insertAdjacentHTML(
			"beforeend",
			`<div id="report">
            <p class="err_show">Please add an input ...</p>
            <button class="close_err">close</button>
            </div>`
		);

		//
		//3. Get the buttons to show the error message,associated with the dialog
		const buttons: Array<HTMLButtonElement> = Array.from(
			this.document.querySelectorAll(".err_show")
		);
		//
		//3.1. Add an event listener to each button to allow error reporting
		for (let button of buttons) {
			//
			//Add an event listener that is triggered only once when it is clicked.
			button.addEventListener(
				"click",
				() => {
					//
					//Get the input element
					const elem = <HTMLInputElement>(
						button.parentElement!.previousElementSibling!
					);
					//
					//show the dialog box
					button.insertAdjacentHTML(
						"beforeend",
						`<dialog open>
                       Please add an input. A value for the ${elem.name} is missing.
                </dialog>`
					);
				},
				{ once: true }
			);
		}
		//
		//4. Get the buttons to close the error message from the opened dialog box
		const close_buttons: Array<HTMLButtonElement> = Array.from(
			this.document.querySelectorAll(".close_err")
		);
		//
		//4.1. Close a dialog box for each selected user
		for (let close_btn of close_buttons) {
			close_btn.onclick = () => {
				//
				//Close the visible dialog box
				buttons.forEach(button => {
					console.log(button.lastElementChild);
					button.lastElementChild!.remove();
				});
			};
		}
	}
	//
	//Allows the user to interact smartly with the page
	async show_panels(): Promise<void> {
		//
		//Validate the inputs
		this.validate_inputs();
	}
	//
	//Set the custom validity to each empty input
	// set_custom_validity(input: HTMLInputElement): void {
	//     //
	//     //Add an event listener to each each empty input that reports a custom validity for the input
	//     input.onclick = () => {
	//         //
	//         //Set the custom validity for this input
	//         input.setCustomValidity(`Missing value.Please Provide the ${input.name} data here`);
	//         //
	//         //Report the custom validity to the user
	//         input.reportValidity();
	//     }
	// }
}
