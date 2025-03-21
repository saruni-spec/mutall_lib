//
//The base class from which we are trying to implement the additional functionality of reviewing
//the records in a given entity using tabulations
import { metavisuo } from '../code/metavisuo.js';
//
//Form the zone lib get the essential functionality to be able to plot a db table
import { homo, driver_source, hetero } from '../../../outlook/v/zone/zone.js';
//
//For loud error reporting
import { mutall_error } from '../../../schema/v/code/schema.js';
//
//The main goal of this class is to implement the tabular review of data in a given entity with the
//help of the zone library
export class metacrud extends metavisuo {
    //
    constructor(cwd: string) {
        //
        //Create an instance of the base class
        super(cwd);
    }
    //
    //The tablulate function will handle the tabulation of data from the specified entity
    //The tabulation will be done with the help of the zone library.
    private async tabulate(ename: string, dbase: string): Promise<void> {
        //
        //Define the sql;
        //TODO:Do pagination at this level
        const sql: string = `select * from ${ename}`;
        //
        //Define the source of the data that drives the tabulation for the body
        const driver_source: driver_source = {
            type: 'sql',
            sql,
            row_index: ename,
            dbname: dbase,
        };
        //
        //Create the homozone
        const body = new homo.zone(driver_source);
        //
        //Define a a layout Of how the data table will be shown
        const layout: Array<Array<homo.zone>> = [
            [new homo.zone(), body.get_header()],
            [body.get_leftie(), body],
        ];
        //
        //Use the layout to define a heterozone
        const zone = new hetero.zone(layout, this, {
            anchor: '#dlg',
        });
        //
        //Now show the homozone
        await zone.show();
    }
    //
    //Get the selected entity and produce a dialog box with the tabulation of the entities data using
    //the zone library
    async show_tabulation(): Promise<void> {
        //
        //Get the name of the selected database
        const ename: string = this.get_selected_entity().name;
        //
        //On right click create a dialog box attached to the body
        const dlg: HTMLDialogElement = this.create_element('dialog', this.document.body, {
            id: `dlg`,
        });
        //
        //Add a close button to the dialog box
        const close: HTMLButtonElement = this.create_element('button', dlg, {
            textContent: 'Close',
        });
        //
        //Implement the close dialog behaviour once the close button is clicked
        close.onclick = () => this.document.body.removeChild(dlg);
        //
        //Get the currently selected database
        const db: string = (<HTMLSelectElement>this.get_element('databases')).value;
        //
        //Do all tabulations of the selected entity on the dialog box
        await this.tabulate(ename, db);
        //
        //Finally show the dialog box
        dlg.showModal();
    }
    //
    //After initializing the page add the event listener for the show_data button. This only happens
    //if there is a selected database.
    public async show_panels(): Promise<void> {
        //
        //Call the show panels of the parent class
        await super.show_panels();
        //
        //Ensure that there is a current db present
        if (!this.current_db)
            throw new mutall_error(
                'No database selected. Kindly select one in the drop down above !!!'
            );
        //
        //Get the button for showing data
        const show: HTMLElement = this.get_element('show_data');
        //
        //Add the listener to handle showing of the data in the selected entity
        show.addEventListener('click', () => this.show_tabulation());
    }
}
